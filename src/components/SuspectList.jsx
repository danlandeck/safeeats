import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { getGrade, getGradeColor } from "../utils/grading";

/**
 * SuspectList — shows top restaurants matching a filter (grade or result),
 * collapsed to 10, expandable to full list.
 * Props:
 *   restaurants: full array
 *   filterType: "grade" | "result"
 *   filterValue: e.g. "F (<60)" or "Fail"
 *   onSelectRestaurant: (r) => void
 */
export default function SuspectList({ restaurants, filterType, filterValue, onSelectRestaurant }) {
  const [expanded, setExpanded] = useState(false);

  // Reset expansion whenever the filter changes
  React.useEffect(() => { setExpanded(false); }, [filterValue]);
  const INITIAL_LIMIT = 10;

  if (!filterValue || !restaurants?.length) return null;

  // Filter matching restaurants
  const matches = restaurants.filter((r) => {
    if (filterType === "grade") {
      const gradeRanges = {
        "A (90-100)": [90, 100],
        "B (80-89)": [80, 89],
        "C (70-79)": [70, 79],
        "D (60-69)": [60, 69],
        "F (<60)": [0, 59],
      };
      const [lo, hi] = gradeRanges[filterValue] || [0, 100];
      return (r.safetyScore ?? r.score ?? 0) >= lo && (r.safetyScore ?? r.score ?? 0) <= hi;
    }
    if (filterType === "result") {
      return (r.latestResult || r.result || "").toLowerCase() === filterValue.toLowerCase();
    }
    return false;
  }).sort((a, b) => (a.safetyScore ?? a.score ?? 0) - (b.safetyScore ?? b.score ?? 0));

  if (!matches.length) return null;

  const visible = expanded ? matches : matches.slice(0, INITIAL_LIMIT);
  const hasMore = matches.length > INITIAL_LIMIT;

  const isRisky = filterType === "grade"
    ? ["F (<60)", "D (60-69)"].includes(filterValue)
    : ["fail", "unsatisfactory", "closed", "conditional"].some(k => filterValue.toLowerCase().includes(k));

  return (
    <div className={`mt-3 rounded-2xl border overflow-hidden ${isRisky ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
      <div className={`px-4 py-2.5 flex items-center gap-2 ${isRisky ? "bg-red-100 border-b border-red-200" : "bg-slate-100 border-b border-slate-200"}`}>
        {isRisky && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
        <span className={`text-xs font-extrabold uppercase tracking-widest ${isRisky ? "text-red-700" : "text-slate-600"}`}>
          {matches.length} restaurant{matches.length !== 1 ? "s" : ""} — {filterValue}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map((r, i) => {
          const score = r.safetyScore ?? r.score ?? 0;
          const grade = r.grade || getGrade(score);
          const gradeColorMap = { A: "bg-green-100 text-green-800", B: "bg-lime-100 text-lime-800", C: "bg-yellow-100 text-yellow-800", D: "bg-orange-100 text-orange-800", F: "bg-red-100 text-red-800" };
          return (
            <button
              key={r.business_id || i}
              onClick={() => onSelectRestaurant?.(r)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white transition-colors text-left group"
            >
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md flex-shrink-0 ${gradeColorMap[grade] || "bg-slate-100 text-slate-700"}`}>
                {grade} {score}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                <p className="text-xs text-slate-400 truncate">{r.address}{r.city ? `, ${r.city}` : ""}</p>
              </div>
              <span className="text-xs text-slate-300 group-hover:text-slate-500 flex-shrink-0">→</span>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border-t border-slate-200"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Show {matches.length - INITIAL_LIMIT} More</>
          }
        </button>
      )}
    </div>
  );
}