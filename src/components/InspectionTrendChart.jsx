import React from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

  // Trend: compare first half avg vs second half avg
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.ceil(data.length / 2));
  const firstAvg = firstHalf.reduce((s, d) => s + d.score, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, d) => s + d.score, 0) / (secondHalf.length || 1);
  const delta = Math.round(secondAvg - firstAvg);
  const isImproving = delta >= 3;
  const isDeclining = delta <= -3;

  const trendColor = isImproving ? "#16a34a" : isDeclining ? "#dc2626" : "#64748b";
  const TrendIcon = isImproving ? TrendingUp : isDeclining ? TrendingDown : Minus;
  const trendLabel = isImproving ? "Improving" : isDeclining ? "Declining" : "Stable";
  const trendBg = isImproving ? "bg-green-50 text-green-700 border-green-200" : isDeclining ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <Card className="p-6 border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Safety Score Trend</h3>
          <p className="text-xs text-slate-400 mt-0.5">{data.length} inspections over time</p>
        </div>
        <div className="flex items-center gap-3">
          {avgScore !== null && (
            <span className="text-xs text-slate-500">Avg: <strong className="text-slate-700">{avgScore}</strong></span>
          )}
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${trendBg}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendLabel}
            {Math.abs(delta) >= 3 && <span className="font-extrabold">{delta > 0 ? `+${delta}` : delta} pts</span>}
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={trendColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
            formatter={(val, name, props) => [
              <span style={{ fontWeight: 700 }}>{val} / 100</span>,
              "Safety Score"
            ]}
            labelStyle={{ fontWeight: 600, color: "#334155", marginBottom: 2 }}
          />
          <ReferenceLine y={90} stroke="#16a34a" strokeDasharray="4 3" strokeOpacity={0.4} label={{ value: "A", position: "insideLeft", fontSize: 10, fill: "#16a34a" }} />
          <ReferenceLine y={80} stroke="#84cc16" strokeDasharray="4 3" strokeOpacity={0.3} label={{ value: "B", position: "insideLeft", fontSize: 10, fill: "#84cc16" }} />
          <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.4} label={{ value: "C", position: "insideLeft", fontSize: 10, fill: "#f59e0b" }} />
          <ReferenceLine y={60} stroke="#dc2626" strokeDasharray="4 3" strokeOpacity={0.4} label={{ value: "F", position: "insideLeft", fontSize: 10, fill: "#dc2626" }} />
          {avgScore !== null && (
            <ReferenceLine y={avgScore} stroke="#6366f1" strokeDasharray="5 3" strokeOpacity={0.5} label={{ value: `Avg ${avgScore}`, position: "insideRight", fontSize: 9, fill: "#6366f1" }} />
          )}
          <Area
            type="monotone"
            dataKey="score"
            stroke={trendColor}
            strokeWidth={2.5}
            fill="url(#scoreGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              const color = payload.score >= 90 ? "#16a34a" : payload.score >= 80 ? "#84cc16" : payload.score >= 70 ? "#f59e0b" : "#dc2626";
              return <circle key={cx} cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />;
            }}
            activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}