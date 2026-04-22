import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Droplets, ExternalLink, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Extracts a US state abbreviation from a restaurant object
function inferState(restaurant) {
  // Try explicit fields first
  if (restaurant.state && restaurant.state.length === 2) return restaurant.state.toUpperCase();

  // Map known county_id → state abbreviation
  const COUNTY_STATE = {
    king: "WA", nyc: "NY", ny_state: "NY", cook: "IL",
    montgomery_md: "MD", travis: "TX", sf: "CA", la: "CA",
    delaware: "DE",
  };
  if (restaurant.county_id && COUNTY_STATE[restaurant.county_id]) {
    return COUNTY_STATE[restaurant.county_id];
  }
  if (restaurant.source && COUNTY_STATE[restaurant.source]) {
    return COUNTY_STATE[restaurant.source];
  }

  // Try parsing from address string
  const addr = `${restaurant.address || ""} ${restaurant.city || ""} ${restaurant.zip_code || ""}`;
  const match = addr.match(/\b([A-Z]{2})\b/);
  return match ? match[1] : null;
}

const GRADE_STYLES = {
  excellent:       { bg: "bg-blue-600",   text: "text-white",       border: "border-blue-200",  panelBg: "bg-blue-50" },
  good:            { bg: "bg-lime-500",   text: "text-white",       border: "border-lime-200",  panelBg: "bg-lime-50" },
  drinkable:       { bg: "bg-orange-400", text: "text-white",       border: "border-orange-200",panelBg: "bg-orange-50" },
  not_recommended: { bg: "bg-red-600",    text: "text-white",       border: "border-red-200",   panelBg: "bg-red-50" },
};

export default function WaterQualityBadge({ restaurant }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(false);

  const city  = restaurant.city;
  const state = inferState(restaurant);

  useEffect(() => {
    if (!city || !state) { setLoading(false); return; }

    setLoading(true);
    base44.functions.invoke("getWaterQuality", { city, state, country: "US" })
      .then(res => setData(res.data))
      .catch(() => setData({ available: false, reason: "Unable to fetch water data." }))
      .finally(() => setLoading(false));
  }, [city, state]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 w-fit">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking water quality…
      </div>
    );
  }

  if (!data?.available) {
    const reason = (!city || !state)
      ? "No location data to look up water quality."
      : (data?.reason || "Water quality data not available for this location.");
    const isNonUS = !state && !city;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 w-fit">
        <Droplets className="w-3.5 h-3.5 text-slate-400" />
        <span>
          💧 Tap water: {isNonUS ? "US data only" : reason}
          {" · "}
          <Link to="/About#water-quality" className="underline hover:text-slate-700">Learn more</Link>
        </span>
      </div>
    );
  }

  const styles = GRADE_STYLES[data.grade] || GRADE_STYLES.good;

  return (
    <div className={`rounded-2xl border ${styles.border} overflow-hidden`}>
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${styles.panelBg} hover:opacity-90 transition-opacity text-left`}
        aria-expanded={expanded}
      >
        {/* Grade pill */}
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${styles.bg} ${styles.text} flex-shrink-0`}>
          <Droplets className="w-3 h-3" />
          {data.emoji} {data.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 leading-tight">💧 Tap Water Quality</p>
          <p className="text-[11px] text-slate-500 truncate">{data.verdict}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            to="/About#water-quality"
            onClick={e => e.stopPropagation()}
            className="text-[10px] text-blue-500 hover:underline font-semibold hidden sm:block"
          >
            How is this graded?
          </Link>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 py-4 bg-white space-y-3 border-t border-slate-100">
          <p className="text-xs text-slate-600 leading-relaxed">{data.detail}</p>

          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
              🏙️ {data.systemName}
            </span>
            {data.populationServed && (
              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
                👥 {Number(data.populationServed).toLocaleString()} served
              </span>
            )}
            {data.isFallback && (
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                ⚠ State-level estimate
              </span>
            )}
          </div>

          {data.violations?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest">Recent EPA Violations</p>
              {data.violations.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                  <span className="text-red-800 leading-tight">
                    {v.CONTAMINANT_NAME || v.VIOLATION_CATEGORY_CODE} — {v.VIOLATION_STATUS || "Open"}
                    {v.COMPL_PER_BEGIN_DATE ? ` (since ${new Date(v.COMPL_PER_BEGIN_DATE).toLocaleDateString("en-US", { year: "numeric", month: "short" })})` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">Source: EPA Safe Drinking Water Information System</p>
            {data.epaUrl && (
              <a
                href={data.epaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline font-semibold"
              >
                Full EPA report <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}