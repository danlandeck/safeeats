import React, { useState } from "react";
import { MapPin, Search, X } from "lucide-react";

const QUICK_CUISINES = [
  { label: "🍕 Pizza", q: "pizza" },
  { label: "🍔 Burgers", q: "burger" },
  { label: "🍣 Sushi", q: "sushi" },
  { label: "🌮 Tacos", q: "tacos" },
  { label: "🍜 Noodles", q: "noodles" },
  { label: "🥗 Salads", q: "salad" },
  { label: "🐔 Chicken", q: "chicken" },
  { label: "☕ Café", q: "cafe" },
];

const LIVE_API_CITIES = [
  { label: "Seattle", region: "washington", countyId: "king", emoji: "🌲" },
  { label: "New York", region: "new_york", countyId: "nyc", emoji: "🗽" },
  { label: "Chicago", region: "illinois", countyId: "cook", emoji: "🏙️" },
  { label: "Montgomery MD", region: "maryland", countyId: "montgomery_md", emoji: "🏛️" },
  { label: "Austin TX", region: "texas", countyId: "travis", emoji: "🤠" },
  { label: "San Francisco", region: "california", countyId: "sf", emoji: "🌉" },
  { label: "Los Angeles", region: "california", countyId: "la", emoji: "🌴" },
];

export default function SmartSearchPanel({
  locationQuery, onLocationChange, onRegionChange,
  onSearch, isLoading, activeRegion, activeCounty,
}) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const handleCuisineClick = (q) => {
    setQuery(q);
    onSearch(q);
  };

  const fieldClass =
    "w-full pl-11 pr-4 h-14 rounded-2xl border border-white/15 bg-white/10 text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/15 transition-all";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">

      {/* Location field */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
        <p className="text-[11px] font-extrabold text-[#81c784] uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Where are you eating?
        </p>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4CAF50] pointer-events-none" />
          <input
            value={locationQuery}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="City, state or country — e.g. Seattle, Tokyo, London…"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {LIVE_API_CITIES.map((city) => {
            const isActive = activeRegion === city.region && activeCounty === city.countyId;
            return (
              <button
                key={city.countyId}
                type="button"
                onClick={() => onRegionChange(city)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px] ${
                  isActive
                    ? "bg-[#4CAF50] text-white border-[#4CAF50]"
                    : "bg-white/10 text-slate-300 border-white/15 hover:bg-white/20 hover:text-white"
                }`}
              >
                {city.emoji} {city.label}
                {isActive && <span className="text-[9px] bg-white/25 px-1 py-0.5 rounded-full">✓</span>}
              </button>
            );
          })}
          <span className="flex items-center px-3 py-1.5 rounded-full text-xs text-slate-500 border border-white/10 min-h-[36px]">
            🌍 Or type any city
          </span>
        </div>
      </div>

      {/* Search field */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
        <p className="text-[11px] font-extrabold text-[#81c784] uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" /> Which restaurant or food type?
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Seattle eateries — e.g. Subway, pizza, sushi…"
                className={fieldClass + " pl-11"}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="h-14 px-6 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-50 text-white font-bold shadow-sm min-w-[80px] transition-colors"
            >
              {isLoading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                : "Search"}
            </button>
          </div>
        </form>

        {/* Quick cuisine chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {QUICK_CUISINES.map(({ label, q }) => (
            <button
              key={q}
              type="button"
              onClick={() => handleCuisineClick(q)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15 hover:bg-[#4CAF50]/20 hover:text-[#81c784] hover:border-[#4CAF50]/40 transition-all min-h-[36px]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}