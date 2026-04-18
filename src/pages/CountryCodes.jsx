import React, { useState, useMemo } from "react";
import { Search, AlertTriangle, Info } from "lucide-react";
import { REGIONS } from "../utils/regions";

// Build country code table from REGIONS (international only — skip US states)
const US_STATES = new Set([
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
  "delaware","dc","florida","georgia","hawaii","idaho","illinois","indiana",
  "iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts",
  "michigan","minnesota","mississippi","missouri","montana","nebraska","nevada",
  "new_hampshire","new_jersey","new_mexico","new_york","north_carolina",
  "north_dakota","ohio","oklahoma","oregon","pennsylvania","rhode_island",
  "south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming","global"
]);

const COUNTRY_ROWS = Object.entries(REGIONS)
  .filter(([key]) => !US_STATES.has(key))
  .map(([key, r]) => ({ key, name: r.name, code: r.abbr }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Pairs that are commonly confused
const CONFUSING_PAIRS = [
  { wanted: "South Africa", wantedCode: "ZA", gotInstead: "Saudi Arabia", gotCode: "SA" },
  { wanted: "India", wantedCode: "IN", gotInstead: "Indiana (US state)", gotCode: "IN" },
  { wanted: "Australia", wantedCode: "AU", gotInstead: "Austria", gotCode: "AT" },
  { wanted: "Argentina", wantedCode: "AR", gotInstead: "Arkansas (US state)", gotCode: "AR" },
  { wanted: "Canada", wantedCode: "CA", gotInstead: "California (US state)", gotCode: "CA" },
  { wanted: "Germany", wantedCode: "DE", gotInstead: "Delaware (US state)", gotCode: "DE" },
  { wanted: "Mexico", wantedCode: "MX", gotInstead: "Mexico (US state abbreviation conflict)", gotCode: "MX" },
  { wanted: "New Zealand", wantedCode: "NZ", gotInstead: "Nebraska (US)", gotCode: "NE" },
];

export default function CountryCodes() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_ROWS;
    return COUNTRY_ROWS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase() === q
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">🌍 Country Codes Reference</h1>
          <p className="text-slate-400 text-sm mt-1">
            When searching SafeEats, use the full country name or the 2-letter ISO code below.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ⚠️ Confusion callout */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-800 text-sm">Watch out — some codes are easy to mix up!</p>
              <p className="text-xs text-amber-700 mt-0.5">
                For example: <strong>South Africa is ZA</strong>, not SA. Typing "SA" will link to Saudi Arabia.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONFUSING_PAIRS.map(({ wanted, wantedCode, gotInstead, gotCode }) => (
              <div key={wantedCode + gotCode + wanted} className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-bold text-green-700">✅ {wanted} = <code className="bg-green-100 px-1 rounded">{wantedCode}</code></span>
                <br />
                <span className="text-slate-500">⚠️ "{gotCode}" → {gotInstead}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
          <span>SafeEats supports the countries listed below. For any other country, it will fall back to AI-powered search of public health records. US states are not listed here — they use standard 2-letter US postal abbreviations (CA = California, TX = Texas, etc.).</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country name or code…"
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_auto] text-xs font-extrabold uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-200 px-5 py-3">
            <span>Country / Region</span>
            <span className="text-right">ISO Code</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-center py-10 text-slate-400 text-sm">No match for "{query}"</p>
            )}
            {filtered.map(({ key, name, code }) => (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                <span className="text-sm font-semibold text-slate-900">{name}</span>
                <code className="text-sm font-extrabold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg tracking-widest">
                  {code || "—"}
                </code>
              </div>
            ))}
          </div>
          <div className="px-5 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
            {filtered.length} countr{filtered.length !== 1 ? "ies" : "y"} shown
          </div>
        </div>

      </div>
    </div>
  );
}