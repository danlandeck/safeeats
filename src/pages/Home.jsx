import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { REGIONS } from "../utils/regions";
import { getGrade } from "../utils/grading";
import {
  processKingCountyResults,
  processNYCResults,
  processChicagoResults,
  processMontgomeryResults,
  processAustinResults,
  processSFResults,
  nycToDetailRows,
  chicagoToDetailRows,
  montgomeryToDetailRows,
  austinToDetailRows,
  sfToDetailRows,
  llmToDetailRows,
  buildLLMRestaurant,
  geocodeAddress,
} from "../utils/inspectionProcessors";
import SearchBar from "../components/SearchBar";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";
import MapView from "../components/MapView";
import FilterSortControls from "../components/FilterSortControls";
import DataVisualizations from "../components/DataVisualizations";
import NationalHeatMap from "../components/NationalHeatMap";

export { getGrade };
export { getGradeColor } from "../utils/grading";

const KING_API       = "https://data.kingcounty.gov/resource/f29f-zza5.json";
const NYC_API        = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const CHICAGO_API    = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
const MONTGOMERY_API = "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json";
const AUSTIN_API     = "https://data.austintexas.gov/resource/ecmv-9xxi.json";
const SF_API         = "https://data.sfgov.org/resource/pyih-qa8i.json";

const LLM_PROMPT = (query, countyName, regionAbbr, today) => `Today's date is ${today}. You are a food safety data expert. Search the official health department website and public records for food establishments matching "${query}" in ${countyName}, ${regionAbbr}.

Search these sources in order:
1. The official county/city health department inspection portal
2. State health department public database
3. Any open data portals (data.gov, Socrata, etc.) for that jurisdiction

Rules:
- Return each establishment ONCE only — no duplicates
- safetyScore = 0-100 (100 = perfect). Derive from: 100 - total_violation_points, clamped 0-100
- If result says Pass/Satisfactory/Compliant/Approved with 0 violation points, safetyScore must be ≥90
- Return up to 3 short violation descriptions (under 80 chars each) for the latest inspection
- inspection_history: return the COMPLETE lifetime inspection history — every inspection on record, most recent first
- Use real establishment names and real addresses from actual records`;

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
          inspection_history: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                total_violation_points: { type: "number" },
                result: { type: "string" },
                violations: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
  },
};

