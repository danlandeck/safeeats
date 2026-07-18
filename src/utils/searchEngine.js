import { base44 } from "@/api/base44Client";
import { API_REGISTRY, LIVE_API_IDS, buildSearchUrl } from "./apiRegistry";
import {
  processKingCountyResults, processNYCResults, processChicagoResults,
  processMontgomeryResults, processAustinResults, processSFResults, processLAResults,
  processDelawareResults, processNYStateResults, processTorontoResults,
  processBostonResults, processHoustonResults, processStanislausResults,
  processVancouverBCResults, processSingaporeResults, processNSWResults,
  processTacomaPierceResults, processSNHDResults, processWakeCountyResults,
  processLouisvilleResults, processRiversideResults, processAlabamaResults,
  processMaricopaResults, processArkansasResults, processTriCountyCoResults,
  processFVHDResults, processDCResults, processFloridaResults,
  processGeorgiaResults, processIllinoisCDPResults, processIndianaMarionResults,
  processUKFSAResults, llmToDetailRows, buildLLMRestaurant,
  processMississippiResults,
  processOklahomaResults, processSCResults,
  processUtahResults,
  processSafefoodResults,
} from "./inspectionProcessors";
import { enrichResults, isStale } from "./backgroundEnrich";
import { resolveJurisdiction } from "./routing";
import { getJurisdictionPortal } from "./jurisdictionResolver";

// Split modules
import { PROCESSORS, SOURCE_TO_COUNTY } from "./search/registry";
import { UK_CITY_IDS, COUNTRY_CONTEXT, getCountryContext, getContextForLocation } from "./search/countryContext";
import {
  US_STATE_ABBRS, CA_PROVINCES, COUNTRY_ALIASES,
  resolveExpectedGeo, parseSearchQuery,
  filterByNameRelevance, rankByQueryRelevance, deduplicateResults, filterUnverified,
} from "./search/searchHelpers";
import {
  LLM_SCHEMA, INSPECTION_SCHEMA,
  PROMPT_ENRICH, PROMPT_LOCATION, PROMPT_GLOBAL, PROMPT_DUBAI,
  FAST_PROMPT, FAST_PROMPT_DUBAI, llmCall,
} from "./search/llmConfig";
import { fetchDetail } from "./search/fetchDetail";

// Re-export fetchDetail so existing imports from searchEngine still work
export { fetchDetail };

// ── Cache version stamp ──
const CACHE_VERSION = "v9";
(function purgeStaleCache() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("se-ai-cache-") && !k.startsWith(`se-ai-cache-${CACHE_VERSION}:`)) {
        localStorage.removeItem(k);
      }
    });
  } catch { /* localStorage unavailable */ }
})();

function getStatePortalInfo(state, city, country) {
  return getJurisdictionPortal(state, city, country);
}

// Re-entrancy guard: a geo-routed search() call that itself falls back to AI
// must not geo-route again.
let _geoRouting = false;

// ── Dubai location filtering ──────────────────────────────────────────────────
const US_CITIES = ["miami", "boston", "chicago", "los angeles", "san francisco", "austin", "seattle", "denver", "atlanta", "dallas", "houston", "phoenix", "orlando", "las vegas", "philadelphia"];
const US_STATES = ["florida", "new york", "massachusetts", "illinois", "california", "texas", "colorado", "georgia", "nevada", "pennsylvania", "washington dc"];
const NON_DUBAI = ["london", "paris", "tokyo", "abu dhabi", "dubai creek", "ras al khaimah", "fujairah", "umm al quwain", "ajman", "sharjah"];
const ALL_FORBIDDEN = [...new Set([...US_CITIES, ...US_STATES, ...NON_DUBAI])];

function isDubaiLocation(city, address) {
  const cityLower = (city || "").toLowerCase().trim();
  const addressLower = (address || "").toLowerCase();
  if (ALL_FORBIDDEN.some(f => cityLower.includes(f) || addressLower.includes(f))) return false;
  const isDubaiCity = cityLower === "dubai" || cityLower.startsWith("dubai,");
  const hasDubaiAddress = ["jumeirah", "deira", "bur dubai", "marina", "downtown dubai", "jbr", "difc", "business bay", "palm jumeirah", "sheikh zayed", "dubai", "uae"].some(m => addressLower.includes(m));
  return isDubaiCity && hasDubaiAddress;
}

