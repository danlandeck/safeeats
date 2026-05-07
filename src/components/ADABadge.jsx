import React from "react";
import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

const ADA_KEYS = {
  accessible: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2, labelKey: "adaAccessible", fallback: "ADA Accessible" },
  partially_accessible: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle, labelKey: "adaPartial", fallback: "Partially Accessible" },
  not_accessible: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, labelKey: "adaNotAccessible", fallback: "Not Accessible" },
  unknown: { bg: "bg-slate-100", text: "text-slate-500", icon: HelpCircle, labelKey: "adaUnknown", fallback: "Accessibility Unknown" },
};

export default function ADABadge({ ada_compliance = "unknown", size = "md" }) {
  const { t } = useLanguage();
  const style = ADA_KEYS[ada_compliance] || ADA_KEYS.unknown;
  const Icon = style.icon;
  const label = t?.[style.labelKey] || style.fallback;

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${style.bg}`}>
      <Icon className={`w-5 h-5 ${style.text} flex-shrink-0 mt-0.5`} />
      <div>
        <p className={`font-semibold text-sm ${style.text}`}>{t?.adaAccessibility || "ADA Accessibility"}</p>
        <p className={`text-xs ${style.text} opacity-80`}>{label}</p>
      </div>
    </div>
  );
}