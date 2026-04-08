import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, X, GitCompareArrows, LocateFixed, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { REGIONS } from "../utils/regions";
import { getTranslations } from "../utils/i18n";
import { getGrade } from "../utils/grading";
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
  geocodeAddress,
} from "../utils/inspectionProcessors";
import SearchBar, { parseLocationQuery } from "../components/SearchBar";
import CameraScanner from "../components/CameraScanner";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";
import MapView from "../components/MapView";
import FilterSortControls from "../components/FilterSortControls";
import DataVisualizations from "../components/DataVisualizations";

import ComparePanel from "../components/ComparePanel";
import LocalAreaMap from "../components/LocalAreaMap";
import ConsentBanner, { useConsent } from "../components/ConsentBanner";

export { getGrade };
export { getGradeColor } from "../utils/grading";

const KING_API       = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API        = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API    = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";
const AUSTIN_API     = "https://data.austintexas.gov/resource/ecmv-9xxi.json";
const SF_API         = "https://data.sfgov.org/resource/pyih-qa8i.json";
const LA_API         = "https://data.lacity.org/resource/29fd-3paw.json";

const LLM_PROMPT = (query, countyName, regionAbbr, today) => `Today is ${today}. Search the web for real health inspection records for "${query}" in ${countyName}${regionAbbr && regionAbbr !== countyName ? ', ' + regionAbbr : ''}.

CRITICAL RULES:
- If "${query}" looks like a specific restaurant name, return ONLY that restaurant's locations (exact name matches only).
- If "${query}" is a cuisine/food type, return up to 8 real restaurants of that type in the area.
- Every record MUST be a real, verifiable business. No invented addresses. No placeholders.
- Use the local health department website, state inspection database, or Yelp health score disclosures as sources.
- latest_score must be a real integer 0–100 from actual inspection history (higher = safer).
- latest_result: use the actual outcome — Pass, Fail, Satisfactory, Unsatisfactory, Closed, Conditional Pass, etc.
- violations: list actual violations found, not generic descriptions.
- If you cannot find real inspection data for a restaurant, omit it entirely rather than guessing.`;

const LLM_PROMPT_CITY = (query, city, today) => `Today is ${today}. Search the web for real health inspection records for "${query}" in ${city}.

CRITICAL RULES:
- If "${query}" looks like a specific restaurant name, return ONLY that restaurant's locations in ${city}.
- If "${query}" is a cuisine/food type, return up to 8 real restaurants of that type in ${city}.
- Every record MUST be a real, verifiable business with a real address in ${city}.
- Use the local health department website, state inspection database, or Yelp health score disclosures as sources.
- latest_score: real integer 0–100 from actual inspection history.
- latest_result: actual inspection outcome (Pass, Fail, Satisfactory, Unsatisfactory, Closed, etc.)
- violations: list actual violations found. Omit any restaurant you cannot verify.`;

const LLM_PROMPT_GLOBAL = (query, today) => `Today is ${today}. Search the web for real health inspection records for "${query}" anywhere in the world.

CRITICAL RULES:
- If "${query}" looks like a specific restaurant name or chain, return up to 8 real locations of that exact chain.
- If "${query}" is a cuisine/food type, return up to 8 well-known real restaurants of that cuisine worldwide.
- Every record MUST be a real, verifiable business. No invented data.
- Use health department databases, local government inspection sites, or Yelp disclosures as sources.
- latest_score: real integer 0–100. latest_result: actual inspection outcome.
- violations: real violations only. Omit any restaurant you cannot verify.`;

