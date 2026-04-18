/**
 * SafeEats Search Engine
 * ──────────────────────
 * Single entry-point for all inspection data fetching.
 * Handles live-API counties, AI-assisted global search, and caching.
 *
 * Usage:
 *   import { search, fetchDetail } from "@/utils/searchEngine";
 *
 *   const results = await search({ query, countyId, locationLabel, today, signal });
 *   const rows    = await fetchDetail({ restaurant, signal });
 */

import { base44 } from "@/api/base44Client";
import { API_REGISTRY, LIVE_API_IDS, buildSearchUrl, buildDetailUrl } from "./apiRegistry";
import {
  processKingCountyResults,
  processNYCResults,
  processChicagoResults,
  processMontgomeryResults,
  processAustinResults,
  processSFResults,
  processLAResults,
  nycToDetailRows,
  chicagoToDetailRows,
  montgomeryToDetailRows,
  austinToDetailRows,
  sfToDetailRows,
  laToDetailRows,
  llmToDetailRows,
  buildLLMRestaurant,
} from "./inspectionProcessors";

// ── Processor map: countyId → { process, toDetailRows } ──────────────────────
const PROCESSORS = {
  king:          { process: processKingCountyResults,   toDetailRows: null },        // king uses raw rows
  nyc:           { process: processNYCResults,          toDetailRows: nycToDetailRows },
  cook:          { process: processChicagoResults,      toDetailRows: chicagoToDetailRows },
  montgomery_md: { process: processMontgomeryResults,   toDetailRows: montgomeryToDetailRows },
  travis:        { process: processAustinResults,       toDetailRows: austinToDetailRows },
  sf:            { process: processSFResults,           toDetailRows: sfToDetailRows },
  la:            { process: processLAResults,           toDetailRows: laToDetailRows },
};

// ── LLM prompt templates ──────────────────────────────────────────────────────

const promptFor = (query, location, today) => `Today is ${today}. Search the web for real health inspection records for "${query}" in ${location}.

CRITICAL RULES — READ CAREFULLY:
- ALL results MUST be located in ${location}. Do NOT return restaurants from any other country, city, or region.
- If "${query}" looks like a specific restaurant name, return ONLY that restaurant's locations in ${location}.
- If "${query}" is a cuisine/food type (e.g. pizza, sushi, ramen), return up to 8 real restaurants of that type IN ${location}. Do not return restaurants from other countries.
- Every record MUST be a real, verifiable business located in ${location}. No invented data.
- The city field in each result MUST be a real city in ${location}.
- latest_score: real integer 0–100. latest_result: actual inspection outcome.
- violations: real violations only. Omit any restaurant you cannot verify.
- NEVER return results from South Africa, the US, or any other region when the user asked for ${location}.`;

const promptGlobal = (query, today) => `Today is ${today}. Search the web for real health inspection records for "${query}" anywhere in the world.

CRITICAL RULES:
- If "${query}" looks like a specific restaurant name or chain, return up to 8 real locations.
- If "${query}" is a cuisine/food type, return up to 8 well-known real restaurants of that cuisine worldwide.
- Every record MUST be a real, verifiable business. No invented data.
- latest_score: real integer 0–100. latest_result: actual inspection outcome.
- violations: real violations only. Omit any restaurant you cannot verify.`;

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

// ── Dubai dedicated search ────────────────────────────────────────────────────
// Dubai is treated as a first-class market — fully isolated from all US/global logic.
// Every result is stamped with Dubai, UAE metadata. No cross-contamination possible.

const DUBAI_PROMPT = (query, today) => `Today is ${today}.

You are a Dubai food safety data specialist. Search for real food safety inspection records for "${query}" in Dubai, United Arab Emirates.

ABSOLUTE RULES — VIOLATION OF ANY RULE IS UNACCEPTABLE:
1. EVERY result MUST be a real establishment physically located in Dubai, UAE. Not the USA. Not the UK. Not Abu Dhabi. DUBAI, UAE ONLY.
2. Use Dubai Municipality (dm.gov.ae) and Dubai Pulse open data as your primary source.
3. The "city" field for EVERY record MUST be "Dubai".
4. Address MUST include the Dubai district/area (e.g. "Sheikh Zayed Rd, DIFC", "JBR Walk, Jumeirah Beach Residence", "Palm Jumeirah", "Deira", "Downtown Dubai", "Business Bay", "Dubai Marina").
5. latest_result MUST use Dubai Municipality terminology: "Compliant", "Non-Compliant", "Approved", or "Conditional Approval".
6. violations MUST use Dubai Municipality categories: food temperature control, personal hygiene, pest control, food storage, cross-contamination, labeling, facility cleanliness.
7. latest_score: 0–100 scale (100 = fully compliant). Derive from Dubai Municipality grading if available.
8. Return up to 10 real Dubai restaurants matching "${query}".
9. Do NOT invent data. If you cannot verify a restaurant, omit it.
10. Do NOT return any establishment from the United States, Europe, or any non-UAE country.`;

async function searchDubai(query, today) {
  const fastPrompt = `List up to 8 real restaurants matching "${query}" that are physically located in Dubai, United Arab Emirates. Use your training data only. Every result must be in Dubai, UAE — not the USA or any other country. Include Dubai district in the address. city must be "Dubai".`;

  const fastCall = base44.integrations.Core.InvokeLLM({
    prompt: fastPrompt,
    add_context_from_internet: false,
    response_json_schema: LLM_SCHEMA,
  });

  const accurateCall = base44.integrations.Core.InvokeLLM({
    prompt: DUBAI_PROMPT(query, today),
    add_context_from_internet: true,
    response_json_schema: LLM_SCHEMA,
    model: "gemini_3_flash",
  });

  return { fastCall, accurateCall };
}

