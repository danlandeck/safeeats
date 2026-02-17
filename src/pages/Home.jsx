import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, TrendingDown, Utensils } from "lucide-react";
import SearchBar from "../components/SearchBar";
import RestaurantCard from "../components/RestaurantCard";
import RestaurantDetail from "../components/RestaurantDetail";
import ScoreLegend from "../components/ScoreLegend";

const API_BASE = "https://data.kingcounty.gov/resource/f29f-zza5.json";

function processResults(data) {
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

    return {
      ...biz,
      safetyScore,
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: latest?.result,
    };
  }).sort((a, b) => b.totalInspections - a.totalInspections);
}

export default function Home() {
  const [results, setResults] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(async (query) => {
    setIsLoading(true);
    setHasSearched(true);
    setSearchQuery(query);
    setSelectedBusiness(null);
    
    const encodedQuery = encodeURIComponent(query.toUpperCase());
    const url = `${API_BASE}?$where=upper(name) like '%25${encodedQuery}%25' OR upper(address) like '%25${encodedQuery}%25' OR upper(inspection_business_name) like '%25${encodedQuery}%25'&$limit=500&$order=inspection_date DESC`;
    
    const response = await fetch(url);
    const data = await response.json();
    const processed = processResults(data);
    setResults(processed);
    setIsLoading(false);
  }, []);

  const handleSelectBusiness = useCallback(async (biz) => {
    setIsDetailLoading(true);
    setSelectedBusiness(biz);
    
    const url = `${API_BASE}?business_id=${biz.business_id}&$limit=1000&$order=inspection_date DESC`;
    const response = await fetch(url);
    const data = await response.json();
    setDetailRows(data);
    setIsDetailLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-transparent to-cyan-50/40" />
        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100/80 rounded-full text-emerald-700 text-xs font-semibold mb-4 tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              King County Food Safety
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Is your restaurant <br className="hidden sm:block" />
              <span className="text-emerald-600">safe to eat at?</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
              Search real King County health inspection data. See safety scores, violations, and full inspection history.
            </p>
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
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
                            <span className="font-semibold text-slate-700">{results.length}</span> establishment{results.length !== 1 ? "s" : ""} found for "{searchQuery}"
                          </p>
                        </div>
                        <div className="space-y-3">
                          {results.map((r) => (
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
                      <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                          How Scoring Works
                        </h3>
                        <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
                          <div className="flex gap-2">
                            <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-red-600">RED</strong> violations are critical food safety risks (e.g. temperature, contamination)</span>
                          </div>
                          <div className="flex gap-2">
                            <TrendingDown className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <span><strong className="text-blue-600">BLUE</strong> violations are non-critical operational issues</span>
                          </div>
                          <p>Each violation adds penalty points. Higher penalties = lower safety score.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!hasSearched && (
                <div className="text-center py-12">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                    {[
                      { icon: ShieldCheck, title: "Real-time Data", desc: "Direct from King County Public Health" },
                      { icon: Utensils, title: "Safety Scores", desc: "Color-coded 0-100 safety rating" },
                      { icon: TrendingDown, title: "Violation Details", desc: "Full writeups with severity levels" },
                    ].map(({ icon: Icon, title, desc }) => (
                      <div key={title} className="text-center p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Icon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{desc}</p>
                      </div>
                    ))}
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