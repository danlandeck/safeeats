import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, TrendingDown, Utensils } from "lucide-react";
import SearchBar from "../components/SearchBar";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";
import MapView from "../components/MapView";
import FilterSortControls from "../components/FilterSortControls";

const API_BASE = "https://data.kingcounty.gov/resource/f29f-zza5.json";

function processResults(data) {
  // Guard against non-array data
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // Group by business_id
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
    
    // Track unique inspections
    const serialNum = row.inspection_serial_num;
    if (!businesses[id].inspections.find(i => i.serial === serialNum)) {
      businesses[id].inspections.push({
        serial: serialNum,
        date: row.inspection_date,
        score: parseInt(row.inspection_score) || 0,
        result: row.inspection_result,
      });
    }
  });

  return Object.values(businesses).map((biz) => {
    // Sort inspections by date
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    
    // Safety score: lower penalty = better. King County scores are penalty points.
    // Typical max is around 100+ for bad places. We cap conversion at 100 penalty = 0 safety.
    const latestPenalty = latest ? latest.score : 0;
    const safetyScore = Math.max(0, Math.min(100, 100 - latestPenalty));

    // Get first row with valid coordinates
    const rowWithCoords = biz.allRows.find(r => r.latitude && r.longitude);

    return {
      ...biz,
      safetyScore,
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: latest?.result,
      latitude: rowWithCoords?.latitude,
      longitude: rowWithCoords?.longitude,
    };
  }).sort((a, b) => b.totalInspections - a.totalInspections);
}

export default function Home() {
  const [county, setCounty] = useState("king");
  const [results, setResults] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"
  const [filterResult, setFilterResult] = useState("all");
  const [sortBy, setSortBy] = useState("score-high");

  const handleSearch = useCallback(async (query) => {
    setIsLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    setSelectedBusiness(null);
    
    try {
      // Remove apostrophes and dashes for more flexible searching
      const cleanedQuery = query.replace(/['-]/g, '');
      const encodedQuery = encodeURIComponent(cleanedQuery.toUpperCase());
      
      // Also search with original query for exact matches
      const encodedOriginal = encodeURIComponent(query.toUpperCase());
      
      const url = `${API_BASE}?$where=upper(replace(replace(name, '''', ''), '-', '')) like '%25${encodedQuery}%25' OR upper(replace(replace(address, '''', ''), '-', '')) like '%25${encodedQuery}%25' OR upper(replace(replace(inspection_business_name, '''', ''), '-', '')) like '%25${encodedQuery}%25' OR upper(name) like '%25${encodedOriginal}%25' OR upper(address) like '%25${encodedOriginal}%25' OR upper(inspection_business_name) like '%25${encodedOriginal}%25'&$limit=500&$order=inspection_date DESC`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      const processed = processResults(data);
      setResults(processed);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectBusiness = useCallback(async (biz) => {
    setIsDetailLoading(true);
    setSelectedBusiness(biz);
    
    try {
      const url = `${API_BASE}?business_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch details');
      const data = await response.json();
      setDetailRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Detail fetch error:', error);
      setDetailRows([]);
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  // Apply filters and sorting
  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...results];
    
    // Apply filter
    if (filterResult !== "all") {
      filtered = filtered.filter(r => r.latestResult === filterResult);
    }
    
    // Apply sort
    switch (sortBy) {
      case "score-high":
        filtered.sort((a, b) => b.safetyScore - a.safetyScore);
        break;
      case "score-low":
        filtered.sort((a, b) => a.safetyScore - b.safetyScore);
        break;
      case "inspections":
        filtered.sort((a, b) => b.totalInspections - a.totalInspections);
        break;
      case "date-recent":
        filtered.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));
        break;
      case "date-oldest":
        filtered.sort((a, b) => new Date(a.latestDate) - new Date(b.latestDate));
        break;
      default:
        filtered.sort((a, b) => b.safetyScore - a.safetyScore);
    }
    
    return filtered;
  }, [results, filterResult, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-transparent to-cyan-50/40" />
        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Is your restaurant <br className="hidden sm:block" />
              <span className="text-emerald-600">safe to eat at?</span>
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-500">
              Search health inspection scores
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => setCounty("king")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                county === "king"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
              }`}
            >
              King
            </button>
            <button
              onClick={() => setCounty("snohomish")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                county === "snohomish"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
              }`}
            >
              Snohomish
            </button>
            <button
              onClick={() => setCounty("pierce")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                county === "pierce"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
              }`}
            >
              Pierce
            </button>
            <button
              onClick={() => setCounty("thurston")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                county === "thurston"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
              }`}
            >
              Thurston
            </button>
            <button
              onClick={() => setCounty("kitsap")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                county === "kitsap"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
              }`}
            >
              Kitsap
            </button>
          </div>

          {county === "king" ? (
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          ) : county === "snohomish" ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Snohomish County Inspections</h3>
              <p className="text-slate-600 mb-6">
                Search Snohomish County restaurant inspections on their official website
              </p>
              <a
                href="https://snohomishonline.envisionconnect.com/#/pa1/search"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm"
              >
                Visit Snohomish County Search
              </a>
            </div>
          ) : county === "pierce" ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Pierce County Inspections</h3>
              <p className="text-slate-600 mb-6">
                Search Pierce County (Tacoma) restaurant inspections and ratings on their official website
              </p>
              <a
                href="https://aca-prod.accela.com/TPCHD/GeneralProperty/PropertyLookUp.aspx?isFoodFacility=Y&TabName=APO"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm"
              >
                Visit Pierce County Search
              </a>
            </div>
          ) : county === "thurston" ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Thurston County Inspections</h3>
              <p className="text-slate-600 mb-6">
                Search Thurston County restaurant inspections on their official website
              </p>
              <a
                href="https://www.co.thurston.wa.us/apps/eh-food-inspections/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm"
              >
                Visit Thurston County Search
              </a>
            </div>
          ) : county === "kitsap" ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Kitsap County Inspections</h3>
              <p className="text-slate-600 mb-6">
                Search Kitsap County restaurant inspections on their official website
              </p>
              <a
                href="https://www.kitsappublichealth.org/fle/foodscores"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm"
              >
                Visit Kitsap County Search
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        {county === "king" && (
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
                  <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
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
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {hasSearched && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-slate-400">Searching King County records...</p>
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">{filteredAndSortedResults.length}</span> of {results.length} establishment{results.length !== 1 ? "s" : ""} for "{searchQuery}"
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setViewMode("list")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                viewMode === "list"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              List
                            </button>
                            <button
                              onClick={() => setViewMode("map")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                viewMode === "map"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Map
                            </button>
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
                        
                        {viewMode === "map" ? (
                          <MapView
                            restaurants={filteredAndSortedResults}
                            onSelectRestaurant={handleSelectBusiness}
                          />
                        ) : (
                          <div className="space-y-3">
                            {filteredAndSortedResults.map((r) => (
                              <motion.div
                                key={r.business_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <RestaurantCard
                                  restaurant={r}
                                  onClick={() => handleSelectBusiness(r)}
                                />
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

              {!hasSearched && null}
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}