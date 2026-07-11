import { Database, Search, AlertCircle } from "lucide-react";

const TIERS = [
  {
    icon: Database,
    color: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    title: "Live API Markets",
    stat: "18 sources · 3 countries",
    body: "Direct, real-time connectors to government open-data APIs — NYC, Chicago, SF, LA County, King County, Austin, Montgomery MD, Delaware, NY State, Boston, Houston, Toronto, UK FSA, and more. Queried at request time, never stale snapshots.",
    items: ["Socrata / CKAN / ArcGIS", "UK FSA national API", "Real-time freshness tracking"],
  },
  {
    icon: Search,
    color: "bg-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
    title: "AI-Enhanced Markets",
    stat: "74 countries total",
    body: "For jurisdictions with public food safety programs but no structured API, AI reads official health department websites and portals. GPT-5 Mini identifies restaurants instantly; Gemini 3 Flash pulls real-time inspection data from official sources. Every result carries a confidence level and verification source — unverified entries are filtered out.",
    items: ["Dubai, Ireland, Netherlands", "France, Germany, Japan, Brazil", "Geo-fenced & deduplicated"],
  },
  {
    icon: AlertCircle,
    color: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    title: "On the Radar",
    stat: "Expanding pipeline",
    body: "Markets where public food safety data exists in some form but SafeEats has no structured coverage yet — Indonesia, Vietnam, Philippines, Malaysia, Nordics, and more. Each is a roadmap milestone with a clear integration path.",
    items: ["Documented integration paths", "Per-market feasibility assessed", "Pipeline grows quarterly"],
  },
];

export default function CoverageSummary() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {TIERS.map(({ icon: Icon, color, badge, title, stat, body, items }) => (
        <div
          key={title}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm leading-tight">{title}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{stat}</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{body}</p>
          <ul className="space-y-1.5 mt-auto">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
                <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}