import React from "react";

const levels = [
  { grade: "A", range: "90–100", color: "bg-green-700",  textColor: "text-white",     label: "A — Excellent", tip: "Very safe ✅" },
  { grade: "B", range: "80–89",  color: "bg-green-400",  textColor: "text-white",     label: "B — Good",      tip: "Generally safe 👍" },
  { grade: "C", range: "70–79",  color: "bg-yellow-400", textColor: "text-slate-800", label: "C — Okay",      tip: "Some issues ⚠️" },
  { grade: "D", range: "60–69",  color: "bg-orange-400", textColor: "text-white",     label: "D — Poor",      tip: "Real problems 🔴" },
  { grade: "F", range: "0–59",   color: "bg-red-600",    textColor: "text-white",     label: "F — Critical",  tip: "Serious violations 🚨" },
  { grade: "U", range: "No data",color: "bg-slate-300",  textColor: "text-slate-700", label: "U — Unknown",   tip: "No records found ❓" },
];

export default function ScoreLegend({ activeGrade, onGradeFilter }) {
  const interactive = typeof onGradeFilter === "function";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 mb-0.5">
        What do the grades mean?
      </h3>
      {interactive && (
        <p className="text-[10px] text-slate-400 mb-3">Tap a grade to filter results</p>
      )}
      <div className="space-y-1">
        {levels.map((level) => {
          const isActive = activeGrade === level.grade;
          return (
            <div
              key={level.grade}
              onClick={() => interactive && onGradeFilter(isActive ? null : level.grade)}
              className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all ${
                interactive ? "cursor-pointer hover:bg-slate-50" : ""
              } ${isActive ? "ring-2 ring-slate-800 bg-slate-50" : ""}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${level.color} ${isActive ? "scale-110 transition-transform" : ""}`}>
                <span className={`font-extrabold text-xs ${level.textColor}`}>{level.grade}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800">{level.tip}</p>
                <p className="text-[10px] text-slate-400">{level.range} points</p>
              </div>
              {isActive && (
                <span className="text-[10px] font-bold text-blue-500 flex-shrink-0">active ✓</span>
              )}
            </div>
          );
        })}
      </div>
      {activeGrade && interactive && (
        <button
          onClick={() => onGradeFilter(null)}
          className="mt-3 w-full text-xs font-semibold text-blue-600 hover:underline text-center"
        >
          Clear filter
        </button>
      )}
      <p className="text-[10px] text-slate-400 mt-3 leading-relaxed border-t border-slate-100 pt-2">
        Scores are normalized from official government records. The A–F scale lets you compare any restaurant, anywhere.
      </p>
    </div>
  );
}