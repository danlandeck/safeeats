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
  processBostonResults, bostonToDetailRows,
  processHoustonResults, houstonToDetailRows,
  processStanislausResults, stanislausToDetailRows,
  processSingaporeResults, singaporeToDetailRows,
  processNSWResults, nswToDetailRows,
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
  boston: "boston", houston: "houston",
  stanislaus: "stanislaus",
  singapore: "singapore",
  australia_nsw: "sydney", australia_qld: "brisbane",
};

// All UK city IDs that should route through the live UK FSA API
const UK_CITY_IDS = new Set([
  "london", "birmingham", "manchester", "leeds", "glasgow",
  "edinburgh", "liverpool", "bristol", "sheffield", "cardiff", "belfast",
]);

// Country-specific guidance for the LLM to find real inspection data
const COUNTRY_CONTEXT = {
  // Australia
  sydney:       "Prioritize: NSW Food Authority (foodauthority.nsw.gov.au), Scores on Doors A-E grades.",
  melbourne:    "Prioritize: VicHealth food safety, City of Melbourne restaurant inspections, FoodSmart Victoria.",
  brisbane:     "Prioritize: Brisbane City Council & Queensland Health restaurant inspection records.",
  perth:        "Prioritize: WA Department of Health (health.wa.gov.au) food premises inspection records.",
  adelaide:     "Prioritize: SA Health food premises inspection records, City of Adelaide.",
  gold_coast:   "Prioritize: Gold Coast City Council food safety inspection records.",
  canberra:     "Prioritize: ACT Health food premises inspection records.",
  hobart:       "Prioritize: Tasmania Health Service food premises inspection records.",
  // Japan
  tokyo:        "Search: Tokyo Metropolitan Government (東京都) food hygiene (食品衛生) from local 保健所 (health centers). Score is Pass/Fail from 食品衛生責任者.",
  osaka:        "Search: Osaka Prefecture food hygiene inspection records from 保健所 (hokenjo). Focus on 食品衛生 compliance.",
  kyoto:        "Search: Kyoto City food safety inspection records from local 保健所.",
  yokohama:     "Search: Yokohama City food hygiene inspection records from local 保健所.",
  sapporo:      "Search: Sapporo City food safety inspection records from local 保健所.",
  fukuoka:      "Search: Fukuoka City food hygiene inspection records from local 保健所.",
  nagoya:       "Search: Nagoya City food safety inspection records from 保健所.",
  // South Korea
  seoul:        "Search: 식품안전나라 (foodsafetykorea.go.kr) and Seoul Metropolitan Government food inspection database. Score is 0-100.",
  busan:        "Search: 식품안전나라 (foodsafetykorea.go.kr) and Busan Metropolitan City food safety records.",
  incheon:      "Search: 식품안전나라 (foodsafetykorea.go.kr) and Incheon City food hygiene inspection data.",
  // France
  paris:        "Prioritize: Alim'confiance platform (alim-confiance.gouv.fr) — official DGCCRF transparency database with 4-tier ratings.",
  lyon:         "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Lyon.",
  marseille:    "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Marseille.",
  toulouse:     "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Toulouse.",
  nice:         "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Nice.",
  bordeaux:     "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Bordeaux.",
  strasbourg:   "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Strasbourg.",
  // Germany
  berlin:       "Prioritize: verbraucherportal.de and Berlin Senatsverwaltung Lebensmittelüberwachung inspection records.",
  munich:       "Prioritize: LGL Bayern (lgl.bayern.de) food inspection records and verbraucherportal.de.",
  hamburg:      "Prioritize: Hamburg Lebensmittelüberwachung (hamburg.de/lmue) restaurant inspection records.",
  cologne:      "Prioritize: Köln Veterinär- und Lebensmittelüberwachungsamt food inspection records.",
  frankfurt:    "Prioritize: Frankfurt am Main food inspection (Lebensmittelüberwachung) records.",
  // Netherlands
  amsterdam:    "Prioritize: NVWA (nvwa.nl) inspection results and inspectieresultaten.nl — Dutch Food and Consumer Product Safety Authority.",
  rotterdam:    "Prioritize: NVWA (nvwa.nl) and inspectieresultaten.nl food inspection results for Rotterdam.",
  the_hague:    "Prioritize: NVWA (nvwa.nl) food inspection records for The Hague.",
  // Denmark
  copenhagen:   "Prioritize: Smiley scheme (findsmiley.dk) from Fødevarestyrelsen — 4-tier smiley rating for Danish restaurants.",
  // New Zealand
  auckland:     "Prioritize: Auckland Council food premises inspection records and FoodSafe verification scheme.",
  wellington:   "Prioritize: Wellington City Council environmental health food premises inspections.",
  christchurch: "Prioritize: Christchurch City Council food premises inspection records.",
  // Canada (non-Toronto)
  vancouver:    "Prioritize: Vancouver Coastal Health (vch.ca) restaurant inspection database, Fraser Health inspection records.",
  calgary:      "Prioritize: Alberta Health Services food inspection records for Calgary.",
  edmonton:     "Prioritize: Alberta Health Services food inspection records for Edmonton.",
  montreal:     "Prioritize: MAPAQ Québec food inspection records and Montreal public health inspection data.",
  // India
  mumbai:       "Prioritize: FSSAI (fssai.gov.in) registration database and Mumbai Municipal Corporation (MCGM) food safety records.",
  delhi:        "Prioritize: FSSAI (fssai.gov.in) registration and Delhi government food safety inspection records.",
  bangalore:    "Prioritize: FSSAI (fssai.gov.in) and BBMP (Bruhat Bengaluru Mahanagara Palike) food safety inspection records.",
  // China
  beijing:      "Prioritize: 国家市场监督管理总局 (SAMR) food inspection, Beijing food safety supervision (北京食品安全) database.",
  shanghai:     "Prioritize: Shanghai municipal food safety authority (上海市食品安全) inspection records.",
  hong_kong:    "Prioritize: FEHD (Food and Environmental Hygiene Department) Hong Kong (fehd.gov.hk) inspection records.",
  // Brazil
  sao_paulo:    "Prioritize: VISA São Paulo (cvs.saude.sp.gov.br) Vigilância Sanitária restaurant inspection records.",
  rio:          "Prioritize: VISA Rio de Janeiro Vigilância Sanitária (rio.rj.gov.br/web/cvs) food establishment inspection records.",
  // UAE (non-Dubai)
  abu_dhabi:    "Prioritize: ADAFSA (Abu Dhabi Agriculture and Food Safety Authority) restaurant inspection and grading records.",
  sharjah:      "Prioritize: Sharjah City Municipality food safety inspection records.",
  // Singapore handled by live API — keep as LLM fallback description
  singapore:    "Prioritize: SFA/NEA food hygiene grades (A/B/C/D/E scale), SFA food establishment inspections (sfa.gov.sg).",
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
          data_confidence:        { type: "string", enum: ["high", "medium", "low", "none"] },
          is_currently_operating: { type: "boolean" },
          verification_source:   { type: "string" },
        },
      },
    },
  },
};

