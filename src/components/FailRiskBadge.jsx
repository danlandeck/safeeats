import React, { useMemo } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

/**
 * Rule-based fail-risk predictor.
 * Analyzes inspection score trend over last 3+ inspections.
 * Returns High / Med / Low risk for the next 30 days.
 */
export function computeFailRisk(inspections) {
  if (!inspections || inspections.length < 2) return null;

  const scored = inspections
    .slice(0, 5) // last 5
    .map((insp) => {
      const raw = insp.inspection_score !== undefined ? insp.inspection_score : insp.score;
      return raw !== undefined ? Math.max(0, Math.min(100, 100 - parseInt(raw))) : null;
    })
    .filter((s) => s !== null);

  if (scored.length < 2) return null;

  // Trend: negative slope = scores declining = higher risk
  const deltas = [];
  for (let i = 0; i < scored.length - 1; i++) {
    deltas.push(scored[i] - scored[i + 1]); // positive = improving (newer is higher)
  }
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const latestScore = scored[0];
  const repeatCount = inspections.reduce((acc, insp) => acc + (insp.violations?.length || 0), 0);

  // Risk rules
  if (latestScore < 60 || (avgDelta < -5 && latestScore < 75)) {
    return { level: "High", color: "bg-red-100 text-red-700 border-red-200", icon: TrendingDown, tip: "Scores declining — fail likely" };
  }
  if (avgDelta < -3 || (latestScore < 75 && repeatCount > 3)) {
    return { level: "Med", color: "bg-orange-100 text-orange-700 border-orange-200", icon: TrendingDown, tip: "Score trend is downward" };
  }
  if (avgDelta > 3 || latestScore >= 90) {
    return { level: "Low", color: "bg-green-100 text-green-700 border-green-200", icon: TrendingUp, tip: "Scores improving — on track" };
  }
  return { level: "Low", color: "bg-green-100 text-green-700 border-green-200", icon: Minus, tip: "Stable record" };
}

export default function FailRiskBadge({ inspections, size = "sm" }) {
  const risk = useMemo(() => computeFailRisk(inspections), [inspections]);
  if (!risk) return null;

  const Icon = risk.icon;
  const isLarge = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold border rounded-full ${risk.color} ${isLarge ? "text-xs px-3 py-1" : "text-[10px] px-2 py-0.5"}`}
      title={risk.tip}
      aria-label={`Fail risk: ${risk.level} — ${risk.tip}`}
    >
      <Icon className={isLarge ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} aria-hidden="true" />
      Fail Risk: {risk.level}
    </span>
  );
}