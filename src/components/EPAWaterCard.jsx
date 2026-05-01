import React, { useState, useEffect, useRef } from "react";
import { Droplets, ExternalLink, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Module-level cache to avoid re-querying for the same city|state
const CACHE = {};

const SOURCE_TO_STATE = {
  king: "WA", nyc: "NY", ny_state: "NY", cook: "IL",
  travis: "TX", sf: "CA", la: "CA", montgomery_md: "MD",
  delaware: "DE", toronto: null, dubai: null, uk_fsa: null,
};

// Playful grade tier styling
const GRADE_STYLES = {
  stellar: {
    bg: "bg-green-50",
    border: "border-green-200",
    pillBg: "bg-green-500",
    pillText: "text-white",
    nameText: "text-green-800",
    description: "Top-tier tap water",
  },
  solid: {
    bg: "bg-lime-50",
    border: "border-lime-200",
    pillBg: "bg-lime-500",
    pillText: "text-white",
    nameText: "text-lime-800",
    description: "Good tap water",
  },
  soso: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    pillBg: "bg-yellow-500",
    pillText: "text-white",
    nameText: "text-yellow-800",
    description: "Acceptable tap water",
  },
  sketchy: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    pillBg: "bg-orange-500",
    pillText: "text-white",
    nameText: "text-orange-800",
    description: "Some concerns",
  },
  yikes: {
    bg: "bg-red-50",
    border: "border-red-200",
    pillBg: "bg-red-600",
    pillText: "text-white",
    nameText: "text-red-800",
    description: "Real issues",
  },
  mystery: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    pillBg: "bg-slate-400",
    pillText: "text-white",
    nameText: "text-slate-700",
    description: "No water data yet",
  },
};

function parseStateFromAddress(address) {
  if (!address) return null;
  const m = address.match(/,\s*([A-Z]{2})[\s,]+\d{5}/);
  return m ? m[1] : null;
}

export default function EPAWaterCard({ city, address, source, zip_code }) {
  const [data, setData] = useState(undefined);
  const mounted = useRef(true);

  // Build the city|state key to look up
  const fullAddr = [address, city, zip_code].filter(Boolean).join(", ");
  const derivedState = parseStateFromAddress(fullAddr) ?? SOURCE_TO_STATE[source] ?? null;
  const derivedCity = (city && city.trim()) ? city.trim() : null;
  const cacheKey = derivedCity && derivedState ? `${derivedCity.toLowerCase()}|${derivedState}` : null;

  useEffect(() => {
    mounted.current = true;

    async function load() {
      // No location info = Mystery grade immediately
      if (!cacheKey) {
        if (mounted.current) setData({ mystery: true });
        return;
      }

      if (CACHE[cacheKey] !== undefined) {
        if (mounted.current) setData(CACHE[cacheKey]);
        return;
      }

      try {
        // Filter by state, find by city case-insensitively (avoids pipe-character bug in Base44 filter)
        const results = await base44.entities.WaterSystem.filter({ state: derivedState });
        const system = Array.isArray(results)
          ? results.find(r => (r.city || "").toLowerCase() === derivedCity.toLowerCase()) || null
          : null;
        const result = system || { mystery: true };
        CACHE[cacheKey] = result;
        if (mounted.current) setData(result);
      } catch (err) {
        console.warn("WaterSystem lookup failed:", err);
        if (mounted.current) setData({ mystery: true });
      }
    }

    load();
    return () => { mounted.current = false; };
  }, [cacheKey]);

  // Loading state
  if (data === undefined) {
    return (
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" aria-hidden="true" />
        <span>Loading water data…</span>
      </div>
    );
  }

  // Mystery state — no data, show ❓ Mystery grade
  if (data.mystery || !data.grade_tier) {
    const style = GRADE_STYLES.mystery;
    return (
      <div
        className={`mt-2 rounded-xl border ${style.border} ${style.bg} px-3 py-2 text-[11px] flex items-center justify-between gap-2 flex-wrap`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center gap-1.5 font-bold ${style.nameText} min-w-0`}>
          <Droplets className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <span>💧 Tap Water</span>
        </div>
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${style.pillBg} ${style.pillText}`}
          aria-label="Water quality grade: Mystery — not yet rated"
        >
          <span aria-hidden="true">❓</span> Mystery
        </span>
      </div>
    );
  }

  // Real data — show the playful grade
  const style = GRADE_STYLES[data.grade_tier] || GRADE_STYLES.mystery;
  const ewgUrl = zip_code
    ? `https://www.ewg.org/tapwater/search-results.php?zip5=${zip_code}`
    : `https://www.ewg.org/tapwater/system.php?pws=${data.pwsid}`;

  return (
    <div
      className={`mt-2 rounded-xl border ${style.border} ${style.bg} px-3 py-2 text-[11px]`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`flex items-center gap-1.5 font-bold ${style.nameText} min-w-0`}>
          <Droplets className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="truncate leading-tight">{data.name}</span>
        </div>
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${style.pillBg} ${style.pillText}`}
          aria-label={`Water quality grade: ${data.grade_label} — ${style.description}`}
        >
          <span aria-hidden="true">{data.grade_emoji}</span> {data.grade_label}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
        <span className={style.nameText}>💧 {data.source_type || "Unknown source"}</span>
        <a
          href={ewgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded whitespace-nowrap text-[11px]"
          aria-label={`See full tap water report for ${data.name} on EWG (opens in new tab)`}
        >
          See full report <ExternalLink className="w-2.5 h-2.5 ml-0.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}