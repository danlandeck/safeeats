import React, { useState, useRef, useCallback } from "react";
import { MapPin, Search, X, Clock, LocateFixed, Loader2 } from "lucide-react";

// Persistent recent searches
const RECENT_KEY = "safeeats_recent";
function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
function saveRecent(q) {
  const prev = loadRecent().filter(x => x !== q);
  const next = [q, ...prev].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  return next;
}

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
  onNearMe,
  query, onQueryChange,
}) {
  const [recents, setRecents]           = useState(loadRecent);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoLoading, setGeoLoading]     = useState(false);
  const [geoError, setGeoError]         = useState("");
  const debounceRef                     = useRef(null);
  const inputRef                        = useRef(null);

  // Debounced autocomplete suggestions from recents
  const safeQuery = query || "";
  const suggestions = recents.filter(r => safeQuery.length > 0 && r.toLowerCase().includes(safeQuery.toLowerCase()));

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowDropdown(false);
    setRecents(saveRecent(q));
    onSearch(q);
  }, [query, onSearch]);

  const handleChange = (e) => {
    const val = e.target.value;
    onQueryChange(val);
    setShowDropdown(true);
    // Debounce: auto-trigger only for cuisine-style short queries
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        // Only auto-search if it looks like a cuisine keyword (no spaces + short)
        if (val.trim().split(" ").length === 1 && val.trim().length <= 12) {
          // don't auto-fire full search, just keep suggestions visible
        }
      }, 300);
    }
  };

  const pickSuggestion = (s) => {
    onQueryChange(s);
    setShowDropdown(false);
    setRecents(saveRecent(s));
    onSearch(s);
  };

  const handleCuisineClick = useCallback((q) => {
    onQueryChange(q);
    setShowDropdown(false);
    setRecents(saveRecent(q));
    onSearch(q);
  }, [onSearch]);

  const handleNearMe = useCallback(() => {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("Geolocation not supported"); return; }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        onNearMe?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => { setGeoLoading(false); setGeoError("Location access denied"); },
      { timeout: 8000 }
    );
  }, [onNearMe]);

  const fieldClass =
    "w-full pl-12 pr-4 h-16 rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder:text-slate-300 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">

      {/* Location field */}
      <div className="bg-white/10 border border-white/20 rounded-3xl p-5">
        <p className="text-xs font-extrabold text-[#81c784] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <MapPin className="w-4 h-4" aria-hidden="true" /> Step 1 — Where are you eating?
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4CAF50] pointer-events-none" aria-hidden="true" />
            <input
              value={locationQuery}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="City, state, or country — e.g. New York, Tokyo, London…"
              className={fieldClass}
              aria-label="Location"
            />
          </div>
          {/* ── Near Me ── */}
          <button
            type="button"
            onClick={handleNearMe}
            disabled={geoLoading}
            aria-label="Use my current location"
            title="Find restaurants near me"
            className="h-16 px-4 rounded-2xl bg-[#2196F3] hover:bg-[#1e88e5] disabled:opacity-60 text-white font-bold flex items-center gap-2 flex-shrink-0 transition-colors min-w-[120px] justify-center touch-manipulation"
          >
            {geoLoading
              ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /><span className="text-sm">Locating…</span></>
              : <><LocateFixed className="w-5 h-5" aria-hidden="true" /><span className="text-sm font-bold">Near Me</span></>
            }
          </button>
        </div>
        {geoError && <p className="text-xs text-red-300 mt-2" role="alert">{geoError}</p>}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {LIVE_API_CITIES.map((city) => {
            const isActive = activeRegion === city.region && activeCounty === city.countyId;
            return (
              <button
                key={city.countyId}
                type="button"
                onClick={() => {
                  if (isActive) {
                    // Deselect — reset to global/freeform
                    onLocationChange("");
                    onRegionChange({ label: "", region: "global", countyId: "global" });
                  } else {
                    onRegionChange(city);
                  }
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px] ${
                  isActive
                    ? "bg-[#4CAF50] text-white border-[#4CAF50]"
                    : "bg-white/10 text-slate-300 border-white/15 hover:bg-white/20 hover:text-white"
                }`}
              >
                {city.emoji} {city.label}
                {isActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onLocationChange("");
              onRegionChange({ label: "", region: "global", countyId: "global" });
            }}
            className={`flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-[36px] ${
              activeRegion === "global"
                ? "bg-[#4CAF50] text-white border-[#4CAF50]"
                : "text-slate-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            🌍 Any city / country
          </button>
        </div>
      </div>

      {/* Search field */}
      <div className="bg-white/10 border border-white/20 rounded-3xl p-5">
        <p className="text-xs font-extrabold text-[#81c784] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Search className="w-4 h-4" aria-hidden="true" /> Step 2 — Search restaurant or food type
        </p>
        <form onSubmit={handleSubmit} role="search" aria-label="Search for restaurants">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={handleChange}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={`Restaurant name or cuisine type — e.g. "McDonald's" or "sushi"`}
                className={fieldClass}
                aria-label="Search restaurants"
                aria-autocomplete="list"
                autoComplete="off"
                enterKeyHint="search"
              />
              {query && (
                <button type="button" onClick={() => { onQueryChange(""); setShowDropdown(false); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label="Clear search">
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Dropdown: recent + suggestions */}
              {showDropdown && (suggestions.length > 0 || (recents.length > 0 && !safeQuery)) && (
                <ul
                  role="listbox"
                  aria-label="Search suggestions"
                  className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/15 rounded-xl overflow-hidden z-50 shadow-xl"
                >
                  {(safeQuery ? suggestions : recents).map((s, i) => (
                    <li key={i}>
                      <button
                        role="option"
                        type="button"
                        onMouseDown={() => pickSuggestion(s)}
                        className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" aria-hidden="true" />
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="h-16 px-7 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-50 text-white font-bold shadow-sm min-w-[90px] transition-colors touch-manipulation text-base focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#4CAF50]"
              aria-label={isLoading ? "Searching, please wait" : "Search restaurants"}
              aria-busy={isLoading}
            >
              {isLoading
                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" /><span className="sr-only">Searching…</span></>
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
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/15 hover:bg-[#4CAF50]/20 hover:text-[#81c784] hover:border-[#4CAF50]/40 transition-all min-h-[36px] touch-manipulation"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}