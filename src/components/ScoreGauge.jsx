import React, { useEffect, useState } from "react";

// Esri diverging health-risk color ramp
function getScoreColor(score) {
  if (score >= 90) return { bg: "bg-green-700",  text: "text-green-800",  ring: "ring-green-200",  hex: "#1a9641" };
  if (score >= 80) return { bg: "bg-green-500",  text: "text-green-700",  ring: "ring-green-200",  hex: "#a6d96a" };
  if (score >= 70) return { bg: "bg-yellow-400", text: "text-yellow-700", ring: "ring-yellow-200", hex: "#e8c32a" };
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

export default function ScoreGauge({ score, size = "md", animate = true }) {
  const isUnknown = score === null || score === undefined;
  const colors = isUnknown ? { hex: "#94a3b8", text: "text-slate-400" } : getScoreColor(score);
  const label = isUnknown ? "No Data" : getLabel(score);

  // Animated fill: start at 0, animate to score
  const [displayScore, setDisplayScore] = useState(animate ? 0 : (score || 0));
  useEffect(() => {
    if (!animate || isUnknown) return;
    setDisplayScore(0);
    const timeout = setTimeout(() => setDisplayScore(score), 80);
    return () => clearTimeout(timeout);
  }, [score, animate, isUnknown]);

  const sizes = {
    sm: { outer: "w-16 h-16", text: "text-lg",  label: "text-[9px]",  svgSize: 64,  r: 28, sw: 4 },
    md: { outer: "w-24 h-24", text: "text-2xl", label: "text-[10px]", svgSize: 96,  r: 42, sw: 5 },
    lg: { outer: "w-36 h-36", text: "text-4xl", label: "text-sm",     svgSize: 144, r: 64, sw: 7 },
  };

  const s = sizes[size] || sizes.md;
  const circumference = 2 * Math.PI * s.r;
  const effectiveScore = animate ? displayScore : (score || 0);
  const offset = isUnknown ? circumference : circumference - (effectiveScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${s.outer} flex items-center justify-center`}>
        {/* Glow ring for high scores */}
        {!isUnknown && score >= 80 && (
          <div className="absolute inset-0 rounded-full opacity-20 blur-md"
            style={{ backgroundColor: colors.hex }} />
        )}
        <svg
          className="absolute inset-0 -rotate-90"
          width={s.svgSize} height={s.svgSize}
          viewBox={`0 0 ${s.svgSize} ${s.svgSize}`}
        >
          {/* Track */}
          <circle
            cx={s.svgSize / 2} cy={s.svgSize / 2} r={s.r}
            fill="none" stroke="#e2e8f0" strokeWidth={s.sw}
          />
          {/* Progress */}
          {!isUnknown && (
            <circle
              cx={s.svgSize / 2} cy={s.svgSize / 2} r={s.r}
              fill="none"
              stroke={colors.hex}
              strokeWidth={s.sw}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: animate ? "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none" }}
            />
          )}
        </svg>
        <span className={`${s.text} font-extrabold z-10 ${isUnknown ? "text-slate-400" : colors.text}`}>
          {isUnknown ? "?" : score}
        </span>
      </div>
      <span className={`${s.label} font-bold uppercase tracking-wider ${isUnknown ? "text-slate-400" : colors.text}`}>
        {label}
      </span>
    </div>
  );
}

export { getScoreColor, getLabel };