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

CRITICAL RULES:
- If "${query}" looks like a specific restaurant name, return ONLY that restaurant's locations in ${location}.
- If "${query}" is a cuisine/food type, return up to 8 real restaurants of that type in ${location}.
- Every record MUST be a real, verifiable business. No invented data.
- Use local health department websites, state inspection databases, or Yelp health score disclosures.
- latest_score: real integer 0–100. latest_result: actual inspection outcome.
- violations: real violations only. Omit any restaurant you cannot verify.`;

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
 * @returns {Promise<{ results: object[], isAI: boolean }>}
 */
export async function search({ query, countyId, locationLabel, today, signal }) {
  const safeFetch = (url) => fetch(url, signal ? { signal } : {}).then((r) => r.json());

  // ── Live government API ───────────────────────────────────────────────────
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    const proc  = PROCESSORS[countyId];
    const url   = buildSearchUrl(entry, query);
    const raw   = await safeFetch(url);
    return { results: proc.process(Array.isArray(raw) ? raw : []), isAI: false };
  }

  // ── AI-assisted search (any city/country not covered by live API) ─────────
  const location = locationLabel && locationLabel !== "Worldwide (AI Search)"
    ? locationLabel
    : null;

  const prompt = location ? promptFor(query, location, today) : promptGlobal(query, today);
  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: LLM_SCHEMA,
    model: "gemini_3_flash",
  });

  const restaurants = (result?.restaurants || []).map((r, i) =>
    buildLLMRestaurant(r, i, countyId, location || "", null)
  );
  return { results: restaurants, isAI: true };
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