function buildRestaurantWithLocationCheck(r, i, countyId, location, expectedCity) {
  let isWrongLocation = false;
  let isWrongState = false;

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
  } else if (expectedCity && expectedCity !== "Worldwide (AI Search)") {
    const resultCityLower = (r.city || "").toLowerCase().trim();
    const expectedLower = expectedCity.toLowerCase().trim();
    const expectedCleaned = expectedLower.replace(/,.*$/, "").trim();
    const isMatch = resultCityLower === expectedCleaned ||
                    resultCityLower.startsWith(expectedCleaned + ",") ||
                    resultCityLower.startsWith(expectedCleaned + " ");
    isWrongLocation = expectedCleaned.length > 2 && !isMatch;

    if (!isWrongLocation) {
      const expected = resolveExpectedGeo(location);
      if (expected) {
        const resultCountryRaw = (r.country || "").toUpperCase().trim();
        const resultCountry = COUNTRY_ALIASES[resultCountryRaw.toLowerCase()] || resultCountryRaw;
        if (resultCountry && resultCountry !== expected.country) isWrongState = true;
        if (!isWrongState && expected.state) {
          const resultState = (r.state || "").toUpperCase().trim();
          if (resultState && resultState !== expected.state) isWrongState = true;
        }
      }
    }
  }

  const built = buildLLMRestaurant(r, i, countyId, location, null);
  return { ...built, _wrongLocation: isWrongLocation, _wrongState: isWrongState };
}

async function runWithFastResults(fastPromise, accuratePromise, buildFn, isDubaiSearch = false, onAccurateResults, nameQuery = "") {
  const fastRes = await fastPromise;
  let fast = filterUnverified(fastRes?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation && !r._wrongState);
  if (isDubaiSearch) fast = fast.filter(r => isDubaiLocation(r.city, r.address));
  if (nameQuery) fast = filterByNameRelevance(fast, nameQuery);
  fast = deduplicateResults(fast);

  if (fast.length > 0) {
    accuratePromise.then((res) => {
      const verified = filterUnverified(res?.restaurants || []);
      let accurate = verified.map(buildFn).filter(r => !r._wrongLocation && !r._wrongState);
      if (isDubaiSearch) accurate = accurate.filter(r => isDubaiLocation(r.city, r.address));
      if (nameQuery) accurate = filterByNameRelevance(accurate, nameQuery);
      accurate = deduplicateResults(accurate);
      if (accurate.length > 0 && onAccurateResults) onAccurateResults(accurate);
    }).catch(() => {});
    return fast;
  }

  const result = await accuratePromise;
  const verified = filterUnverified(result?.restaurants || []);
  let restaurants = verified.map(buildFn).filter(r => !r._wrongLocation && !r._wrongState);
  if (isDubaiSearch) restaurants = restaurants.filter(r => isDubaiLocation(r.city, r.address));
  if (nameQuery) restaurants = filterByNameRelevance(restaurants, nameQuery);
  return deduplicateResults(restaurants);
}

