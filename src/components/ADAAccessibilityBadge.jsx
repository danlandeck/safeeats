import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
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

  const isUS = !restaurant.country || restaurant.country === "US" ||
    ["washington", "new_york", "illinois", "maryland", "texas", "california"].includes(restaurant.source) ||
    ["king", "nyc", "cook", "montgomery_md", "travis", "sf", "la"].includes(restaurant.county_id);

  useEffect(() => {
    if (!isUS) return;
    const cacheKey = restaurant.business_id;
    const cache = loadCache();
    if (cache[cacheKey]) {
      setData(cache[cacheKey]);
      setStatus("done");
      return;
    }
    setStatus("loading");

    const address = `${restaurant.name}, ${restaurant.address || ""}, ${restaurant.city || ""}`.trim();
    base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful assistant looking up ADA (Americans with Disabilities Act) wheelchair accessibility information for a US restaurant.

Restaurant: ${restaurant.name}
Address: ${address}

Search for whether this restaurant is ADA accessible / wheelchair accessible. Look for:
1. Wheelchair accessible entrance (ramp or level entry)
2. Accessible restroom
3. Accessible parking
4. Any known ADA complaints or violations

Return a JSON object with:
- accessible: true | false | "unknown"
- entrance: true | false | null
- restroom: true | false | null  
- parking: true | false | null
- summary: a 1-2 sentence plain English summary
- confidence: "high" | "medium" | "low"

If you cannot find specific info, use "unknown" for accessible and "low" for confidence.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          accessible: {},
          entrance: {},
          restroom: {},
          parking: {},
          summary: { type: "string" },
          confidence: { type: "string" }
        }
      }
    }).then((result) => {
      const d = result || {};
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

  const isAccessible = data?.accessible === true;
  const isNotAccessible = data?.accessible === false;

  const headerBg = isAccessible
    ? "bg-gradient-to-r from-emerald-600 to-emerald-500"
    : isNotAccessible
    ? "bg-gradient-to-r from-red-500 to-orange-500"
    : "bg-gradient-to-r from-slate-600 to-slate-500";

  const wrapperBorder = isAccessible
    ? "border-emerald-300"
    : isNotAccessible
    ? "border-red-200"
    : "border-slate-200";

  const headline = status === "loading"
    ? "Checking ADA accessibility…"
    : status === "error"
    ? "ADA info unavailable"
    : isAccessible
    ? "♿ ADA Accessible"
    : isNotAccessible
    ? "⚠️ Limited ADA Accessibility"
    : "♿ ADA Accessibility Unknown";

  const subtext = status === "loading"
    ? "Searching public records…"
    : isAccessible
    ? "This restaurant appears to accommodate guests with disabilities."
    : isNotAccessible
    ? "This location may have limited accessibility features."
    : "We couldn't confirm specific accessibility details for this location.";

  const hasFeatures = data && (data.entrance !== null || data.restroom !== null || data.parking !== null);

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

        {/* Feature grid */}
        {status === "done" && hasFeatures && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <FeatureRow label="Accessible Entrance" icon="🚪" value={data.entrance} />
            <FeatureRow label="Accessible Restroom" icon="🚻" value={data.restroom} />
            <FeatureRow label="Accessible Parking" icon="🅿️" value={data.parking} />
          </div>
        )}

        {/* Expandable summary */}
        {status === "done" && data?.summary && (
          <div>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide details" : "View source details"}
            </button>
            {expanded && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">{data.summary}</p>
                {data.confidence && (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Confidence: <span className="font-semibold capitalize">{data.confidence}</span> · Sourced via public web data. Always verify directly with the restaurant.
                  </p>
                )}
              </div>
            )}
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