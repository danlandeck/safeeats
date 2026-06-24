import React, { useState, useEffect } from "react";
import { Droplets, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { inferState } from "../utils/regions";

// International sources that have no EWG/EPA data
const NO_WATER_DATA_SOURCES = ["toronto", "dubai", "uk_fsa"];

const GRADE_STYLES = {
  excellent:        { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", dot: "bg-blue-500" },
  good:             { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
  drinkable:        { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  not_recommended:  { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", dot: "bg-red-500" },
};

function loadCache() {
  try { return JSON.parse(localStorage.getItem("epa-water-cache") || "{}"); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem("epa-water-cache", JSON.stringify(cache)); } catch {}
}

export default function EPAWaterCard({ restaurant }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const state = inferState(restaurant);
  const city = restaurant.city;
  const zip = restaurant.zip_code;
  const source = restaurant.source;
  const shouldSkip = NO_WATER_DATA_SOURCES.includes(source) || !state;

  const cacheKey = `${(city || "").toLowerCase()}|${state || ""}`;

  useEffect(() => {
    if (shouldSkip || !city || !state) return;
    const cache = loadCache();
    if (cache[cacheKey]) {
      setData(cache[cacheKey]);
      return;
    }
    setLoading(true);
    base44.functions.invoke("getWaterQuality", {
      city,
      state,
      county_id: restaurant.county_id,
      full_address: [restaurant.address, city, zip].filter(Boolean).join(", "),
    }).then((res) => {
      const d = res.data || {};
      const cache = loadCache();
      cache[cacheKey] = d;
      saveCache(cache);
      setData(d);
    }).catch(() => {
      setData({ available: false });
    }).finally(() => setLoading(false));
  }, [cacheKey]);

  // Skip international restaurants (after hooks)
  if (shouldSkip) return null;

  // Loading state
  if (loading) {
    return (
      <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
        <span className="text-blue-700 font-bold">Checking EPA tap water quality…</span>
      </div>
    );
  }

  // No data available — fall back to EWG link
  if (!data || !data.available) {
    if (!zip) return null;
    const ewgUrl = `https://www.ewg.org/tapwater/search-results.php?zip5=${zip}`;
    return (
      <div
        className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] flex items-center justify-between gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 text-blue-800 font-bold min-w-0">
          <Droplets className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <span>💧 Tap Water Quality</span>
        </div>
        <a
          href={ewgUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded whitespace-nowrap text-[11px]"
          aria-label={`Check tap water quality on EWG for zip code ${zip} (opens in new tab)`}
        >
          Check on EWG <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
        </a>
      </div>
    );
  }

  // Real EPA data available — show visible grade indicator
  const style = GRADE_STYLES[data.grade] || GRADE_STYLES.drinkable;

  return (
    <div
      className={`mt-2 rounded-xl border ${style.border} ${style.bg} px-3 py-2.5 text-[11px]`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base flex-shrink-0">{data.emoji}</span>
          <div className="min-w-0">
            <div className={`font-extrabold ${style.text} leading-tight`}>
              Tap Water: {data.label}
            </div>
            {data.systemName && (
              <div className="text-[10px] text-slate-500 truncate">
                {data.systemName}
                {data.isFallback && data.fallbackLevel ? ` · ${data.fallbackLevel}-level` : ""}
              </div>
            )}
          </div>
        </div>
        {data.epaUrl && (
          <a
            href={data.epaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline font-bold focus:outline-none focus:ring-2 focus:ring-[#4CAF50] rounded whitespace-nowrap text-[10px]"
            aria-label="View full EPA water system report (opens in new tab)"
          >
            EPA Report <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
      <p className={`mt-1.5 text-[10px] leading-snug ${style.text} opacity-90`}>
        {data.verdict}
      </p>
      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-200/60">
        <ShieldCheck className="w-2.5 h-2.5 text-slate-400" />
        <span className="text-[9px] text-slate-400 font-semibold">
          Live EPA SDWIS data · {data.detail ? "verified violations history" : "no violations found"}
        </span>
      </div>
    </div>
  );
}