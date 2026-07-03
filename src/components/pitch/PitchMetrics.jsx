import { Globe, Database, ShieldCheck, TrendingUp } from "lucide-react";

const METRICS = [
  { icon: Globe, value: "195+", label: "Countries", sub: "Global coverage" },
  { icon: Database, value: "16", label: "Live API sources", sub: "Direct government data" },
  { icon: ShieldCheck, value: "1M+", label: "Establishments", sub: "Normalized & indexed" },
  { icon: TrendingUp, value: "∞", label: "Scalable", sub: "Plug-in architecture" },
];

export default function PitchMetrics() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {METRICS.map(({ icon: Icon, value, label, sub }) => (
        <div
          key={label}
          className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm"
        >
          <Icon className="w-6 h-6 text-[#4CAF50] mx-auto mb-2" />
          <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
          <p className="text-sm font-bold text-slate-700 mt-1">{label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  );
}