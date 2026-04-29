import React, { useState, useEffect, useRef } from "react";
import { Droplets, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Module-level cache keyed by lookup_key so each city|state is queried at most once per session
const CACHE = {};

const SOURCE_TO_STATE = {
  king: "WA", nyc: "NY", ny_state: "NY", cook: "IL",
  travis: "TX", sf: "CA", la: "CA", montgomery_md: "MD",
  delaware: "DE", toronto: null, dubai: null, uk_fsa: null,
};

function parseStateFromAddress(address) {
  if (!address) return null;
  const m = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  return m ? m[1] : null;
}

function getStatusBadge({ violations_health_based = 0, violations_unresolved = 0 }) {
  if (violations_unresolved > 0) {
    return { label: "Active Violations", className: "bg-red-100 text-red-700 border-red-200", icon: "⚠" };
  }
  if (violations_health_based > 0) {
    return { label: "Past Issues", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⚠" };
  }
  return { label: "Safe", className: "bg-green-100 text-green-700 border-green-200", icon: "✓" };
}

export default function EPAWaterCard({ city, address, source, zip_code }) {
  const [data, setData] = useState(undefined);
  const mounted = useRef(true);

  // Derive state and city to query the WaterSystem entity
  const fullAddr = [address, city, zip_code].filter(Boolean).join(", ");
  const derivedState = parseStateFromAddress(fullAddr) ?? SOURCE_TO_STATE[source] ?? null;
  const derivedCity = (city && city.trim()) ? city.trim() : null;
  const lookupKey = derivedCity && derivedState ? `${derivedCity.toLowerCase()}|${derivedState}` : null;

  useEffect(() => {
    mounted.current = true;

    async function load() {
      if (!lookupKey) {
        if (mounted.current) setData({ notFound: true });
        return;
      }

      // Check cache first
      if (CACHE[lookupKey] !== undefined) {
        if (mounted.current) setData(CACHE[lookupKey]);
        return;
      }

      try {
        // Query the WaterSystem entity for this city|state
        // Query by city + state separately. Note: city stored in title case (e.g. "Manchester"), so use derivedCity directly.
        // We do a case-insensitive comparison client-side after fetching matches by state since city stored as title case.
        const results = await base44.entities.WaterSystem.filter({ state: derivedState });
        const system = Array.isArray(results)
          ? results.find(r => (r.city || "").toLowerCase() === derivedCity.toLowerCase()) || null
          : null;
        const result = system || { notFound: true };
        CACHE[lookupKey] = result;
        if (mounted.current) setData(result);
      } catch (err) {
        console.warn("WaterSystem lookup failed:", err);
        if (mounted.current) setData({ notFound: true });
      }
    }

    load();
    return () => { mounted.current = false; };
  }, [lookupKey]);

  // Loading state
  if (data === undefined) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" aria-hidden="true" />
        <span>Loading water data…</span>
      </div>
    );
  }

  // Not found
  if (!data || data.notFound) {
    return (
      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
        <Droplets className="w-3 h-3 text-slate-300" aria-hidden="true" />
        <span>Water data unavailable for this location</span>
      </div>
    );
  }

  // Success
  const badge = getStatusBadge(data);

  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-blue-800 min-w-0">
          <Droplets className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
          <span className="truncate leading-tight">{data.name}</span>
        </div>
        <span
          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold flex-shrink-0 ${badge.className}`}
          aria-label={`Water safety status: ${badge.label}`}
        >
          <span aria-hidden="true">{badge.icon}</span> {badge.label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
        <span className="text-blue-600">💧 {data.source_type || "Unknown source"}</span>
        {data.source_url && (
          <a
            href={data.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded whitespace-nowrap"
            aria-label={`View EPA water report for ${data.name} (opens in new tab)`}
          >
            View EPA report <ExternalLink className="w-2.5 h-2.5 ml-0.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}