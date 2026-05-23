import { base44 } from "@/api/base44Client";
import { API_REGISTRY, LIVE_API_IDS, buildSearchUrl, buildDetailUrl } from "./apiRegistry";
import {
  processKingCountyResults, processNYCResults, processChicagoResults,
  processMontgomeryResults, processAustinResults, processSFResults, processLAResults,
  nycToDetailRows, chicagoToDetailRows, montgomeryToDetailRows,
  austinToDetailRows, sfToDetailRows, laToDetailRows,
  llmToDetailRows, buildLLMRestaurant,
  processUKFSAResults, ukFSAToDetailRows,
  processDelawareResults, delawareToDetailRows,
  processNYStateResults, nyStateToDetailRows,
  processTorontoResults, torontoToDetailRows,
} from "./inspectionProcessors";

const PROCESSORS = {
  king:          { process: processKingCountyResults,  toDetailRows: null },
  nyc:           { process: processNYCResults,         toDetailRows: nycToDetailRows },
  cook:          { process: processChicagoResults,     toDetailRows: chicagoToDetailRows },
  montgomery_md: { process: processMontgomeryResults,  toDetailRows: montgomeryToDetailRows },
  travis:        { process: processAustinResults,      toDetailRows: austinToDetailRows },
  sf:            { process: processSFResults,          toDetailRows: sfToDetailRows },
  la:            { process: processLAResults,          toDetailRows: laToDetailRows },
  delaware:      { process: processDelawareResults,    toDetailRows: delawareToDetailRows },
  ny_state:      { process: processNYStateResults,     toDetailRows: nyStateToDetailRows },
  toronto:       { process: processTorontoResults,     toDetailRows: torontoToDetailRows },
};