export default function Home() {
  const [region, setRegion]                   = useState("washington");
  const [countyId, setCountyId]               = useState("king");
  const [pendingSearch, setPendingSearch]     = useState(null);
  const [results, setResults]                 = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows]           = useState([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched]         = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  const [viewMode, setViewMode]               = useState("list");
  const [filterResult, setFilterResult]       = useState("all");
  const [sortBy, setSortBy]                   = useState("score-high");
  const [isGeocodingMap, setIsGeocodingMap]   = useState(false);

  const currentRegion = REGIONS[region];
  const currentCounty = currentRegion.counties.find((c) => c.id === countyId) || currentRegion.counties[0];

  // Auto-search from URL params (e.g. navigated here from CountyDrillDown)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const r = params.get("region");
    const c = params.get("county");
    if (q) {
      if (r && REGIONS[r]) setRegion(r);
      if (c) setCountyId(c);
      setPendingSearch(q);
    }
  }, []);

  useEffect(() => {
    if (pendingSearch) {
      setPendingSearch(null);
      handleSearch(pendingSearch);
    }
  }, [countyId, pendingSearch]);

  const resetSearch = () => {
    setResults([]);
    setHasSearched(false);
    setSelectedBusiness(null);
    setViewMode("list");
  };

  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
    setCountyId(REGIONS[newRegion].counties[0].id);
    resetSearch();
  };

  const handleSearch = useCallback(async (query) => {
    setIsLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    setSelectedBusiness(null);
    setViewMode("list");

    const encode = (s) => encodeURIComponent(s.toUpperCase());

    if (countyId === "nyc") {
      const norm = query.replace(/['''\-]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
      const url = `${NYC_API}?$where=upper(replace(replace(dba,chr(39),''),'-','')) like '%25${encode(norm)}%25' OR upper(dba) like '%25${encode(query)}%25'&$limit=500&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setResults(processNYCResults(data));
    } else if (countyId === "cook") {
      const url = `${CHICAGO_API}?$where=upper(dba_name) like '%25${encode(query)}%25' OR upper(address) like '%25${encode(query)}%25'&$limit=500&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setResults(processChicagoResults(data));
    } else if (countyId === "montgomery_md") {
      const url = `${MONTGOMERY_API}?$where=upper(name) like '%25${encode(query)}%25' OR upper(address1) like '%25${encode(query)}%25'&$limit=500&$order=inspectiondate DESC`;
      const data = await fetch(url).then((r) => r.json());
      setResults(processMontgomeryResults(data));
    } else if (countyId === "travis") {
      const url = `${AUSTIN_API}?$where=upper(restaurant_name) like '%25${encode(query)}%25' OR upper(address) like '%25${encode(query)}%25'&$limit=500&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setResults(processAustinResults(data));
    } else if (countyId === "sf") {
      const url = `${SF_API}?$where=upper(business_name) like '%25${encode(query)}%25' OR upper(business_address) like '%25${encode(query)}%25'&$limit=500&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setResults(processSFResults(data));
    } else if (currentCounty.hasPublicApi) {
      const clean = encodeURIComponent(query.replace(/[^a-zA-Z0-9 ]/g, "").trim().toUpperCase());
      const url = `${KING_API}?$where=upper(name) like '%25${encode(query)}%25' OR upper(address) like '%25${encode(query)}%25' OR upper(replace(name,chr(39),'')) like '%25${clean}%25'&$limit=500&$order=inspection_date DESC`;
      const data = await fetch(url).then((r) => r.json());
      setResults(processKingCountyResults(data));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: LLM_PROMPT(query, currentCounty.name, currentRegion.abbr, today),
        add_context_from_internet: true,
        response_json_schema: LLM_SCHEMA,
      });

      const raw = (result?.restaurants || []).map((r, i) =>
        buildLLMRestaurant(r, i, countyId, currentCounty.city)
      );

      // Deduplicate by name + address
      const seen = new Map();
      raw.forEach((r) => {
        const key = `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${r.address.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        if (!seen.has(key) || r.safetyScore > seen.get(key).safetyScore) seen.set(key, r);
      });
      setResults(Array.from(seen.values()));
    }

    setIsLoading(false);
  }, [currentCounty, currentRegion, countyId]);

  const handleSelectBusiness = useCallback(async (biz) => {
    setIsDetailLoading(true);
    setSelectedBusiness(biz);

    if (biz.source === "nyc") {
      const data = await fetch(`${NYC_API}?camis=${biz.business_id}&$limit=1000&$order=inspection_date DESC`).then((r) => r.json());
      setDetailRows(nycToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "chicago") {
      const data = await fetch(`${CHICAGO_API}?license_=${biz.business_id}&$limit=1000&$order=inspection_date DESC`).then((r) => r.json());
      setDetailRows(chicagoToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "montgomery") {
      const data = await fetch(`${MONTGOMERY_API}?establishment_id=${biz.business_id}&$limit=1000&$order=inspectiondate DESC`).then((r) => r.json());
      setDetailRows(montgomeryToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "austin") {
      const data = await fetch(`${AUSTIN_API}?facility_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`).then((r) => r.json());
      setDetailRows(austinToDetailRows(Array.isArray(data) ? data : []));
    } else if (biz.source === "sf") {
      const data = await fetch(`${SF_API}?business_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`).then((r) => r.json());
      setDetailRows(sfToDetailRows(Array.isArray(data) ? data : []));
    } else if (!biz.isLLMData) {
      const data = await fetch(`${KING_API}?business_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`).then((r) => r.json());
      setDetailRows(Array.isArray(data) ? data : []);
    } else {
      setDetailRows(llmToDetailRows(biz));
    }

    setIsDetailLoading(false);
  }, []);

  const handleSwitchToMap = useCallback(async () => {
    setViewMode("map");
    if (!results.some((r) => !r.latitude)) return;
    setIsGeocodingMap(true);
    const geocoded = await Promise.all(
      results.map(async (r) => {
        if (r.latitude && r.longitude) return r;
        const coords = await geocodeAddress(r.address, r.city, currentRegion.abbr);
        return coords ? { ...r, ...coords } : r;
      })
    );
    setResults(geocoded);
    setIsGeocodingMap(false);
  }, [results, currentRegion.abbr]);

  const filteredAndSortedResults = useMemo(() => {
    let filtered = filterResult === "all" ? [...results] : results.filter((r) => r.latestResult === filterResult);
    switch (sortBy) {
      case "score-high":   filtered.sort((a, b) => b.safetyScore - a.safetyScore || b.totalInspections - a.totalInspections); break;
      case "score-low":    filtered.sort((a, b) => a.safetyScore - b.safetyScore || b.totalInspections - a.totalInspections); break;
      case "inspections":  filtered.sort((a, b) => b.totalInspections - a.totalInspections || b.safetyScore - a.safetyScore); break;
      case "date-recent":  filtered.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate)); break;
      case "date-oldest":  filtered.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate)); break;
      default:             filtered.sort((a, b) => b.safetyScore - a.safetyScore);
    }
    return filtered;
  }, [results, filterResult, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              Is your restaurant
              <br className="hidden sm:block" />
              <span className="text-slate-400"> safe to eat at?</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-400 font-medium">
              Real health inspection data — every county, one platform
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <select
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer min-w-[220px]"
            >
              {Object.entries(REGIONS)
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .map(([key, reg]) => (
                  <option key={key} value={key}>{reg.name} ({reg.abbr})</option>
                ))}
            </select>
          </div>

          <div className="flex justify-center mb-6">
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

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {!currentCounty.hasPublicApi && (
            <p className="text-center text-xs text-slate-500 mt-3">
              AI-assisted lookup for {currentCounty.name} · searches publicly available official health department records · results may be incomplete if this jurisdiction does not publish data online
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">
        {!hasSearched && (
          <div className="mb-10">
            <NationalHeatMap />
          </div>
        )}

        <AnimatePresence mode="wait">
          {selectedBusiness ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-400">Loading inspection details...</p>
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
                        <p className="text-sm text-slate-400">Searching {currentCounty.name} records…</p>
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-slate-500">
                              <span className="font-semibold text-slate-800">{filteredAndSortedResults.length}</span> of {results.length} establishment{results.length !== 1 ? "s" : ""} for "{searchQuery}"
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Ties broken by inspection count — consistency over time ranks higher.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>List</button>
                            <button onClick={viewMode !== "map" ? handleSwitchToMap : undefined} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "map" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Map</button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <FilterSortControls filterResult={filterResult} onFilterChange={setFilterResult} sortBy={sortBy} onSortChange={setSortBy} />
                        </div>

                        <div className="mb-6">
                          <DataVisualizations restaurants={filteredAndSortedResults} />
                        </div>

                        {viewMode === "map" ? (
                          isGeocodingMap ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
                              <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-3" />
                              <p className="text-sm text-slate-500">Geocoding map locations…</p>
                            </div>
                          ) : (
                            <MapView restaurants={filteredAndSortedResults} onSelectRestaurant={handleSelectBusiness} />
                          )
                        ) : (
                          <div className="space-y-3">
                            {filteredAndSortedResults.map((r) => (
                              <RestaurantCard key={r.business_id} restaurant={r} onClick={() => handleSelectBusiness(r)} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Utensils className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700">No results found</h3>
                        <p className="text-sm text-slate-400 mt-1">Try a different restaurant name or address</p>
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
    </div>
  );
}