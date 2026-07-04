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

// Trimmed schema — only fields needed for the search results list.
// Dietary/ADA fields removed to reduce LLM output tokens and speed up generation.
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
          data_confidence:        { type: "string", enum: ["high", "medium", "low", "none"] },
          is_currently_operating: { type: "boolean" },
          verification_source:   { type: "string" },
        },
      },
    },
  },
};

// Schema for the inspection-enrichment pass: the LLM only reports inspection
// records for restaurants ALREADY verified via Google Places, keyed by idx.
const INSPECTION_SCHEMA = {
  type: "object",
  properties: {
    inspections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          idx:                 { type: "number" },
          latest_score:        { type: "number" },
          latest_date:         { type: "string" },
          latest_result:       { type: "string" },
          total_inspections:   { type: "number" },
          violations:          { type: "array", items: { type: "string" } },
          data_confidence:     { type: "string", enum: ["high", "medium", "low"] },
          verification_source: { type: "string" },
        },
      },
    },
  },
};

const PROMPT_ENRICH = (list, location, today) =>
  `Today is ${today}. Below are VERIFIED, REAL restaurants${location ? ` in ${location}` : ""} (confirmed via Google Places — do NOT question their existence or alter their details).
Search the LIVE WEB for OFFICIAL health inspection records for these EXACT establishments:
${list.map((r, i) => `${i}. ${r.name} — ${r.address}`).join("\n")}
RULES:
1. Return one entry per restaurant you find inspection data for, keyed by "idx" (the number above).
2. latest_score 0–100, latest_date, latest_result, violations: from REAL official inspection records ONLY.
3. If you cannot find an official inspection record for a restaurant, OMIT that idx entirely. NEVER invent scores, dates, or results.
4. data_confidence: "high"=official record found; "medium"=inspection referenced secondhand; "low"=uncertain match.
5. verification_source: the URL or agency name where you found the record.`;

const PROMPT_LOCATION = (query, location, today) =>
  `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" in ${location} ONLY.
RULES:
1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.
2. city MUST be "${location}" or start with the same word. NEVER return results from outside ${location}.
3. latest_score: 0–100 from REAL inspection data. If not found, set null. latest_date/latest_result/violations: REAL only.
4. data_confidence: "high"=official inspection record found; "medium"=restaurant confirmed with inspection reference; "low"=found but no inspection details; "none"=unverified.
5. is_currently_operating: true ONLY if evidence it's open today.
6. verification_source: URL/name where you confirmed it exists.
7. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.
8. Return max 8 verified results. ZERO fabricated data. Identify cuisine type.`;

const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" anywhere in the world.
RULES:
1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.
2. Return up to 8 real, verifiable businesses. No invented data or fabricated scores.
3. latest_score: 0–100 from REAL inspection data. If not found, set null and data_confidence to "none".
4. latest_date/latest_result/violations: REAL only.
5. data_confidence: "high"=official record; "medium"=some reference; "low"=found but no details; "none"=unverified.
6. is_currently_operating: true ONLY if evidence it's open today.
7. verification_source: URL/name where you confirmed it exists.
8. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.
9. Identify cuisine type.`;

const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE ONLY.
RULES:
1. BLOCK all US cities, London, Paris, Tokyo, Abu Dhabi, Sharjah — ANY non-UAE location = REJECTED.
2. city MUST be exactly "Dubai". Address MUST include: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, or "Dubai, UAE".
3. ONLY return restaurants you can VERIFY exist via web search. If unsure = OMIT.
4. latest_score: 0–100 from REAL inspection data. If not found, set null. Never fabricate.
5. data_confidence: "high"=official record; "medium"=confirmed with reference; "low"=found no details; "none"=unverified.
6. is_currently_operating: true ONLY if evidence it's open today.
7. verification_source: URL/name where you confirmed it exists.
8. Return max 8 verified Dubai restaurants only.`;

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
 *   - For multi-word queries: ANY query word must appear in the name (so "Chipotle" matches
 *     "Chipotle Mexican Grill")
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
  const base = filtered.length > 0 ? filtered : results;
  // HARD requirement (no fail-open): AI results must have a street address.
  // An entry with no address can't be tied to a real location — showing it as
  // "Unknown" with no address erodes trust more than showing nothing.
  return base.filter(r => (r.address || "").trim().length >= 5);
}