const SOURCE_TO_COUNTY = {
  king: "king", nyc: "nyc", chicago: "cook",
  montgomery: "montgomery_md", austin: "travis",
  sf: "sf", la: "la", dubai: "dubai", llm: "llm",
  uk_fsa: "uk_fsa", delaware: "delaware",
  ny_state: "ny_state", toronto: "toronto",
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

// US state full name → abbreviation
const STATE_ABBR = {
  "alabama":"al","alaska":"ak","arizona":"az","arkansas":"ar","california":"ca",
  "colorado":"co","connecticut":"ct","delaware":"de","florida":"fl","georgia":"ga",
  "hawaii":"hi","idaho":"id","illinois":"il","indiana":"in","iowa":"ia",
  "kansas":"ks","kentucky":"ky","louisiana":"la","maine":"me","maryland":"md",
  "massachusetts":"ma","michigan":"mi","minnesota":"mn","mississippi":"ms",
  "missouri":"mo","montana":"mt","nebraska":"ne","nevada":"nv",
  "new hampshire":"nh","new jersey":"nj","new mexico":"nm","new york":"ny",
  "north carolina":"nc","north dakota":"nd","ohio":"oh","oklahoma":"ok",
  "oregon":"or","pennsylvania":"pa","rhode island":"ri","south carolina":"sc",
  "south dakota":"sd","tennessee":"tn","texas":"tx","utah":"ut","vermont":"vt",
  "virginia":"va","washington":"wa","west virginia":"wv","wisconsin":"wi",
  "wyoming":"wy","district of columbia":"dc"
};
const ABBR_TO_STATE = Object.fromEntries(Object.entries(STATE_ABBR).map(([k,v]) => [v, k]));

/**
 * Parse a location string like "Springfield, IL" or "Austin, TX" into
 * { city: "Springfield", state: "il" }. state is null if no comma found.
 * Normalises state to lowercase 2-letter abbreviation when possible.
 */
function parseLocationParts(location) {
  if (!location) return { city: "", state: null };
  const commaIdx = location.indexOf(",");
  if (commaIdx === -1) {
    // Could be a full state name — still no city
    return { city: location.trim(), state: null };
  }
  const city = location.slice(0, commaIdx).trim();
  const stateRaw = location.slice(commaIdx + 1).trim().split(/[,\s]/)[0].trim().toLowerCase();
  // Resolve full name → abbr  ("washington" → "wa")
  const stateAbbr = STATE_ABBR[stateRaw] || (ABBR_TO_STATE[stateRaw] ? stateRaw : stateRaw);
  return { city, state: stateAbbr || null };
}

/**
 * Returns true if `text` contains the state as a whole word/token.
 * Avoids substring false-positives like "wa" matching "washington blvd".
 */
function containsStateToken(text, stateAbbr) {
  if (!text || !stateAbbr) return false;
  const t = text.toLowerCase();
  const abbr = stateAbbr.toLowerCase();
  const full = ABBR_TO_STATE[abbr] || "";
  // Match abbreviation as a standalone token (preceded/followed by non-alpha)
  const abbrRe = new RegExp(`(?:^|[^a-z])${abbr}(?:[^a-z]|$)`);
  return abbrRe.test(t) || (full.length > 2 && t.includes(full));
}

/**
 * Hard-filter AI results: keep only restaurants whose city AND state match.
 * City must match. State: only REJECT when a DIFFERENT state is explicitly
 * found in the data (e.g. ", CA" in the address when Seattle, WA expected).
 * Never requires confirmation of the expected state — a result with city="Seattle"
 * and no state in its address is ACCEPTED, not rejected.
 */
function hardFilterByLocation(results, locationLabel) {
  if (!locationLabel || locationLabel === "Worldwide (AI Search)") return results;
  const { city: expectedCity, state: expectedState } = parseLocationParts(locationLabel);
  if (!expectedCity || expectedCity.length < 2) return results;
  const expectedCityLow = expectedCity.toLowerCase();

  return results.filter(r => {
    const cityLow = (r.city    || "").toLowerCase().trim();
    const addrLow = (r.address || "").toLowerCase();

    // Primary: city must appear in city field OR address
    const cityOk = cityLow === expectedCityLow ||
                   cityLow.startsWith(expectedCityLow + ",") ||
                   cityLow.startsWith(expectedCityLow + " ") ||
                   cityLow.includes(expectedCityLow) ||
                   addrLow.includes(expectedCityLow);
    if (!cityOk) return false;

    // Secondary: reject only if a DIFFERENT US state abbreviation is found
    // Pattern looks for ", XX" (comma + 2-letter abbr) in city+address
    if (expectedState) {
      const combined = cityLow + " " + addrLow;
      const statePattern = /,\s*([a-z]{2})\b/g;
      let m;
      while ((m = statePattern.exec(combined)) !== null) {
        const found = m[1];
        // Only care about real US state abbreviations
        if (ABBR_TO_STATE[found] && found !== expectedState) {
          return false; // conflicting state found — reject
        }
      }
    }

    return true;
  });
}

const PROMPT_LOCATION = (query, location, today) => {
  const { city, state } = parseLocationParts(location);
  const stateClause = state
    ? `\nSTATE ENFORCEMENT: Results MUST be in state "${(ABBR_TO_STATE[state] || state).toUpperCase()}" (abbreviation: ${state.toUpperCase()}). A restaurant with the same name in ANY other state is FORBIDDEN and must be OMITTED.`
    : "";
  return `Today is ${today}. Search the web for real health inspection records for "${query}" in ${location} ONLY.${stateClause}
STRICT RULES:
1. EVERY result MUST be physically located in ${city}${state ? `, ${state.toUpperCase()}` : ""}. Any result from another city or state is REJECTED.
2. The city field MUST be "${city}" (or a neighbourhood within ${city}). If unsure, OMIT the result.
3. latest_score: 0–100 (real data). latest_result: real inspection outcome. violations: real only.
4. NEVER return results from outside ${location}.
5. Better to return 0 verified results than 1 wrong-location result.
6. For each restaurant, identify: cuisine type, is_vegan_friendly, is_vegetarian_friendly, is_kosher, is_halal, is_gluten_free_options, dietary_tags, and ADA compliance status.`;
};

const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the web for real health inspection records for "${query}" anywhere in the world.
Return up to 8 real, verifiable businesses. No invented data. latest_score: 0–100.
For each restaurant, identify: cuisine type, is_vegan_friendly, is_vegetarian_friendly, is_kosher, is_halal, is_gluten_free_options, dietary_tags, and ADA compliance status (accessible/partially_accessible/not_accessible/unknown).`;

const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Find ONLY real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE.
ZERO TOLERANCE RULES:
1. BLOCK EVERYTHING: Miami, New York, Boston, Chicago, Los Angeles, San Francisco, Austin, London, Paris, Tokyo, Abu Dhabi, Sharjah — ANY US city or non-UAE location = REJECTED.
2. city MUST be exactly "Dubai" for EVERY result.
3. Address MUST include: Jumeirah, Deira, Bur Dubai, Marina, Downtown Dubai, JBR, DIFC, Business Bay, Palm Jumeirah, Sheikh Zayed, or "Dubai, UAE".
4. Verify EVERY result is actually in Dubai before returning it. If unsure = OMIT.
5. Return max 8 real verified Dubai restaurants only. ZERO results from outside Dubai.`;

const FAST_PROMPT = (query, location) => location
  ? `List up to 8 real restaurants matching "${query}" physically located in ${location}. Training data only. ONLY results in ${location} — zero results from other cities or states.`
  : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;

const FAST_PROMPT_DUBAI = (query) =>
  `DUBAI ONLY. REJECT: Miami, Boston, New York, Chicago, LA, SF, Austin, London, Paris, Tokyo, Abu Dhabi, any US city.
List ONLY restaurants in DUBAI, UAE. city="Dubai" ALWAYS. Address: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, Dubai.
Return max 8. If unsure = OMIT. ZERO non-Dubai results.`;

/**
 * Post-fetch relevance filter: ensures search results actually match the query name.
 * Strategy:
 *   - If query is short (<=2 chars), keep all results (avoid filtering "DQ" or "AM/PM" etc)
 *   - For multi-word queries: every word must appear somewhere in the name
 *   - For single-word queries: word must appear as substring in name
 *   - Punctuation in either is normalized away
 *   - Always case-insensitive
 *   - If filter would remove ALL results, return original list (fail-open — better to show
 *     too many results than zero)
 */
function filterByNameRelevance(results, query) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const cleanQuery = (query || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (cleanQuery.length <= 2) return results;

  const queryWords = cleanQuery.split(" ").filter(w => w.length >= 2);
  if (queryWords.length === 0) return results;

  const filtered = results.filter(r => {
    const cleanName = (r.name || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleanName) return false;
    return queryWords.every(w => cleanName.includes(w));
  });

  // Fail-open: if filtering removes everything, return original list
  return filtered.length > 0 ? filtered : results;
}

async function llmCall(prompt, internet = false) {
  if (!internet) {
    // Training-data-only call: can use response_json_schema directly
    return base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: LLM_SCHEMA,
    });
  }

  // Two-step approach: Gemini does not allow add_context_from_internet + response_json_schema together.
  // Step 1 — Web search: get raw text from the internet (no JSON schema)
  const rawText = await base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    model: "gemini_3_flash",
  });

  if (!rawText || typeof rawText !== "string" || rawText.trim().length < 10) {
    return { restaurants: [] };
  }

  // Step 2 — Format: parse the raw text into structured JSON (no internet)
  const formatPrompt = `You are a data formatter. Convert the following restaurant health inspection information into structured JSON.
Only include restaurants with real data from the text below. Do not invent any data.
If a field is unknown, use null or omit it.

RAW DATA:
${rawText}`;

  const structured = await base44.integrations.Core.InvokeLLM({
    prompt: formatPrompt,
    add_context_from_internet: false,
    response_json_schema: LLM_SCHEMA,
  });

  return structured || { restaurants: [] };
}

