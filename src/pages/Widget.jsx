import React, { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import ScoreGauge from "../components/ScoreGauge";
import { getGrade, getGradeColor } from "../utils/grading";

// Widget embed page — renders a minimal safety score card for a single restaurant
// URL params: name, score, grade, address, date
// Usage: /widget?name=McDonald%27s&score=87&address=123+Main+St&date=2024-01-15

export default function Widget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const score = p.get("score") !== null ? parseInt(p.get("score")) : null;
    setData({
      name: p.get("name") || "Restaurant",
      score,
      address: p.get("address") || "",
      date: p.get("date") || "",
      grade: p.get("grade") || getGrade(score),
    });
  }, []);

  if (!data) return null;

  const grade = data.grade || getGrade(data.score);

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-2">
      <a
        href={`https://safeeats.app?q=${encodeURIComponent(data.name)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-xs bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="bg-slate-900 px-4 py-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300 tracking-wide">SafeEats Safety Score</span>
        </div>

        {/* Content */}
        <div className="p-4 flex items-center gap-4">
          <ScoreGauge score={data.score} size="sm" animate={false} />
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-slate-900 text-sm truncate">{data.name}</p>
            {data.address && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{data.address}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${getGradeColor(grade)}`}>
                Grade {grade}
              </span>
              {data.date && (
                <span className="text-[10px] text-slate-400">
                  Last inspected {new Date(data.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-1.5 text-center">
          <span className="text-[10px] text-slate-400">Powered by SafeEats · Click to view full report</span>
        </div>
      </a>
    </div>
  );
}