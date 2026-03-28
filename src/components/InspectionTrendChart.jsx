import React from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { format } from "date-fns";

export default function InspectionTrendChart({ inspections }) {
  const data = [...inspections]
    .reverse()
    .filter((i) => i.inspection_date || i.date)
    .map((insp) => {
      const raw = insp.inspection_score !== undefined ? insp.inspection_score : insp.score;
      const score = raw !== undefined ? Math.max(0, Math.min(100, 100 - parseInt(raw))) : (insp.safetyScore || 0);
      const dateStr = insp.inspection_date || insp.date;
      return {
        date: dateStr ? format(new Date(dateStr), "MMM yy") : "N/A",
        score,
        result: insp.inspection_result || insp.result || "",
      };
    });

  if (data.length < 2) return null;

  const validScores = data.map((d) => d.score).filter((s) => s > 0);
  const avgScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  return (
    <Card className="p-6 border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">Safety Score History</h3>
        {avgScore !== null && (
          <span className="text-xs text-slate-500">Legacy avg: <strong className="text-slate-700">{avgScore}</strong></span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
            formatter={(val) => [`Score: ${val}`, ""]}
          />
          <ReferenceLine y={90} stroke="#1e293b" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: "A", position: "insideLeft", fontSize: 10, fill: "#94a3b8" }} />
          <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: "C", position: "insideLeft", fontSize: 10, fill: "#94a3b8" }} />
          <ReferenceLine y={60} stroke="#dc2626" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: "F", position: "insideLeft", fontSize: 10, fill: "#94a3b8" }} />
          {avgScore !== null && (
            <ReferenceLine y={avgScore} stroke="#6366f1" strokeDasharray="5 3" strokeOpacity={0.5} label={{ value: `Avg ${avgScore}`, position: "insideRight", fontSize: 9, fill: "#6366f1" }} />
          )}
          <Line
            type="monotone"
            dataKey="score"
            stroke="#1e293b"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#1e293b", strokeWidth: 0 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}