import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import MiniSearch from "minisearch";
import { Search, X } from "lucide-react";

/**
 * FuzzySearchBar — MiniSearch-powered typeahead over already-fetched results.
 * Props:
 *   results       — array of restaurant objects (post-search from the API)
 *   onSelect      — called with restaurant object when user picks one
 *   onFilterChange— called with { cuisine, city, minGrade } filter state
 *   placeholder   — input placeholder text
 */

const GRADE_ORDER = ["A", "B", "C", "D", "F", "U"];

function buildIndex(docs) {
  const ms = new MiniSearch({
    fields: ["name", "cuisine", "city"],
    storeFields: ["name", "cuisine", "city", "id"],
    searchOptions: {
      boost: { name: 4, cuisine: 2, city: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
  ms.addAll(docs.map((r, i) => ({
    id: r.business_id || String(i),
    name: r.name || "",
    cuisine: r.cuisine || "",
    city: r.city || "",
  })));
  return ms;
}

export default function FuzzySearchBar({ results = [], onSelect, onFilterChange, placeholder = "Filter results…" }) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const [open, setOpen]             = useState(false);
  const [cuisine, setCuisine]       = useState("");
  const [city, setCity]             = useState("");
  const [minGrade, setMinGrade]     = useState("");

  const msRef    = useRef(null);
  const debounce = useRef(null);
  const inputRef = useRef(null);
  const listId   = useId();
  const liveId   = useId();

  // Rebuild index when results change
  useEffect(() => {
    if (results.length > 0) msRef.current = buildIndex(results);
  }, [results]);

  // Derive unique filter options
  const cuisines = [...new Set(results.map(r => r.cuisine).filter(Boolean))].sort();
  const cities   = [...new Set(results.map(r => r.city).filter(Boolean))].sort();

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange?.({ cuisine, city, minGrade });
  }, [cuisine, city, minGrade]);

  const doSearch = useCallback((q) => {
    if (!msRef.current || !q.trim()) { setSuggestions([]); setOpen(false); return; }
    const hits = msRef.current.search(q, { prefix: true, fuzzy: 0.2 });
    const top  = hits.slice(0, 8).map(h => results.find(r => (r.business_id || "") === h.id || r.name === h.name)).filter(Boolean);
    setSuggestions(top);
    setOpen(top.length > 0);
    setActiveIdx(-1);
  }, [results]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(val), 120);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Escape")     { setOpen(false); setActiveIdx(-1); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(suggestions[activeIdx]); }
  };

  const pick = (r) => {
    setQuery(r.name);
    setOpen(false);
    setSuggestions([]);
    onSelect?.(r);
  };

  const activeDescendant = activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined;

  return (
    <div className="w-full space-y-3">
      {/* Search input */}
      <div className="relative">
        <label htmlFor="fuzzy-search-input" className="sr-only">Filter restaurants by name, cuisine, or city</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
        <input
          id="fuzzy-search-input"
          name="fuzzy-search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query && suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeDescendant}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:border-[#4CAF50] transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown */}
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Restaurant suggestions"
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            {suggestions.map((r, i) => (
              <li
                key={r.business_id || i}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={() => pick(r)}
                className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${i === activeIdx ? "bg-[#4CAF50] text-white" : "hover:bg-slate-50 text-slate-800"}`}
              >
                <span className="font-bold">{r.name}</span>
                {(r.cuisine || r.city) && (
                  <span className={`ml-2 text-xs ${i === activeIdx ? "text-white/80" : "text-slate-400"}`}>
                    {[r.cuisine, r.city].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Live region for screen readers */}
      <div id={liveId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {open ? `${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""} available` : ""}
      </div>

      {/* Filter chips */}
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Cuisine filter */}
          {cuisines.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-cuisine" className="text-xs font-bold text-slate-500 whitespace-nowrap">Cuisine:</label>
              <select
                id="filter-cuisine"
                name="filter-cuisine"
                value={cuisine}
                onChange={e => setCuisine(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] cursor-pointer"
              >
                <option value="">All</option>
                {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* City filter */}
          {cities.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-city" className="text-xs font-bold text-slate-500 whitespace-nowrap">City:</label>
              <select
                id="filter-city"
                name="filter-city"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] cursor-pointer"
              >
                <option value="">All</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Min grade filter */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-grade" className="text-xs font-bold text-slate-500 whitespace-nowrap">Min grade:</label>
            <select
              id="filter-grade"
              name="filter-grade"
              value={minGrade}
              onChange={e => setMinGrade(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] cursor-pointer"
            >
              <option value="">Any</option>
              <option value="A">A+</option>
              <option value="B">B or better</option>
              <option value="C">C or better</option>
            </select>
          </div>

          {/* Clear filters */}
          {(cuisine || city || minGrade) && (
            <button
              type="button"
              onClick={() => { setCuisine(""); setCity(""); setMinGrade(""); }}
              className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}