import React from "react";
import { getGrade, getGradeColor } from "../utils/grading";

const GRADE_MEANINGS = {
  A: { emoji: "🟢", label: "Excellent", blurb: "Super clean! Safe to eat." },
  B: { emoji: "🟡", label: "Good", blurb: "A few small issues, but generally safe." },
  C: { emoji: "🟠", label: "Okay", blurb: "Some concerns. Look at the violations." },
  D: { emoji: "🔴", label: "Poor", blurb: "Real problems found. Be careful." },
  F: { emoji: "🚨", label: "Critical", blurb: "Serious violations. Avoid if possible." },
  U: { emoji: "❓", label: "Unknown", blurb: "No inspection data found yet." },
};

export default function GradeBadge({ score, grade: gradeProp, size = "md", showBlurb = false }) {
  const grade = gradeProp || (score !== null && score !== undefined ? getGrade(score) : "U");
  const info = GRADE_MEANINGS[grade] || GRADE_MEANINGS["U"];
  const colorClass = getGradeColor(grade);

  const sizes = {
    xs:  { badge: "w-8 h-8 text-sm",   wrapper: "gap-1" },
    sm:  { badge: "w-10 h-10 text-base", wrapper: "gap-1.5" },
    md:  { badge: "w-14 h-14 text-2xl", wrapper: "gap-2" },
    lg:  { badge: "w-20 h-20 text-4xl", wrapper: "gap-3" },
    xl:  { badge: "w-28 h-28 text-6xl", wrapper: "gap-4" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex flex-col items-center ${s.wrapper}`}>
      <div className={`${s.badge} rounded-2xl flex items-center justify-center font-extrabold shadow-sm ${colorClass}`}>
        {grade}
      </div>
      {showBlurb && (
        <div className="text-center">
          <p className="text-xs font-bold text-slate-700">{info.emoji} {info.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 max-w-[120px]">{info.blurb}</p>
        </div>
      )}
    </div>
  );
}

export { GRADE_MEANINGS };