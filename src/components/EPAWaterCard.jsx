import React, { useState, useEffect, useRef } from "react";
import { Droplets, ExternalLink } from "lucide-react";

/**
 * EPAWaterCard — fetches EPA SDWIS community water system data for a city+state
 * and displays it on a restaurant card.
 *
 * Props:
 *   city  — string
 *   state — 2-letter state code (US only)
 */

// Module-level cache so each city|state combo is only fetched once per session
const WATER_CACHE = {};

const SOURCE_LABELS = {
  GW: "Groundwater",
  SW: "Surface water",
  GU: "Groundwater under surface water influence",
  SWP: "Purchased surface water",
  GWP: "Purchased groundwater",
};

function getStatusBadge(sys) {
  if (!sys) return null;
  const healthViol = Number(sys.VIOL_HEALTH_BASED || 0);
  const unresolvedViol = Number(sys.VIOL_UNRESOLVED || 0);

  if (unresolvedViol > 0) {
    return { label: "Active violations", color: "bg-red-100 text-red-700 border-red-200", icon: "⚠️" };
  }
  if (healthViol > 0) {
    return { label: "Past violations", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⚠️" };
  }
  return { label: "No violations", color: "bg-green-100 text-green-700 border-green-200", icon: "✓" };
}

async function fetchEPAWater(city, state) {
  const key = `${city}|${state}`;
  if (WATER_CACHE[key] !== undefined) return WATER_CACHE[key];

  const encoded = encodeURIComponent(city.toUpperCase());
  const url = `https://data.epa.gov/efservice/SDW_PUB_WATER_SYSTEMS/CITY_SERVED/=/${encoded}/PRIMACY_AGENCY_CODE/=/${state}/PWS_ACTIVITY_CODE/=/A/PWS_TYPE_CODE/=/CWS/JSON`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) { WATER_CACHE[key] = null; return null; }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) { WATER_CACHE[key] = null; return null; }

  // Pick system with highest population served
  const best = data.reduce((a, b) =>
    Number(b.POPULATION_SERVED_COUNT || 0) > Number(a.POPULATION_SERVED_COUNT || 0) ? b : a
  );
  WATER_CACHE[key] = best;
  return best;
}

export default function EPAWaterCard({ city, state }) {
  const [sys, setSys]       = useState(undefined); // undefined=loading, null=unavailable
  const [error, setError]   = useState(false);
  const mounted             = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!city || !state) { setSys(null); return; }

    fetchEPAWater(city, state)
      .then(d => { if (mounted.current) setSys(d); })
      .catch(() => { if (mounted.current) { setSys(null); setError(true); } });

    return () => { mounted.current = false; };
  }, [city, state]);

  if (sys === undefined) {
    // Loading — show a subtle skeleton
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <Droplets className="w-3 h-3 text-blue-300 animate-pulse" aria-hidden="true" />
        <span className="text-[10px] text-slate-400 animate-pulse">Loading water data…</span>
      </div>
    );
  }

  if (!sys) {
    return (
      <div className="flex items-center gap-1 mt-1.5">
        <Droplets className="w-3 h-3 text-slate-300" aria-hidden="true" />
        <span className="text-[10px] text-slate-400">Water data not available for this location</span>
      </div>
    );
  }

  const badge = getStatusBadge(sys);
  const sourceLabel = SOURCE_LABELS[sys.PRIMARY_SOURCE_CODE] || sys.PRIMARY_SOURCE_CODE || "Unknown source";
  const pwsId = sys.PWSID || "";
  const epaUrl = pwsId
    ? `https://echo.epa.gov/detailed-facility-report?fid=${pwsId}`
    : `https://data.epa.gov/efservice/SDW_PUB_WATER_SYSTEMS/PWSID/=/${pwsId}/JSON`;

  return (
    <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-blue-800">
          <Droplets className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
          <span className="leading-tight">{sys.PWS_NAME || "Water system"}</span>
        </div>
        {badge && (
          <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.color}`} aria-label={`Water status: ${badge.label}`}>
            <span aria-hidden="true">{badge.icon}</span> {badge.label}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
        <span className="text-blue-600">💧 {sourceLabel}</span>
        {pwsId && (
          <a
            href={epaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded"
            aria-label={`View EPA water report for ${sys.PWS_NAME || "this system"} (opens in new tab)`}
          >
            View EPA report <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}