async function aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, fetchInfo = {}) {
  const rawLabel = locationLabel?.trim() || "";
  const location = rawLabel && rawLabel !== "Worldwide (AI Search)" ? rawLabel : null;
  const primaryCity = location ? location.split(",")[0].trim() : "";
  const { nameQuery: filterQuery } = parseSearchQuery(query);
  const ctx = getCountryContext(countyId);
  const buildFn = (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", primaryCity);

  const seCacheKey = `se-ai-cache-${CACHE_VERSION}:${(location || "global").toLowerCase()}:${query.toLowerCase().trim()}`;
  try {
    const hit = JSON.parse(localStorage.getItem(seCacheKey) || "null");
    const hitTtl = hit?.ttl || 5 * 60 * 1000;
    if (hit && Date.now() - hit.at < hitTtl && Array.isArray(hit.results) && hit.results.length > 0) {
      return { results: hit.results, isAI: false };
    }
  } catch { /* unreadable cache — proceed */ }
  const saveCache = (results) => {
    try { localStorage.setItem(seCacheKey, JSON.stringify({ at: Date.now(), ttl: 24 * 60 * 60 * 1000, results })); } catch { /* quota */ }
  };
  const saveCacheShort = (results) => {
    try { localStorage.setItem(seCacheKey, JSON.stringify({ at: Date.now(), ttl: 5 * 60 * 1000, results })); } catch { /* quota */ }
  };

  try {
    const placesRes = await base44.functions.invoke("placesRestaurantSearch", { query: filterQuery || query, location });
    const verified = placesRes.data?.restaurants || [];
    if (verified.length > 0) {
      const liveApiNote = fetchInfo.liveApiFailed
        ? "Live government data source was temporarily unavailable. "
        : "";
      const groundedRaw = verified.map(p => ({
        name: p.name,
        address: p.address,
        city: p.city || primaryCity,
        state: p.state || "",
        country: p.country || "",
        zip_code: p.zip_code || "",
        cuisine: p.cuisine || "",
        data_confidence: "low",
        data_fetch_notes: liveApiNote,
        is_currently_operating: p.business_status === "OPERATIONAL" ? true : null,
        verification_source: "Google Places",
      }));
      const overlay = (built, i) => ({
        ...built,
        latitude: verified[i].latitude,
        longitude: verified[i].longitude,
        place_id: verified[i].place_id,
        country: verified[i].country,
      });
      const needle = (primaryCity || "").toLowerCase().replace(/\s+county$/i, "").trim();
      const inLocation = (r) => {
        if (r._wrongState) return false;
        if (!needle) return true;
        if (!r._wrongLocation) return true;
        return (r.address || "").toLowerCase().includes(needle) ||
               (r.city || "").toLowerCase().includes(needle);
      };
      let grounded = groundedRaw.map((r, i) => ({ ...overlay(buildFn(r, i), i), data_fetch_notes: r.data_fetch_notes || "" })).filter(inLocation);
      grounded = filterByNameRelevance(grounded, filterQuery);
      grounded = deduplicateResults(grounded);

      if (grounded.length > 0) {
        const route = resolveJurisdiction(verified[0].state, verified[0].city, verified[0].country);

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

        if (route.type === "none") {
          const portal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
          const withNotes = portal.note
            ? grounded.map(r => ({
                ...r,
                portal_url: portal.url,
                portal_name: portal.name,
                data_fetch_notes: (r.data_fetch_notes || "") + portal.note + "Inspection data is not available via automated systems for this jurisdiction.",
              }))
            : grounded;
          saveCache(withNotes);
          return { results: withNotes, isAI: false };
        }

        if (verified[0]?.state === "CT") {
          const ctPortal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
          if (ctPortal.url) {
            grounded = grounded.map(r => ({
              ...r,
              portal_url: ctPortal.url,
              portal_name: ctPortal.name,
              data_fetch_notes: (r.data_fetch_notes || "") + (ctPortal.note || ""),
            }));
          }
          enrichResults(grounded, "manchester_ct", (enriched) => {
            if (enriched && enriched.length > 0) {
              saveCache(enriched);
              if (onAccurateResults) onAccurateResults(enriched);
            }
          });
        } else {
          const enrichCtx = getContextForLocation(countyId, location, verified[0]?.country);
          llmCall(PROMPT_ENRICH(groundedRaw, location, today, enrichCtx), true, INSPECTION_SCHEMA)
            .then((res) => {
              const found = Array.isArray(res?.inspections) ? res.inspections : [];
              const byIdx = new Map(found.filter(f => Number.isInteger(f.idx)).map(f => [f.idx, f]));
              const portal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
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
                } : {
                  ...raw,
                  portal_url: portal.url,
                  portal_name: portal.name,
                  data_fetch_notes: (raw.data_fetch_notes || "") + portal.note + "No public inspection records found by AI web search.",
                };
                return { ...overlay(buildFn(merged, i), i), data_fetch_notes: merged.data_fetch_notes || "", portal_url: merged.portal_url, portal_name: merged.portal_name };
              }).filter(inLocation);
              const finalResults = deduplicateResults(filterByNameRelevance(enriched, filterQuery));
              if (finalResults.length > 0) {
                saveCache(finalResults);
                if (onAccurateResults) onAccurateResults(finalResults);
              }
            }).catch(() => {
              try {
                const portal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
                const failed = grounded.map(r => ({
                  ...r,
                  portal_url: portal.url,
                  portal_name: portal.name,
                  data_fetch_notes: (r.data_fetch_notes || "") + portal.note + "AI web search was unable to complete — please try again later.",
                }));
                saveCache(failed);
                if (portal.note && onAccurateResults) onAccurateResults(failed);
              } catch {}
            });
        }
        saveCacheShort(grounded);
        return { results: grounded, isAI: true };
      }
    }
  } catch { /* Places unavailable — fall through to pure-AI flow */ }

  const basePrompt = location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today);
  const enhancedPrompt = ctx ? `${basePrompt}\n- ${ctx}` : basePrompt;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(enhancedPrompt, true),
    buildFn,
    false,
    onAccurateResults,
    filterQuery
  );
  return { results: restaurants, isAI: true };
}

