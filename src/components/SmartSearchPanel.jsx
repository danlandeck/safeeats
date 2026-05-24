import React, { useRef, useCallback, useState } from "react";
import { Search, X } from "lucide-react";
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
      "sammamish", "woodinville", "auburn", "federal way", ", wa", " wa "],
  },
  {
    countyId: "nyc",
    region: "new_york",
    label: "New York City",
    emoji: "🗽",
    keywords: ["new york", "nyc", "manhattan", "brooklyn", "queens", "bronx", "staten island",
      "harlem", "tribeca", "soho", "williamsburg", "astoria", "flushing", ", ny"],
  },
  {
    countyId: "cook",
    region: "illinois",
    label: "Chicago",
    emoji: "🏙️",
    keywords: ["chicago", " chi ", "chi-town", "wicker park", "wrigleyville", "lincoln park",
      "logan square", "river north", "evanston", "skokie", ", il"],
  },
  {
    countyId: "travis",
    region: "texas",
    label: "Austin",
    emoji: "🤠",
    keywords: ["austin", "travis county", "south congress", "east austin", "pflugerville",
      "round rock", ", tx", " tx "],
  },
  {
    countyId: "sf",
    region: "california",
    label: "San Francisco",
    emoji: "🌉",
    keywords: ["san francisco", " sf ", "bay area", "mission district", "castro", "soma",
      "tenderloin", "north beach", "haight", "noe valley", "hayes valley"],
  },
  {
    countyId: "la",
    region: "california",
    label: "Los Angeles",
    emoji: "🌴",
    keywords: ["los angeles", " la ", "hollywood", "santa monica", "pasadena", "burbank",
      "glendale", "long beach", "culver city", "venice", "koreatown", "silver lake",
      "echo park", "downtown la", "dtla", ", ca"],
  },
  {
    countyId: "montgomery_md",
    region: "maryland",
    label: "Montgomery County, MD",
    emoji: "🏛️",
    keywords: ["montgomery", "rockville", "bethesda", "silver spring", "gaithersburg",
      "germantown", "chevy chase", "potomac", ", md", " md "],
  },
];

/**
 * Given a raw query string, returns { market, strippedQuery } or { market: null }.
 * Tries longest keyword match first to avoid false positives.
 */
function detectMarket(raw) {
  const lower = " " + raw.toLowerCase() + " ";

  // Sort keywords by length desc so longer/more-specific matches win
  for (const market of MARKETS) {
    const sorted = [...market.keywords].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      if (lower.includes(kw)) {
        // Strip the matched keyword (and surrounding punctuation/spaces) from the query
        const stripped = raw
          .replace(new RegExp(kw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "")
          .replace(/[,\s]+$/, "")
          .replace(/^[,\s]+/, "")
          .trim();
        return { market, strippedQuery: stripped || raw };
      }
    }
  }
  return { market: null, strippedQuery: raw };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SmartSearchPanel({ onSearch, isLoading, query, onQueryChange }) {
  const inputRef = useRef(null);
  const [noMarketError, setNoMarketError] = useState(false);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const raw = query.trim();
    if (!raw) return;

    const { market, strippedQuery } = detectMarket(raw);

    if (!market) {
      setNoMarketError(true);
      return;
    }

    setNoMarketError(false);
    clearSearchState();
    // Pass { q, countyId, region, label } so Home.jsx can route correctly
    onSearch(strippedQuery, {
      countyId: market.countyId,
      region: market.region,
      label: market.label,
    });
  }, [query, onSearch]);

  const handleChange = useCallback((e) => {
    onQueryChange(e.target.value);
    if (noMarketError) setNoMarketError(false);
  }, [onQueryChange, noMarketError]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">

      {/* Single smart search bar */}
      <form onSubmit={handleSubmit} role="search" aria-label="Search for restaurants">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" aria-hidden="true" />
            <label htmlFor="smart-search" className="sr-only">Search restaurant and city</label>
            <input
              id="smart-search"
              ref={inputRef}
              value={query}
              onChange={handleChange}
              placeholder="Try 'Starbucks Seattle' or 'Pizza NYC'"
              className="w-full pl-12 pr-10 h-16 rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white/20 transition-all"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQueryChange(""); setNoMarketError(false); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="h-16 px-7 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] disabled:opacity-50 text-white font-bold shadow-sm min-w-[90px] transition-colors touch-manipulation text-base focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isLoading ? "Searching, please wait" : "Search restaurants"}
            aria-busy={isLoading}
          >
            {isLoading
              ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" aria-hidden="true" /><span className="sr-only">Searching…</span></>
              : "Search"}
          </button>
        </div>

        {/* No-market error */}
        {noMarketError && (
          <p className="mt-2 text-sm text-yellow-300 font-semibold text-center" role="alert">
            📍 We currently cover <strong>Seattle, NYC, Chicago, Austin, San Francisco, Los Angeles,</strong> and <strong>Montgomery County MD</strong>. Try adding your city to the search!
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