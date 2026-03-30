import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, CheckCircle2, Clock } from "lucide-react";

export default function DataVisualizations({ restaurants }) {
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

  const BAR_COLORS = ["#16a34a", "#65a30d", "#f59e0b", "#f97316", "#dc2626"];
  const RESULT_COLORS = ["#16a34a", "#3b82f6", "#f59e0b", "#f97316", "#dc2626", "#8b5cf6", "#94a3b8"];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">{stats.avgScore}</p>
              <p className="text-xs text-slate-500">Avg Score</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">{stats.aCount}</p>
              <p className="text-xs text-slate-500">Grade A</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">{stats.totalRestaurants}</p>
              <p className="text-xs text-slate-500">Results</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.scoreData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.scoreData.map((entry, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Inspection Results Breakdown</h3>
          <div className="flex gap-4">
            <div className="flex-1" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.resultsData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false} labelLine={false}>
                    {stats.resultsData.map((entry, i) => <Cell key={i} fill={RESULT_COLORS[i % RESULT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-2 flex-shrink-0 pr-1">
              {stats.resultsData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: RESULT_COLORS[i % RESULT_COLORS.length] }} />
                  <span className="text-xs text-slate-600 font-medium truncate max-w-[110px]" title={entry.name}>{entry.name}</span>
                  <span className="text-xs text-slate-400 ml-auto pl-1">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}