function llmCall(prompt, internet = false, schema = LLM_SCHEMA) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: schema,
    // Gemini 3 Flash: supports web search, much faster than 3.1 Pro.
    // GPT-5 Mini: fast training-data-only lookup for preliminary results.
    ...(internet ? { model: "gemini_3_flash" } : { model: "gpt_5_mini" }),
  });
}

// ── GEO-ROUTING TABLE ─────────────────────────────────────────────────────────
// Maps a verified address (state + locality from Google Places) to the
// inspection source that serves it. type "registry" → live API countyId;
// "none" → jurisdiction publishes no machine-readable data (skip slow AI
// enrichment — the answer is known); "unknown" → try AI enrichment.
const GEO_ROUTE = {
  WA: { cities: { seattle: "king", bellevue: "king", kent: "king", renton: "king", redmond: "king", kirkland: "king", "federal way": "king", sammamish: "king", shoreline: "king", burien: "king", tukwila: "king", issaquah: "king" } },
  NY: { cities: { "new york": "nyc", brooklyn: "nyc", queens: "nyc", bronx: "nyc", "the bronx": "nyc", manhattan: "nyc", "staten island": "nyc" } },
  IL: { cities: { chicago: "cook" } },
  CA: { cities: { "san francisco": "sf", "los angeles": "la", "long beach": "la", glendale: "la", pasadena: "la", "santa monica": "la", burbank: "la", torrance: "la", modesto: "stanislaus", turlock: "stanislaus", ceres: "stanislaus" } },
  TX: { cities: { austin: "travis", houston: "houston" } },
  MD: { cities: { rockville: "montgomery_md", bethesda: "montgomery_md", "silver spring": "montgomery_md", gaithersburg: "montgomery_md" } },
  MA: { cities: { boston: "boston" } },
  DE: { default: "delaware" },
  CT: { none: true }, // verified: no statewide machine-readable inspection data
};

function geoRoute(state, city) {
  const entry = GEO_ROUTE[(state || "").toUpperCase().trim()];
  if (!entry) return { type: "unknown" };
  if (entry.none) return { type: "none" };
  const c = (city || "").toLowerCase().trim();
  if (entry.cities && entry.cities[c]) return { type: "registry", countyId: entry.cities[c] };
  if (entry.default) return { type: "registry", countyId: entry.default };
  return { type: "unknown" };
}

// Re-entrancy guard: a geo-routed search() call that itself falls back to AI
// must not geo-route again.
let _geoRouting = false;

