import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SearchBar from "../components/SearchBar";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";
import MapView from "../components/MapView";
import FilterSortControls from "../components/FilterSortControls";
import DataVisualizations from "../components/DataVisualizations";

const KING_API = "https://data.kingcounty.gov/resource/f29f-zza5.json";

const REGIONS = {
  washington: {
    name: "Washington",
    abbr: "WA",
    counties: [
      { id: "king", name: "King County", city: "Seattle", hasPublicApi: true },
      { id: "snohomish", name: "Snohomish County", city: "Everett", hasPublicApi: false },
      { id: "pierce", name: "Pierce County", city: "Tacoma", hasPublicApi: false },
      { id: "thurston", name: "Thurston County", city: "Olympia", hasPublicApi: false },
      { id: "kitsap", name: "Kitsap County", city: "Bremerton", hasPublicApi: false },
    ],
  },
  nevada: {
    name: "Nevada",
    abbr: "NV",
    counties: [
      { id: "clark", name: "Clark County (Las Vegas Metro)", city: "Las Vegas", hasPublicApi: false },
    ],
  },
};

export function getGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-slate-900 text-white";
    case "B": return "bg-slate-600 text-white";
    case "C": return "bg-amber-500 text-white";
    case "D": return "bg-orange-500 text-white";
    case "F": return "bg-red-600 text-white";
    default: return "bg-slate-400 text-white";
  }
}

function processKingCountyResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.business_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.name || row.inspection_business_name,
        address: row.address,
        city: row.city,
        zip_code: row.zip_code,
        phone: row.phone,
        description: row.description,
        inspections: [],
        allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const serialNum = row.inspection_serial_num;
    if (!businesses[id].inspections.find((i) => i.serial === serialNum)) {
      businesses[id].inspections.push({
        serial: serialNum,
        date: row.inspection_date,
        score: parseInt(row.inspection_score) || 0,
        result: row.inspection_result,
      });
    }
  });

  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = Math.max(0, Math.min(100, 100 - (latest?.score || 0)));
    const rowWithCoords = biz.allRows.find((r) => r.latitude && r.longitude);
    return {
      ...biz,
      safetyScore,
      grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: latest?.result,
      latitude: rowWithCoords?.latitude,
      longitude: rowWithCoords?.longitude,
      isLLMData: false,
    };
  });
}

function llmToDetailRows(restaurant) {
  const rows = [];
  (restaurant.allInspections || []).forEach((insp, inspIndex) => {
    const violations = insp.violations || [];
    if (violations.length === 0) {
      rows.push({
        inspection_serial_num: `llm-${inspIndex}`,
        inspection_date: insp.date,
        inspection_score: String(insp.violation_points || 0),
        inspection_result: insp.result || "Unknown",
        inspection_type: insp.type || "Routine",
        violation_description: "",
        violation_type: "",
        violation_points: "0",
      });
    } else {
      violations.forEach((v) => {
        rows.push({
          inspection_serial_num: `llm-${inspIndex}`,
          inspection_date: insp.date,
          inspection_score: String(insp.violation_points || 0),
          inspection_result: insp.result || "Unknown",
          inspection_type: insp.type || "Routine",
          violation_description: typeof v === "string" ? v : v.description || "",
          violation_type: typeof v === "object" && v.severity === "critical" ? "RED" : "BLUE",
          violation_points: typeof v === "object" ? String(v.points || 0) : "0",
        });
      });
    }
  });
  return rows;
}

