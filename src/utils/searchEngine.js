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

const PROMPT_LOCATION = (query, location, today) =>
  `Today is ${today}. Search the web for real health inspection records for "${query}" in ${location} ONLY.
STRICT RULES:
1. EVERY result MUST have city="${location}" or a city name that starts with the same word as "${location}".
2. city field MUST match the requested location. If unsure, OMIT the result.
3. latest_score: 0–100 (real data). latest_result: real inspection outcome. violations: real only.
4. NEVER return results from outside ${location}.
5. Better to return 3 verified results than 10 with any location mismatch.
6. For each restaurant, identify: cuisine type, is_vegan_friendly, is_vegetarian_friendly, is_kosher, is_halal, is_gluten_free_options, dietary_tags, and ADA compliance status (accessible/partially_accessible/not_accessible/unknown).`;

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
  ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
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

function llmCall(prompt, internet = false) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: LLM_SCHEMA,
    ...(internet ? { model: "gemini_3_flash" } : {}),
  });
}

// --- Location matching helpers ---

const STATE_ABBR_MAP = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv", "new hampshire": "nh",
  "new jersey": "nj", "new mexico": "nm", "new york": "ny", "north carolina": "nc",
  "north dakota": "nd", ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa",
  "rhode island": "ri", "south carolina": "sc", "south dakota": "sd", tennessee: "tn",
  texas: "tx", utah: "ut", vermont: "vt", virginia: "va", washington: "wa",
  "west virginia": "wv", wisconsin: "wi", wyoming: "wy",
};

// Known US state for each live-API county
const COUNTY_STATE = {
  king: "wa", nyc: "ny", cook: "il", montgomery_md: "md",
  travis: "tx", sf: "ca", la: "ca", delaware: "de", ny_state: "ny",
};

function normalizeState(s) {
  if (!s) return null;
  const lower = s.trim().toLowerCase();
  if (STATE_ABBR_MAP[lower]) return STATE_ABBR_MAP[lower];
  if (lower.length === 2 && /^[a-z]{2}$/.test(lower)) return lower;
  return null;
}

// Parse { city, state } from a label like "Seattle, WA" or "Seattle Metro / King County"
function parseLocationLabel(label) {
  if (!label) return { city: null, state: null };
  const parts = label.split(",").map(s => s.trim());
  const rawCity = (parts[0] || "").toLowerCase();
  // Strip common suffixes that aren't city names
  const city = rawCity
    .replace(/\s*(metro|county|borough)\b.*/i, "")
    .replace(/\s*\/.*$/, "")
    .trim() || null;
  const rawState = parts[1]?.split(/\s+/)[0] || null;
  return { city, state: normalizeState(rawState) };
}

// Extract the state abbreviation from a result's city/address fields
function parseStateFromResult(r) {
  // 1. "City, ST" in city field
  const cityParts = (r.city || "").split(",");
  if (cityParts.length >= 2) {
    const st = normalizeState(cityParts[cityParts.length - 1].trim().split(/\s+/)[0]);
    if (st) return st;
  }
  // 2. ", ST 12345" pattern in address
  const m1 = (r.address || "").match(/,\s*([A-Za-z]{2})\s*\d{5}/);
  if (m1) return normalizeState(m1[1]);
  // 3. ", ST" at end or before comma in address
  const m2 = (r.address || "").match(/,\s*([A-Za-z]{2})\s*(?:[,\d]|$)/);
  if (m2) return normalizeState(m2[1]);
  return null;
}

// Filter live-API results by the county's known state (fail-open if no state known)
function filterByLocationForLiveApi(results, countyId) {
  const knownState = COUNTY_STATE[countyId];
  if (!knownState) return results;
  const filtered = results.filter(r => {
    const rs = parseStateFromResult(r);
    return !rs || rs === knownState;
  });
  return filtered.length > 0 ? filtered : results;
}

