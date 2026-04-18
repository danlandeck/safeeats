import { base44 } from "@/api/base44Client";
import { API_REGISTRY, LIVE_API_IDS, buildSearchUrl, buildDetailUrl } from "./apiRegistry";
import {
  processKingCountyResults, processNYCResults, processChicagoResults,
  processMontgomeryResults, processAustinResults, processSFResults, processLAResults,
  nycToDetailRows, chicagoToDetailRows, montgomeryToDetailRows,
  austinToDetailRows, sfToDetailRows, laToDetailRows,
  llmToDetailRows, buildLLMRestaurant,
} from "./inspectionProcessors";

const PROCESSORS = {
  king:          { process: processKingCountyResults,  toDetailRows: null },
  nyc:           { process: processNYCResults,         toDetailRows: nycToDetailRows },
  cook:          { process: processChicagoResults,     toDetailRows: chicagoToDetailRows },
  montgomery_md: { process: processMontgomeryResults,  toDetailRows: montgomeryToDetailRows },
  travis:        { process: processAustinResults,      toDetailRows: austinToDetailRows },
  sf:            { process: processSFResults,          toDetailRows: sfToDetailRows },
  la:            { process: processLAResults,          toDetailRows: laToDetailRows },
};

const SOURCE_TO_COUNTY = {
  king: "king", nyc: "nyc", chicago: "cook",
  montgomery: "montgomery_md", austin: "travis",
  sf: "sf", la: "la", dubai: "dubai", llm: "llm",
};

const LLM_SCHEMA = {
  type: "object",
  properties: {
    restaurants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name:                   { type: "string" },
          address:                { type: "string" },
          city:                   { type: "string" },
          zip_code:               { type: "string" },
          phone:                  { type: "string" },
          latest_score:           { type: "number" },
          total_violation_points: { type: "number" },
          latest_date:            { type: "string" },
          latest_result:          { type: "string" },
          total_inspections:      { type: "number" },
          violations:             { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const PROMPT_LOCATION = (query, location, today) =>
  `Today is ${today}. Search the web for real health inspection records for "${query}" in ${location}.
CRITICAL: ALL results MUST be in ${location} only. No invented data. city field must be a real city in ${location}.
latest_score: 0–100. latest_result: actual inspection outcome. violations: real only.
NEVER return results from any other country or region.`;

const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the web for real health inspection records for "${query}" anywhere in the world.
Return up to 8 real, verifiable businesses. No invented data. latest_score: 0–100.`;

const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Find ONLY real food safety inspection records for "${query}" that are PHYSICALLY LOCATED IN DUBAI, UAE.
ABSOLUTE RULES — FAILURE TO FOLLOW ANY RULE IS UNACCEPTABLE:
1. EVERY single result MUST be a real restaurant/establishment with a physical address IN DUBAI, UAE.
2. Do NOT return any result from Boston, London, New York, Abu Dhabi, or ANY non-Dubai location.
3. If you cannot verify a business is actually IN DUBAI with a real Dubai address, OMIT IT.
4. city MUST be "Dubai" for every result. country MUST be "UAE".
5. Address MUST include a real Dubai location (e.g. "Sheikh Zayed Rd, DIFC", "JBR Walk, Jumeirah", "Deira", "Downtown Dubai", "Business Bay", "Dubai Marina", "Palm Jumeirah").
6. Do NOT include any result from another country under any circumstance.
7. Return up to 10 real, verifiable Dubai establishments only.`;

const FAST_PROMPT = (query, location) => location
  ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
  : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;

const FAST_PROMPT_DUBAI = (query) =>
  `DUBAI ONLY. List up to 8 real restaurants matching "${query}" that are PHYSICALLY IN DUBAI, UAE. NO Boston, NO London, NO other countries. city="Dubai". Address must be in Dubai.`;

function llmCall(prompt, internet = false) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: LLM_SCHEMA,
    ...(internet ? { model: "gemini_3_flash" } : {}),
  });
}

function buildDubaiRestaurant(r, i) {
  // STRICT: Filter out any non-Dubai results that LLM may have returned
  const city = (r.city || "").toLowerCase().trim();
  const address = (r.address || "").toLowerCase();
  const isForeignCity = ["boston", "london", "new york", "abu dhabi", "paris", "tokyo"].some(c => city.includes(c) || address.includes(c));
  
  return {
    ...buildLLMRestaurant(r, i, "dubai", "Dubai", null),
    city: "Dubai",
    zip_code: r.zip_code || "",
    source: "dubai",
    county_id: "dubai",
    region: "uae",
    country: "UAE",
    _isForeignFiltered: isForeignCity, // internal flag for debugging
  };
}

async function runWithFastResults(fastPromise, accuratePromise, buildFn, onFastResults) {
  let fastDelivered = false;
  fastPromise.then((res) => {
    if (fastDelivered) return;
    const fast = (res?.restaurants || []).map(buildFn);
    if (fast.length > 0 && onFastResults) { fastDelivered = true; onFastResults(fast); }
  }).catch(() => {});
  const result = await accuratePromise;
  fastDelivered = true;
  return (result?.restaurants || []).map(buildFn);
}

export async function search({ query, countyId, locationLabel, today, signal, onFastResults }) {
  // Live government API
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    const raw = await fetch(buildSearchUrl(entry, query), signal ? { signal } : {}).then(r => r.json());
    return { results: PROCESSORS[countyId].process(Array.isArray(raw) ? raw : []), isAI: false };
  }

  // Dubai — fully isolated path
  if (countyId === "dubai") {
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT_DUBAI(query), false),
      llmCall(PROMPT_DUBAI(query, today), true),
      (r, i) => buildDubaiRestaurant(r, i),
      onFastResults
    );
    // FINAL FILTER: Remove any non-Dubai establishments that slipped through
    const filtered = restaurants.filter(r => !r._isForeignFiltered);
    return { results: filtered.length > 0 ? filtered : restaurants, isAI: true };
  }

  // AI global/location search
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today), true),
    (r, i) => buildLLMRestaurant(r, i, countyId, location || "", null),
    onFastResults
  );
  return { results: restaurants, isAI: true };
}

export async function fetchDetail(restaurant) {
  const { source, business_id, isLLMData } = restaurant;
  if (isLLMData || source === "dubai" || source === "llm") return llmToDetailRows(restaurant);

  const countyId = SOURCE_TO_COUNTY[source] || source;
  const entry = API_REGISTRY[countyId];
  if (!entry) return [];

  const data = await fetch(buildDetailUrl(entry, business_id)).then(r => r.json());
  const rows = Array.isArray(data) ? data : [];
  if (countyId === "king") return rows;
  return PROCESSORS[countyId].toDetailRows(rows);
}