const PROMPT_LOCATION = (query, location, today) =>
  `Today is ${today}. Search the LIVE WEB for real, current health inspection records for "${query}" in ${location} ONLY.
ABSOLUTE ACCURACY RULES — ZERO TOLERANCE FOR HALLUCINATION:
1. ONLY return restaurants you can VERIFY exist today via web search results. If you cannot find concrete evidence a restaurant exists and is currently operating, OMIT it entirely.
2. EVERY result MUST have city="${location}" or a city name that starts with the same word as "${location}". NEVER return results from outside ${location}.
3. latest_score: 0–100 from REAL inspection data found on the web. latest_date: the REAL date of the most recent inspection you found. latest_result: the REAL inspection outcome. violations: REAL violations only — never invent.
4. If you cannot find a real inspection score for a restaurant, set latest_score to null and data_confidence to "none". Do NOT guess or fabricate a score.
5. data_confidence: "high" = found official inspection record with score and date; "medium" = found the restaurant confirmed operating with some inspection reference; "low" = found the restaurant but no inspection details; "none" = could not verify.
6. is_currently_operating: true ONLY if you have evidence the restaurant is open today. false if confirmed closed. If unknown, set true only if you found a current website/listing.
7. verification_source: the URL or name of the source where you confirmed this restaurant exists (e.g. "yelp.com", "google.com", official health dept site).
8. Better to return 3 verified results than 10 with any uncertainty. ZERO fabricated data.
9. For each restaurant, identify: cuisine type, is_vegan_friendly, is_vegetarian_friendly, is_kosher, is_halal, is_gluten_free_options, dietary_tags, and ADA compliance status (accessible/partially_accessible/not_accessible/unknown).
10. For California locations, check the California DPH environmental health records, local county health portal, and Yelp/Google health inspection summaries.`;