// ─── Layer 2: Hard jurisdiction enforcement (zip-code based) ───────────────────
// Each county's valid zip-code prefixes. A result whose zip exists but does NOT
// start with any of these prefixes is physically impossible to be in this county
// and is discarded regardless of what the source API claimed.
const COUNTY_ZIP_PREFIXES = {
  king:          ["980", "981"],                                      // King County, WA
  nyc:           ["100", "101", "102", "103", "104", "111", "112", "113", "114"], // NYC boroughs
  cook:          ["606", "607", "608"],                              // Chicago / Cook County, IL
  montgomery_md: ["208", "209"],                                      // Montgomery County, MD
  travis:        ["786", "787", "788"],                              // Austin / Travis County, TX
  sf:            ["941"],                                             // San Francisco, CA
  la:            ["900", "901", "902", "903", "904", "905", "906", // Los Angeles, CA
                  "907", "908", "910", "911", "912", "913", "914",
                  "915", "916", "917", "918"],
  delaware:      ["197", "198", "199"],                              // Delaware
  ny_state:      ["100", "101", "102", "103", "104",               // All NY State (includes NYC)
                  "105", "106", "107", "108", "109", "110",
                  "111", "112", "113", "114", "115", "116",
                  "117", "118", "119", "120", "121", "122",
                  "123", "124", "125", "126", "127", "128", "129",
                  "130", "131", "132", "133", "134", "135", "136",
                  "137", "138", "139", "140", "141", "142", "143",
                  "144", "145", "146", "147", "148", "149"],
};

/**
 * Enforces geographic isolation by zip-code prefix.
 * If a result has a zip code that doesn't match the expected county's zip prefixes,
 * it is discarded. Results with no detectable zip pass through (fail-open on missing data).
 * This is the final defense ensuring a Los Angeles result can NEVER appear in Seattle results.
 */
function enforceJurisdiction(results, countyId) {
  const validPrefixes = COUNTY_ZIP_PREFIXES[countyId];
  if (!validPrefixes) return results; // No rules defined for this county — pass through

  return results.filter(r => {
    // Extract zip from dedicated field
    const zipFromField = (r.zip_code || "").replace(/\D/g, "").slice(0, 5);
    // Extract zip embedded in address (e.g. "1150 S HOPE ST LOS ANGELES 90015")
    const zipFromAddr = ((r.address || "").match(/\b(\d{5})\b/) || [""])[1] || "";
    const zip = zipFromField || zipFromAddr;

    if (zip.length >= 3) {
      // We have enough zip data — enforce strict prefix match
      const valid = validPrefixes.some(p => zip.startsWith(p));
      if (!valid) {
        console.warn(`[jurisdiction] Discarding result "${r.name}" (zip ${zip}) — not valid for county "${countyId}".`);
      }
      return valid;
    }

    // No zip available — pass through, can't validate
    return true;
  });
}

// --- Dubai location helpers ---
// Restaurants outside Dubai must be rejected.
const US_CITIES = ["miami", "boston", "chicago", "los angeles", "san francisco", "austin", "seattle", "denver", "atlanta", "dallas", "houston", "phoenix", "orlando", "las vegas", "philadelphia"];
const US_STATES = ["florida", "new york", "massachusetts", "illinois", "california", "texas", "colorado", "georgia", "nevada", "pennsylvania", "washington dc"];
const NON_DUBAI = ["london", "paris", "tokyo", "abu dhabi", "dubai creek", "ras al khaimah", "fujairah", "umm al quwain", "ajman", "sharjah"];
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
  let isWrongLocation = false;

  if (countyId === "dubai") {
    isWrongLocation = !isDubaiLocation(r.city, r.address);
    if (isWrongLocation) {
      const built = buildLLMRestaurant(r, i, countyId, location, null);
      return { ...built, _wrongLocation: true };
    }
    const built = {
      ...buildLLMRestaurant(r, i, countyId, location, null),
      city: "Dubai",
      region: "uae",
      country: "UAE",
    };
    return { ...built, _wrongLocation: false };
  } else {
    const { city: expCity, state: expState } = parseLocationLabel(expectedCity || "");
    // Use county's known state as fallback when the location label has no explicit state abbreviation
    // (e.g. "Seattle Metro / King County" has no ", WA", but countyId="king" maps to "wa")
    const effectiveState = expState || COUNTY_STATE[countyId] || null;

    if (expCity && expCity !== "worldwide (ai search)") {
      // City check — compare result city (before comma) to expected city
      const resultCityLower = (r.city || "").toLowerCase().trim().split(",")[0].trim();
      const cityMatch = expCity.length > 2 && (
        resultCityLower === expCity ||
        resultCityLower.startsWith(expCity + ",") ||
        resultCityLower.startsWith(expCity + " ") ||
        resultCityLower.includes(expCity)
      );

      // State check — use effectiveState (label state OR county's known state)
      let stateMatch = true;
      if (effectiveState) {
        const resultState = parseStateFromResult(r);
        if (resultState && resultState !== effectiveState) stateMatch = false;
      }

      // Also reject if the address explicitly names a different major city
      const addressLower = (r.address || "").toLowerCase();
      const MAJOR_CITIES = ["los angeles", "new york", "chicago", "houston", "san francisco",
        "miami", "dallas", "boston", "atlanta", "denver", "philadelphia", "phoenix",
        "san diego", "san jose", "austin", "las vegas", "portland", "seattle", "nashville"];
      const contradictingCity = cityMatch && stateMatch &&
        MAJOR_CITIES.some(c => c !== expCity && addressLower.includes(c));

      isWrongLocation = !(cityMatch && stateMatch) || contradictingCity;
    } else if (!expCity) {
      // No city resolved — fail closed when county implies a specific location
      if (COUNTY_STATE[countyId]) isWrongLocation = true;
    }
  }

  const built = buildLLMRestaurant(r, i, countyId, location, null);
  return { ...built, _wrongLocation: isWrongLocation };
}

