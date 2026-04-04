import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, MapPin } from "lucide-react";

// Detects if the query ends with ", City ST" or ", City, ST" or ", City ST ZIP"
export function parseLocationQuery(raw) {
  const trimmed = raw.trim();
  // Match patterns like "Subway, Seattle WA", "Dairy Queen, Woodinville WA 98072", "McDonald's, Chicago, IL"
  const match = trimmed.match(/^(.+?),\s*([^,]+?)\s+([A-Z]{2})\s*(\d{5})?$/i);
  if (match) {
    return {
      name: match[1].trim(),
      city: match[2].trim(),
      state: match[3].toUpperCase(),
      zip: match[4] || null,
    };
  }
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
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || "Restaurant name, or: Subway, Seattle WA"}
            dir={dir || "ltr"}
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
          className="h-14 px-8 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold shadow-sm"
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