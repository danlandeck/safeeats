import React from "react";
import { AlertTriangle, AlertCircle, Info, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { translateViolation, CATEGORY_LABELS } from "../utils/violationTranslator";

const typeConfig = {
  RED:  { icon: AlertTriangle, bg: "bg-red-50 border-red-200",    badge: "bg-red-100 text-red-800",    label: "Critical" },
  BLUE: { icon: AlertCircle,   bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800", label: "Non-Critical" },
};

export default function ViolationItem({ violation, isRepeat = false }) {
  const config = typeConfig[violation.violation_type] || {
    icon: Info,
    bg: "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    label: violation.violation_type || "Info",
  };
  const Icon = config.icon;
  const { human, category } = translateViolation(violation.violation_description);
  const cat = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${config.bg} transition-all`}>
      <div className="mt-0.5 flex-shrink-0">
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <Badge className={`${config.badge} text-[10px] font-semibold uppercase tracking-wide`}>
            {config.label}
          </Badge>
          <span className="text-[10px] text-slate-500 font-medium">
            {cat.emoji} {cat.label}
          </span>
          {isRepeat && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full border border-orange-200">
              <RefreshCw className="w-2.5 h-2.5" /> Repeat
            </span>
          )}
          {violation.violation_points > 0 && (
            <span className="text-[10px] text-slate-400 ml-auto">{violation.violation_points} pts</span>
          )}
        </div>
        {/* Human-readable primary text */}
        <p className="text-sm font-medium text-slate-800 leading-snug">{human}</p>
        {/* Raw detail — collapsed by default */}
        {human !== violation.violation_description && (
          <details className="mt-1">
            <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              Official wording ▸
            </summary>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed italic">
              {violation.violation_description}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}