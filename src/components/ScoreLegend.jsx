import React from "react";

const levels = [
  { range: "90-100", color: "bg-emerald-500", label: "Excellent" },
  { range: "80-89", color: "bg-green-500", label: "Very Good" },
  { range: "70-79", color: "bg-lime-500", label: "Good" },
  { range: "60-69", color: "bg-yellow-500", label: "Fair" },
  { range: "50-59", color: "bg-amber-500", label: "Below Avg" },
  { range: "40-49", color: "bg-orange-500", label: "Caution" },
  { range: "30-39", color: "bg-orange-600", label: "Warning" },
  { range: "20-29", color: "bg-red-500", label: "Poor" },
  { range: "10-19", color: "bg-red-600", label: "Very Poor" },
  { range: "0-9", color: "bg-red-700", label: "Critical" },
];

export default function ScoreLegend() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Safety Score Legend
      </h3>
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-3">
        {levels.map((l) => (
          <div key={l.range} className={`flex-1 ${l.color}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>Critical (0)</span>
        <span>Excellent (100)</span>
      </div>
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        Score is calculated from King County inspection penalty points.
        Lower penalty = higher safety score. A score of 100 means zero violations.
      </p>
    </div>
  );
}