async function geocodeAddress(address, city, stateAbbr) {
  const query = `${address}, ${city}, ${stateAbbr}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
  const data = await res.json();
  if (data.length > 0) return { latitude: data[0].lat, longitude: data[0].lon };
  return null;
}

export default function Home() {
  const [region, setRegion] = useState("washington");
  const [countyId, setCountyId] = useState("king");
  const [results, setResults] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [filterResult, setFilterResult] = useState("all");
  const [sortBy, setSortBy] = useState("score-high");
  const [isGeocodingMap, setIsGeocodingMap] = useState(false);

  const currentRegion = REGIONS[region];
  const currentCounty = currentRegion.counties.find((c) => c.id === countyId) || currentRegion.counties[0];

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

  const handleSearch = useCallback(
    async (query) => {
      setIsLoading(true);
      setHasSearched(true);
      setSearchQuery(query);
      setSelectedBusiness(null);
      setViewMode("list");

      if (currentCounty.hasPublicApi) {
        const cleanedQuery = query.replace(/['-]/g, "");
        const encodedQuery = encodeURIComponent(cleanedQuery.toUpperCase());
        const encodedOriginal = encodeURIComponent(query.toUpperCase());
        const url = `${KING_API}?$where=upper(replace(replace(name, '''', ''), '-', '')) like '%25${encodedQuery}%25' OR upper(replace(replace(address, '''', ''), '-', '')) like '%25${encodedQuery}%25' OR upper(replace(replace(inspection_business_name, '''', ''), '-', '')) like '%25${encodedQuery}%25' OR upper(name) like '%25${encodedOriginal}%25' OR upper(address) like '%25${encodedOriginal}%25' OR upper(inspection_business_name) like '%25${encodedOriginal}%25'&$limit=500&$order=inspection_date DESC`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        setResults(processKingCountyResults(data));
      } else {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Find health inspection records for food establishments matching "${query}" in ${currentCounty.name}, ${currentRegion.abbr}. Search the official health department records. Return ALL matching establishments. Include COMPLETE inspection history with all dates going back as far as available. For each inspection, provide: date, result (Satisfactory/Unsatisfactory/Pass/Fail etc), a 0-100 safety score where 100=no violations, total violation points, and ALL violations found. Be thorough and accurate with real data only.`,
          add_context_from_internet: true,
          response_json_schema: {
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
                    inspections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string" },
                          score: { type: "number" },
                          result: { type: "string" },
                          type: { type: "string" },
                          violation_points: { type: "number" },
                          violations: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                description: { type: "string" },
                                severity: { type: "string" },
                                points: { type: "number" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const restaurants = (result?.restaurants || []).map((r, index) => {
          const inspections = (r.inspections || []).sort((a, b) => new Date(b.date) - new Date(a.date));
          const latest = inspections[0];
          const safetyScore =
            latest?.score !== undefined
              ? Math.max(0, Math.min(100, latest.score))
              : Math.max(0, Math.min(100, 100 - (latest?.violation_points || 0)));

          return {
            business_id: `${countyId}-${index}-${r.name}`,
            name: r.name,
            address: r.address || "",
            city: r.city || currentCounty.city,
            zip_code: r.zip_code || "",
            phone: r.phone || "",
            description: "",
            safetyScore,
            grade: getGrade(safetyScore),
            totalInspections: inspections.length,
            latestDate: latest?.date,
            latestResult: latest?.result,
            latitude: null,
            longitude: null,
            isLLMData: true,
            allInspections: inspections,
            allRows: [],
          };
        });
        setResults(restaurants);
      }
      setIsLoading(false);
    },
    [currentCounty, currentRegion, countyId]
  );

  const handleSelectBusiness = useCallback(async (biz) => {
    setIsDetailLoading(true);
    setSelectedBusiness(biz);
    if (!biz.isLLMData) {
      const url = `${KING_API}?business_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch details");
      const data = await response.json();
      setDetailRows(Array.isArray(data) ? data : []);
    } else {
      setDetailRows(llmToDetailRows(biz));
    }
    setIsDetailLoading(false);
  }, []);

  const handleSwitchToMap = useCallback(async () => {
    setViewMode("map");
    const needsGeocode = results.some((r) => !r.latitude);
    if (!needsGeocode) return;
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
    let filtered = [...results];
    if (filterResult !== "all") filtered = filtered.filter((r) => r.latestResult === filterResult);
    switch (sortBy) {
      case "score-high": filtered.sort((a, b) => b.safetyScore - a.safetyScore); break;
      case "score-low": filtered.sort((a, b) => a.safetyScore - b.safetyScore); break;
      case "inspections": filtered.sort((a, b) => b.totalInspections - a.totalInspections); break;
      case "date-recent": filtered.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate)); break;
      case "date-oldest": filtered.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate)); break;
      default: filtered.sort((a, b) => b.safetyScore - a.safetyScore);
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

          {/* State selector */}
          <div className="flex justify-center gap-3 mb-4">
            {Object.entries(REGIONS).map(([key, reg]) => (
              <button
                key={key}
                onClick={() => handleRegionChange(key)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  region === key
                    ? "bg-white text-slate-900"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {reg.name}
              </button>
            ))}
          </div>

          {/* County selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {currentRegion.counties.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCountyId(c.id); resetSearch(); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  countyId === c.id
                    ? "bg-white text-slate-900 shadow"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          {!currentCounty.hasPublicApi && (
            <p className="text-center text-xs text-slate-500 mt-3">
              AI-assisted lookup for {currentCounty.name} · results sourced from official health department records
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20 pt-8">
        <AnimatePresence mode="wait">
          {selectedBusiness ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-slate-400">Loading inspection details...</p>
                </div>
              ) : (
                <RestaurantDetail
                  restaurant={selectedBusiness}
                  inspections={detailRows}
                  onBack={() => setSelectedBusiness(null)}
                />
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
                          <p className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-800">{filteredAndSortedResults.length}</span> of {results.length} establishment{results.length !== 1 ? "s" : ""} for "{searchQuery}"
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewMode("list")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >List</button>
                            <button
                              onClick={viewMode !== "map" ? handleSwitchToMap : undefined}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "map" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >Map</button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <FilterSortControls
                            filterResult={filterResult}
                            onFilterChange={setFilterResult}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                          />
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
                              <motion.div
                                key={r.business_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <RestaurantCard restaurant={r} onClick={() => handleSelectBusiness(r)} />
                              </motion.div>
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