import React, { useState, useRef, useCallback } from "react";
import { MapPin, Search, X, Clock, LocateFixed, Loader2 } from "lucide-react";
import { SEARCH_KEYS } from "../utils/searchState";

const RECENT_KEY     = SEARCH_KEYS[0];
const RECENT_LOC_KEY = SEARCH_KEYS[1];

function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
function saveRecent(q) {
  const prev = loadRecent().filter(x => x !== q);
  const next = [q, ...prev].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  return next;
}

function loadRecentLocations() { try { return JSON.parse(localStorage.getItem(RECENT_LOC_KEY) || "[]"); } catch { return []; } }
function saveRecentLocation(loc) {
  if (!loc?.trim()) return;
  const prev = loadRecentLocations().filter(x => x.toLowerCase() !== loc.toLowerCase());
  const next = [loc, ...prev].slice(0, 5);
  try { localStorage.setItem(RECENT_LOC_KEY, JSON.stringify(next)); } catch {}
  return next;
}

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
  const [recents, setRecents]                   = useState(loadRecent);
  const [recentLocations, setRecentLocations]   = useState(loadRecentLocations);
  const [showDropdown, setShowDropdown]         = useState(false);
  const [showLocDropdown, setShowLocDropdown]   = useState(false);
  const [geoLoading, setGeoLoading]             = useState(false);
  const [geoError, setGeoError]                 = useState("");
  const inputRef                                = useRef(null);
  const locInputRef                             = useRef(null);

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
    onQueryChange(e.target.value);
    setShowDropdown(true);
  };

  const pickSuggestion = (s) => {
    onQueryChange(s);
    setShowDropdown(false);
    setRecents(saveRecent(s));
    onSearch(s);
  };

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

  const handleCitySelect = useCallback((city) => {
    onRegionChange(city);
    const label = city.locationLabel || city.label;
    setRecentLocations(saveRecentLocation(label) || recentLocations);
    setShowLocDropdown(false);
  }, [onRegionChange, recentLocations]);

  const handleLocationBlur = useCallback(() => {
    setTimeout(() => setShowLocDropdown(false), 150);
    if (locationQuery?.trim()) {
      setRecentLocations(saveRecentLocation(locationQuery.trim()) || recentLocations);
    }
  }, [locationQuery, recentLocations]);

  const pickRecentLocation = useCallback((loc) => {
    onLocationChange(loc);
    setShowLocDropdown(false);
    const match = LIVE_API_CITIES.find(c =>
      loc.toLowerCase().includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(loc.toLowerCase().split(",")[0])
    );
    if (match) onRegionChange(match);
  }, [onLocationChange, onRegionChange]);

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
              ref={locInputRef}
              value={locationQuery}
              onChange={(e) => { onLocationChange(e.target.value); setShowLocDropdown(true); }}
              onFocus={() => setShowLocDropdown(true)}
              onBlur={handleLocationBlur}
              placeholder="City, state, or country — e.g. New York, Tokyo, London…"
              className={fieldClass}
              aria-label="Location"
              autoComplete="off"
            />

          </div>

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
                    onLocationChange("");
                    onRegionChange({ label: "", region: "global", countyId: "global" });
                  } else {
                    handleCitySelect(city);
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
      </div>

    </div>
  );
}