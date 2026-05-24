import React, { useCallback, useState } from "react";
import { Search, MapPin, UtensilsCrossed } from "lucide-react";
import { clearSearchState } from "../utils/searchState";

// ─── Market routing table ─────────────────────────────────────────────────────
// Each entry maps location keywords → { countyId, region, label }
// Order matters: more-specific entries first.

const MARKET_RULES = [
  // ── Proxy cities (live government data) ──────────────────────────────────
  {
    countyId: "king", region: "washington", label: "Seattle / King County, WA",
    keywords: ["seattle", "king county", "bellevue", "kirkland", "redmond", "renton", "kent",
      "bothell", "issaquah", "mercer island", "tukwila", "burien", "shoreline", "kenmore",
      "sammamish", "woodinville", "auburn", "federal way"],
  },
  {
    countyId: "nyc", region: "new_york", label: "New York City, NY",
    keywords: ["new york city", "nyc", "manhattan", "brooklyn", "queens", "bronx", "staten island",
      "new york, ny", "harlem", "tribeca", "soho", "williamsburg", "astoria", "flushing",
      "the bronx"],
  },
  {
    countyId: "cook", region: "illinois", label: "Chicago, IL",
    keywords: ["chicago", "cook county", "evanston", "skokie", "wicker park", "wrigleyville",
      "lincoln park", "logan square", "river north", "bucktown", "pilsen"],
  },
  {
    countyId: "travis", region: "texas", label: "Austin, TX",
    keywords: ["austin", "travis county", "pflugerville", "round rock", "cedar park",
      "south congress", "east austin", "zilker", "domain austin"],
  },
  {
    countyId: "sf", region: "california", label: "San Francisco, CA",
    keywords: ["san francisco", " sf ", "sf,", "bay area", "mission district", "castro",
      "soma", "tenderloin", "north beach", "haight", "noe valley", "hayes valley",
      "fisherman's wharf", "russian hill", "nob hill"],
  },
  {
    countyId: "la", region: "california", label: "Los Angeles, CA",
    keywords: ["los angeles", " la ", "la,", "hollywood", "santa monica", "pasadena",
      "burbank", "glendale", "long beach", "culver city", "venice beach", "koreatown",
      "silver lake", "echo park", "downtown la", "dtla", "beverly hills", "west hollywood",
      "los angeles county", "compton", "inglewood", "torrance"],
  },
  {
    countyId: "montgomery_md", region: "maryland", label: "Montgomery County, MD",
    keywords: ["montgomery county", "rockville", "bethesda", "silver spring", "gaithersburg",
      "germantown", "chevy chase", "potomac", "montgomery, md"],
  },
  // ── Backend-function cities ───────────────────────────────────────────────
  {
    countyId: "toronto", region: "canada", label: "Toronto, Ontario, Canada",
    keywords: ["toronto", "ontario", "north york", "scarborough", "etobicoke", "york, on",
      "mississauga", "brampton", "markham", "vaughan"],
  },
  {
    countyId: "uk_fsa", region: "uk", label: "United Kingdom",
    keywords: ["united kingdom", " uk ", "uk,", "uk)", "england", "scotland", "wales",
      "northern ireland", "great britain", "britain", "london", "manchester", "birmingham",
      "liverpool", "leeds", "sheffield", "bristol", "newcastle", "nottingham", "leicester",
      "coventry", "edinburgh", "glasgow", "cardiff", "belfast"],
  },
  {
    countyId: "delaware", region: "delaware", label: "Delaware",
    keywords: ["delaware", "wilmington, de", "dover, de", "newark, de"],
  },
  {
    countyId: "ny_state", region: "new_york", label: "New York State",
    keywords: ["buffalo", "rochester, ny", "syracuse", "albany, ny", "yonkers",
      "new rochelle", "white plains", "utica, ny", "schenectady", "binghamton",
      "long island", "nassau county", "westchester county", "ithaca", "saratoga springs",
      "new york state", "upstate new york"],
  },
  {
    countyId: "dubai", region: "uae", label: "Dubai, UAE",
    keywords: ["dubai", "uae", "united arab emirates", "abu dhabi", "sharjah",
      "jbr", "difc", "downtown dubai", "palm jumeirah", "dubai marina"],
  },
];

/**
 * Detect market from location string.
 * Returns a market object, or null (→ AI/LLM fallback).
 */
