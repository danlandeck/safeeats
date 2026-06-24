import React from "react";
import { CheckCircle2, AlertCircle, XCircle, HelpCircle, Search } from "lucide-react";

const ADA_STYLES = {
  accessible: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2, label: "ADA Accessible" },
  partially_accessible: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle, label: "Partially Accessible" },
  not_accessible: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Not Accessible" },
  unknown: { bg: "bg-slate-100", text: "text-slate-500", icon: HelpCircle, label: "Accessibility Unknown" },
  not_verified: { bg: "bg-blue-50", text: "text-blue-600", icon: Search, label: "Tap to verify ADA" },
};

export default function ADABadge({ ada_compliance, size = "md" }) {
  // "unknown" or missing → "not_verified" so we're honest: we haven't checked yet,
  // not that we checked and couldn't determine. The detail page does the live lookup.
  const status = (!ada_compliance || ada_compliance === "unknown") ? "not_verified" : ada_compliance;
  const style = ADA_STYLES[status] || ADA_STYLES.not_verified;
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