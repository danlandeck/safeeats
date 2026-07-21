import { Database, Search, AlertCircle } from "lucide-react";

const TIERS = [
  {
    icon: Database,
    color: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    title: "Live API Markets",
    stat: "20 sources · 3 countries",
    body: "Direct, real-time connectors to government open-data APIs — NYC, Chicago, SF, LA County, King County, Austin, Montgomery MD, Delaware, NY State, Boston, Houston, Toronto, UK FSA, and more. Queried at request time, never stale snapshots.",
    items: ["Socrata / CKAN / ArcGIS", "UK FSA national API", "Real-time freshness tracking"],
  },
  {
    icon: Search,
    color: "bg-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
    title: "AI-Enhanced Markets",
    stat: "Additional jurisdictions",
    body: "For jurisdictions with publicly accessible inspection records but no structured API, AI reads official health department websites and portals. GPT-5 Mini identifies restaurants; Gemini 3 Flash pulls inspection data from official sources. Every result carries a confidence level and verification source — unverified entries are filtered out.",
    items: ["Dubai Municipality (public sources)", "Denmark Smiley (findsmiley.dk)", "Confidence-labeled & deduplicated"],
  },
  {
    icon: AlertCircle,
    color: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
    title: "Portal Redirect (Not Coverage)",
    stat: "Honest scope",
    body: "For jurisdictions with no scrapable data and no publicly accessible records, SafeEats links to the official health department portal so users can search manually. This is a convenience — not coverage. We do not claim the invention operates in jurisdictions where we can only redirect users elsewhere. The normalization requires data to normalize.",
    items: ["Clearly labeled as redirect-only", "Not counted in coverage claims", "Honest scope protects the patent"],
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