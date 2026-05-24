import React, { useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { clearSearchState } from "../utils/searchState";
import { useLanguage } from "../lib/LanguageContext";

const CITIES = [
  { label: "Seattle / King County",  value: "seattle",    region: "washington", countyId: "king" },
  { label: "New York City",           value: "nyc",        region: "new_york",   countyId: "nyc" },
  { label: "Chicago",                 value: "chicago",    region: "illinois",   countyId: "cook" },
  { label: "Austin",                  value: "austin",     region: "texas",      countyId: "travis" },
  { label: "San Francisco",           value: "sf",         region: "california", countyId: "sf" },
  { label: "Los Angeles",             value: "la",         region: "california", countyId: "la" },
  { label: "Montgomery County, MD",   value: "montgomery", region: "maryland",   countyId: "montgomery_md" },
];

export { CITIES };

export default function SmartSearchPanel({
  onRegionChange,
  onSearch,
  isLoading,
  activeCounty,
  query,
  onQueryChange,
}) {
  const { t } = useLanguage();
  const inputRef = useRef(null);

  // Find the currently selected city object based on activeCounty
  const selectedCity = CITIES.find(c => c.countyId === activeCounty) || CITIES[0];

  const handleCityChange = useCallback((e) => {
    const city = CITIES.find(c => c.value === e.target.value) || CITIES[0];
    onRegionChange({ region: city.region, countyId: city.countyId, label: city.label });
  }, [onRegionChange]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    clearSearchState();
    onSearch(q);
  }, [query, onSearch]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} role="search" aria-label="Search for restaurants">
        <div className="flex flex-col sm:flex-row gap-2">

          {/* City dropdown */}
          <div className="relative">
            <label htmlFor="city-select" className="sr-only">Select city</label>
            <select
              id="city-select"
              value={selectedCity.value}
              onChange={handleCityChange}
              className="h-16 pl-4 pr-10 rounded-2xl border-2 border-white/20 bg-white/10 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all appearance-none cursor-pointer w-full sm:w-auto"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
            >
              {CITIES.map(city => (
                <option key={city.value} value={city.value} style={{ background: "#1e293b", color: "#fff" }}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" aria-hidden="true" />
            <label htmlFor="search-restaurant" className="sr-only">Search restaurant name or cuisine type</label>
            <input
              id="search-restaurant"
              name="search-restaurant"
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t?.restaurantPlaceholder || `Restaurant name — e.g. "McDonald's" or "sushi"`}
              className="w-full pl-12 pr-10 h-16 rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder:text-slate-300 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQueryChange(""); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="h-16 px-7 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-50 text-white font-bold shadow-sm min-w-[90px] transition-colors touch-manipulation text-base focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#4CAF50]"
            aria-label={isLoading ? "Searching, please wait" : "Search restaurants"}
            aria-busy={isLoading}
          >
            {isLoading
              ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" /><span className="sr-only">Searching…</span></>
              : (t?.searchButton || "Search")}
          </button>

        </div>
      </form>
    </div>
  );
}