import React from "react";

const TOP_VIOLATIONS = [
  { emoji: "🐀", label: "Rodents / Pests", count: "2,341", color: "bg-red-50 border-red-200 text-red-700" },
  { emoji: "🌡️", label: "Temperature Abuse", count: "3,812", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { emoji: "🙌", label: "Poor Hand Hygiene", count: "1,994", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { emoji: "🧹", label: "Unclean Surfaces", count: "2,670", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { emoji: "🥩", label: "Cross-Contamination", count: "1,587", color: "bg-purple-50 border-purple-200 text-purple-700" },
];

export default function HeroViolations() {
  return (
    <div className="mt-8">
      <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Most Common Violations in Our Database
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {TOP_VIOLATIONS.map(({ emoji, label, count, color }) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1.5 border rounded-2xl px-3 py-4 ${color} transition-transform hover:scale-105`}
          >
            <span className="text-3xl" role="img" aria-label={label}>{emoji}</span>
            <span className="text-xs font-bold text-center leading-tight">{label}</span>
            <span className="text-lg font-extrabold">{count}</span>
            <span className="text-[10px] font-medium opacity-70">violations</span>
          </div>
        ))}
      </div>
    </div>
  );
}