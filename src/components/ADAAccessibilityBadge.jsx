import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Accessibility, CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

const ADA_CACHE_KEY = "safeeats_ada_cache";

function loadCache() {
  try { return JSON.parse(localStorage.getItem(ADA_CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(ADA_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export default function ADAAccessibilityBadge({ restaurant }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Only show for US restaurants
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

  const getIcon = () => {
    if (status === "loading") return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
    if (status === "error") return <HelpCircle className="w-4 h-4 text-slate-400" />;
    if (!data) return <Accessibility className="w-4 h-4 text-slate-400" />;
    if (data.accessible === true) return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    if (data.accessible === false) return <XCircle className="w-4 h-4 text-red-500" />;
    return <HelpCircle className="w-4 h-4 text-slate-400" />;
  };

  const getBgColor = () => {
    if (!data || status !== "done") return "bg-slate-50 border-slate-200";
    if (data.accessible === true) return "bg-emerald-50 border-emerald-200";
    if (data.accessible === false) return "bg-red-50 border-red-200";
    return "bg-slate-50 border-slate-200";
  };

  const getHeadline = () => {
    if (status === "loading") return "Checking ADA accessibility…";
    if (status === "error") return "ADA info unavailable";
    if (!data) return "ADA accessibility unknown";
    if (data.accessible === true) return "Likely ADA accessible";
    if (data.accessible === false) return "May not be fully ADA accessible";
    return "ADA accessibility unclear";
  };

  const featureRow = (label, value) => {
    if (value === null || value === undefined) return null;
    return (
      <div className="flex items-center gap-2 text-xs">
        {value === true
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
        <span className={value ? "text-slate-700" : "text-slate-500"}>{label}</span>
      </div>
    );
  };

  const hasFeatures = data && (data.entrance !== null || data.restroom !== null || data.parking !== null);

  return (
    <div className={`rounded-2xl border p-4 ${getBgColor()} transition-all`}>
      <button
        onClick={() => status === "done" && data && setExpanded(v => !v)}
        className="w-full flex items-center gap-3 text-left"
        disabled={status !== "done" || !data}
      >
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">♿ ADA Accessibility</span>
            {data?.confidence === "low" && (
              <span className="text-[10px] text-slate-400 font-medium">(low confidence)</span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{getHeadline()}</p>
        </div>
        {status === "done" && data && (hasFeatures || data.summary) && (
          expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {expanded && data && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
          {data.summary && (
            <p className="text-xs text-slate-600 leading-relaxed">{data.summary}</p>
          )}
          {hasFeatures && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {featureRow("Accessible entrance", data.entrance)}
              {featureRow("Accessible restroom", data.restroom)}
              {featureRow("Accessible parking", data.parking)}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            ⓘ ADA info sourced via public web data. Verify with the restaurant directly for the most accurate information.
          </p>
        </div>
      )}
    </div>
  );
}