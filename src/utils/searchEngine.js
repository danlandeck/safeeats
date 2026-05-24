/**
 * searchEngine.js — City-isolated restaurant search
 *
 * Architecture: ONE function per city. The dispatcher (searchRestaurants) calls
 * EXACTLY ONE fetch function based on the selected city. No Promise.all across
 * multiple cities. No merging. No cross-city results. Ever.
 */

import { base44 } from "@/api/base44Client";
import { API_REGISTRY, buildDetailUrl } from "./apiRegistry";
import {
  processKingCountyResults, processNYCResults, processChicagoResults,
  processAustinResults, processSFResults,
  nycToDetailRows, chicagoToDetailRows, montgomeryToDetailRows,
  austinToDetailRows, sfToDetailRows, laToDetailRows,
  llmToDetailRows, buildLLMRestaurant,
  processUKFSAResults, ukFSAToDetailRows,
  processDelawareResults, delawareToDetailRows,
  processNYStateResults, nyStateToDetailRows,
  processTorontoResults, torontoToDetailRows,
} from "./inspectionProcessors";

// ─── Proxy API ────────────────────────────────────────────────────────────────
// All live city searches go through a single proxy endpoint.
// ONE city key per call — never multiple cities simultaneously.

const PROXY_BASE = 'https://safeeats-proxy.vercel.app/api/search';

/**
 * Normalize a proxy result into the app's standard Restaurant shape.
 */
function normalizeProxyResult(r, city) {
  const score = typeof r.inspection_score === 'number' ? r.inspection_score : parseFloat(r.inspection_score || 0);
  const grade = r.grade || (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : score > 0 ? 'F' : 'U');
  return {
    business_id: r.id || `${city}-${r.name}-${r.address}`,
    name: r.name || '',
    address: r.address || '',
    city: r.city || '',
    zip_code: r.zip || '',
    phone: r.phone || '',
    latitude: r.lat || null,
    longitude: r.lng || null,
    description: r.description || '',
    source: city,
    county_id: city,
    safetyScore: score || null,
    grade,
    totalInspections: 1,
    latestDate: r.inspection_date || '',
    latestResult: r.inspection_result || '',
    violation_description: r.violation_description || '',
    violation_points: r.violation_points || 0,
    isLLMData: false,
  };
}

/**
 * Single dispatcher — calls ONLY the proxy for the selected city.
 * One city key per call. No merging across cities.
 */