export async function search({ query, countyId, locationLabel, today, signal, onAccurateResults, onCountUpdate }) {
  // All UK cities route through the live FSA API
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
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
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
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Australia NSW / QLD
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
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Vancouver, BC
  if (countyId === "vancouver") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("vancouverBCInspections", { action: "search", name: nameQuery });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processVancouverBCResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        enrichResults(liveResults, "vancouver", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Toronto DineSafe
  if (countyId === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processTorontoResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Boston
  if (countyId === "boston") {
    try {
      const res = await base44.functions.invoke("bostonFoodInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processBostonResults(records), query);
      if (liveResults.length > 0) {
        enrichResults(liveResults, "boston", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Stanislaus County CA
  if (countyId === "stanislaus") {
    try {
      const res = await base44.functions.invoke("stanislausInspections", { action: "search", name: query });
      const facilities = res.data?.facilities || [];
      const liveResults = filterByNameRelevance(processStanislausResults(facilities), query);
      if (liveResults.length > 0) {
        enrichResults(liveResults, "stanislaus", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    const location = locationLabel?.trim() || "Modesto, Stanislaus County, CA";
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT(query, location), false),
      llmCall(PROMPT_LOCATION(query, location, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location, "Modesto"),
      false, onAccurateResults, parseSearchQuery(query).nameQuery
    );
    return { results: restaurants, isAI: true };
  }

  // Los Angeles County
  if (countyId === "la") {
    try {
      const res = await base44.functions.invoke("laCountyInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processLAResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Houston
  if (countyId === "houston") {
    try {
      const res = await base44.functions.invoke("houstonFoodInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processHoustonResults(records), query);
      if (liveResults.length > 0) {
        enrichResults(liveResults, "houston", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Live government API (King, NYC, Chicago, Montgomery, Austin, SF, Delaware, NY State, Tri-County CO)
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    const { nameQuery, locationHint } = parseSearchQuery(query);
    let allResults;
    try {
      const raw = await fetch(buildSearchUrl(entry, nameQuery), signal ? { signal } : {}).then(r => r.json());
      allResults = PROCESSORS[countyId].process(raw);
    } catch {
      return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
    }
    const results = rankByQueryRelevance(filterByNameRelevance(allResults, nameQuery), nameQuery, locationHint);
    if (results.length === 0) {
      return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
    }
    if (onCountUpdate && countyId !== "delaware" && !entry.isArcGIS) {
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
          if (trueCount > biz.totalInspections) onCountUpdate(biz.business_id, trueCount);
        } catch { /* background polish — silently ignore */ }
      });
    }
    if (results.some(r => isStale(r.latestDate) || r.safetyScore === null)) {
      enrichResults(results, countyId, onAccurateResults);
    }
    return { results, isAI: false };
  }

  // Wake County, NC
  if (countyId === "wake") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("wakeCountyInspections", { action: "search", name: nameQuery });
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processWakeCountyResults(res.data), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Louisville / Jefferson County, KY
  if (countyId === "jefferson_ky") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("louisvilleInspections", { action: "search", name: nameQuery });
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processLouisvilleResults(res.data?.records || []), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Riverside County, CA
  if (countyId === "riverside") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("riversideInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processRiversideResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        enrichResults(liveResults, "riverside", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Maricopa County, AZ
  if (countyId === "maricopa") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("maricopaInspections", { action: "search", query: nameQuery, city: cityName });
      const facilities = res.data?.results || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processMaricopaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        enrichResults(liveResults, "maricopa", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* ArcGIS search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Alabama — state-wide ADPH
  if (countyId === "alabama") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("alabamaFoodScores", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processAlabamaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Arkansas — state-wide ADH
  if (countyId === "arkansas") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("arkansasFoodScores", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processArkansasResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        enrichResults(liveResults, "arkansas", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Washington DC
  if (countyId === "dc") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("dcInspections", { action: "search", name: nameQuery });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processDCResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Florida — state-wide DBPR
  if (countyId === "florida") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("floridaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processFloridaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        enrichResults(liveResults, "florida", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // South Dakota, Vermont, Wyoming — shared safefoodinspection.com platform
  if (countyId === "sd_safefood" || countyId === "vt_safefood" || countyId === "wy_safefood") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const stateMap = { sd_safefood: "sd", vt_safefood: "vt", wy_safefood: "wy" };
      const stateCode = stateMap[countyId] || "sd";
      const res = await base44.functions.invoke("safefoodInspections", { action: "search", name: nameQuery, state: stateCode });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processSafefoodResults(facilities, stateCode), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Georgia — state-wide DPH
  if (countyId === "georgia") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("georgiaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processGeorgiaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Illinois CDP Portal
  if (countyId === "illinois_cdp") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("illinoisInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processIllinoisCDPResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Indiana Marion County (Indianapolis)
  if (countyId === "indiana_marion") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "Indianapolis";
      const res = await base44.functions.invoke("indianaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processIndianaMarionResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Mississippi — state-wide MSDH
  if (countyId === "mississippi") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("mississippiInspections", { action: "search", query: nameQuery });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processMississippiResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Oklahoma — state-wide OSDH
  if (countyId === "oklahoma") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("oklahomaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processOklahomaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Utah — Salt Lake County CDP Portal
  if (countyId === "utah_cdp") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("utahInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processUtahResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // South Carolina — state-wide SCDA FoodGrades
  if (countyId === "sc_food_grades") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("scFoodGrades", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processSCResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // FVHD — CT
  if (countyId === "fvhd") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("fvhdInspections", { action: "search", name: nameQuery, town: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processFVHDResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // SNHD — Clark County, NV
  if (countyId === "snhd") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "Las Vegas, NV";
      const res = await base44.functions.invoke("snhdInspections", { action: "search", name: nameQuery, city_name: cityName });
      const restaurants = res.data?.restaurants || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processSNHDResults(restaurants), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* SNHD search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Tacoma-Pierce County
  if (countyId === "pierce") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      let res = await base44.functions.invoke("tacomaPierceInspections", { action: "search", name: nameQuery });
      let facilities = res.data?.facilities || [];
      if (facilities.length === 0) {
        const firstWord = nameQuery.split(/\s+/)[0];
        if (firstWord && firstWord.length >= 3 && firstWord.toLowerCase() !== nameQuery.toLowerCase()) {
          res = await base44.functions.invoke("tacomaPierceInspections", { action: "search", name: firstWord });
          facilities = res.data?.facilities || [];
        }
      }
      if (facilities.length > 0) {
        const liveResults = rankByQueryRelevance(
          filterByNameRelevance(processTacomaPierceResults(facilities), nameQuery),
          nameQuery, locationHint
        );
        if (liveResults.length > 0) {
          enrichResults(liveResults, "pierce", onAccurateResults);
          return { results: liveResults, isAI: true };
        }
      }
    } catch { /* Accela search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Dubai — fully isolated path
  if (countyId === "dubai") {
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT_DUBAI(query), false),
      llmCall(PROMPT_DUBAI(query, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, "dubai", "Dubai", "Dubai"),
      true, onAccurateResults, parseSearchQuery(query).nameQuery
    );
    return { results: restaurants, isAI: true };
  }

  // AI global/location search — route through the Places-grounded fallback
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  return aiSearchFallback(query, countyId, location, today, onAccurateResults);
}