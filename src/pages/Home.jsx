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
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";
import MapView from "../components/MapView";
import FilterSortControls from "../components/FilterSortControls";
import DataVisualizations from "../components/DataVisualizations";
import NationalHeatMap from "../components/NationalHeatMap";
import ComparePanel from "../components/ComparePanel";

export { getGrade };
export { getGradeColor } from "../utils/grading";

const KING_API       = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API        = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API    = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";
const AUSTIN_API     = "https://data.austintexas.gov/resource/ecmv-9xxi.json";
const SF_API         = "https://data.sfgov.org/resource/pyih-qa8i.json";
const LA_API         = "https://data.lacity.org/resource/29fd-3paw.json";

const LLM_PROMPT = (query, countyName, regionAbbr, today) => `Today is ${today}. Find food establishments matching "${query}" in ${countyName}${regionAbbr && regionAbbr !== countyName ? ', ' + regionAbbr : ''} from official health department records.

Return up to 3 real matches. For each:
- name, address, city, zip_code, phone
- latest_score (0-100, 100=perfect), total_violation_points, latest_date (YYYY-MM-DD), latest_result
- total_inspections (count)
- violations: up to 2 short strings from the latest inspection

No duplicates. Use real names and addresses only.`;

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
  const [region, setRegion]                   = useState("washington");
  const [countyId, setCountyId]               = useState("king");
  const pendingSearchRef                      = useRef(null);
  const [results, setResults]                 = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows]           = useState([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [loadingSeconds, setLoadingSeconds]   = useState(0);
  const loadingTimerRef                       = useRef(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched]         = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [viewMode, setViewMode]               = useState("list");
  const [filterResult, setFilterResult]       = useState("all");
  const [sortBy, setSortBy]                   = useState("score-high");
  const [dateFrom, setDateFrom]               = useState("");
  const [dateTo, setDateTo]                   = useState("");
  const [minScore, setMinScore]               = useState(0);
  const [isGeocodingMap, setIsGeocodingMap]   = useState(false);
  const [compareList, setCompareList]         = useState([]);
  const [showCompare, setShowCompare]         = useState(false);
  const [nearMeActive, setNearMeActive]       = useState(false);
  const [userCoords, setUserCoords]           = useState(null);
  const [isGeolocating, setIsGeolocating]     = useState(false);
  const [nearMeError, setNearMeError]         = useState("");
  const searchCacheRef                        = useRef(new Map());
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
    setViewMode("list");
    setCompareList([]);
    setShowCompare(false);
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
    if (parsed) {
      query = parsed.name;
      // Find matching region by state abbreviation
      const matchedRegionEntry = Object.entries(REGIONS).find(([, r]) => r.abbr === parsed.state);
      if (matchedRegionEntry) {
        searchRegion = matchedRegionEntry[0];
        const matchedRegion = matchedRegionEntry[1];
        // Find best matching county by city name
        const cityLower = parsed.city.toLowerCase();
        const matchedCounty = matchedRegion.counties.find(
          (c) => c.city.toLowerCase().includes(cityLower) || cityLower.includes(c.city.toLowerCase())
        ) || matchedRegion.counties[0];
        searchCounty = matchedCounty.id;
        // Update dropdowns
        setRegion(searchRegion);
        setCountyId(searchCounty);
      }
    }

    setIsLoading(true);
    setLoadingSeconds(0);
    loadingTimerRef.current = setInterval(() => setLoadingSeconds((s) => s + 1), 1000);
    setHasSearched(true);
    setSearchQuery(rawQuery);
    setSelectedBusiness(null);
    setViewMode("list");

    const cacheKey = `${searchCounty}:${query.toLowerCase()}`;
    if (searchCacheRef.current.has(cacheKey)) {
      setResults(searchCacheRef.current.get(cacheKey));
      setIsLoading(false);
      return;
    }

    const currentRegion = REGIONS[searchRegion];
    const currentCounty = currentRegion.counties.find((c) => c.id === searchCounty) || currentRegion.counties[0];
    const encode = (s) => encodeURIComponent(s.toUpperCase());
    const setAndCache = (data) => { searchCacheRef.current.set(cacheKey, data); setResults(data); };

    if (searchCounty === "nyc") {
      const norm = query.replace(/['''\-]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
      const url = `${NYC_API}?$where=upper(replace(replace(dba,chr(39),''),'-','')) like '%25${encode(norm)}%25' OR upper(dba) like '%25${encode(query)}%25'&$limit=200&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processNYCResults(data));
    } else if (searchCounty === "cook") {
      const url = `${CHICAGO_API}?$where=upper(dba_name) like '%25${encode(query)}%25' OR upper(address) like '%25${encode(query)}%25'&$limit=200&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processChicagoResults(data));
    } else if (searchCounty === "montgomery_md") {
      const url = `${MONTGOMERY_API}?$where=upper(name) like '%25${encode(query)}%25' OR upper(address1) like '%25${encode(query)}%25'&$limit=200&$order=inspectiondate DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processMontgomeryResults(data));
    } else if (searchCounty === "travis") {
      const url = `${AUSTIN_API}?$where=upper(restaurant_name) like '%25${encode(query)}%25' OR upper(address) like '%25${encode(query)}%25'&$limit=200&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processAustinResults(data));
    } else if (searchCounty === "sf") {
      const url = `${SF_API}?$where=upper(business_name) like '%25${encode(query)}%25' OR upper(business_address) like '%25${encode(query)}%25'&$limit=200&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processSFResults(data));
    } else if (searchCounty === "la") {
      const url = `${LA_API}?$where=upper(facility_name) like '%25${encode(query)}%25' OR upper(facility_address) like '%25${encode(query)}%25'&$limit=200&$order=activity_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processLAResults(data));
    } else if (currentCounty.hasPublicApi) {
      const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, "").trim().toUpperCase());
      const url = `${KING_API}?$where=upper(name) like '%25${encode(query)}%25' OR upper(address) like '%25${encode(query)}%25' OR upper(replace(name,chr(39),'')) like '%25${clean}%25'&$limit=200&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setAndCache(processKingCountyResults(data));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: LLM_PROMPT(query, currentCounty.name, currentRegion.abbr, today),
        add_context_from_internet: true,
        response_json_schema: LLM_SCHEMA,
      });

      const raw = (result?.restaurants || []).map((r, i) =>
        buildLLMRestaurant(r, i, searchCounty, currentCounty.city)
      );

      const seen = new Map();
      raw.forEach((r) => {
        const key = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${r.address.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        if (!seen.has(key) || r.safetyScore > seen.get(key).safetyScore) seen.set(key, r);
      });
      setAndCache(Array.from(seen.values()));
    }

    clearInterval(loadingTimerRef.current);
    setIsLoading(false);
  }, [region, countyId]);

  const handleSelectBusiness = useCallback(async (biz) => {
    setSelectedBusiness(biz);

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
  }, [results, filterResult, sortBy, nearMeActive, userCoords, dateFrom, dateTo, minScore]);

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

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs font-semibold text-slate-500 tracking-widest uppercase">{t.labelCountry}</label>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer min-w-[240px]"
              >
                {(() => {
                  const intlKeys = new Set(["canada","uk","mexico","australia","france","germany","spain","italy","japan","brazil","india","south_korea","china","uae","singapore","netherlands","portugal","new_zealand","argentina","thailand","greece","turkey","south_africa"]);
                  const usEntries = Object.entries(REGIONS).filter(([k]) => !intlKeys.has(k)).sort(([,a],[,b]) => a.name.localeCompare(b.name));
                  const intlEntries = Object.entries(REGIONS).filter(([k]) => intlKeys.has(k)).sort(([,a],[,b]) => a.name.localeCompare(b.name));
                  return (
                    <>
                      <optgroup label={t.optgroupUS}>
                        {usEntries.map(([key, reg]) => <option key={key} value={key}>{reg.name}</option>)}
                      </optgroup>
                      <optgroup label={t.optgroupIntl}>
                        {intlEntries.map(([key, reg]) => <option key={key} value={key}>{reg.name}</option>)}
                      </optgroup>
                    </>
                  );
                })()}
              </select>
            </div>
            <div className="flex flex-col items-center gap-1">
              <label className="text-xs font-semibold text-slate-500 tracking-widest uppercase">{t.labelCity}</label>
              <select
                value={countyId}
                onChange={(e) => { setCountyId(e.target.value); resetSearch(); }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer min-w-[260px]"
              >
                {currentRegion.counties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} placeholder={t.searchPlaceholder} dir={isRTL ? "rtl" : "ltr"} />

          {!currentCounty.hasPublicApi && (
            <p className="text-center text-xs text-slate-500 mt-3">
              {t.aiDisclaimer(currentCounty.city)}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">
        {!hasSearched && (
          <div className="mb-10">
            <NationalHeatMap region={region} onNavigate={(r, c) => { handleRegionChange(r); setCountyId(c || REGIONS[r].counties[0].id); }} />
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
                         {currentCounty.hasPublicApi ? t.loading(currentCounty.name) : t.loadingAI(loadingSeconds)}
                        </p>
                        {!currentCounty.hasPublicApi && loadingSeconds >= 5 && (
                         <p className="text-xs text-slate-400 mt-2">{t.loadingAILong}</p>
                        )}
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-slate-500">
                              {t.resultsFor(filteredAndSortedResults.length, results.length, searchQuery)}
                              {nearMeActive && <span className="ml-1 text-blue-600 font-semibold">{t.withinDist}</span>}
                            </p>
                            {nearMeError && <p className="text-xs text-red-500 mt-0.5">{nearMeError}</p>}
                            <p className="text-xs text-slate-400 mt-0.5">{t.sortedBy}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleFindNearMe}
                              disabled={isGeolocating}
                              title={nearMeActive ? t.nearMeActive : t.nearMe}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                nearMeActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {isGeolocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                              {nearMeActive ? t.nearMeActive : t.nearMe}
                            </button>
                            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t.listLabel}</button>
                            <button onClick={viewMode !== "map" ? () => { handleSwitchToMap(); handleGeocodedMapSwitch(filteredAndSortedResults); } : undefined} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "map" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t.mapLabel}</button>
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

                        <div className="mb-6">
                          <DataVisualizations restaurants={filteredAndSortedResults} />
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
                      <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Utensils className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">{t.noResults}</h3>
                        <p className="text-sm text-slate-400 mt-1">{t.noResultsSub}</p>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <GitCompareArrows className="w-4 h-4 text-blue-400" />
            {compareList.length} {t.selected}
          </div>
          <div className="flex items-center gap-1">
            {compareList.map((r) => (
              <span key={r.business_id} className="text-xs bg-slate-700 px-2 py-1 rounded-lg truncate max-w-[120px]">{r.name}</span>
            ))}
          </div>
          <button
            onClick={() => setShowCompare(true)}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold px-4 py-1.5 rounded-xl transition-colors"
          >
            {t.compare}
          </button>
          <button onClick={() => setCompareList([])} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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