import React from "react";

// Esri diverging health-risk color ramp: deep green → yellow-green → yellow → orange → red
function getScoreColor(score) {
  if (score >= 90) return { bg: "bg-green-700",  text: "text-green-800",  ring: "ring-green-200",  hex: "#1a9641" };
  if (score >= 80) return { bg: "bg-green-500",  text: "text-green-700",  ring: "ring-green-200",  hex: "#a6d96a" };
  if (score >= 70) return { bg: "bg-yellow-400", text: "text-yellow-700", ring: "ring-yellow-200", hex: "#ffffbf" };
  if (score >= 60) return { bg: "bg-orange-400", text: "text-orange-700", ring: "ring-orange-200", hex: "#fdae61" };
  return              { bg: "bg-red-600",    text: "text-red-700",    ring: "ring-red-200",    hex: "#d7191c" };
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
  const isUnknown = score === null || score === undefined;
  const colors = isUnknown ? { hex: "#94a3b8", text: "text-slate-400" } : getScoreColor(score);
  const label = isUnknown ? "No Inspection" : getLabel(score);

  const sizes = {
    sm: { outer: "w-16 h-16", text: "text-lg", label: "text-[9px]" },
    md: { outer: "w-24 h-24", text: "text-2xl", label: "text-[10px]" },
    lg: { outer: "w-32 h-32", text: "text-4xl", label: "text-xs" },
  };

  const s = sizes[size] || sizes.md;
  const radius = size === "sm" ? 28 : size === "lg" ? 56 : 42;
  const circumference = 2 * Math.PI * radius;
  const svgSize = size === "sm" ? 64 : size === "lg" ? 128 : 96;
  const strokeWidth = size === "sm" ? 4 : size === "lg" ? 6 : 5;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${s.outer} flex items-center justify-center`}>
        <svg className="absolute inset-0 -rotate-90" width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          {!isUnknown && (
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none"
              stroke={colors.hex} strokeWidth={strokeWidth} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (score / 100) * circumference}
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          )}
        </svg>
        <span className={`${s.text} font-bold z-10 ${isUnknown ? "text-slate-400" : colors.text}`}>
          {isUnknown ? "U" : score}
        </span>
      </div>
      <span className={`${s.label} font-semibold uppercase tracking-wider ${colors.text}`}>{label}</span>
    </div>
  );
}

export { getScoreColor, getLabel };