async function aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults) {
  const location = locationLabel?.trim() || null;
  const primaryCity = location ? location.split(",")[0].trim() : "";
  const ctx = getCountryContext(countyId);
  const buildFn = (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", primaryCity);

  // 24h result cache: repeat searches render instantly. Enriched results
  // overwrite grounded-only results as they land.
  const seCacheKey = `se-ai-cache:${(location || "global").toLowerCase()}:${query.toLowerCase().trim()}`;
  try {
    const hit = JSON.parse(localStorage.getItem(seCacheKey) || "null");
    if (hit && Date.now() - hit.at < 24 * 60 * 60 * 1000 && Array.isArray(hit.results) && hit.results.length > 0) {
      return { results: hit.results, isAI: true };
    }
  } catch { /* unreadable cache — proceed */ }
  const saveCache = (results) => {
    try { localStorage.setItem(seCacheKey, JSON.stringify({ at: Date.now(), results })); } catch { /* quota */ }
  };

  // GROUNDED PATH — Google Places establishes which restaurants exist and where
  // (real names, addresses, zips, operating status). The LLM's only job is then
  // finding inspection records for those exact establishments. This prevents
  // hallucinated/address-less entries in jurisdictions with no live API.
  try {
    const placesRes = await base44.functions.invoke("placesRestaurantSearch", { query, location });
    const verified = placesRes.data?.restaurants || [];
    if (verified.length > 0) {
      const groundedRaw = verified.map(p => ({
        name: p.name,
        address: p.address,
        city: p.city || primaryCity,
        zip_code: p.zip_code || "",
        cuisine: p.cuisine || "",
        data_confidence: "low", // verified to exist; no inspection record (yet)
        is_currently_operating: p.business_status === "OPERATIONAL" ? true : null,
        verification_source: "Google Places",
      }));
      const overlay = (built, i) => ({
        ...built,
        latitude: verified[i].latitude,
        longitude: verified[i].longitude,
        place_id: verified[i].place_id,
      });
      // Places addresses are authoritative. A result is in-location if the strict
      // city check passes OR the searched city/county appears in the result's
      // address or locality (handles village-vs-town mismatches like
      // Willimantic → Windham CT, and "Windham County" vs locality "Windham").
      const needle = (primaryCity || "").toLowerCase().replace(/\s+county$/i, "").trim();
      const inLocation = (r) => {
        if (!needle) return true;
        if (!r._wrongLocation) return true;
        return (r.address || "").toLowerCase().includes(needle) ||
               (r.city || "").toLowerCase().includes(needle);
      };
      let grounded = groundedRaw.map((r, i) => overlay(buildFn(r, i), i)).filter(inLocation);
      grounded = deduplicateResults(grounded);

      if (grounded.length > 0) {
        // GEO-ROUTING: derive the inspection jurisdiction from the verified
        // address rather than the user's dropdown selection.
        const route = geoRoute(verified[0].state, verified[0].city);

        // Address sits in live-API territory → query the real source (no LLM)
        if (route.type === "registry" && route.countyId !== countyId && !_geoRouting) {
          _geoRouting = true;
          try {
            const routed = await search({ query, countyId: route.countyId, locationLabel, today, onAccurateResults });
            if (routed?.results?.length > 0 && !routed.isAI) {
              saveCache(routed.results);
              return routed;
            }
          } catch { /* routed source failed — continue with grounded flow */ }
          finally { _geoRouting = false; }
        }

        // Jurisdiction is known to publish nothing machine-readable → the
        // grounded list IS the final answer; skip the slow web-search pass.
        if (route.type === "none") {
          saveCache(grounded);
          return { results: grounded, isAI: true };
        }

        // Background: inspection enrichment for the verified list only
        llmCall(PROMPT_ENRICH(groundedRaw, location, today), true, INSPECTION_SCHEMA)
          .then((res) => {
            const found = Array.isArray(res?.inspections) ? res.inspections : [];
            const byIdx = new Map(found.filter(f => Number.isInteger(f.idx)).map(f => [f.idx, f]));
            const enriched = groundedRaw.map((raw, i) => {
              const insp = byIdx.get(i);
              const merged = insp ? {
                ...raw,
                latest_score: insp.latest_score ?? null,
                latest_date: insp.latest_date || "",
                latest_result: insp.latest_result || "",
                total_inspections: insp.total_inspections || null,
                violations: insp.violations || [],
                data_confidence: insp.data_confidence || "low",
                verification_source: insp.verification_source || "Google Places",
              } : raw;
              return overlay(buildFn(merged, i), i);
            }).filter(inLocation);
            const finalResults = deduplicateResults(enriched);
            if (finalResults.length > 0) {
              saveCache(finalResults);
              if (onAccurateResults) onAccurateResults(finalResults);
            }
          }).catch(() => {});
        saveCache(grounded);
        return { results: grounded, isAI: true };
      }
    }
  } catch { /* Places unavailable — fall through to pure-AI flow */ }

  // PURE-AI PATH (previous behavior): only when Places fails or returns nothing
  const basePrompt = location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today);
  const enhancedPrompt = ctx ? `${basePrompt}\n- ${ctx}` : basePrompt;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(enhancedPrompt, true),
    buildFn,
    false,
    onAccurateResults
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

/**
 * FAST-FIRST STRATEGY: return the fast (training-data) LLM results immediately
 * so the user sees results in 2-4 seconds. The accurate (web-search) LLM runs
 * in the background and silently updates results via onAccurateResults when done.
 * Only if fast results are empty do we wait for the web search.
 */
async function runWithFastResults(fastPromise, accuratePromise, buildFn, isDubaiSearch = false, onAccurateResults) {
  // Await fast results — this returns in 2-4 seconds.
  // Fast (training-data) results get the SAME verification filter as accurate
  // results — address-less or unverified entries must never reach the UI.
  const fastRes = await fastPromise;
  let fast = filterUnverified(fastRes?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation);
  if (isDubaiSearch) {
    fast = fast.filter(r => isDubaiLocation(r.city, r.address));
  }
  fast = deduplicateResults(fast);

  // If fast results exist, return them immediately and fire web search in background
  if (fast.length > 0) {
    accuratePromise.then((res) => {
      const verified = filterUnverified(res?.restaurants || []);
      let accurate = verified.map(buildFn).filter(r => !r._wrongLocation);
      if (isDubaiSearch) {
        accurate = accurate.filter(r => isDubaiLocation(r.city, r.address));
      }
      accurate = deduplicateResults(accurate);
      if (accurate.length > 0 && onAccurateResults) onAccurateResults(accurate);
    }).catch(() => {});
    return fast;
  }

  // No fast results — wait for web search to get something to show
  const result = await accuratePromise;
  const verified = filterUnverified(result?.restaurants || []);
  let restaurants = verified.map(buildFn).filter(r => !r._wrongLocation);
  if (isDubaiSearch) {
    restaurants = restaurants.filter(r => isDubaiLocation(r.city, r.address));
  }
  return deduplicateResults(restaurants);
}

export async function search({ query, countyId, locationLabel, today, signal, onAccurateResults, onCountUpdate }) {
  // All UK cities route through the live FSA API (national search, UK-wide coverage)
  if (UK_CITY_IDS.has(countyId) || countyId === "uk_fsa") {
    try {
      const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
      const establishments = res.data?.establishments || [];
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
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Singapore — live data via data.gov.sg CKAN API
  if (countyId === "singapore") {
    try {
      const res = await base44.functions.invoke("singaporeInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      if (records.length > 0) {
        const liveResults = filterByNameRelevance(processSingaporeResults(records, res.data?.resourceId), query);
        if (liveResults.length > 0) return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Australia NSW / QLD — live data via state open data portals
  if (countyId === "sydney" || countyId === "brisbane" || countyId === "gold_coast") {
    try {
      const state = (countyId === "brisbane" || countyId === "gold_coast") ? "qld" : "nsw";
      const res = await base44.functions.invoke("australiaFoodSafety", { action: "search", name: query, state });
      const records = res.data?.records || [];
      if (records.length > 0) {
        const liveResults = filterByNameRelevance(processNSWResults(records, res.data?.state), query);
        if (liveResults.length > 0) return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Toronto DineSafe (CKAN — needs backend proxy)
  if (countyId === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processTorontoResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Boston (CKAN — needs backend proxy)
  if (countyId === "boston") {
    try {
      const res = await base44.functions.invoke("bostonFoodInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processBostonResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Stanislaus County CA (scraped portal, with AI fallback)
  if (countyId === "stanislaus") {
    try {
      const res = await base44.functions.invoke("stanislausInspections", { action: "search", name: query });
      const facilities = res.data?.facilities || [];
      const liveResults = filterByNameRelevance(processStanislausResults(facilities), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    // Not in county database — fall back to AI web search
    const location = locationLabel?.trim() || "Modesto, Stanislaus County, CA";
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT(query, location), false),
      llmCall(PROMPT_LOCATION(query, location, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location, "Modesto"),
      false,
      onAccurateResults
    );
    return { results: restaurants, isAI: true };
  }

  // Los Angeles County (ArcGIS Feature Service via backend proxy)
  if (countyId === "la") {
    try {
      const res = await base44.functions.invoke("laCountyInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processLAResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Houston (CKAN — needs backend proxy)
  if (countyId === "houston") {
    try {
      const res = await base44.functions.invoke("houstonFoodInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processHoustonResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
  }

  // Live government API
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    let allResults;
    try {
      const raw = await fetch(buildSearchUrl(entry, query), signal ? { signal } : {}).then(r => r.json());
      allResults = PROCESSORS[countyId].process(Array.isArray(raw) ? raw : []);
    } catch {
      // Network error, CORS, or abort — fall back to AI search
      return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
    }

    // Post-fetch relevance filter: keep only results whose name actually matches the query.
    const results = filterByNameRelevance(allResults, query);

    // If live API returned nothing, fall back to AI
    if (results.length === 0) {
      return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults);
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
      true,
      onAccurateResults
    );
    return { results: restaurants, isAI: true };
  }

  // AI global/location search
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today), true),
    (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", location || ""),
    false,
    onAccurateResults
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
    try {
      const [restname, ...addrParts] = business_id.split("-");
      const restaddress = addrParts.join("-");
      const url = `${entry.endpoint}?$where=upper(restname)='${encodeURIComponent((restname || "").toUpperCase())}' AND upper(restaddress)='${encodeURIComponent((restaddress || "").toUpperCase())}'&$limit=500&$order=${entry.dateField} DESC`;
      const data = await fetch(url).then(r => r.json());
      return delawareToDetailRows(Array.isArray(data) ? data : []);
    } catch { return []; }
  }

  try {
    const data = await fetch(buildDetailUrl(entry, business_id)).then(r => r.json());
    const rows = Array.isArray(data) ? data : [];
    if (countyId === "king") return rows;
    return PROCESSORS[countyId].toDetailRows(rows);
  } catch { return []; }
}