function detectMarket(locationInput) {
  const lower = " " + locationInput.toLowerCase() + " ";
  for (const market of MARKET_RULES) {
    const sorted = [...market.keywords].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      if (lower.includes(kw)) return market;
    }
  }
  return null;
}

// Informational chips shown below the form
const MARKET_CHIPS = [
  { emoji: "🌲", label: "Seattle / King County" },
  { emoji: "🗽", label: "New York City" },
  { emoji: "🏙️", label: "Chicago" },
  { emoji: "🤠", label: "Austin" },
  { emoji: "🌉", label: "San Francisco" },
  { emoji: "🌴", label: "Los Angeles" },
  { emoji: "🏛️", label: "Montgomery County, MD" },
  { emoji: "🍁", label: "Toronto (DineSafe)" },
  { emoji: "🇬🇧", label: "United Kingdom" },
  { emoji: "🦅", label: "Delaware" },
  { emoji: "🏔️", label: "NY State" },
  { emoji: "🇦🇪", label: "Dubai" },
  { emoji: "🌍", label: "Everywhere else (AI)" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartSearchPanel({ onSearch, isLoading, query, onQueryChange }) {
  const [locationValue, setLocationValue] = useState("");
  const [restaurantValue, setRestaurantValue] = useState(query || "");
  const [locationError, setLocationError] = useState("");
  const [restaurantError, setRestaurantError] = useState("");

  const handleRestaurantChange = useCallback((e) => {
    setRestaurantValue(e.target.value);
    onQueryChange(e.target.value);
    if (restaurantError) setRestaurantError("");
  }, [onQueryChange, restaurantError]);

  const handleLocationChange = useCallback((e) => {
    setLocationValue(e.target.value);
    if (locationError) setLocationError("");
  }, [locationError]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();

    let valid = true;
    if (!locationValue.trim()) { setLocationError("Please enter a location"); valid = false; }
    if (!restaurantValue.trim()) { setRestaurantError("Please enter a restaurant name"); valid = false; }
    if (!valid) return;

    const detected = detectMarket(locationValue);

    // Known market → use its countyId/region
    // Unknown → AI fallback: pass the raw location as label, countyId="ai_global"
    const cityInfo = detected
      ? { countyId: detected.countyId, region: detected.region, label: detected.label }
      : { countyId: "ai_global", region: "global", label: locationValue.trim() };

    clearSearchState();
    onSearch(restaurantValue.trim(), cityInfo);
  }, [locationValue, restaurantValue, onSearch]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">

      <form onSubmit={handleSubmit} role="search" aria-label="Search for restaurants" noValidate>
        <div className="flex flex-col gap-3">

          {/* Location field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="location-field" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              City, State, County, Country, Province, District, Parish, or Municipality
            </label>
            <input
              id="location-field"
              value={locationValue}
              onChange={handleLocationChange}
              placeholder='e.g. "Seattle, WA" or "Chicago, IL" or "London, UK" or "Tokyo, Japan"'
              className={`w-full px-4 h-14 rounded-2xl border-2 bg-white/10 text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all ${locationError ? "border-red-400" : "border-white/20"}`}
              autoComplete="off"
              aria-describedby={locationError ? "location-error" : undefined}
              aria-invalid={!!locationError}
            />
            {locationError && (
              <p id="location-error" className="text-xs text-red-400 font-semibold" role="alert">{locationError}</p>
            )}
          </div>

          {/* Restaurant + Search button */}
          <div className="flex flex-col gap-1">
            <label htmlFor="restaurant-field" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" aria-hidden="true" />
              Restaurant Name
            </label>
            <div className="flex gap-2">
              <input
                id="restaurant-field"
                value={restaurantValue}
                onChange={handleRestaurantChange}
                placeholder={`e.g. "Dick's Burgers" or "Starbucks" or "Pizza Hut"`}
                className={`flex-1 px-4 h-14 rounded-2xl border-2 bg-white/10 text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all ${restaurantError ? "border-red-400" : "border-white/20"}`}
                autoComplete="off"
                enterKeyHint="search"
                aria-describedby={restaurantError ? "restaurant-error" : undefined}
                aria-invalid={!!restaurantError}
              />
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
      </form>

      {/* Supported markets — informational chips */}
      <div className="flex flex-wrap justify-center gap-1.5" aria-label="Supported markets">
        {MARKET_CHIPS.map(m => (
          <span
            key={m.label}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15 select-none"
          >
            {m.emoji} {m.label}
          </span>
        ))}
      </div>

    </div>
  );
}