const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real, current health inspection records for "${query}" anywhere in the world.
ABSOLUTE ACCURACY RULES — ZERO TOLERANCE FOR HALLUCINATION:
1. ONLY return restaurants you can VERIFY exist today via web search results. If you cannot find concrete evidence, OMIT it entirely.
2. Return up to 8 real, verifiable businesses. No invented data. No fabricated inspection scores.
3. latest_score: 0–100 from REAL inspection data found on the web. If you cannot find a real score, set latest_score to null and data_confidence to "none".
4. latest_date: the REAL date of the most recent inspection. latest_result: the REAL outcome. violations: REAL only.
5. data_confidence: "high" = found official inspection record with score and date; "medium" = found restaurant with some inspection reference; "low" = found restaurant but no inspection details; "none" = could not verify.
6. is_currently_operating: true ONLY if you have evidence the restaurant is open today.
7. verification_source: the URL or name of the source where you confirmed this restaurant exists.
8. Better to return 3 verified results than 8 with any uncertainty. ZERO fabricated data.
9. For each restaurant, identify: cuisine type, is_vegan_friendly, is_vegetarian_friendly, is_kosher, is_halal, is_gluten_free_options, dietary_tags, and ADA compliance status (accessible/partially_accessible/not_accessible/unknown).`;

const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for ONLY real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE.
ZERO TOLERANCE RULES:
1. BLOCK EVERYTHING: Miami, New York, Boston, Chicago, Los Angeles, San Francisco, Austin, London, Paris, Tokyo, Abu Dhabi, Sharjah — ANY US city or non-UAE location = REJECTED.
2. city MUST be exactly "Dubai" for EVERY result.
3. Address MUST include: Jumeirah, Deira, Bur Dubai, Marina, Downtown Dubai, JBR, DIFC, Business Bay, Palm Jumeirah, Sheikh Zayed, or "Dubai, UAE".
4. Verify EVERY result is actually in Dubai before returning it. If unsure = OMIT.
5. ONLY return restaurants you can VERIFY exist today via web search. If you cannot find concrete evidence, OMIT it.
6. latest_score: 0–100 from REAL inspection data. If no real score found, set latest_score to null and data_confidence to "none". Never fabricate.
7. data_confidence: "high" = official inspection record; "medium" = restaurant confirmed with inspection reference; "low" = restaurant found but no inspection details; "none" = unverified.
8. is_currently_operating: true ONLY if you have evidence the restaurant is open today.
9. verification_source: the URL or name of the source where you confirmed this restaurant exists.
10. Return max 8 real verified Dubai restaurants only. ZERO results from outside Dubai. ZERO fabricated data.`;

const FAST_PROMPT = (query, location) => location
  ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
  : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;

