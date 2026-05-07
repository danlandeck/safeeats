import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, MapPin } from "lucide-react";

// Detects location patterns: "Subway, Seattle WA", "San Diego, CA", "92101", "Taco Bell 92101"
export function parseLocationQuery(raw) {
  const trimmed = raw.trim();

  // "Name, City ST" or "Name, City, ST"
  const withName = trimmed.match(/^(.+?),\s*([^,]+?)\s+([A-Z]{2})$/i);
  if (withName) return { name: withName[1].trim(), city: withName[2].trim(), state: withName[3].toUpperCase() };

  // "City, ST" or "City ST" standalone (no restaurant name)
  const locationOnly = trimmed.match(/^([A-Za-z\s]+),?\s+([A-Z]{2})$/i);
  if (locationOnly) return { name: "", city: locationOnly[1].trim(), state: locationOnly[2].toUpperCase() };

  // "Name, City" or just "City" (no state)
  const nameCity = trimmed.match(/^(.+?),\s*([A-Za-z][A-Za-z\s]+)$/);
  if (nameCity) return { name: nameCity[1].trim(), city: nameCity[2].trim(), state: null };

  return null;
}

export default function SearchBar({ onSearch, isLoading, placeholder, dir }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <label htmlFor="searchbar-query" className="sr-only">Search restaurant or cuisine</label>
          <Input
            id="searchbar-query"
            name="searchbar-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || "Try: Subway, San Diego CA · pizza Seattle · tacos Austin TX"}
            dir={dir || "ltr"}
            aria-label="Search restaurant or cuisine"
            className="pl-12 pr-10 h-14 text-base rounded-2xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:border-slate-300 whitespace-nowrap overflow-x-auto"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="h-14 px-8 rounded-2xl bg-[#4CAF50] hover:bg-[#43A047] text-white font-bold shadow-sm min-w-[80px]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </div>

    </form>
  );
}