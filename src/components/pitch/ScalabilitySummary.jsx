import { Zap, Layers, Plug, Globe2, Cpu, Database } from "lucide-react";

const ARCHITECTURE = [
  {
    icon: Plug,
    title: "Plug-in Data Connectors",
    body: "Each government API is a self-contained connector with its own processor and normalizer. Adding a new market is a configuration task, not a rebuild — the pattern is proven across 23 live sources.",
  },
  {
    icon: Layers,
    title: "Unified Schema",
    body: "One normalized record shape across every source. No per-jurisdiction parsing on the consumer side. A new data source slots into the existing search, detail, and history pipeline with zero frontend changes.",
  },
  {
    icon: Cpu,
    title: "Tiered AI Pipeline",
    body: "GPT-5 Mini for fast restaurant identification (2–4s), Gemini 3 Flash for real-time web search of official sources. Background-refresh pattern returns instant results, then silently upgrades with verified data.",
  },
  {
    icon: Database,
    title: "Cache + Live Hybrid",
    body: "Results are cached with freshness timestamps; live APIs are queried at request time where available. The system gracefully degrades — if an API is down, AI fallback kicks in automatically.",
  },
  {
    icon: Globe2,
    title: "International by Default",
    body: "The search engine handles any city, any country, any language. A user in Tokyo gets the same experience as a user in Austin — location-agnostic by design, not bolted on.",
  },
  {
    icon: Zap,
    title: "Low Marginal Cost",
    body: "Adding the 24th, 50th, or 100th market follows the same proven pattern. The infrastructure scales horizontally — no new servers, no new frontend, no new schema. Just a new connector file.",
  },
];

export default function ScalabilitySummary() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ARCHITECTURE.map(({ icon: Icon, title, body }) => (
        <div
          key={title}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm mb-3">
            <Icon className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="font-extrabold text-slate-900 text-sm mb-1.5">{title}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  );
}