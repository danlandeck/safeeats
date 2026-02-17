import React from "react";

function getScoreColor(score) {
  // score is 0-100 where 100 = best (green), 0 = worst (red)
  if (score >= 90) return { bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", hex: "#10b981" };
  if (score >= 80) return { bg: "bg-green-500", text: "text-green-700", ring: "ring-green-200", hex: "#22c55e" };
  if (score >= 70) return { bg: "bg-lime-500", text: "text-lime-700", ring: "ring-lime-200", hex: "#84cc16" };
  if (score >= 60) return { bg: "bg-yellow-500", text: "text-yellow-700", ring: "ring-yellow-200", hex: "#eab308" };
  if (score >= 50) return { bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", hex: "#f59e0b" };
  if (score >= 40) return { bg: "bg-orange-500", text: "text-orange-700", ring: "ring-orange-200", hex: "#f97316" };
  if (score >= 30) return { bg: "bg-orange-600", text: "text-orange-800", ring: "ring-orange-200", hex: "#ea580c" };
  if (score >= 20) return { bg: "bg-red-500", text: "text-red-700", ring: "ring-red-200", hex: "#ef4444" };
  if (score >= 10) return { bg: "bg-red-600", text: "text-red-800", ring: "ring-red-200", hex: "#dc2626" };
  return { bg: "bg-red-700", text: "text-red-900", ring: "ring-red-300", hex: "#b91c1c" };
}

function getLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Caution";
  if (score >= 20) return "Poor";
  return "Critical";
}

export default function ScoreGauge({ score, size = "md" }) {
  const colors = getScoreColor(score);
  const label = getLabel(score);
  
  const sizes = {
    sm: { outer: "w-16 h-16", text: "text-lg", label: "text-[9px]" },
    md: { outer: "w-24 h-24", text: "text-2xl", label: "text-[10px]" },
    lg: { outer: "w-32 h-32", text: "text-4xl", label: "text-xs" },
  };

  const s = sizes[size] || sizes.md;
  
  // SVG circle gauge
  const radius = size === "sm" ? 28 : size === "lg" ? 56 : 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const svgSize = size === "sm" ? 64 : size === "lg" ? 128 : 96;
  const strokeWidth = size === "sm" ? 4 : size === "lg" ? 6 : 5;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${s.outer} flex items-center justify-center`}>
        <svg className="absolute inset-0 -rotate-90" width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={colors.hex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          />
        </svg>
        <span className={`${s.text} font-bold ${colors.text} z-10`}>{score}</span>
      </div>
      <span className={`${s.label} font-semibold uppercase tracking-wider ${colors.text}`}>{label}</span>
    </div>
  );
}

export { getScoreColor, getLabel };