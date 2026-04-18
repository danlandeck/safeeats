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
// Dubai-specific prompt — maximizes known Dubai establishment data
const promptDubai = (query, today) => `Today is ${today}. Search the web for real food safety inspection records for "${query}" in Dubai, UAE.

CRITICAL RULES:
- ALL results MUST be physically located in Dubai, UAE. Zero exceptions.
- Dubai Municipality conducts food safety inspections. Use Dubai Pulse / dm.gov.ae / Dubai Municipality open data as primary source.
- Return up to 10 real, verifiable restaurants/food establishments in Dubai matching "${query}".
- latest_score: integer 0–100 (100 = perfect). latest_result: "Compliant", "Non-Compliant", "Pass", or "Approved" as used by Dubai Municipality.
- violations: use the Dubai Municipality violation categories (food temperature, hygiene, storage, pest control, labeling, staff hygiene).
- total_inspections: how many Dubai Municipality inspections are on record.
- Include district/area in the address (e.g. "Sheikh Zayed Rd, DIFC", "JBR Walk, Jumeirah Beach Residence", "The Palm Jumeirah").
- Do NOT return results from Abu Dhabi, Sharjah, or any other emirate unless explicitly asked.`;

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

// ── Main search function ──────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string}  opts.query         – the search term
 * @param {string}  opts.countyId      – e.g. "nyc", "king", "global"
 * @param {string}  opts.locationLabel – human-readable city label for AI prompt
 * @param {string}  opts.today         – formatted date string for AI prompt
 * @param {AbortSignal} [opts.signal]  – optional AbortController signal
 * @param {function} [opts.onFastResults] – called with fast/preliminary results before accurate ones arrive
 * @returns {Promise<{ results: object[], isAI: boolean, isAccurate: boolean }>}
 */
export async function search({ query, countyId, locationLabel, today, signal, onFastResults }) {
  const safeFetch = (url) => fetch(url, signal ? { signal } : {}).then((r) => r.json());

  // ── Live government API ───────────────────────────────────────────────────
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    const proc  = PROCESSORS[countyId];
    const url   = buildSearchUrl(entry, query);
    const raw   = await safeFetch(url);
    return { results: proc.process(Array.isArray(raw) ? raw : []), isAI: false, isAccurate: true };
  }

  // ── AI-assisted search (any city/country not covered by live API) ─────────
  // Always use the location if provided — never fall back to "anywhere in the world"
  // when the user has specified a location. Only use global prompt if truly no location given.
  const location = locationLabel && locationLabel.trim() !== "" && locationLabel !== "Worldwide (AI Search)"
    ? locationLabel.trim()
    : null;

  // Dubai gets a dedicated high-quality prompt with Dubai Municipality context
  const isDubai = location && /dubai/i.test(location);
  const prompt = isDubai
    ? promptDubai(query, today)
    : location ? promptFor(query, location, today) : promptGlobal(query, today);
  const fastPrompt     = location
    ? `List up to 8 real restaurants matching "${query}" located in ${location}. IMPORTANT: Only return restaurants physically located in ${location} — not from any other country or region. Use your training data only — no web search. Include any known health inspection scores/grades if you have them. Be concise.`
    : `List up to 8 real restaurants matching "${query}" anywhere in the world. Use your training data only. Include any known health inspection scores/grades if you have them.`;

  // Fire both in parallel: fast (no internet) and accurate (with internet)
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

  // Whichever resolves first gets surfaced — fast call delivers preliminary results
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

  // Always wait for accurate results
  const result = await accurateCall;
  fastDelivered = true; // suppress fast delivery once accurate arrives

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

  // LLM / AI data — build rows from embedded data
  if (isLLMData) return llmToDetailRows(restaurant);

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
  };
  return map[source] || source;
}