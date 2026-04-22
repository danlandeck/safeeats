import React from "react";
import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react";

const ADA_STYLES = {
  accessible: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2, label: "Accessible" },
  partially_accessible: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle, label: "Partially Accessible" },
  not_accessible: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Not Accessible" },
  unknown: { bg: "bg-slate-100", text: "text-slate-600", icon: HelpCircle, label: "Unknown" },
};

export default function ADABadge({ ada_compliance = "unknown", size = "md" }) {
  const style = ADA_STYLES[ada_compliance] || ADA_STYLES.unknown;
  const Icon = style.icon;
  
  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${style.bg}`}>
      <Icon className={`w-5 h-5 ${style.text} flex-shrink-0 mt-0.5`} />
      <div>
        <p className={`font-semibold text-sm ${style.text}`}>ADA Accessibility</p>
        <p className={`text-xs ${style.text} opacity-80`}>{style.label}</p>
      </div>
    </div>
  );
}