// EXHAUSTIVE forbidden locations
// Dubai location filter — restaurants outside Dubai must be rejected.
// Three lists of forbidden tokens, deduplicated and de-collided.
const US_CITIES = ["miami", "boston", "chicago", "los angeles", "san francisco", "austin", "seattle", "denver", "atlanta", "dallas", "houston", "phoenix", "orlando", "las vegas", "philadelphia"];
const US_STATES = ["florida", "new york", "massachusetts", "illinois", "california", "texas", "colorado", "georgia", "nevada", "pennsylvania", "washington dc"];
const NON_DUBAI = ["london", "paris", "tokyo", "abu dhabi", "dubai creek", "ras al khaimah", "fujairah", "umm al quwain", "ajman", "sharjah"];
// Deduplicate just in case any tokens overlap across lists
const ALL_FORBIDDEN = [...new Set([...US_CITIES, ...US_STATES, ...NON_DUBAI])];

function isDubaiLocation(city, address) {
  const cityLower = (city || "").toLowerCase().trim();
  const addressLower = (address || "").toLowerCase();
  
  // REJECT if any forbidden location found
  if (ALL_FORBIDDEN.some(f => cityLower.includes(f) || addressLower.includes(f))) {
    return false;
  }
  
  // ACCEPT only if city is "dubai" AND address has Dubai marker
  const isDubaiCity = cityLower === "dubai" || cityLower.startsWith("dubai,");
  const hasDubaiAddress = ["jumeirah", "deira", "bur dubai", "marina", "downtown dubai", "jbr", "difc", "business bay", "palm jumeirah", "sheikh zayed", "dubai", "uae"].some(m => addressLower.includes(m));
  
  return isDubaiCity && hasDubaiAddress;
}