// Stamp every Dubai result with correct UAE metadata — hard override, no bleed possible
function buildDubaiRestaurant(r, index) {
  const base = buildLLMRestaurant(r, index, "dubai", "Dubai", null);
  // Force-override every location field — no US city can ever appear
  return {
    ...base,
    city: "Dubai",
    zip_code: r.zip_code || "",
    source: "dubai",
    county_id: "dubai",
    region: "uae",
    country: "UAE",
  };
}

// ── Main search function ──────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}  opts.query         – the search term
 * @param {string}  opts.countyId      – e.g. "nyc", "king", "dubai", "global"
 * @param {string}  opts.locationLabel – human-readable city label for AI prompt
 * @param {string}  opts.today         – formatted date string for AI prompt
 * @param {AbortSignal} [opts.signal]  – optional AbortController signal
 * @param {function} [opts.onFastResults] – called with fast/preliminary results before accurate ones arrive
 * @returns {Promise<{ results: object[], isAI: boolean, isAccurate: boolean }>}
 */
export async function search({ query, countyId, locationLabel, today, signal, onFastResults }) {
  const safeFetch = (url) => fetch(url, signal ? { signal } : {}).then((r) => r.json());

  // ── Live government API (US counties) ────────────────────────────────────
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    const proc  = PROCESSORS[countyId];
    const url   = buildSearchUrl(entry, query);
    const raw   = await safeFetch(url);
    return { results: proc.process(Array.isArray(raw) ? raw : []), isAI: false, isAccurate: true };
  }

  // ── Dubai — fully isolated, first-class dedicated search path ─────────────
  // Dubai is NEVER routed through US logic or generic global AI search.
  if (countyId === "dubai") {
    const { fastCall, accurateCall } = await searchDubai(query, today);

    let fastDelivered = false;
    fastCall.then((fastResult) => {
      if (fastDelivered) return;
      const fast = (fastResult?.restaurants || []).map((r, i) => buildDubaiRestaurant(r, i));
      if (fast.length > 0 && onFastResults) {
        fastDelivered = true;
        onFastResults(fast);
      }
    }).catch(() => {});

    const result = await accurateCall;
    fastDelivered = true;

    const restaurants = (result?.restaurants || []).map((r, i) => buildDubaiRestaurant(r, i));
    return { results: restaurants, isAI: true, isAccurate: true };
  }

  // ── AI-assisted search (all other international cities/countries) ─────────
  const location = locationLabel && locationLabel.trim() !== "" && locationLabel !== "Worldwide (AI Search)"
    ? locationLabel.trim()
    : null;

  const prompt = location ? promptFor(query, location, today) : promptGlobal(query, today);
  const fastPrompt = location
    ? `List up to 8 real restaurants matching "${query}" located in ${location}. IMPORTANT: Only return restaurants physically located in ${location} — not from any other country or region. Use your training data only. Include any known health inspection scores/grades if you have them.`
    : `List up to 8 real restaurants matching "${query}" anywhere in the world. Use your training data only. Include any known health inspection scores/grades if you have them.`;

  const fastCall = base44.integrations.Core.InvokeLLM({
    prompt: fastPrompt,
    add_context_from_internet: false,
    response_json_schema: LLM_SCHEMA,
  });

  const accurateCall = base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: LLM_SCHEMA,
    model: "gemini_3_flash",
  });

  let fastDelivered = false;

  fastCall.then((fastResult) => {
    if (fastDelivered) return;
    const fast = (fastResult?.restaurants || []).map((r, i) =>
      buildLLMRestaurant(r, i, countyId, location || "", null)
    );
    if (fast.length > 0 && onFastResults) {
      fastDelivered = true;
      onFastResults(fast);
    }
  }).catch(() => {});

  const result = await accurateCall;
  fastDelivered = true;

  const restaurants = (result?.restaurants || []).map((r, i) =>
    buildLLMRestaurant(r, i, countyId, location || "", null)
  );
  return { results: restaurants, isAI: true, isAccurate: true };
}

// ── Detail fetcher ────────────────────────────────────────────────────────────

/**
 * Fetch full inspection history for a single restaurant.
 * @param {object} restaurant – a result object from search()
 * @returns {Promise<object[]>} – normalized detail rows for InspectionDetail
 */
export async function fetchDetail(restaurant) {
  const { source, business_id, isLLMData } = restaurant;

  // Dubai and all AI/LLM data — build rows from embedded data, never hit a US API
  if (isLLMData || source === "dubai" || source === "llm") return llmToDetailRows(restaurant);

  const countyId = sourceToCountyId(source);
  const entry    = API_REGISTRY[countyId];
  if (!entry) return [];

  const url  = buildDetailUrl(entry, business_id);
  const data = await fetch(url).then((r) => r.json());
  const rows = Array.isArray(data) ? data : [];

  const proc = PROCESSORS[countyId];

  // King County passes raw rows directly to InspectionDetail
  if (countyId === "king") return rows;

  return proc.toDetailRows(rows);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceToCountyId(source) {
  const map = {
    king: "king", nyc: "nyc", chicago: "cook",
    montgomery: "montgomery_md", austin: "travis",
    sf: "sf", la: "la",
    dubai: "dubai",
    llm: "llm",
  };
  return map[source] || source;
}