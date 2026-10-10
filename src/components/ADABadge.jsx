import React, { useState } from "react";
import { CheckCircle2, AlertCircle, XCircle, HelpCircle, Search, Loader2 } from "lucide-react";

const ADA_STYLES = {
  accessible: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle2, label: "ADA Accessible" },
  partially_accessible: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle, label: "Partially Accessible" },
  not_accessible: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Not Accessible" },
  unknown: { bg: "bg-slate-100", text: "text-slate-500", icon: HelpCircle, label: "Accessibility Unknown" },
  not_verified: { bg: "bg-blue-50", text: "text-blue-600", icon: Search, label: "Tap to verify ADA" },
  no_data: { bg: "bg-slate-100", text: "text-slate-500", icon: HelpCircle, label: "No ADA info found" },
};

export default function ADABadge({ ada_compliance, size = "md", onVerify, source }) {
  const [checking, setChecking] = useState(false);
  const [checkedEmpty, setCheckedEmpty] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  // "unknown" or missing → "not_verified" so we're honest: we haven't checked yet,
  // not that we checked and couldn't determine. The detail page does the live lookup.
  let status = (!ada_compliance || ada_compliance === "unknown") ? "not_verified" : ada_compliance;
  // After a user-triggered lookup that found nothing, say so instead of
  // offering "Tap to verify" again.
  if (status === "not_verified" && checkedEmpty) status = "no_data";
  const style = ADA_STYLES[status] || ADA_STYLES.not_verified;
  const Icon = checking ? Loader2 : style.icon;
  const label = checking ? "Checking…" : checkFailed ? "Couldn't check — tap to retry" : style.label;

  const interactive = status === "not_verified" && !!onVerify;

  const handleTap = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    try {
      const found = await onVerify();
      if (found) {
        setCheckFailed(false);
      } else if (found === false) {
        // Genuinely checked: Google has no accessibility data for this place.
        setCheckedEmpty(true);
        setCheckFailed(false);
      } else {
        setCheckFailed(true);
      }
    } catch {
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  };

  if (size === "sm") {
    const content = (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        <Icon className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} />
        {label}
        {source && status !== "not_verified" && !checking && (
          <span className="opacity-60 font-medium">· {source === "osm" ? "OpenStreetMap" : "Google"}</span>
        )}
      </span>
    );
    if (!interactive) return content;
    return (
      <button
        type="button"
        onClick={handleTap}
        disabled={checking}
        aria-label="Check ADA accessibility with Google Places"
        className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D32] focus-visible:ring-offset-1"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${style.bg}`}>
      <Icon className={`w-5 h-5 ${style.text} flex-shrink-0 mt-0.5 ${checking ? "animate-spin" : ""}`} />
      <div>
        <p className={`font-semibold text-sm ${style.text}`}>ADA Accessibility</p>
        <p className={`text-xs ${style.text} opacity-80`}>{label}</p>
      </div>
    </div>
  );
}