async function runWithFastResults(fastPromise, accuratePromise, buildFn, onFastResults, isDubaiSearch = false) {
  let fastDelivered = false;
  fastPromise.then((res) => {
    if (fastDelivered) return;
    let fast = (res?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation);
    if (isDubaiSearch) {
      fast = fast.filter(r => isDubaiLocation(r.city, r.address));
    }
    if (fast.length > 0 && onFastResults) { fastDelivered = true; onFastResults(fast); }
  }).catch(() => {});
  const result = await accuratePromise;
  fastDelivered = true;
  let restaurants = (result?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation);
  if (isDubaiSearch) {
    restaurants = restaurants.filter(r => isDubaiLocation(r.city, r.address));
  }
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

  // Live government API — STRICT city isolation.
  // Each city has its own dedicated government endpoint. Results are 100% scoped to that
  // jurisdiction. If the API is unavailable we return a city-specific error — we do NOT
  // fall through to AI search, which could return results from completely different cities.
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    let raw;
    try {
      raw = await fetch(buildSearchUrl(entry, query), signal ? { signal } : {}).then(r => r.json());
    } catch (fetchErr) {
      if (fetchErr.name === "AbortError") throw fetchErr;
      console.warn(`Live API unavailable for ${countyId}:`, fetchErr.message);
      // STRICT: do NOT fall through to AI — return a city-specific error instead.
      return {
        results: [],
        isAI: false,
        error: `The ${entry.name} health inspection database is temporarily unavailable. Please try again in a moment.`,
      };
    }

    const allResults = PROCESSORS[countyId].process(Array.isArray(raw) ? raw : []);
    // Relevance filter: keep only results whose name matches the query
    const nameFiltered = filterByNameRelevance(allResults, query);
    // Layer 1: state-based location guard
    const stateFiltered = filterByLocationForLiveApi(nameFiltered, countyId);
    // Layer 2: hard zip-code jurisdiction enforcement — physically impossible for a
    // Los Angeles result (zip 900xx) to survive into a King County (zip 980xx-981xx) search
    const results = enforceJurisdiction(stateFiltered, countyId);

    // Background-fetch true inspection counts and fire onCountUpdate per business
    if (onCountUpdate && countyId !== "delaware") {
      results.forEach(async (biz) => {
        try {
          const countUrl = `${entry.endpoint}?$select=${entry.dateField}&${entry.idField}=${biz.business_id}&$limit=500&$order=${entry.dateField} DESC`;
          const rows = await fetch(countUrl, signal ? { signal } : {}).then(r => r.json());
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
          // silently ignore background count errors
        }
      });
    }

    return { results, isAI: false };
    // IMPORTANT: execution never falls through to AI search for live-API cities.
  }

  // Dubai — fully isolated path
  if (countyId === "dubai") {
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT_DUBAI(query), false),
      llmCall(PROMPT_DUBAI(query, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, "dubai", "Dubai", "Dubai"),
      onFastResults,
      true  // isDubaiSearch flag for aggressive filtering
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