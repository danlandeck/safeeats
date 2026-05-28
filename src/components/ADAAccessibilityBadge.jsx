import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, XCircle, ExternalLink, HelpCircle } from "lucide-react";
import { SEARCH_KEYS } from "../utils/searchState";

const ADA_CACHE_KEY = SEARCH_KEYS[2];

function loadCache() {
  try { return JSON.parse(localStorage.getItem(ADA_CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(ADA_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

const FeatureRow = ({ label, icon, value }) => {
  if (value === null || value === undefined) return null;
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center ${value ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
      <span className="text-xl">{icon}</span>
      {value
        ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        : <XCircle className="w-4 h-4 text-red-400" />}
      <span className={`text-[11px] font-bold leading-tight ${value ? "text-emerald-800" : "text-red-700"}`}>{label}</span>
    </div>
  );
};

export default function ADAAccessibilityBadge({ restaurant }) {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Default to treating restaurants as US-based unless explicitly international.
  // This is the right default — health inspection sources covered by SafeEats
  // (king, nyc, cook, travis, sf, la, montgomery_md, delaware, ny_state) are all US.
  const INTERNATIONAL_SOURCES = ["toronto", "dubai", "uk_fsa"];
  const isUS = !INTERNATIONAL_SOURCES.includes(restaurant.source);

  useEffect(() => {
    if (!isUS) return;
    const cacheKey = `places-ada-${restaurant.business_id}`;
    const cache = loadCache();
    const cached = cache[cacheKey];
    if (cached) {
      setData(cached);
      setStatus("done");
      return;
    }
    setStatus("loading");

    base44.functions.invoke("getPlacesADA", {
      name: restaurant.name,
      address: restaurant.address || "",
      city: restaurant.city || "",
      zip_code: restaurant.zip_code || "",
    }).then((res) => {
      const d = res.data || {};
      const cache = loadCache();
      cache[cacheKey] = d;
      saveCache(cache);
      setData(d);
      setStatus("done");
    }).catch(() => {
      setStatus("error");
    });
  }, [restaurant.business_id, isUS]);

  if (!isUS) return null;

  // Hide on error or when Google has no data for this place
  if (status === "error") return null;
  if (status === "done" && (!data?.found || !data?.hasAnyData)) return null;

  const entrance = data?.wheelchairAccessibleEntrance ?? null;
  const parking  = data?.wheelchairAccessibleParking  ?? null;
  const restroom = data?.wheelchairAccessibleRestroom  ?? null;
  const seating  = data?.wheelchairAccessibleSeating   ?? null;

  // Determine overall accessible status from entrance (most critical field)
  const isAccessible    = entrance === true  || (entrance === null && (parking === true || restroom === true || seating === true));
  const isNotAccessible = entrance === false;

  const headerBg = isAccessible
    ? "bg-gradient-to-r from-emerald-600 to-emerald-500"
    : isNotAccessible
    ? "bg-gradient-to-r from-red-500 to-orange-500"
    : "bg-gradient-to-r from-slate-600 to-slate-500";

  const wrapperBorder = isAccessible ? "border-emerald-300" : isNotAccessible ? "border-red-200" : "border-slate-200";

  const headline = status === "loading"
    ? "Checking ADA accessibility…"
    : isAccessible    ? "♿ Wheelchair Accessible"
    : isNotAccessible ? "⚠️ Limited Wheelchair Accessibility"
    : "♿ Accessibility Unknown";

  const subtext = status === "loading"
    ? "Looking up Google Places data…"
    : isAccessible
    ? "Google Maps confirms accessibility features at this location."
    : isNotAccessible
    ? "Google Maps indicates limited accessibility at this location."
    : "Google Maps has partial accessibility data for this location.";

  const hasFeatures = data && (data.entrance !== null || data.restroom !== null || data.parking !== null || data.automatic_doors !== null);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm ${wrapperBorder}`}>
      {/* Header bar */}
      <div className={`${headerBg} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">♿</span>
          <div>
            <p className="text-white font-extrabold text-sm tracking-tight">{headline}</p>
            <p className="text-white/80 text-xs mt-0.5">{subtext}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "loading" && <Loader2 className="w-5 h-5 text-white animate-spin" />}
          {status === "done" && isAccessible && <CheckCircle2 className="w-6 h-6 text-white fill-white/20" />}
          {status === "done" && isNotAccessible && <XCircle className="w-6 h-6 text-white fill-white/20" />}
          {status === "done" && !isAccessible && !isNotAccessible && <HelpCircle className="w-6 h-6 text-white/70" />}
        </div>
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4">
        {/* Mission statement */}
        <div className="flex items-start gap-2 mb-4">
          <span className="text-lg flex-shrink-0">❤️</span>
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Accessibility matters.</span> SafeEats is committed to helping everyone — including guests with disabilities — make informed dining choices. We surface ADA accessibility info alongside health scores so no one is left behind.
          </p>
        </div>

        {/* Feature grid — real Google Places data */}
        {status === "done" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <FeatureRow label="Accessible Entrance" icon="🚪" value={entrance} />
            <FeatureRow label="Accessible Restroom" icon="🚻" value={restroom} />
            <FeatureRow label="Accessible Parking"  icon="🅿️" value={parking}  />
            <FeatureRow label="Accessible Seating"  icon="🪑" value={seating}  />
          </div>
        )}

        {/* Google Places attribution */}
        {status === "done" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">
              Data from Google Maps · 
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((restaurant.name || "") + " " + (restaurant.address || "") + " " + (restaurant.city || ""))}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:underline font-semibold"
            >
              Verify on Google Maps <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-[10px] text-slate-400">· Always confirm directly with the restaurant.</span>
          </div>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking public accessibility records…
          </div>
        )}
      </div>
    </div>
  );
}