// City aliases → { region, countyId } for all supported live API counties
const CITY_TO_COUNTY = {
  // King County, WA — all cities, neighborhoods, and unincorporated areas
  "seattle": { region: "washington", countyId: "king" },
  "bellevue": { region: "washington", countyId: "king" },
  "redmond": { region: "washington", countyId: "king" },
  "kirkland": { region: "washington", countyId: "king" },
  "renton": { region: "washington", countyId: "king" },
  "kent": { region: "washington", countyId: "king" },
  "burien": { region: "washington", countyId: "king" },
  "federal way": { region: "washington", countyId: "king" },
  "auburn": { region: "washington", countyId: "king" },
  "shoreline": { region: "washington", countyId: "king" },
  "bothell": { region: "washington", countyId: "king" },
  "sammamish": { region: "washington", countyId: "king" },
  "issaquah": { region: "washington", countyId: "king" },
  "king county": { region: "washington", countyId: "king" },
  "mercer island": { region: "washington", countyId: "king" },
  "newcastle": { region: "washington", countyId: "king" },
  "covington": { region: "washington", countyId: "king" },
  "maple valley": { region: "washington", countyId: "king" },
  "black diamond": { region: "washington", countyId: "king" },
  "enumclaw": { region: "washington", countyId: "king" },
  "duvall": { region: "washington", countyId: "king" },
  "snoqualmie": { region: "washington", countyId: "king" },
  "north bend": { region: "washington", countyId: "king" },
  "carnation": { region: "washington", countyId: "king" },
  "skykomish": { region: "washington", countyId: "king" },
  "tukwila": { region: "washington", countyId: "king" },
  "seatac": { region: "washington", countyId: "king" },
  "sea-tac": { region: "washington", countyId: "king" },
  "des moines": { region: "washington", countyId: "king" },
  "normandy park": { region: "washington", countyId: "king" },
  "algona": { region: "washington", countyId: "king" },
  "pacific": { region: "washington", countyId: "king" },
  "milton": { region: "washington", countyId: "king" },
  "medina": { region: "washington", countyId: "king" },
  "clyde hill": { region: "washington", countyId: "king" },
  "yarrow point": { region: "washington", countyId: "king" },
  "hunts point": { region: "washington", countyId: "king" },
  "beaux arts": { region: "washington", countyId: "king" },
  "lake forest park": { region: "washington", countyId: "king" },
  "kenmore": { region: "washington", countyId: "king" },
  "woodinville": { region: "washington", countyId: "king" },
  // Seattle neighborhoods (all in King County)
  "capitol hill": { region: "washington", countyId: "king" },
  "ballard": { region: "washington", countyId: "king" },
  "fremont": { region: "washington", countyId: "king" },
  "queen anne": { region: "washington", countyId: "king" },
  "south lake union": { region: "washington", countyId: "king" },
  "pioneer square": { region: "washington", countyId: "king" },
  "chinatown": { region: "washington", countyId: "king" },
  "international district": { region: "washington", countyId: "king" },
  "belltown": { region: "washington", countyId: "king" },
  "west seattle": { region: "washington", countyId: "king" },
  "columbia city": { region: "washington", countyId: "king" },
  "rainier valley": { region: "washington", countyId: "king" },
  "u district": { region: "washington", countyId: "king" },
  "university district": { region: "washington", countyId: "king" },
  "greenwood": { region: "washington", countyId: "king" },
  "phinney ridge": { region: "washington", countyId: "king" },
  "wallingford": { region: "washington", countyId: "king" },
  "eastlake": { region: "washington", countyId: "king" },
  "madison park": { region: "washington", countyId: "king" },
  "montlake": { region: "washington", countyId: "king" },
  "madrona": { region: "washington", countyId: "king" },
  "beacon hill": { region: "washington", countyId: "king" },
  "georgetown": { region: "washington", countyId: "king" },
  "sodo": { region: "washington", countyId: "king" },
  "interbay": { region: "washington", countyId: "king" },
  "magnolia": { region: "washington", countyId: "king" },
  "crown hill": { region: "washington", countyId: "king" },
  "bitter lake": { region: "washington", countyId: "king" },
  "northgate": { region: "washington", countyId: "king" },
  "lake city": { region: "washington", countyId: "king" },
  "wedgwood": { region: "washington", countyId: "king" },
  "ravenna": { region: "washington", countyId: "king" },
  "bryant": { region: "washington", countyId: "king" },
  "sand point": { region: "washington", countyId: "king" },
  "maple leaf": { region: "washington", countyId: "king" },
  "victory heights": { region: "washington", countyId: "king" },
  "pinehurst": { region: "washington", countyId: "king" },
  "cedar park": { region: "washington", countyId: "king" },
  "olympic hills": { region: "washington", countyId: "king" },
  "haller lake": { region: "washington", countyId: "king" },
  "licton springs": { region: "washington", countyId: "king" },
  "green lake": { region: "washington", countyId: "king" },
  "tangletown": { region: "washington", countyId: "king" },
  "phinney": { region: "washington", countyId: "king" },
  "hawthorne hills": { region: "washington", countyId: "king" },
  "laurelhurst": { region: "washington", countyId: "king" },
  "leschi": { region: "washington", countyId: "king" },
  "mt baker": { region: "washington", countyId: "king" },
  "mount baker": { region: "washington", countyId: "king" },
  "seward park": { region: "washington", countyId: "king" },
  "hillman city": { region: "washington", countyId: "king" },
  "brighton": { region: "washington", countyId: "king" },
  "dunlap": { region: "washington", countyId: "king" },
  "skyway": { region: "washington", countyId: "king" },
  "delridge": { region: "washington", countyId: "king" },
  "highland park": { region: "washington", countyId: "king" },
  "riverview": { region: "washington", countyId: "king" },
  "south park": { region: "washington", countyId: "king" },
  "fauntleroy": { region: "washington", countyId: "king" },
  "admiral": { region: "washington", countyId: "king" },
  "alki": { region: "washington", countyId: "king" },
  "junction": { region: "washington", countyId: "king" },
  "white center": { region: "washington", countyId: "king" },
  "arbor heights": { region: "washington", countyId: "king" },
  // NYC
  "new york": { region: "newyork", countyId: "nyc" },
  "new york city": { region: "newyork", countyId: "nyc" },
  "nyc": { region: "newyork", countyId: "nyc" },
  "manhattan": { region: "newyork", countyId: "nyc" },
  "brooklyn": { region: "newyork", countyId: "nyc" },
  "queens": { region: "newyork", countyId: "nyc" },
  "bronx": { region: "newyork", countyId: "nyc" },
  "staten island": { region: "newyork", countyId: "nyc" },
  "the bronx": { region: "newyork", countyId: "nyc" },
  // Chicago / Cook County
  "chicago": { region: "illinois", countyId: "cook" },
  "cook county": { region: "illinois", countyId: "cook" },
  // Montgomery County, MD
  "rockville": { region: "maryland", countyId: "montgomery_md" },
  "silver spring": { region: "maryland", countyId: "montgomery_md" },
  "bethesda": { region: "maryland", countyId: "montgomery_md" },
  "gaithersburg": { region: "maryland", countyId: "montgomery_md" },
  "germantown": { region: "maryland", countyId: "montgomery_md" },
  "montgomery county": { region: "maryland", countyId: "montgomery_md" },
  // Austin / Travis County
  "austin": { region: "texas", countyId: "travis" },
  "travis county": { region: "texas", countyId: "travis" },
  // San Francisco
  "san francisco": { region: "california", countyId: "sf" },
  "sf": { region: "california", countyId: "sf" },
  // Los Angeles
  "los angeles": { region: "california", countyId: "la" },
  "la": { region: "california", countyId: "la" },
  "hollywood": { region: "california", countyId: "la" },
  "santa monica": { region: "california", countyId: "la" },
  "long beach": { region: "california", countyId: "la" },
  "pasadena": { region: "california", countyId: "la" },
  "burbank": { region: "california", countyId: "la" },
  "glendale": { region: "california", countyId: "la" },
  "compton": { region: "california", countyId: "la" },
  "inglewood": { region: "california", countyId: "la" },
};

