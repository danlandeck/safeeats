import React from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const typeConfig = {
  RED: {
    icon: AlertTriangle,
    bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800",
    label: "Critical",
  },
  BLUE: {
    icon: AlertCircle,
    bg: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    label: "Non-Critical",
  },
};

export default function ViolationItem({ violation }) {
  const config = typeConfig[violation.violation_type] || {
    icon: Info,
    bg: "bg-slate-50 border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    label: violation.violation_type || "Info",
  };
  const Icon = config.icon;

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${config.bg} transition-all`}>
      <div className="mt-0.5">
        <Icon className="w-5 h-5 text-current opacity-60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Badge variant="outline" className={`${config.badge} text-[10px] font-semibold uppercase tracking-wide`}>
            {config.label}
          </Badge>
          <Badge variant="outline" className="bg-white text-slate-600 text-[10px] font-medium">
            {violation.violation_points} pts
          </Badge>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {violation.violation_description}
        </p>
      </div>
    </div>
  );
}