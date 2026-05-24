import React, { useRef, useCallback, useState } from "react";
import { Search, MapPin, UtensilsCrossed } from "lucide-react";
import { clearSearchState } from "../utils/searchState";

// ─── Market detection ─────────────────────────────────────────────────────────

const MARKETS = [
  {
    countyId: "king",
    region: "washington",
    label: "Seattle / King County",
    emoji: "🌲",
    keywords: ["seattle", "king county", "bellevue", "kirkland", "redmond", "renton", "kent",
      "bothell", "issaquah", "mercer island", "tukwila", "burien", "shoreline", "kenmore",
      "sammamish", "woodinville", "auburn"],
  },
  {
    countyId: "nyc",
    region: "new_york",
    label: "New York City",
    emoji: "🗽",
    keywords: ["new york", "nyc", "manhattan", "brooklyn", "queens", "bronx", "staten island"],
  },
  {
    countyId: "cook",
    region: "illinois",
    label: "Chicago",
    emoji: "🏙️",
    keywords: ["chicago", "cook county"],
  },
  {
    countyId: "travis",
    region: "texas",
    label: "Austin",
    emoji: "🤠",
    keywords: ["austin"],
  },
  {
    countyId: "sf",
    region: "california",
    label: "San Francisco",
    emoji: "🌉",
    keywords: ["san francisco", "sf"],
  },
  {
    countyId: "la",
    region: "california",
    label: "Los Angeles",
    emoji: "🌴",
    keywords: ["los angeles", "la", "hollywood", "santa monica", "pasadena", "los angeles county"],
  },
  {
    countyId: "montgomery_md",
    region: "maryland",
    label: "Montgomery County, MD",
    emoji: "🏛️",
    keywords: ["montgomery county", "rockville", "bethesda", "silver spring", "gaithersburg"],
  },
];

function detectMarket(locationInput) {
  const lower = locationInput.toLowerCase().trim();
  for (const market of MARKETS) {
    // Sort keywords longest-first to prefer more specific matches
    const sorted = [...market.keywords].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      if (lower.includes(kw)) return market;
    }
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartSearchPanel({ onSearch, isLoading, query, onQueryChange }) {
  const [locationValue, setLocationValue] = useState("");
  const [restaurantValue, setRestaurantValue] = useState(query || "");
  const [locationError, setLocationError] = useState("");
  const [restaurantError, setRestaurantError] = useState("");
  const [noMarketError, setNoMarketError] = useState(false);

  // Keep parent query in sync with restaurant field
  const handleRestaurantChange = useCallback((e) => {
    setRestaurantValue(e.target.value);
    onQueryChange(e.target.value);
    if (restaurantError) setRestaurantError("");
    setNoMarketError(false);
  }, [onQueryChange, restaurantError]);

  const handleLocationChange = useCallback((e) => {
    setLocationValue(e.target.value);
    if (locationError) setLocationError("");
    setNoMarketError(false);
  }, [locationError]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();

    let valid = true;
    if (!locationValue.trim()) {
      setLocationError("Please enter a location");
      valid = false;
    }
    if (!restaurantValue.trim()) {
      setRestaurantError("Please enter a restaurant name");
      valid = false;
    }
    if (!valid) return;

    const market = detectMarket(locationValue);
    if (!market) {
      setNoMarketError(true);
      return;
    }

    setNoMarketError(false);
    clearSearchState();
    onSearch(restaurantValue.trim(), {
      countyId: market.countyId,
      region: market.region,
      label: market.label,
    });
  }, [locationValue, restaurantValue, onSearch]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">

      <form onSubmit={handleSubmit} role="search" aria-label="Search for restaurants" noValidate>
        <div className="flex flex-col gap-3">

          {/* Row 1: Location */}
          <div className="flex flex-col gap-1">
            <label htmlFor="location-field" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              City, State, County, Country, Province, District, Parish, or Municipality
            </label>
            <div className="relative">
              <input
                id="location-field"
                value={locationValue}
                onChange={handleLocationChange}
                placeholder='e.g. "Seattle, WA" or "Chicago, IL" or "London, UK"'
                className={`w-full pl-4 pr-4 h-14 rounded-2xl border-2 bg-white/10 text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all ${locationError ? "border-red-400" : "border-white/20"}`}
                autoComplete="off"
                aria-describedby={locationError ? "location-error" : undefined}
                aria-invalid={!!locationError}
              />
            </div>
            {locationError && (
              <p id="location-error" className="text-xs text-red-400 font-semibold" role="alert">{locationError}</p>
            )}
          </div>

          {/* Row 2: Restaurant + Search button */}
          <div className="flex flex-col gap-1">
            <label htmlFor="restaurant-field" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" aria-hidden="true" />
              Restaurant Name
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="restaurant-field"
                  value={restaurantValue}
                  onChange={handleRestaurantChange}
                  placeholder={`e.g. "Dick's Burgers" or "Starbucks" or "Pizza Hut"`}
                  className={`w-full pl-4 pr-4 h-14 rounded-2xl border-2 bg-white/10 text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all ${restaurantError ? "border-red-400" : "border-white/20"}`}
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-describedby={restaurantError ? "restaurant-error" : undefined}
                  aria-invalid={!!restaurantError}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-14 px-7 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-50 text-white font-bold shadow-sm min-w-[100px] transition-colors text-base focus:outline-none focus:ring-2 focus:ring-white"
                aria-label={isLoading ? "Searching, please wait" : "Search restaurants"}
                aria-busy={isLoading}
              >
                {isLoading
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" /><span className="sr-only">Searching…</span></>
                  : <span className="flex items-center gap-1.5"><Search className="w-4 h-4" aria-hidden="true" />Search</span>}
              </button>
            </div>
            {restaurantError && (
              <p id="restaurant-error" className="text-xs text-red-400 font-semibold" role="alert">{restaurantError}</p>
            )}
          </div>

        </div>

        {/* No-market error */}
        {noMarketError && (
          <p className="mt-2 text-sm text-yellow-300 font-semibold text-center" role="alert">
            📍 We currently cover <strong>Seattle/King County, NYC, Chicago, Austin, San Francisco, Los Angeles,</strong> and <strong>Montgomery County MD</strong>. More markets coming soon!
          </p>
        )}
      </form>

      {/* Supported markets — informational chips only */}
      <div className="flex flex-wrap justify-center gap-1.5" aria-label="Supported markets">
        {MARKETS.map(m => (
          <span
            key={m.countyId}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15 select-none"
          >
            {m.emoji} {m.label}
          </span>
        ))}
      </div>

    </div>
  );
}