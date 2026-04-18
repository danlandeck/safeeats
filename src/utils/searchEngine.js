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
  `Today is ${today}. Search the web for real health inspection records for "${query}" in ${location} ONLY.
STRICT RULES:
1. EVERY result MUST have city="${location}" or a city name that starts with the same word as "${location}".
2. city field MUST match the requested location. If unsure, OMIT the result.
3. latest_score: 0–100 (real data). latest_result: real inspection outcome. violations: real only.
4. NEVER return results from outside ${location}.
5. Better to return 3 verified results than 10 with any location mismatch.`;

const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the web for real health inspection records for "${query}" anywhere in the world.
Return up to 8 real, verifiable businesses. No invented data. latest_score: 0–100.`;

const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Find ONLY real food safety inspection records for "${query}" that are PHYSICALLY LOCATED IN DUBAI, UAE.
ABSOLUTE RULES — IF YOU VIOLATE EVEN ONE, YOUR RESPONSE WILL BE REJECTED:
1. EVERY single result MUST be physically located IN DUBAI, UAE — ZERO exceptions.
2. BLOCK LIST: Do NOT return ANYTHING from Boston, London, New York, Abu Dhabi, Paris, Tokyo, Chicago, Los Angeles, San Francisco, Austin, or ANY city outside UAE.
3. WHITELIST: Address MUST mention Dubai or a Dubai neighborhood: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm Jumeirah, Sheikh Zayed Rd, etc.
4. city field MUST be "Dubai" for EVERY result. country field MUST be "UAE".
5. If you are unsure whether a business is in Dubai, OMIT IT. Better to return 2 verified results than 10 with 1 wrong city.
6. Return up to 8 real, verifiable Dubai establishments only.`;

const FAST_PROMPT = (query, location) => location
  ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
  : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;

const FAST_PROMPT_DUBAI = (query) =>
  `DUBAI ONLY — BLOCK: Boston, London, New York, Abu Dhabi, Paris, Tokyo, or ANY non-UAE city.
List up to 8 REAL restaurants matching "${query}" PHYSICALLY IN DUBAI, UAE.
city="Dubai" for ALL results. Address must mention Dubai or: Jumeirah, Deira, Marina, Downtown, JBR, DIFC, Business Bay, Palm.
If unsure, OMIT. Better to return 5 verified than 8 with errors.`;

function llmCall(prompt, internet = false) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: LLM_SCHEMA,
    ...(internet ? { model: "gemini_3_flash" } : {}),
  });
}

const FORBIDDEN_CITIES = ["boston", "london", "new york", "abu dhabi", "paris", "tokyo", "chicago", "los angeles", "san francisco", "austin"];
const DUBAI_AREAS = ["dubai", "jumeirah", "deira", "bur dubai", "marina", "downtown", "jbr", "difc", "business bay", "palm"];

function isForbiddenLocation(city, address) {
  const cityLower = (city || "").toLowerCase();
  const addressLower = (address || "").toLowerCase();
  return FORBIDDEN_CITIES.some(c => cityLower.includes(c) || addressLower.includes(c));
}

function isDubaiLocation(city, address) {
  const cityLower = (city || "").toLowerCase();
  const addressLower = (address || "").toLowerCase();
  // Must have Dubai-ness in city OR address, AND no forbidden cities
  const hasDubaiIndicator = DUBAI_AREAS.some(area => cityLower.includes(area) || addressLower.includes(area));
  const hasForbidden = isForbiddenLocation(city, address);
  return hasDubaiIndicator && !hasForbidden;
}

function buildRestaurantWithLocationCheck(r, i, countyId, location, expectedCity) {
  let isWrongLocation = false;
  
  if (countyId === "dubai") {
    // Dubai: STRICT validation — must have Dubai markers, zero forbidden cities
    isWrongLocation = !isDubaiLocation(r.city, r.address);
  } else if (expectedCity && expectedCity !== "Worldwide (AI Search)") {
    // Other cities: result city must contain first word of expected city
    const resultCityLower = (r.city || "").toLowerCase().trim();
    const expectedLower = expectedCity.toLowerCase().trim();
    const firstWord = expectedLower.split(/[\s,]+/)[0];
    isWrongLocation = firstWord.length > 2 && !resultCityLower.includes(firstWord);
  }
  
  const built = countyId === "dubai"
    ? {
        ...buildLLMRestaurant(r, i, countyId, location, null),
        city: "Dubai",
        region: "uae",
        country: "UAE",
      }
    : buildLLMRestaurant(r, i, countyId, location, null);
  
  return { ...built, _wrongLocation: isWrongLocation };
}

async function runWithFastResults(fastPromise, accuratePromise, buildFn, onFastResults) {
  let fastDelivered = false;
  fastPromise.then((res) => {
    if (fastDelivered) return;
    const fast = (res?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation);
    if (fast.length > 0 && onFastResults) { fastDelivered = true; onFastResults(fast); }
  }).catch(() => {});
  const result = await accuratePromise;
  fastDelivered = true;
  return (result?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation);
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
      (r, i) => buildRestaurantWithLocationCheck(r, i, "dubai", "Dubai", "Dubai"),
      onFastResults
    );
    return { results: restaurants, isAI: true };
  }

  // AI global/location search
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today), true),
    (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", location || ""),
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