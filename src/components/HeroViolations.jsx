import React from "react";

const TOP_VIOLATIONS = [
  { label: "Rodents & Pests", count: "18,400+", emoji: "🐀", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  { label: "Improper Temps", count: "31,200+", emoji: "🌡️", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { label: "Poor Handwashing", count: "22,800+", emoji: "🧼", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  { label: "Cross-Contamination", count: "14,500+", emoji: "🦠", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
];

export default function HeroViolations() {
  return (
    <div className="mt-6">
      <p className="text-center text-xs text-slate-400 font-semibold uppercase tracking-widest mb-3">
        Most common violations found in our database
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TOP_VIOLATIONS.map(({ label, count, emoji, bg, text, border }) => (
          <div
            key={label}
            className={`${bg} ${border} border rounded-xl px-3 py-2.5 text-center`}
          >
            <div className="text-2xl mb-1">{emoji}</div>
            <p className={`text-xs font-extrabold ${text}`}>{count}</p>
            <p className={`text-[10px] font-semibold ${text} opacity-80 mt-0.5 leading-tight`}>{label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-slate-400 mt-2">
        These are real violations recorded by health inspectors — search any restaurant to see theirs
      </p>
    </div>
  );
}