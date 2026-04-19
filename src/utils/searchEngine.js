import { base44 } from "@/api/base44Client";
import { API_REGISTRY, LIVE_API_IDS, buildSearchUrl, buildDetailUrl } from "./apiRegistry";
import {
  processKingCountyResults, processNYCResults, processChicagoResults,
  processMontgomeryResults, processAustinResults, processSFResults, processLAResults,
  nycToDetailRows, chicagoToDetailRows, montgomeryToDetailRows,
  austinToDetailRows, sfToDetailRows, laToDetailRows,
  llmToDetailRows, buildLLMRestaurant,
  processUKFSAResults, ukFSAToDetailRows,
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
  uk_fsa: "uk_fsa",
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

function llmCall(prompt, internet = false) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: LLM_SCHEMA,
    ...(internet ? { model: "gemini_3_flash" } : {}),
  });
}

// EXHAUSTIVE forbidden locations
const US_CITIES = ["miami", "new york", "boston", "chicago", "los angeles", "san francisco", "austin", "seattle", "denver", "atlanta", "dallas", "houston", "phoenix", "orlando", "las vegas", "philadelphia", "washington"];
const US_STATES = ["florida", "new york", "massachusetts", "illinois", "california", "texas", "colorado", "georgia", "nevada", "pennsylvania", "dc"];
const NON_DUBAI = ["london", "paris", "tokyo", "abu dhabi", "dubai creek", "ras al khaimah", "fujairah", "umm al quwain", "ajman", "sharjah"];
const ALL_FORBIDDEN = [...US_CITIES, ...US_STATES, ...NON_DUBAI];

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
  // VALIDATE LOCATION ON ORIGINAL DATA BEFORE ANY OVERRIDES
  let isWrongLocation = false;
  
  if (countyId === "dubai") {
    isWrongLocation = !isDubaiLocation(r.city, r.address);
    // If wrong location, return early with flag set
    if (isWrongLocation) {
      const built = buildLLMRestaurant(r, i, countyId, location, null);
      return { ...built, _wrongLocation: true };
    }
    // Only override city if location is valid
    const built = {
      ...buildLLMRestaurant(r, i, countyId, location, null),
      city: "Dubai",
      region: "uae",
      country: "UAE",
    };
    return { ...built, _wrongLocation: false };
  } else if (expectedCity && expectedCity !== "Worldwide (AI Search)") {
    const resultCityLower = (r.city || "").toLowerCase().trim();
    const expectedLower = expectedCity.toLowerCase().trim();
    const firstWord = expectedLower.split(/[\s,]+/)[0];
    isWrongLocation = firstWord.length > 2 && !resultCityLower.includes(firstWord);
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

export async function search({ query, countyId, locationLabel, today, signal, onFastResults }) {
  // UK FSA live API (requires backend proxy for header injection)
  if (countyId === "uk_fsa") {
    const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
    const establishments = res.data?.establishments || [];
    return { results: processUKFSAResults(establishments), isAI: false };
  }

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

  const data = await fetch(buildDetailUrl(entry, business_id)).then(r => r.json());
  const rows = Array.isArray(data) ? data : [];
  if (countyId === "king") return rows;
  return PROCESSORS[countyId].toDetailRows(rows);
}