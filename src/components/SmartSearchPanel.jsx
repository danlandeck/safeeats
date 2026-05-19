import React, { useState, useRef, useCallback } from "react";
import { MapPin, Search, X } from "lucide-react";
import { SEARCH_KEYS } from "../utils/searchState";
import { useLanguage } from "../lib/LanguageContext";

const RECENT_KEY     = SEARCH_KEYS[0];
const RECENT_LOC_KEY = SEARCH_KEYS[1];

function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
function saveRecent(q) {
  if (!q) return;
  const prev = loadRecent().filter(x => x !== q);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 6))); } catch {}
}

function saveRecentLocation(loc) {
  if (!loc?.trim()) return;
  const prev = (() => { try { return JSON.parse(localStorage.getItem(RECENT_LOC_KEY) || "[]"); } catch { return []; } })();
  const next = [loc, ...prev.filter(x => x.toLowerCase() !== loc.toLowerCase())].slice(0, 5);
  try { localStorage.setItem(RECENT_LOC_KEY, JSON.stringify(next)); } catch {}
}

export default function SmartSearchPanel({
  locationQuery, onLocationChange, onRegionChange,
  onSearch, isLoading,
  onNearMe,
  query, onQueryChange,
}) {
  const { t } = useLanguage();
  const [geoError, setGeoError] = useState("");
  const inputRef    = useRef(null);
  const locInputRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const q = (query || "").trim();
    if (!q) return;
    saveRecent(q);
    onSearch(q);
  }, [query, onSearch]);

  const handleLocationBlur = useCallback(() => {
    if (locationQuery?.trim()) saveRecentLocation(locationQuery.trim());
  }, [locationQuery]);

  const fieldClass =
    "w-full pl-12 pr-4 h-16 rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder:text-slate-300 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">

      {/* Location field */}
      <div className="bg-white/10 border border-white/20 rounded-3xl p-5">
        <p className="text-xs font-extrabold text-[#81c784] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <MapPin className="w-4 h-4" aria-hidden="true" /> {t?.step1Label || "Step 1 — Where are you eating?"}
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4CAF50] pointer-events-none" aria-hidden="true" />
            <label htmlFor="search-location" className="sr-only">Location — city, state, or country</label>
            <input
              id="search-location"
              name="search-location"
              ref={locInputRef}
              value={locationQuery}
              onChange={(e) => onLocationChange(e.target.value)}
              onBlur={handleLocationBlur}
              placeholder={t?.locationPlaceholder || "City, state, or country — e.g. New York, Tokyo, London…"}
              className={fieldClass}
              aria-label="Location"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
        </div>
        {geoError && <p className="text-xs text-red-300 mt-2" role="alert">{geoError}</p>}
      </div>

      {/* Search field */}
      <div className="bg-white/10 border border-white/20 rounded-3xl p-5">
        <p className="text-xs font-extrabold text-[#81c784] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Search className="w-4 h-4" aria-hidden="true" /> {t?.step2Label || "Step 2 — Search restaurant or food type"}
        </p>
        <form onSubmit={handleSubmit} role="search" aria-label="Search for restaurants">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" aria-hidden="true" />
              <label htmlFor="search-restaurant" className="sr-only">Search restaurant name or cuisine type</label>
              <input
                id="search-restaurant"
                name="search-restaurant"
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onBlur={() => saveRecent((query || "").trim())}
                placeholder={t?.restaurantPlaceholder || `Restaurant name or cuisine type — e.g. "McDonald's" or "sushi"`}
                className={fieldClass}
                aria-label="Search restaurants"
                autoComplete="new-password"
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
            <button
              type="submit"
              disabled={isLoading || !(query || "").trim()}
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

    </div>
  );
}