function buildRestaurantWithLocationCheck(r, i, countyId, location, expectedCity) {
  if (countyId === "dubai") {
    const isWrongLocation = !isDubaiLocation(r.city, r.address);
    if (isWrongLocation) {
      const built = buildLLMRestaurant(r, i, countyId, location, null);
      return { ...built, _wrongLocation: true };
    }
    const built = {
      ...buildLLMRestaurant(r, i, countyId, location, null),
      city: "Dubai", region: "uae", country: "UAE",
    };
    return { ...built, _wrongLocation: false };
  }
  // For non-Dubai: build first, then attach _wrongLocation for later filtering
  const built = buildLLMRestaurant(r, i, countyId, location, null);
  // _wrongLocation is evaluated lazily by hardFilterByLocation — just pass through
  return { ...built, _wrongLocation: false };
}

async function runWithFastResults(fastPromise, accuratePromise, buildFn, onFastResults, isDubaiSearch = false, locationLabel = "") {
  let fastDelivered = false;
  fastPromise.then((res) => {
    if (fastDelivered) return;
    let fast = (res?.restaurants || []).map(buildFn);
    if (isDubaiSearch) fast = fast.filter(r => isDubaiLocation(r.city, r.address));
    else if (locationLabel) fast = hardFilterByLocation(fast, locationLabel);
    if (fast.length > 0 && onFastResults) { fastDelivered = true; onFastResults(fast); }
  }).catch(() => {});
  const result = await accuratePromise;
  fastDelivered = true;
  let restaurants = (result?.restaurants || []).map(buildFn);
  if (isDubaiSearch) restaurants = restaurants.filter(r => isDubaiLocation(r.city, r.address));
  else if (locationLabel) restaurants = hardFilterByLocation(restaurants, locationLabel);
  return restaurants;
}

