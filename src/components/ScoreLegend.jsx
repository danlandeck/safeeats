import React from "react";

const levels = [
  { range: "90-100", color: "bg-green-600", label: "Excellent", desc: "Really Good ✓" },
  { range: "80-89", color: "bg-green-500", label: "Very Good", desc: "Good ✓" },
  { range: "70-79", color: "bg-lime-500", label: "Good", desc: "Okay" },
  { range: "60-69", color: "bg-yellow-500", label: "Fair", desc: "Fair" },
  { range: "50-59", color: "bg-amber-500", label: "Below Avg", desc: "Concerning" },
  { range: "40-49", color: "bg-orange-500", label: "Caution", desc: "Bad ✗" },
  { range: "30-39", color: "bg-orange-600", label: "Warning", desc: "Really Bad ✗" },
  { range: "20-29", color: "bg-red-500", label: "Poor", desc: "Very Bad ✗✗" },
  { range: "10-19", color: "bg-red-600", label: "Very Poor", desc: "Extremely Bad ✗✗" },
  { range: "0-9", color: "bg-red-700", label: "Critical", desc: "Dangerous ✗✗✗" },
];

export default function ScoreLegend() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Safety Score Legend
      </h3>
      <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mb-3">
        {levels.slice().reverse().map((l) => (
          <div key={l.range} className={`flex-1 ${l.color}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-semibold mb-4">
        <span className="text-red-700">Red = Bad</span>
        <span className="text-green-700">Green = Good</span>
      </div>
      <div className="space-y-1.5 text-[11px]">
        {levels.map((level) => (
          <div key={level.range} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${level.color} flex-shrink-0`} />
              <span className="text-slate-600">{level.range}</span>
            </div>
            <span className={`font-medium ${parseInt(level.range) >= 80 ? 'text-green-600' : parseInt(level.range) >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
              {level.desc}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
        Score from King County penalties. Lower penalties = higher safety score.
      </p>
    </div>
  );
}