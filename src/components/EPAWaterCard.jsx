import React, { useState, useEffect, useRef } from "react";
import { Droplets, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * EPAWaterCard — shows EPA drinking water safety info for a restaurant.
 * Derives state from address string (most reliable) then falls back to source mapping.
 * Results cached module-level so each unique city|state is only fetched once per session.
 */

// Module-level cache keyed by "city|state"
const CACHE = {};

const SOURCE_TO_STATE = {
  king:          "WA",
  nyc:           "NY",
  ny_state:      "NY",
  cook:          "IL",
  travis:        "TX",
  sf:            "CA",
  la:            "CA",
  montgomery_md: "MD",
  delaware:      "DE",
  toronto:       null,
  dubai:         null,
  uk_fsa:        null,
};

function parseStateFromAddress(address) {
  if (!address) return null;
  const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  return match ? match[1] : null;
}

function parseCityFromAddress(address) {
  if (!address) return null;
  const match = address.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/);
  return match ? match[1].trim() : null;
}

function getStatusBadge({ violationsHealthBased, violationsUnresolved }) {
  if (violationsUnresolved > 0) {
    return { label: "Active Violations", className: "bg-red-100 text-red-700 border-red-200", icon: "⚠" };
  }
  if (violationsHealthBased > 0) {
    return { label: "Past Issues", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⚠" };
  }
  return { label: "Safe", className: "bg-green-100 text-green-700 border-green-200", icon: "✓" };
}

export default function EPAWaterCard({ city, address, source }) {
  const [data, setData]       = useState(undefined);
  const [isError, setIsError] = useState(false);
  const mounted               = useRef(true);

  // Derive state and city client-side so we can build the correct cache key
  const derivedState = parseStateFromAddress(address) ?? SOURCE_TO_STATE[source] ?? null;
  const derivedCity  = (city && city.trim()) ? city.trim() : parseCityFromAddress(address);
  const cacheKey     = derivedCity && derivedState ? `${derivedCity}|${derivedState}` : null;

  const load = async () => {
    // Skip international / unresolvable locations immediately
    if (!derivedState || !derivedCity) {
      setData({ notFound: true });
      return;
    }

    if (cacheKey && CACHE[cacheKey] !== undefined) {
      setData(CACHE[cacheKey]);
      setIsError(CACHE[cacheKey]?.error === true);
      return;
    }

    setData(undefined);
    setIsError(false);

    try {
      const res = await base44.functions.invoke("getWaterSystem", { city, address, source });
      const d = res.data;
      if (cacheKey) CACHE[cacheKey] = d;
      if (mounted.current) {
        setData(d);
        setIsError(d?.error === true);
      }
    } catch {
      const errVal = { error: true };
      if (cacheKey) CACHE[cacheKey] = errVal;
      if (mounted.current) { setData(errVal); setIsError(true); }
    }
  };

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [cacheKey]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (data === undefined) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" aria-hidden="true" />
        <span>Loading water data…</span>
      </div>
    );
  }

  // ── Not found / international ────────────────────────────────────────────
  if (!data || data.notFound) {
    return (
      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
        <Droplets className="w-3 h-3 text-slate-300" aria-hidden="true" />
        <span>Water data unavailable for this location</span>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
        <Droplets className="w-3 h-3 text-slate-300" aria-hidden="true" />
        <span>Unable to load water data</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (cacheKey) delete CACHE[cacheKey];
            load();
          }}
          className="flex items-center gap-0.5 text-blue-500 hover:text-blue-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded"
          aria-label="Retry water data fetch"
        >
          <RefreshCw className="w-2.5 h-2.5" aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  const badge = getStatusBadge(data);

  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px]" onClick={e => e.stopPropagation()}>
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
        <span className="text-blue-600">💧 {data.sourceType}</span>
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded whitespace-nowrap"
          aria-label={`View EPA water report for ${data.name} (opens in new tab)`}
        >
          View EPA report <ExternalLink className="w-2.5 h-2.5 ml-0.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}