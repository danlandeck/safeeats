import React from "react";
import { X, Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ScoreGauge from "./ScoreGauge";
import { getGrade, getGradeColor } from "../utils/grading";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const VIOLATION_CATEGORIES = [
  { key: "Temperature",  keywords: ["temp", "cold", "hot", "cook", "cool", "refriger", "frozen", "thaw"] },
  { key: "Sanitation",   keywords: ["sanit", "clean", "wash", "handwash", "soap", "sewage", "waste"] },
  { key: "Pest",         keywords: ["pest", "rodent", "insect", "vermin", "fly", "roach", "mouse", "rat"] },
  { key: "Storage",      keywords: ["storage", "store", "label", "date mark", "covered", "container"] },
  { key: "Equipment",    keywords: ["equipment", "utensil", "surface", "floor", "wall", "ceiling", "ventil"] },
  { key: "Employee",     keywords: ["employee", "worker", "glove", "hair", "illness", "bare hand"] },
];

function categorizeViolations(violations) {
  const counts = {};
  VIOLATION_CATEGORIES.forEach((c) => { counts[c.key] = 0; });
  (violations || []).forEach((v) => {
    const desc = (v.violation_description || v || "").toLowerCase();
    for (const cat of VIOLATION_CATEGORIES) {
      if (cat.keywords.some((kw) => desc.includes(kw))) {
        counts[cat.key]++;
        return;
      }
    }
  });
  return counts;
}

function buildRadarData(restaurants) {
  return VIOLATION_CATEGORIES.map((cat) => {
    const row = { category: cat.key };
    restaurants.forEach((r, i) => {
      const counts = categorizeViolations(r.violations);
      row[`r${i}`] = counts[cat.key] || 0;
    });
    return row;
  });
}

function buildTrendData(restaurant) {
  const history = restaurant.inspection_history || [];
  if (history.length === 0 && restaurant.latestDate && restaurant.safetyScore) {
    return [{ date: restaurant.latestDate.slice(0, 7), score: restaurant.safetyScore }];
  }
  return history
    .slice()
    .reverse()
    .map((h) => ({
      date: (h.date || h.inspection_date || "").slice(0, 7),
      score: Math.max(0, Math.min(100, 100 - (parseInt(h.total_violation_points || h.score || 0) || 0))),
    }))
    .filter((d) => d.date);
}

const COLORS = ["#0f172a", "#2563eb", "#dc2626"];

function DeltaBadge({ value, isBetter }) {
  if (value === 0) return <Minus className="w-3 h-3 text-slate-400 inline" />;
  const better = isBetter ? value > 0 : value < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${better ? "text-green-600" : "text-red-500"}`}>
      {value > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(value)}
    </span>
  );
}

export default function ComparePanel({ restaurants, onClose, onViewDetail }) {
  if (restaurants.length < 2) return null;

  const radarData = buildRadarData(restaurants);
  const best = restaurants.reduce((a, b) => (b.safetyScore > a.safetyScore ? b : a));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Side-by-Side Comparison</h2>
            <p className="text-xs text-slate-500 mt-0.5">Comparing {restaurants.length} establishments</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Restaurant headers */}
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${restaurants.length}, 1fr)` }}>
            {restaurants.map((r, i) => {
              const grade = r.grade || getGrade(r.safetyScore);
              const isBest = r.business_id === best.business_id;
              return (
                <div key={r.business_id} className={`rounded-2xl p-4 border-2 transition-all ${isBest ? "border-green-400 bg-green-50" : "border-slate-100 bg-slate-50"}`}>
                  {isBest && (
                    <div className="flex items-center gap-1 mb-2">
                      <Trophy className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Best Score</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <ScoreGauge score={r.safetyScore} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-900 text-sm leading-tight truncate">{r.name}</p>
                      <p className="text-xs text-slate-500 truncate">{r.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${getGradeColor(grade)}`}>{grade}</span>
                    <Badge variant="outline" className="text-[10px]">{r.totalInspections} inspections</Badge>
                  </div>
                  {onViewDetail && (
                    <button
                      onClick={() => onViewDetail(r)}
                      className="mt-3 w-full text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-400 rounded-lg py-1.5 transition-all"
                    >
                      View Full Details →
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Safety score comparison table */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide">Safety Metrics</h3>
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              {[
                { label: "Safety Score", getValue: (r) => r.safetyScore, isBetter: true },
                { label: "Grade", getValue: (r) => r.grade || getGrade(r.safetyScore), isBetter: false, raw: true },
                { label: "Inspections", getValue: (r) => r.totalInspections, isBetter: true },
                { label: "Latest Result", getValue: (r) => r.latestResult || "—", isBetter: false, raw: true },
                { label: "Violations", getValue: (r) => (r.violations || []).length, isBetter: false },
              ].map((row, idx) => (
                <div key={row.label} className={`flex items-center ${idx % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                  <div className="w-36 flex-shrink-0 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-100">
                    {row.label}
                  </div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${restaurants.length}, 1fr)` }}>
                    {restaurants.map((r, i) => {
                      const val = row.getValue(r);
                      const vals = row.raw ? null : restaurants.map((x) => row.getValue(x));
                      const isTop = !row.raw && vals && (row.isBetter ? val === Math.max(...vals) : val === Math.min(...vals));
                      return (
                        <div key={r.business_id} className={`px-4 py-3 text-sm font-bold border-r border-slate-100 last:border-0 ${isTop ? "text-green-700" : "text-slate-800"}`}>
                          {val}
                          {!row.raw && i > 0 && (
                            <span className="ml-1.5">
                              <DeltaBadge value={val - restaurants[0].safetyScore !== undefined ? (row.getValue(r) - row.getValue(restaurants[0])) : 0} isBetter={row.isBetter} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Violation radar */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide">Violation Category Radar</h3>
            <div className="bg-slate-50 rounded-xl p-4" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
                  {restaurants.map((r, i) => (
                    <Radar key={r.business_id} name={r.name} dataKey={`r${i}`} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} strokeWidth={2} />
                  ))}
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
              {restaurants.map((r, i) => (
                <div key={r.business_id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i] }} />
                  <span className="text-xs text-slate-600 font-medium">{r.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inspection score history */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide">Score History</h3>
            <div className="bg-slate-50 rounded-xl p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  {restaurants.map((r, i) => {
                    const trendData = buildTrendData(r);
                    return trendData.length > 0 ? (
                      <Line
                        key={r.business_id}
                        data={trendData}
                        type="monotone"
                        dataKey="score"
                        stroke={COLORS[i]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[i], r: 3 }}
                        name={r.name}
                      />
                    ) : null;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}