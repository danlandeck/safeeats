import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, CheckCircle2, Clock } from "lucide-react";
import SuspectList from "./SuspectList";

export default function DataVisualizations({ restaurants, activeGrade, activeResult, onGradeClick, onResultClick, onSelectRestaurant }) {
  const stats = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return null;

    const scoreRanges = {
      "A (90-100)": 0, "B (80-89)": 0, "C (70-79)": 0, "D (60-69)": 0, "F (<60)": 0,
    };
    const resultsCount = {};
    let totalScore = 0;

    restaurants.forEach((r) => {
      const score = r.safetyScore || 0;
      totalScore += score;
      if (score >= 90) scoreRanges["A (90-100)"]++;
      else if (score >= 80) scoreRanges["B (80-89)"]++;
      else if (score >= 70) scoreRanges["C (70-79)"]++;
      else if (score >= 60) scoreRanges["D (60-69)"]++;
      else scoreRanges["F (<60)"]++;
      const result = r.latestResult || "Unknown";
      resultsCount[result] = (resultsCount[result] || 0) + 1;
    });

    const avgScore = Math.round(totalScore / restaurants.length);
    const scoreData = Object.entries(scoreRanges).map(([name, value]) => ({ name, count: value }));
    const resultsData = Object.entries(resultsCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { avgScore, totalRestaurants: restaurants.length, scoreData, resultsData, aCount: scoreRanges["A (90-100)"] };
  }, [restaurants]);

  if (!stats) return null;

  // ESRI diverging color ramp (green→yellow→red) matching the map heatmap
  const BAR_COLORS = ["#1a9641", "#a6d96a", "#ffffbf", "#fdae61", "#d7191c"];
  const RESULT_COLORS = ["#1a9641", "#a6d96a", "#fdae61", "#d7191c", "#2c7bb6", "#abd9e9", "#94a3b8"];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4 border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900">{stats.avgScore}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Avg Score</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900">{stats.aCount}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Grade A</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 border-slate-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900">{stats.totalRestaurants}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Results</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts — stack on mobile, side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 sm:p-5 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-0.5">Grade Distribution</h3>
          <p className="text-xs text-slate-400 mb-3">Tap a bar to see suspects</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.scoreData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              onClick={(e) => e?.activePayload && onGradeClick?.(e.activePayload[0]?.payload?.name)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} cursor="pointer">
                {stats.scoreData.map((entry, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} opacity={activeGrade && activeGrade !== entry.name ? 0.35 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {activeGrade && <button onClick={() => onGradeClick?.(null)} className="text-xs text-blue-600 font-semibold mt-1 hover:underline">Clear filter</button>}
          <SuspectList
            restaurants={restaurants}
            filterType="grade"
            filterValue={activeGrade}
            onSelectRestaurant={onSelectRestaurant}
          />
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-0.5">Inspection Results</h3>
          <p className="text-xs text-slate-400 mb-3">Tap a slice or label to see suspects</p>
          <div className="flex gap-3">
            <div className="flex-1" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stats.resultsData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={false} labelLine={false} cursor="pointer"
                    onClick={(entry) => onResultClick?.(entry?.name)}>
                    {stats.resultsData.map((entry, i) => (
                      <Cell key={i} fill={RESULT_COLORS[i % RESULT_COLORS.length]} opacity={activeResult && activeResult !== entry.name ? 0.35 : 1} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-1.5 flex-shrink-0 pr-1 max-w-[130px]">
              {stats.resultsData.map((entry, i) => (
                <button key={i} onClick={() => onResultClick?.(entry.name)}
                  className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-all hover:bg-slate-100 min-h-[36px] ${activeResult === entry.name ? "ring-1 ring-slate-400 bg-slate-50" : ""}`}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: RESULT_COLORS[i % RESULT_COLORS.length] }} />
                  <span className="text-[11px] text-slate-600 font-medium truncate" title={entry.name}>{entry.name}</span>
                  <span className="text-[11px] text-slate-400 ml-auto pl-1 flex-shrink-0">{entry.value}</span>
                </button>
              ))}
              {activeResult && <button onClick={() => onResultClick?.(null)} className="text-xs text-blue-600 font-semibold mt-1 hover:underline text-left">Clear</button>}
            </div>
          </div>
          <SuspectList
            restaurants={restaurants}
            filterType="result"
            filterValue={activeResult}
            onSelectRestaurant={onSelectRestaurant}
          />
        </Card>
      </div>
    </div>
  );
}