async function searchRestaurants(city, query) {
  const url = `${PROXY_BASE}?city=${encodeURIComponent(city)}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
  const json = await res.json();
  return (json.results || []).map(r => normalizeProxyResult(r, city));
}

// ─── countyId → city key ──────────────────────────────────────────────────────
const COUNTY_TO_CITY = {
  king:          'seattle',
  nyc:           'nyc',
  cook:          'chicago',
  travis:        'austin',
  sf:            'sf',
  la:            'la',
  montgomery_md: 'montgomery',
};

// ─── LLM helpers (AI / Dubai paths) ──────────────────────────────────────────
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
          latest_date:            { type: "string" },
          latest_result:          { type: "string" },
          total_inspections:      { type: "number" },
          violations:             { type: "array", items: { type: "string" } },
          cuisine:                { type: "string" },
          is_vegan_friendly:      { type: "boolean" },
          is_vegetarian_friendly: { type: "boolean" },
          is_kosher:              { type: "boolean" },
          is_halal:               { type: "boolean" },
          is_gluten_free_options: { type: "boolean" },
          dietary_tags:           { type: "array", items: { type: "string" } },
          ada_compliance:         { type: "string", enum: ["accessible", "partially_accessible", "not_accessible", "unknown"] },
        },
      },
    },
  },
};

function llmCall(prompt, internet = false) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: LLM_SCHEMA,
    ...(internet ? { model: "gemini_3_flash" } : {}),
  });
}

const DUBAI_VALID_MARKERS = ["jumeirah", "deira", "bur dubai", "marina", "downtown dubai", "jbr", "difc", "business bay", "palm jumeirah", "sheikh zayed", "dubai", "uae"];
const DUBAI_BLOCKED = ["miami", "boston", "chicago", "los angeles", "san francisco", "austin", "seattle", "london", "paris", "tokyo", "abu dhabi", "sharjah", "new york"];

function isDubaiLocation(city, address) {
  const c = (city || '').toLowerCase();
  const a = (address || '').toLowerCase();
  if (DUBAI_BLOCKED.some(b => c.includes(b) || a.includes(b))) return false;
  return (c === 'dubai' || c.startsWith('dubai,')) && DUBAI_VALID_MARKERS.some(m => a.includes(m));
}

// ─── Main search export ───────────────────────────────────────────────────────
export async function search({ query, countyId, locationLabel, today, signal, onFastResults, onCountUpdate }) {
  // UK FSA — backend proxy
  if (countyId === "uk_fsa") {
    const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
    return { results: processUKFSAResults(res.data?.establishments || []), isAI: false };
  }

  // Toronto DineSafe — backend proxy
  if (countyId === "toronto") {
    const res = await base44.functions.invoke("torontoDineSafe", { action: "search", name: query });
    return { results: processTorontoResults(res.data?.records || []), isAI: false };
  }

  // Live city API — single isolated dispatch
  const city = COUNTY_TO_CITY[countyId];
  if (city) {
    try {
      const results = await searchRestaurants(city, query);
      return { results, isAI: false };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      return {
        results: [],
        isAI: false,
        error: `The ${city} health inspection database is temporarily unavailable. Please try again.`,
      };
    }
  }

  // Dubai — LLM isolated path
  if (countyId === "dubai") {
    const today_ = today || new Date().toISOString().split('T')[0];
    const prompt = `Today is ${today_}. Find ONLY real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE. city MUST be exactly "Dubai". ZERO results from outside Dubai.`;
    const res = await llmCall(prompt, true);
    const restaurants = (res?.restaurants || [])
      .filter(r => isDubaiLocation(r.city, r.address))
      .map((r, i) => ({ ...buildLLMRestaurant(r, i, 'dubai', 'Dubai', null), city: 'Dubai' }));
    return { results: restaurants, isAI: true };
  }

  // AI global / location fallback
  const today_ = today || new Date().toISOString().split('T')[0];
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  const prompt = location
    ? `Today is ${today_}. Search for real health inspection records for "${query}" in ${location} ONLY. Every result city MUST match ${location}. Return up to 8 verified results.`
    : `Today is ${today_}. Search for real health inspection records for "${query}" anywhere. Return up to 8 real results.`;
  const res = await llmCall(prompt, true);
  const restaurants = (res?.restaurants || []).map((r, i) => buildLLMRestaurant(r, i, countyId, location || '', null));
  return { results: restaurants, isAI: true };
}

// ─── Detail fetch (unchanged) ─────────────────────────────────────────────────
const SOURCE_TO_COUNTY = {
  king: "king", nyc: "nyc", chicago: "cook",
  montgomery: "montgomery_md", austin: "travis",
  sf: "sf", la: "la", dubai: "dubai", llm: "llm",
  uk_fsa: "uk_fsa", delaware: "delaware",
  ny_state: "ny_state", toronto: "toronto",
};

const DETAIL_PROCESSORS = {
  nyc:           nycToDetailRows,
  cook:          chicagoToDetailRows,
  montgomery_md: montgomeryToDetailRows,
  travis:        austinToDetailRows,
  sf:            sfToDetailRows,
  la:            laToDetailRows,
  delaware:      delawareToDetailRows,
  ny_state:      nyStateToDetailRows,
  toronto:       torontoToDetailRows,
};

export async function fetchDetail(restaurant) {
  const { source, business_id, isLLMData } = restaurant;
  if (isLLMData || source === "dubai" || source === "llm") return llmToDetailRows(restaurant);

  if (source === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "detail", establishmentId: business_id });
      return torontoToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  if (source === "uk_fsa") {
    try {
      const res = await base44.functions.invoke("ukFoodRatings", { action: "detail", fhrsId: restaurant.fhrsId });
      const descriptors = res.data?.scoreDescriptors || [];
      if (descriptors.length > 0) {
        return descriptors.map((d, i) => ({
          inspection_serial_num: `uk-${restaurant.fhrsId}-${i}`,
          inspection_date: restaurant.latestDate,
          inspection_score: String(d.Score || 0),
          inspection_result: restaurant.latestResult || '',
          inspection_type: 'Food Hygiene Rating (FSA)',
          violation_description: `${d.ScoreCategory}: ${d.Description || (d.Score > 0 ? 'Improvement required' : 'Very good')}`,
          violation_type: d.Score > 15 ? 'RED' : 'BLUE',
          violation_points: String(d.Score || 0),
        }));
      }
    } catch {}
    return ukFSAToDetailRows(restaurant);
  }

  const countyId = SOURCE_TO_COUNTY[source] || source;
  const entry = API_REGISTRY[countyId];
  if (!entry) return [];

  if (countyId === "delaware") {
    const [restname, ...addrParts] = business_id.split("-");
    const restaddress = addrParts.join("-");
    const url = `${entry.endpoint}?$where=upper(restname)='${encodeURIComponent((restname || "").toUpperCase())}' AND upper(restaddress)='${encodeURIComponent((restaddress || "").toUpperCase())}'&$limit=500&$order=${entry.dateField} DESC`;
    const data = await fetch(url).then(r => r.json());
    return delawareToDetailRows(Array.isArray(data) ? data : []);
  }

  const data = await fetch(buildDetailUrl(entry, business_id)).then(r => r.json());
  const rows = Array.isArray(data) ? data : [];
  if (countyId === "king") return rows;
  return DETAIL_PROCESSORS[countyId] ? DETAIL_PROCESSORS[countyId](rows) : rows;
}