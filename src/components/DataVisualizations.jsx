import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function DataVisualizations({ restaurants }) {
  const stats = useMemo(() => {
    if (!restaurants || restaurants.length === 0) return null;

    // Score distribution
    const scoreRanges = {
      "90-100 (Excellent)": 0,
      "70-89 (Good)": 0,
      "50-69 (Fair)": 0,
      "30-49 (Poor)": 0,
      "0-29 (Critical)": 0,
    };

    // Results distribution
    const resultsCount = {};
    
    // Average score
    let totalScore = 0;

    restaurants.forEach((r) => {
      const score = r.safetyScore || 0;
      totalScore += score;

      if (score >= 90) scoreRanges["90-100 (Excellent)"]++;
      else if (score >= 70) scoreRanges["70-89 (Good)"]++;
      else if (score >= 50) scoreRanges["50-69 (Fair)"]++;
      else if (score >= 30) scoreRanges["30-49 (Poor)"]++;
      else scoreRanges["0-29 (Critical)"]++;

      const result = r.latestResult || "Unknown";
      resultsCount[result] = (resultsCount[result] || 0) + 1;
    });

    const avgScore = Math.round(totalScore / restaurants.length);

    const scoreData = Object.entries(scoreRanges).map(([name, value]) => ({
      name,
      count: value,
    }));

    const resultsData = Object.entries(resultsCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      avgScore,
      totalRestaurants: restaurants.length,
      scoreData,
      resultsData,
      excellentCount: scoreRanges["90-100 (Excellent)"],
    };
  }, [restaurants]);

  if (!stats) {
    return null;
  }

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#991b1b"];
  const RESULT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.avgScore}</p>
              <p className="text-xs text-slate-500">Average Safety Score</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.excellentCount}</p>
              <p className="text-xs text-slate-500">Excellent (90-100)</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalRestaurants}</p>
              <p className="text-xs text-slate-500">Total Establishments</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Bar Chart */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Safety Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Inspection Results Pie Chart */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Latest Inspection Results</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.resultsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.resultsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RESULT_COLORS[index % RESULT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}