function getCountryContext(countyId) {
  return COUNTRY_CONTEXT[countyId] || "";
}

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
  
  // Normalize: lowercase, strip apostrophes/dashes, collapse spaces
  const normalize = (str) => (str || "")
    .toLowerCase()
    .replace(/['\-]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanQuery = normalize(query);
  if (cleanQuery.length <= 1) return results;

  const queryWords = cleanQuery.split(" ").filter(w => w.length >= 2);
  if (queryWords.length === 0) return results;

  const filtered = results.filter(r => {
    const cleanName = normalize(r.name);
    if (!cleanName) return false;
    // ANY query word must appear in the name (not ALL — so "Chipotle" matches "Chipotle Mexican Grill")
    return queryWords.some(w => cleanName.includes(w));
  });

  return filtered.length > 0 ? filtered : results;
}

/**
 * Deduplicate results by normalized name + address prefix.
 * Removes redundant entries (same restaurant appearing twice with slight address variations).
 */
function deduplicateResults(results) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const seen = new Set();
  return results.filter(r => {
    const normalize = (str) => (str || "")
      .toLowerCase()
      .replace(/['\-]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const name = normalize(r.name);
    const addr = normalize(r.address).split(" ").slice(0, 3).join(" "); // first 3 address words
    const key = `${name}|${addr}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Filter out unverified / hallucinated / closed results.
 * Drops results where:
 *   - data_confidence is "none" (could not verify the restaurant exists)
 *   - is_currently_operating is explicitly false (confirmed closed)
 * Keeps "low" confidence (restaurant found but no inspection details) since the
 * restaurant is verified to exist — just without a score.
 */
function filterUnverified(results) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const filtered = results.filter(r => {
    const confidence = (r.data_confidence || "").toLowerCase();
    // Drop results the LLM could not verify at all
    if (confidence === "none") return false;
    // Drop confirmed-closed restaurants
    if (r.is_currently_operating === false) return false;
    return true;
  });
  // Fail-open: if filtering removes everything, return original (better to show something)
  return filtered.length > 0 ? filtered : results;
}

function llmCall(prompt, internet = false) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: LLM_SCHEMA,
    // Web search uses Gemini 3.1 Pro (highest-quality web-search model) for maximum accuracy;
    // training-data-only fast results use Claude Opus 4.8 for best preliminary quality.
    ...(internet ? { model: "gemini_3_1_pro" } : { model: "claude_opus_4_8" }),
  });
}

async function aiSearchFallback(query, countyId, locationLabel, today, onFastResults) {
  const location = locationLabel?.trim() || null;
  const primaryCity = location ? location.split(",")[0].trim() : "";
  const ctx = getCountryContext(countyId);
  const basePrompt = location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today);
  const enhancedPrompt = ctx ? `${basePrompt}\n8. ${ctx}` : basePrompt;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(enhancedPrompt, true),
    (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", primaryCity),
    onFastResults
  );
  return { results: restaurants, isAI: true };
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

    // Use the FULL expected city string for matching, not just the first word.
    // Strip trailing state/country suffixes like ", CT" or ", UAE" for comparison.
    const expectedCleaned = expectedLower.replace(/,.*$/, "").trim();

    // Match if the result city equals or contains the full expected name.
    // For multi-word cities ("New York"), require the entire phrase, not just "new".
    // For single-word cities, allow exact match or "Cityname, ST" style.
    const isMatch = resultCityLower === expectedCleaned ||
                    resultCityLower.startsWith(expectedCleaned + ",") ||
                    resultCityLower.startsWith(expectedCleaned + " ");

    isWrongLocation = expectedCleaned.length > 2 && !isMatch;
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
    fast = deduplicateResults(fast);
    if (fast.length > 0 && onFastResults) { fastDelivered = true; onFastResults(fast); }
  }).catch(() => {});
  const result = await accuratePromise;
  fastDelivered = true;
  // Filter out unverified/hallucinated results from the web-search response,
  // then deduplicate to remove redundant entries.
  const verified = filterUnverified(result?.restaurants || []);
  let restaurants = verified.map(buildFn).filter(r => !r._wrongLocation);
  if (isDubaiSearch) {
    restaurants = restaurants.filter(r => isDubaiLocation(r.city, r.address));
  }
  return deduplicateResults(restaurants);
}

export async function search({ query, countyId, locationLabel, today, signal, onFastResults, onCountUpdate }) {
  // All UK cities route through the live FSA API (national search, UK-wide coverage)
  if (UK_CITY_IDS.has(countyId) || countyId === "uk_fsa") {
    const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
    const establishments = res.data?.establishments || [];
    // Optionally filter by city name if user selected a specific UK city (not uk_fsa)
    const cityFilter = countyId !== "uk_fsa" ? countyId.replace(/_/g, " ").toLowerCase() : null;
    const filtered = cityFilter
      ? establishments.filter(e => {
          const auth = (e.LocalAuthorityName || "").toLowerCase();
          const addr = [e.AddressLine1, e.AddressLine2, e.AddressLine3, e.AddressLine4].join(" ").toLowerCase();
          return auth.includes(cityFilter) || addr.includes(cityFilter);
        })
      : establishments;
    const pool = filtered.length > 0 ? filtered : establishments;
    const liveResults = filterByNameRelevance(processUKFSAResults(pool), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // UK FSA live API (requires backend proxy for header injection)
  if (countyId === "uk_fsa_legacy") {
    const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
    const establishments = res.data?.establishments || [];
    const liveResults = filterByNameRelevance(processUKFSAResults(establishments), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Singapore — live data via data.gov.sg CKAN API
  if (countyId === "singapore") {
    const res = await base44.functions.invoke("singaporeInspections", { action: "search", name: query });
    const records = res.data?.records || [];
    if (records.length > 0) {
      const liveResults = filterByNameRelevance(processSingaporeResults(records, res.data?.resourceId), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    }
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Australia NSW / QLD — live data via state open data portals
  if (countyId === "sydney" || countyId === "brisbane" || countyId === "gold_coast") {
    const state = (countyId === "brisbane" || countyId === "gold_coast") ? "qld" : "nsw";
    const res = await base44.functions.invoke("australiaFoodSafety", { action: "search", name: query, state });
    const records = res.data?.records || [];
    if (records.length > 0) {
      const liveResults = filterByNameRelevance(processNSWResults(records, res.data?.state), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    }
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Toronto DineSafe (CKAN — needs backend proxy)
  if (countyId === "toronto") {
    const res = await base44.functions.invoke("torontoDineSafe", { action: "search", name: query });
    const records = res.data?.records || [];
    const liveResults = filterByNameRelevance(processTorontoResults(records), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Boston (CKAN — needs backend proxy)
  if (countyId === "boston") {
    const res = await base44.functions.invoke("bostonFoodInspections", { action: "search", name: query });
    const records = res.data?.records || [];
    const liveResults = filterByNameRelevance(processBostonResults(records), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Stanislaus County CA (scraped portal, with AI fallback)
  if (countyId === "stanislaus") {
    const res = await base44.functions.invoke("stanislausInspections", { action: "search", name: query });
    const facilities = res.data?.facilities || [];
    const liveResults = filterByNameRelevance(processStanislausResults(facilities), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    // Not in county database — fall back to AI web search
    const location = locationLabel?.trim() || "Modesto, Stanislaus County, CA";
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT(query, location), false),
      llmCall(PROMPT_LOCATION(query, location, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location, "Modesto"),
      onFastResults
    );
    return { results: restaurants, isAI: true };
  }

  // Los Angeles County (ArcGIS Feature Service via backend proxy)
  if (countyId === "la") {
    const res = await base44.functions.invoke("laCountyInspections", { action: "search", name: query });
    const records = res.data?.records || [];
    const liveResults = filterByNameRelevance(processLAResults(records), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Houston (CKAN — needs backend proxy)
  if (countyId === "houston") {
    const res = await base44.functions.invoke("houstonFoodInspections", { action: "search", name: query });
    const records = res.data?.records || [];
    const liveResults = filterByNameRelevance(processHoustonResults(records), query);
    if (liveResults.length > 0) return { results: liveResults, isAI: false };
    return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
  }

  // Live government API
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    const raw = await fetch(buildSearchUrl(entry, query), signal ? { signal } : {}).then(r => r.json());
    const allResults = PROCESSORS[countyId].process(Array.isArray(raw) ? raw : []);

    // Post-fetch relevance filter: keep only results whose name actually matches the query.
    // The Socrata LIKE '%query%' is too permissive — it can return adjacent records or
    // fuzzy matches when name fields are denormalized. We require the query (or each query word)
    // to appear in the result's name, case-insensitively.
    const results = filterByNameRelevance(allResults, query);

    // If live API returned nothing, fall back to AI
    if (results.length === 0) {
      return aiSearchFallback(query, countyId, locationLabel, today, onFastResults);
    }

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
          // AbortError is expected when search is replaced; silently ignore.
          // Other errors also silently ignored — these are background polish requests.
        }
        });
        }

    return { results, isAI: false };
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

  // Boston — CKAN detail fetch
  if (source === "boston") {
    try {
      const res = await base44.functions.invoke("bostonFoodInspections", { action: "detail", licenseno: business_id });
      return bostonToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  // Singapore
  if (source === "singapore") {
    return singaporeToDetailRows(restaurant);
  }

  // Australia NSW / QLD
  if (source === "australia_nsw" || source === "australia_qld") {
    return nswToDetailRows(restaurant);
  }

  // Los Angeles County (ArcGIS)
  if (source === "la") {
    try {
      const res = await base44.functions.invoke("laCountyInspections", { action: "detail", facilityId: business_id });
      return laToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  // Stanislaus County
  if (source === "stanislaus") {
    return stanislausToDetailRows(restaurant);
  }

  // Houston — CKAN detail fetch
  if (source === "houston") {
    try {
      const res = await base44.functions.invoke("houstonFoodInspections", { action: "detail", facilityAccountNumber: business_id });
      return houstonToDetailRows(res.data?.records || []);
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