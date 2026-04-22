import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Droplets, Loader2 } from "lucide-react";
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

  const city  = restaurant.city;
  const state = inferState(restaurant);
  const fullAddress = [restaurant.address, restaurant.city, state, restaurant.zip_code].filter(Boolean).join(", ");

  useEffect(() => {
    if (!city || !state) { setLoading(false); return; }

    setLoading(true);
    base44.functions.invoke("getWaterQuality", { city, state, country: "US", county_id: restaurant.county_id, full_address: fullAddress })
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
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${styles.border} ${styles.panelBg}`}>
      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${styles.bg} ${styles.text} flex-shrink-0`}>
        <Droplets className="w-3 h-3" />
        {data.emoji} {data.label}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800 leading-tight">💧 Tap Water Quality</p>
        <p className="text-[11px] text-slate-500 truncate">{data.verdict}</p>
        {data.systemName && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5">Supplied by: {data.systemName}</p>
        )}
      </div>
    </div>
  );
}