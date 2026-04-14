import React from "react";

// Esri diverging ramp: deep green → light green → yellow → orange → red
const levels = [
  { range: "90-100", color: "bg-green-700",  textColor: "text-white",     label: "A — Excellent" },
  { range: "80-89",  color: "bg-green-400",  textColor: "text-white",     label: "B — Very Good" },
  { range: "70-79",  color: "bg-yellow-400", textColor: "text-slate-800", label: "C — Acceptable" },
  { range: "60-69",  color: "bg-orange-400", textColor: "text-white",     label: "D — Below Avg" },
  { range: "0-59",   color: "bg-red-600",    textColor: "text-white",     label: "F — Critical" },
  { range: "No data",color: "bg-slate-300",  textColor: "text-slate-700", label: "U — Unknown" },
];

export default function ScoreLegend() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-3">
        Grade Scale
      </h3>
      <div className="space-y-2">
        {levels.map((level) => (
          <div key={level.range} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${level.color}`}>
              <span className={`font-extrabold text-xs ${level.textColor}`}>{level.label.split(" ")[0]}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{level.label}</p>
              <p className="text-[10px] text-slate-400">{level.range}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
        Scores normalized from each county's official grading. Scales vary by jurisdiction — see About for details.
      </p>
    </div>
  );
}