export async function search({ query, countyId, locationLabel, today, signal, onFastResults, onCountUpdate }) {
  // UK FSA live API (requires backend proxy for header injection)
  if (countyId === "uk_fsa") {
    const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
    const establishments = res.data?.establishments || [];
    return { results: processUKFSAResults(establishments), isAI: false };
  }

  // Toronto DineSafe (CKAN — needs backend proxy)
  if (countyId === "toronto") {
    const res = await base44.functions.invoke("torontoDineSafe", { action: "search", name: query });
    const records = res.data?.records || [];
    return { results: processTorontoResults(records), isAI: false };
  }

  // Live government API
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    let raw;
    try {
      raw = await fetch(buildSearchUrl(entry, query), signal ? { signal } : {}).then(r => r.json());
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") throw fetchErr;
      // CORS or network error — fall through to AI search below
      console.warn(`Live API fetch failed for ${countyId}, falling back to AI search:`, fetchErr.message);
      raw = null;
    }
    if (raw !== null) {
      const allResults = PROCESSORS[countyId].process(Array.isArray(raw) ? raw : []);

      // Post-fetch relevance filter: keep only results whose name actually matches the query.
      const results = filterByNameRelevance(allResults, query);

      // Background-fetch true inspection counts and fire onCountUpdate per business
      if (onCountUpdate && countyId !== "delaware") {
        results.forEach(async (biz) => {
          try {
            const countUrl = `${entry.endpoint}?$select=${entry.dateField}&${entry.idField}=${biz.business_id}&$limit=500&$order=${entry.dateField} DESC`;
            const rows = await fetch(countUrl, signal ? { signal } : {}).then(r => r.json());
            // Don't update if search was aborted
            if (signal?.aborted) return;
            if (!Array.isArray(rows) || rows.length === 0) return;
            const keys = new Set(rows.map(row => {
              const v = row[entry.dateField];
              return v ? v.split("T")[0] : null;
            }).filter(Boolean));
            const trueCount = keys.size;
            if (trueCount > biz.totalInspections) {
              onCountUpdate(biz.business_id, trueCount);
            }
          } catch (err) {
            // silently ignore background count errors (including AbortError)
          }
        });
      }

      return { results, isAI: false };
    }
    // raw was null (network/CORS failure) — fall through to AI search
  }

  // Dubai — fully isolated path
  if (countyId === "dubai") {
    try {
      const restaurants = await runWithFastResults(
        llmCall(FAST_PROMPT_DUBAI(query), false),
        llmCall(PROMPT_DUBAI(query, today), true),
        (r, i) => buildRestaurantWithLocationCheck(r, i, "dubai", "Dubai", "Dubai"),
        onFastResults,
        true  // isDubaiSearch flag for aggressive filtering
      );
      return { results: restaurants, isAI: true };
    } catch (err) {
      console.warn("Dubai AI search failed:", err?.message || err);
      return { results: [], isAI: true };
    }
  }

  // AI global/location search
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  // Include city+state in the query text itself so the LLM has no ambiguity
  const augmentedQuery = location ? `${query} in ${location}` : query;
  try {
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT(augmentedQuery, location), false),
      llmCall(location ? PROMPT_LOCATION(augmentedQuery, location, today) : PROMPT_GLOBAL(query, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", location || ""),
      onFastResults,
      false,
      location || ""
    );
    return { results: restaurants, isAI: true };
  } catch (err) {
    console.warn("AI search failed:", err?.message || err);
    return { results: [], isAI: true };
  }
}

export async function fetchDetail(restaurant) {
  const { source, business_id, isLLMData } = restaurant;
  if (isLLMData || source === "dubai" || source === "llm") return llmToDetailRows(restaurant);

  // Toronto DineSafe — CKAN detail fetch
  if (source === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "detail", establishmentId: business_id });
      const records = res.data?.records || [];
      return torontoToDetailRows(records);
    } catch { return []; }
  }

  // UK FSA — use score descriptor endpoint
  if (source === "uk_fsa") {
    try {
      const res = await base44.functions.invoke("ukFoodRatings", { action: "detail", fhrsId: restaurant.fhrsId });
      const descriptors = res.data?.scoreDescriptors || [];
      // Build detail rows from score descriptors
      if (descriptors.length > 0) {
        return descriptors.map((d, i) => ({
          inspection_serial_num: `uk-${restaurant.fhrsId}-${i}`,
          inspection_date: restaurant.latestDate,
          inspection_score: String(d.Score || 0),
          inspection_result: restaurant.latestResult || "",
          inspection_type: "Food Hygiene Rating (FSA)",
          violation_description: d.Score > 0 ? `${d.ScoreCategory}: ${d.Description || "Improvement required"}` : `${d.ScoreCategory}: ${d.Description || "Very good"}`,
          violation_type: d.Score > 15 ? "RED" : "BLUE",
          violation_points: String(d.Score || 0),
        }));
      }
    } catch {}
    return ukFSAToDetailRows(restaurant);
  }

  const countyId = SOURCE_TO_COUNTY[source] || source;
  const entry = API_REGISTRY[countyId];
  if (!entry) return [];

  // Delaware: business_id is "name-address", need to split and query
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
  return PROCESSORS[countyId].toDetailRows(rows);
}