const LLM_SCHEMA = {
  type: "object",
  properties: {
    restaurants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          zip_code: { type: "string" },
          phone: { type: "string" },
          latest_score: { type: "number" },
          total_violation_points: { type: "number" },
          latest_date: { type: "string" },
          latest_result: { type: "string" },
          total_inspections: { type: "number" },
          violations: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

export default function Home() {
  const location = useLocation();
  const { consent, accept, decline } = useConsent();
  const consentGiven = consent?.location === true;
  const [region, setRegion]                   = useState("washington");
  const [countyId, setCountyId]               = useState("king");
  const pendingSearchRef                      = useRef(null);
  const [results, setResults]                 = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows]           = useState([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [loadingSeconds, setLoadingSeconds]   = useState(0);
  const loadingTimerRef                       = useRef(null);
  const abortRef                              = useRef(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched]         = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [viewMode, setViewMode]               = useState("list");
  const [filterResult, setFilterResult]       = useState("all");
  const [sortBy, setSortBy]                   = useState("score-high");
  const [dateFrom, setDateFrom]               = useState("");
  const [dateTo, setDateTo]                   = useState("");
  const [minScore, setMinScore]               = useState(0);
  const [activeGrade, setActiveGrade]         = useState(null);
  const [activeResult, setActiveResult]       = useState(null);
  const [isGeocodingMap, setIsGeocodingMap]   = useState(false);
  const [compareList, setCompareList]         = useState([]);
  const [showCompare, setShowCompare]         = useState(false);
  const [nearMeActive, setNearMeActive]       = useState(false);
  const [userCoords, setUserCoords]           = useState(null);
  const [isGeolocating, setIsGeolocating]     = useState(false);
  const [nearMeError, setNearMeError]         = useState("");
  const [showScanner, setShowScanner]         = useState(false);
  const searchCacheRef                        = useRef(null);
  if (!searchCacheRef.current) {
    try {
      const stored = localStorage.getItem('safeeats_cache');
      searchCacheRef.current = stored ? new Map(JSON.parse(stored)) : new Map();
    } catch { searchCacheRef.current = new Map(); }
  }
  const detailCacheRef                        = useRef(new Map());

  const handleToggleCompare = (restaurant) => {
    setCompareList((prev) => {
      const exists = prev.find((r) => r.business_id === restaurant.business_id);
      if (exists) return prev.filter((r) => r.business_id !== restaurant.business_id);
      if (prev.length >= 3) return prev;
      return [...prev, restaurant];
    });
  };

  const currentRegion = REGIONS[region];
  const currentCounty = currentRegion.counties.find((c) => c.id === countyId) || currentRegion.counties[0];
  const t = getTranslations(region);
  const isRTL = ["uae"].includes(region);

  // Auto-search from URL params (e.g. navigated here from CountyDrillDown)
  useEffect(() => {
    // If navigated with a pre-loaded restaurant, show it directly
    if (location.state?.restaurant) {
      const { restaurant, region: r, county: c } = location.state;
      if (r && REGIONS[r]) setRegion(r);
      if (c) setCountyId(c);
      setHasSearched(true);
      setSelectedBusiness(restaurant);
      setDetailRows(llmToDetailRows(restaurant));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const r = params.get("region");
    const c = params.get("county");
    if (q) {
      if (r && REGIONS[r]) setRegion(r);
      if (c) setCountyId(c);
      pendingSearchRef.current = q;
    }
  }, []);

  useEffect(() => {
    if (pendingSearchRef.current) {
      const q = pendingSearchRef.current;
      pendingSearchRef.current = null;
      handleSearch(q);
    }
  }, [countyId]);

  const resetSearch = () => {
    setResults([]);
    setHasSearched(false);
    setSelectedBusiness(null);
    window.history.pushState({}, '', window.location.pathname);
    setViewMode("list");
    setCompareList([]);
    setShowCompare(false);
    setActiveGrade(null);
    setActiveResult(null);
    setFilterResult("all");
    setMinScore(0);
    setDateFrom("");
    setDateTo("");
  };

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    setCountyId(REGIONS[newRegion].counties[0].id);
    resetSearch();
  };

  const handleSearch = useCallback(async (rawQuery) => {
    // Detect location-aware queries like "Subway, Seattle WA"
    let query = rawQuery;
    let searchRegion = region;
    let searchCounty = countyId;

    const parsed = parseLocationQuery(rawQuery);
    const hasLocationHint = !!parsed;

    if (parsed) {
      query = parsed.name || parsed.zip || parsed.city || rawQuery;

      // First: check city alias map for known county-level API cities
      const cityKey = (parsed.city || "").toLowerCase().trim();
      const aliasMatch = cityKey ? CITY_TO_COUNTY[cityKey] : null;
      if (aliasMatch && REGIONS[aliasMatch.region]) {
        searchRegion = aliasMatch.region;
        searchCounty = aliasMatch.countyId;
        setRegion(searchRegion);
        setCountyId(searchCounty);
      } else {
        // Fallback: match by state abbreviation
        const stateToMatch = parsed.state?.toUpperCase();
        const matchedRegionEntry = stateToMatch
          ? Object.entries(REGIONS).find(([, r]) => r.abbr?.toUpperCase() === stateToMatch)
          : null;

        if (matchedRegionEntry) {
          searchRegion = matchedRegionEntry[0];
          const matchedRegion = matchedRegionEntry[1];
          const cityLower = (parsed.city || "").toLowerCase();
          const matchedCounty = cityLower
            ? matchedRegion.counties.find(
                (c) => c.city.toLowerCase().includes(cityLower) || cityLower.includes(c.city.toLowerCase())
              ) || matchedRegion.counties[0]
            : matchedRegion.counties[0];
          searchCounty = matchedCounty.id;
          setRegion(searchRegion);
          setCountyId(searchCounty);
        }
      }

      if (!parsed.name) query = rawQuery;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    setIsLoading(true);
    setLoadingSeconds(0);
    loadingTimerRef.current = setInterval(() => setLoadingSeconds((s) => s + 1), 1000);
    setHasSearched(true);
    setSearchQuery(rawQuery);
    setSelectedBusiness(null);
    setViewMode("list");
    setActiveGrade(null);
    setActiveResult(null);

    const cacheKey = `${searchCounty}:${query.toLowerCase()}`;
    if (searchCacheRef.current.has(cacheKey)) {
      clearInterval(loadingTimerRef.current);
      setResults(searchCacheRef.current.get(cacheKey));
      setIsLoading(false);
      return;
    }

    const currentRegion = REGIONS[searchRegion];
    const currentCounty = currentRegion.counties.find((c) => c.id === searchCounty) || currentRegion.counties[0];
    const encode = (s) => encodeURIComponent(s.toUpperCase());
    const safeFetch = (url) => fetch(url, { signal }).then(r => r.json());
    const setAndCache = (data) => {
      searchCacheRef.current.set(cacheKey, data);
      try { localStorage.setItem('safeeats_cache', JSON.stringify([...searchCacheRef.current])); } catch {}
      setResults(data);
    };

    try {
      if (!hasLocationHint) {
        // No location = global LLM search
        const today = new Date().toISOString().slice(0, 10);
        const prompt = LLM_PROMPT_GLOBAL(query, today);
        const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: LLM_SCHEMA, model: "gemini_3_flash", add_context_from_internet: true });
        const raw = (result?.restaurants || []).map((r, i) => buildLLMRestaurant(r, i, "llm", r.city || ""));
        const seen = new Map();
        raw.forEach((r) => {
          const key = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${r.address.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
          if (!seen.has(key) || r.safetyScore > seen.get(key).safetyScore) seen.set(key, r);
        });
        setAndCache(Array.from(seen.values()));
      } else if (parsed?.city && !parsed?.state) {
        // City-only hint (e.g. "Taco Bell, San Diego") — scoped LLM search
        const today = new Date().toISOString().slice(0, 10);
        const prompt = LLM_PROMPT_CITY(query, parsed.city, today);
        const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: LLM_SCHEMA, model: "gemini_3_flash", add_context_from_internet: true });
        const raw = (result?.restaurants || []).map((r, i) => buildLLMRestaurant(r, i, "llm", r.city || parsed.city));
        const seen = new Map();
        raw.forEach((r) => {
          const key = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${r.address.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
          if (!seen.has(key) || r.safetyScore > seen.get(key).safetyScore) seen.set(key, r);
        });
        setAndCache(Array.from(seen.values()));
      } else if (searchCounty === "nyc") {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${NYC_API}?$where=upper(replace(replace(dba,chr(39),''),'-','')) like '%25${clean}%25'&$limit=50&$order=inspection_date DESC`;
        setAndCache(processNYCResults(await safeFetch(url)));
      } else if (searchCounty === "cook") {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${CHICAGO_API}?$where=upper(replace(dba_name,chr(39),'')) like '%25${clean}%25'&$limit=50&$order=inspection_date DESC`;
        setAndCache(processChicagoResults(await safeFetch(url)));
      } else if (searchCounty === "montgomery_md") {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${MONTGOMERY_API}?$where=upper(replace(name,chr(39),'')) like '%25${clean}%25'&$limit=50&$order=inspectiondate DESC`;
        setAndCache(processMontgomeryResults(await safeFetch(url)));
      } else if (searchCounty === "travis") {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${AUSTIN_API}?$where=upper(replace(restaurant_name,chr(39),'')) like '%25${clean}%25'&$limit=50&$order=inspection_date DESC`;
        setAndCache(processAustinResults(await safeFetch(url)));
      } else if (searchCounty === "sf") {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${SF_API}?$where=upper(replace(business_name,chr(39),'')) like '%25${clean}%25'&$limit=50&$order=inspection_date DESC`;
        setAndCache(processSFResults(await safeFetch(url)));
      } else if (searchCounty === "la") {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${LA_API}?$where=upper(replace(facility_name,chr(39),'')) like '%25${clean}%25'&$limit=50&$order=activity_date DESC`;
        setAndCache(processLAResults(await safeFetch(url)));
      } else if (currentCounty.hasPublicApi) {
        const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9]/g, " ").replace(/\s+/g, " ").trim().toUpperCase());
        const url = `${KING_API}?$where=upper(replace(name,chr(39),'')) like '%25${clean}%25' OR upper(replace(name,'-','')) like '%25${clean}%25' OR upper(address) like '%25${clean}%25' OR zip_code like '%25${encodeURIComponent(query.trim())}%25'&$limit=50&$order=inspection_date DESC`;
        setAndCache(processKingCountyResults(await safeFetch(url)));
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const prompt = LLM_PROMPT(query, currentCounty.name, currentRegion.abbr, today);
        const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: LLM_SCHEMA, model: "gemini_3_flash", add_context_from_internet: true });
        const raw = (result?.restaurants || []).map((r, i) => buildLLMRestaurant(r, i, searchCounty, currentCounty.city));
        const seen = new Map();
        raw.forEach((r) => {
          const key = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${r.address.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
          if (!seen.has(key) || r.safetyScore > seen.get(key).safetyScore) seen.set(key, r);
        });
        setAndCache(Array.from(seen.values()));
      }
    } catch (e) {
      if (e.name !== "AbortError") throw e;
      return;
    }

    clearInterval(loadingTimerRef.current);
    setIsLoading(false);
  }, [region, countyId]);

  const handleSelectBusiness = useCallback(async (biz) => {
    setSelectedBusiness(biz);
    window.history.pushState({}, '', `?q=${encodeURIComponent(searchQuery)}&biz=${encodeURIComponent(biz.business_id)}`);

    if (detailCacheRef.current.has(biz.business_id)) {
      setDetailRows(detailCacheRef.current.get(biz.business_id));
      return;
    }

    setIsDetailLoading(true);
    const cacheAndSet = (rows) => { detailCacheRef.current.set(biz.business_id, rows); setDetailRows(rows); };

    if (biz.source === "nyc") {
      const data = await fetch(`${NYC_API}?camis=${biz.business_id}&$limit=500&$order=inspection_date DESC`).then((r) => r.json());
      cacheAndSet(nycToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "chicago") {
      const data = await fetch(`${CHICAGO_API}?license_=${biz.business_id}&$limit=500&$order=inspection_date DESC`).then((r) => r.json());
      cacheAndSet(chicagoToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "montgomery") {
      const data = await fetch(`${MONTGOMERY_API}?establishment_id=${biz.business_id}&$limit=500&$order=inspectiondate DESC`).then((r) => r.json());
      cacheAndSet(montgomeryToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "austin") {
      const data = await fetch(`${AUSTIN_API}?facility_id=${biz.business_id}&$limit=500&$order=inspection_date DESC`).then((r) => r.json());
      cacheAndSet(austinToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "sf") {
      const data = await fetch(`${SF_API}?business_id=${biz.business_id}&$limit=500&$order=inspection_date DESC`).then((r) => r.json());
      cacheAndSet(sfToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "la") {
      const data = await fetch(`${LA_API}?facility_id=${biz.business_id}&$limit=500&$order=activity_date DESC`).then((r) => r.json());
      cacheAndSet(laToDetailRows(Array.isArray(data) ? data : []));
    } else if (!biz.isLLMData) {
      const data = await fetch(`${KING_API}?business_id=${biz.business_id}&$limit=500&$order=inspection_date DESC`).then((r) => r.json());
      cacheAndSet(Array.isArray(data) ? data : []);
    } else {
      cacheAndSet(llmToDetailRows(biz));
    }

    setIsDetailLoading(false);
  }, []);

  const handleSwitchToMap = useCallback(() => {
    setViewMode("map");
  }, []);

  // Haversine distance in miles
  const haversineMiles = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleFindNearMe = useCallback(async () => {
    if (nearMeActive) { setNearMeActive(false); setUserCoords(null); setNearMeError(""); return; }
    setNearMeError("");
    setIsGeolocating(true);
    const abbr = REGIONS[region].abbr;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        // Geocode any results missing coords
        const missing = results.filter((r) => !r.latitude || !r.longitude);
        await Promise.all(missing.map(async (r) => {
          const gc = await geocodeAddress(r.address, r.city, abbr).catch(() => null);
          if (gc) setResults((prev) => prev.map((p) => p.business_id === r.business_id ? { ...p, ...gc } : p));
        }));
        setNearMeActive(true);
        setIsGeolocating(false);
      },
      () => { setNearMeError("Location access denied."); setIsGeolocating(false); }
    );
  }, [nearMeActive, region, results]);

  const filteredAndSortedResults = useMemo(() => {
    let filtered = filterResult === "all" ? [...results] : results.filter((r) => {
      const rv = (r.latestResult || "").toLowerCase();
      const fv = filterResult.toLowerCase();
      return rv === fv || rv.includes(fv);
    });
    if (dateFrom) filtered = filtered.filter((r) => r.latestDate && r.latestDate >= dateFrom);
    if (dateTo)   filtered = filtered.filter((r) => r.latestDate && r.latestDate <= dateTo);
    if (minScore > 0) filtered = filtered.filter((r) => r.safetyScore >= minScore);
    if (activeGrade) {
      const gradeRanges = { "A (90-100)": [90,100], "B (80-89)": [80,89], "C (70-79)": [70,79], "D (60-69)": [60,69], "F (<60)": [0,59] };
      const [lo, hi] = gradeRanges[activeGrade] || [0, 100];
      filtered = filtered.filter((r) => r.safetyScore >= lo && r.safetyScore <= hi);
    }
    if (activeResult) filtered = filtered.filter((r) => (r.latestResult || "").toLowerCase() === activeResult.toLowerCase());
    switch (sortBy) {
      case "score-high":   filtered.sort((a, b) => b.safetyScore - a.safetyScore || b.totalInspections - a.totalInspections); break;
      case "score-low":    filtered.sort((a, b) => a.safetyScore - b.safetyScore || b.totalInspections - a.totalInspections); break;
      case "inspections":  filtered.sort((a, b) => b.totalInspections - a.totalInspections || b.safetyScore - a.safetyScore); break;
      case "date-recent":  filtered.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate)); break;
      case "date-oldest":  filtered.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate)); break;
      default:             filtered.sort((a, b) => b.safetyScore - a.safetyScore);
    }
    if (nearMeActive && userCoords) {
      filtered = filtered.filter((r) => {
        if (!r.latitude || !r.longitude) return false;
        return haversineMiles(userCoords.lat, userCoords.lng, parseFloat(r.latitude), parseFloat(r.longitude)) <= 5;
      });
    }
    return filtered;
  }, [results, filterResult, sortBy, nearMeActive, userCoords, dateFrom, dateTo, minScore, activeGrade, activeResult]);

  const handleGeocodedMapSwitch = useCallback((sortedResults) => {
    const MAP_LIMIT = 10;
    const topResults = sortedResults.slice(0, MAP_LIMIT);
    if (!topResults.some((r) => !r.latitude)) return;
    const abbr = REGIONS[region].abbr;
    // Geocode each in background — map shows immediately, markers pop in as resolved
    topResults.forEach(async (r) => {
      if (r.latitude && r.longitude) return;
      const coords = await geocodeAddress(r.address, r.city, abbr).catch(() => null);
      if (coords) {
        setResults((prev) => prev.map((p) => p.business_id === r.business_id ? { ...p, ...coords } : p));
      }
    });
  }, [region]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight" dir={isRTL ? "rtl" : "ltr"}>
            {t.headline1}
            <br className="hidden sm:block" />
            <span className="text-slate-400"> {t.headline2}</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-400 font-medium">
            {t.subheadline}
            </p>
          </div>


          <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} placeholder={t.searchPlaceholder} dir={isRTL ? "rtl" : "ltr"} />
            </div>
            {hasSearched && (
              <button
                onClick={resetSearch}
                title="Start a new search"
                className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="text-[10px] font-bold">New Search</span>
              </button>
            )}
            <button
              onClick={() => setShowScanner(true)}
              title="Point your camera at a restaurant sign to identify it"
              className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 h-14 rounded-2xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <rect x="9" y="9" width="6" height="6" rx="1" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] font-bold">Scan Sign</span>
            </button>
          </div>

          {/* Search tips */}
          {!hasSearched && (
            <div className="mt-3 bg-amber-500/20 border border-amber-400/40 rounded-xl px-4 py-3 max-w-2xl mx-auto">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-1.5">⚡ For fastest results</p>
              <ul className="text-amber-200 text-xs space-y-1">
                <li>✅ <strong>Always include City + State</strong> — e.g. <span className="font-mono bg-black/20 px-1 rounded">Subway, New York NY</span></li>
                <li>✅ <strong>Use a supported city</strong> (King County WA, NYC, Chicago, Austin TX, SF CA, LA CA, Montgomery MD) for instant results</li>
                <li>⏳ <strong>Global / unknown cities</strong> use AI web search — takes 10–20 seconds, be patient</li>
                <li>🚫 <strong>Avoid vague queries</strong> like "pizza" with no location — forces a slow worldwide AI search</li>
              </ul>
            </div>
          )}

          {/* Quick demo search chips */}
          {!hasSearched && (
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl mx-auto">
              {[
                { label: "🍔 McDonald's, Seattle WA", query: "McDonald's, Seattle WA" },
                { label: "🌮 Subway, New York NY", query: "Subway, New York NY" },
                { label: "🍕 Pizza, Chicago IL", query: "pizza, Chicago IL" },
                { label: "🌯 Chipotle, San Francisco CA", query: "Chipotle, San Francisco CA" },
                { label: "🍣 Sushi, Los Angeles CA", query: "sushi, Los Angeles CA" },
              ].map(({ label, query }) => (
                <button
                  key={query}
                  onClick={() => handleSearch(query)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/20 transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">
        {!hasSearched && (
          <div className="space-y-10 mb-10">

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: "7", label: "Cities with live gov't APIs" },
                { value: "50K+", label: "Restaurants tracked" },
                { value: "100%", label: "Free & public data" },
                { value: "A–F", label: "Universal grading scale" },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                  <p className="text-2xl font-extrabold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 mb-4 text-center">How SafeEats Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: "1", icon: "🔍", title: "Search Any Restaurant", desc: "Type a name, cuisine, or location. We search live government health databases and AI sources instantly." },
                  { step: "2", icon: "📋", title: "See Real Inspection Data", desc: "Get the actual health inspection scores, violations, and pass/fail results — the same records inspectors file." },
                  { step: "3", icon: "🛡️", title: "Make an Informed Choice", desc: "Our A–F grading normalizes scores across cities so you can compare any restaurant, anywhere." },
                ].map(({ step, icon, title, desc }) => (
                  <div key={step} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-extrabold flex items-center justify-center flex-shrink-0">{step}</div>
                      <span className="text-2xl">{icon}</span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm mb-1">{title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Live data sources */}
            <div className="bg-slate-900 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-4">Live Government Data Sources</p>
              <div className="flex flex-wrap justify-center gap-3">
                {["King County, WA", "New York City, NY", "Chicago, IL", "Montgomery Co., MD", "Austin, TX", "San Francisco, CA", "Los Angeles, CA"].map(src => (
                  <span key={src} className="flex items-center gap-1.5 bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                    {src}
                  </span>
                ))}
              </div>
              <p className="text-center text-xs text-slate-500 mt-4">All other cities use AI-assisted research from publicly available health department records.</p>
            </div>

            <LocalAreaMap
              onSearch={(label, coords, radiusMiles) => {
                if (label) {
                  if (coords) {
                    setUserCoords(coords);
                    setNearMeActive(true);
                  }
                  handleSearch(label);
                }
              }}
              consentGiven={consentGiven}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {selectedBusiness ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-400">{t.loadingDetails}</p>
                </div>
              ) : (
                <RestaurantDetail restaurant={selectedBusiness} inspections={detailRows} onBack={() => setSelectedBusiness(null)} />
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {hasSearched && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-slate-400">
                          Searching restaurants worldwide{loadingSeconds >= 3 ? " — this may take a moment…" : "…"}
                        </p>
                        {loadingSeconds >= 8 && (
                          <p className="text-xs text-slate-400 mt-2">Cross-referencing multiple AI models for accuracy…</p>
                        )}
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              {t.resultsFor(filteredAndSortedResults.length, results.length, searchQuery)}
                              {nearMeActive && <span className="ml-1 text-blue-600">{t.withinDist}</span>}
                            </p>
                            {nearMeError && <p className="text-xs text-red-500 mt-0.5">{nearMeError}</p>}
                            <p className="text-xs text-slate-400 mt-0.5">Sorted by safety score · click any card for full inspection history</p>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button
                              onClick={handleFindNearMe}
                              disabled={isGeolocating}
                              title={nearMeActive ? "Click to turn off nearby filter" : "Filter to restaurants within 5 miles of you"}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                nearMeActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {isGeolocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                              {nearMeActive ? "📍 Near Me (ON)" : "📍 Near Me"}
                            </button>
                            <button onClick={() => setViewMode("list")} title="Show results as a list" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${viewMode === "list" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}>
                              📋 List
                            </button>
                            <button onClick={viewMode !== "map" ? () => { handleSwitchToMap(); handleGeocodedMapSwitch(filteredAndSortedResults); } : undefined} title="Show results on a map" className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${viewMode === "map" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}>
                              🗺️ Map
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <FilterSortControls
                            filterResult={filterResult} onFilterChange={setFilterResult}
                            sortBy={sortBy} onSortChange={setSortBy}
                            dateFrom={dateFrom} onDateFromChange={setDateFrom}
                            dateTo={dateTo} onDateToChange={setDateTo}
                            minScore={minScore} onMinScoreChange={setMinScore}
                          />
                        </div>

                        {(activeGrade || activeResult) && (
                          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                            <span className="text-xs font-semibold text-blue-700">Filtered by:</span>
                            {activeGrade && (
                              <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-lg">
                                {activeGrade}
                                <button onClick={() => setActiveGrade(null)} className="ml-1 hover:text-blue-600"><X className="w-3 h-3" /></button>
                              </span>
                            )}
                            {activeResult && (
                              <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-lg">
                                {activeResult}
                                <button onClick={() => setActiveResult(null)} className="ml-1 hover:text-blue-600"><X className="w-3 h-3" /></button>
                              </span>
                            )}
                            <button onClick={() => { setActiveGrade(null); setActiveResult(null); }} className="ml-auto text-xs text-blue-600 font-semibold hover:underline">Clear all</button>
                          </div>
                        )}

                        <div className="mb-6">
                          <DataVisualizations
                            restaurants={results}
                            activeGrade={activeGrade}
                            activeResult={activeResult}
                            onGradeClick={(g) => setActiveGrade(prev => prev === g ? null : g)}
                            onResultClick={(r) => setActiveResult(prev => prev === r ? null : r)}
                          />
                        </div>

                        {viewMode === "map" ? (
                          <MapView restaurants={filteredAndSortedResults} onSelectRestaurant={handleSelectBusiness} />
                        ) : (
                          <div className="space-y-3">
                            {filteredAndSortedResults.map((r) => (
                              <RestaurantCard
                                key={r.business_id}
                                restaurant={r}
                                onClick={() => handleSelectBusiness(r)}
                                onToggleCompare={handleToggleCompare}
                                isCompared={compareList.some((c) => c.business_id === r.business_id)}
                                compareDisabled={compareList.length >= 3}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Utensils className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">{t.noResults}</h3>
                        <p className="text-sm text-slate-400 mt-1 mb-6">{t.noResultsSub}</p>
                        <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wide">Try one of these instead</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {["McDonald's, Seattle WA", "Subway, New York NY", "Chipotle, Chicago IL", "Sushi, San Francisco CA"].map(q => (
                            <button key={q} onClick={() => handleSearch(q)}
                              className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-all">
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <div className="sticky top-6">
                      <ScoreLegend />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compare floating bar */}
      {compareList.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 max-w-lg w-[90vw]">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <GitCompareArrows className="w-4 h-4 text-blue-400" />
              Compare Side-by-Side
            </div>
            <div className="flex items-center gap-1 mt-1">
              {compareList.map((r) => (
                <span key={r.business_id} className="text-[11px] bg-slate-700 px-2 py-0.5 rounded-lg truncate max-w-[100px]">{r.name}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowCompare(true)}
            className="ml-auto bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            ⚖️ Compare Now
          </button>
          <button onClick={() => setCompareList([])} title="Clear comparison" className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showScanner && (
        <CameraScanner
          onResult={(query) => { handleSearch(query); }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <ConsentBanner onAccept={accept} onDecline={decline} />

      {showCompare && (
        <ComparePanel
          restaurants={compareList}
          onClose={() => setShowCompare(false)}
          onViewDetail={(r) => { setShowCompare(false); handleSelectBusiness(r); }}
        />
      )}
    </div>
  );
}