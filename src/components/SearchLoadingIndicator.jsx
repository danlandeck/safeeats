import React, { useEffect, useState } from "react";
import { Database, Globe, Wifi, Search } from "lucide-react";

/**
 * Maps each countyId to its real health department name, connection type,
 * and an emoji for quick visual recognition.
 *
 * Connection types:
 *   live_api       — direct government open-data API (Socrata/ArcGIS)
 *   backend_proxy  — government portal proxied through a SafeEats backend function
 *   ai_enrichment  — Google Places verification + AI web-search of official records
 *   ai_only        — AI-only search (no machine-readable government dataset exists)
 */
const SOURCE_INFO = {
  king:           { dept: "King County Public Health",           type: "live_api",       icon: "🌲" },
  nyc:            { dept: "NYC Department of Health & Mental Hygiene", type: "live_api", icon: "🗽" },
  cook:           { dept: "Chicago Dept. of Public Health",       type: "live_api",       icon: "🏙️" },
  montgomery_md:  { dept: "Montgomery County DHHS",               type: "live_api",       icon: "🏛️" },
  travis:         { dept: "Austin Public Health",                 type: "live_api",       icon: "🤠" },
  sf:             { dept: "SF Department of Public Health",       type: "live_api",       icon: "🌉" },
  la:             { dept: "LA County Dept. of Public Health",     type: "backend_proxy",  icon: "🌴" },
  delaware:       { dept: "Delaware DHSS",                        type: "live_api",       icon: "🦅" },
  ny_state:       { dept: "NY State Dept. of Health",             type: "live_api",       icon: "🏔️" },
  toronto:        { dept: "Toronto Public Health (DineSafe)",     type: "backend_proxy",  icon: "🍁" },
  boston:         { dept: "Boston Inspectional Services",         type: "backend_proxy",  icon: "🦞" },
  houston:        { dept: "Houston Health Department",            type: "backend_proxy",  icon: "🤠" },
  stanislaus:     { dept: "Stanislaus County EHD",                type: "backend_proxy",  icon: "🌾" },
  pierce:         { dept: "Tacoma-Pierce County Health Dept.",    type: "backend_proxy",  icon: "🏔️" },
  snhd:           { dept: "Southern Nevada Health District",      type: "backend_proxy",  icon: "🎰" },
  vancouver:      { dept: "Vancouver Coastal Health",             type: "backend_proxy",  icon: "🏔️" },
  uk_fsa:         { dept: "UK Food Standards Agency (FHRS)",      type: "live_api",       icon: "🇬🇧" },
  singapore:      { dept: "Singapore Food Agency (SFA)",          type: "ai_enrichment",  icon: "🦁" },
  sydney:         { dept: "NSW Food Authority",                   type: "ai_enrichment",  icon: "🇦🇺" },
  brisbane:       { dept: "Queensland Health",                    type: "ai_enrichment",  icon: "🇦🇺" },
  gold_coast:     { dept: "Gold Coast City Council",              type: "ai_enrichment",  icon: "🇦🇺" },
  dubai:          { dept: "Dubai Municipality Food Safety Dept.", type: "ai_only",        icon: "🏙️" },
  manchester_ct:  { dept: "Manchester CT Health Department",      type: "ai_enrichment",  icon: "🏥" },
  philly:         { dept: "Philadelphia Dept. of Public Health",  type: "ai_enrichment",  icon: "🔔" },
  wake:           { dept: "Wake County Environmental Health",      type: "backend_proxy",  icon: "🌲" },
  jefferson_ky:   { dept: "Louisville Metro Public Health",        type: "backend_proxy",  icon: "🍗" },
  riverside:       { dept: "Riverside County DEH",                  type: "backend_proxy",  icon: "🌴" },
  alabama:         { dept: "Alabama Dept. of Public Health",        type: "backend_proxy",  icon: "🦐" },
  arkansas:        { dept: "Arkansas Dept. of Health",              type: "backend_proxy",  icon: "💎" },
  maricopa:        { dept: "Maricopa County Environmental Services", type: "backend_proxy",  icon: "🌵" },
  tri_county_co:   { dept: "Tri-County Health Department (CO)",     type: "live_api",       icon: "⛰️" },
  fvhd:            { dept: "Farmington Valley Health District (CT)", type: "backend_proxy",  icon: "🌲" },
  dc:              { dept: "DC Health (Washington, DC)",              type: "backend_proxy",  icon: "🏛️" },
  florida:         { dept: "Florida DBPR (Hotels & Restaurants)",     type: "backend_proxy",  icon: "🌴" },
};

const TYPE_META = {
  live_api:      { label: "Live Government API",        color: "bg-emerald-500",  text: "text-emerald-600",  desc: "Querying official health department database in real time…" },
  backend_proxy: { label: "Government Portal (Proxied)", color: "bg-blue-500",    text: "text-blue-600",     desc: "Fetching records from the official health department portal…" },
  ai_enrichment: { label: "AI-Verified Public Records",  color: "bg-amber-500",    text: "text-amber-600",    desc: "Verifying restaurants via Google Places, then searching official inspection records…" },
  ai_only:       { label: "AI Web Search",               color: "bg-purple-500",   text: "text-purple-600",   desc: "Searching the live web for official food safety inspection records…" },
};

function resolveSource(countyId, locationCtx, isAISearch) {
  if (SOURCE_INFO[countyId]) return SOURCE_INFO[countyId];
  // Unknown / global county — derive from location context
  if (isAISearch) {
    return {
      dept: locationCtx ? `${locationCtx} — Public Health Records` : "Global Public Health Records",
      type: "ai_enrichment",
      icon: "🌍",
    };
  }
  return {
    dept: locationCtx || "Government Health Database",
    type: "live_api",
    icon: "🏥",
  };
}

// Animated dots that cycle to suggest active work
function AnimatedDots() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => (c + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-6 text-left">{".".repeat(count)}</span>;
}

export default function SearchLoadingIndicator({ countyId, locationCtx, isAISearch }) {
  const source = resolveSource(countyId, locationCtx, isAISearch);
  const meta = TYPE_META[source.type] || TYPE_META.ai_enrichment;
  const Icon = source.type === "live_api" || source.type === "backend_proxy"
    ? Database
    : source.type === "ai_only"
    ? Search
    : Globe;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" style={{ fontFamily: "Nunito, sans-serif" }}>
      {/* Pulsing icon ring */}
      <div className="relative mb-6">
        <div className={`absolute inset-0 ${meta.color} opacity-20 rounded-full animate-ping`} style={{ animationDuration: "1.5s" }} />
        <div className={`relative w-16 h-16 rounded-full ${meta.color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <span className="absolute -bottom-1 -right-1 text-2xl bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md border border-slate-200">
          {source.icon}
        </span>
      </div>

      {/* Department name */}
      <h3 className="text-lg font-black text-slate-800 text-center mb-1">
        Querying: {source.dept}
      </h3>

      {/* Connection type badge */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className={`inline-flex items-center gap-1 ${meta.color} text-white text-xs font-bold px-2.5 py-1 rounded-full`}>
          <Wifi className="w-3 h-3" />
          {meta.label}
        </span>
      </div>

      {/* Status text with animated dots */}
      <p className={`text-sm font-semibold ${meta.text}`}>
        {meta.desc}<AnimatedDots />
      </p>

      {/* Animated progress bar */}
      <div className="w-64 max-w-full mt-5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${meta.color} rounded-full`}
          style={{
            width: "40%",
            animation: "loading-slide 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes loading-slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}