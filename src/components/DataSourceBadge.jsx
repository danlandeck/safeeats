import React from "react";
import { ShieldCheck, BadgeCheck, AlertCircle, HelpCircle } from "lucide-react";

/**
 * Displays the source-of-truth for a restaurant's data:
 *  - Live government API data (highest accuracy, real-time)
 *  - AI web-search verified data (with confidence level)
 *
 * Props:
 *   restaurant — the restaurant object
 *   size       — "sm" (card) or "md" (detail)
 */
export default function DataSourceBadge({ restaurant, size = "sm" }) {
  const isLLM = restaurant.isLLMData || restaurant.source === "llm" || restaurant.source === "dubai";
  const confidence = (restaurant.data_confidence || "").toLowerCase();
  const operating = restaurant.is_currently_operating;
  const verificationSource = restaurant.verification_source || "";
  const fetchNotes = restaurant.data_fetch_notes || "";

  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  const textSize = size === "sm" ? "text-[9px]" : "text-xs";
  const padX = size === "sm" ? "px-1.5" : "px-2.5";
  const padY = size === "sm" ? "py-0.5" : "py-1";

  // Live government data — green, trusted
  if (!isLLM) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${padX} ${padY} rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold ${textSize}`}
        title="Verified live from an official government health department API — real-time, authoritative data."
      >
        <ShieldCheck className={iconSize} aria-hidden="true" />
        Live Gov Data
      </span>
    );
  }

  // AI-verified data — confidence-based coloring
  let bg = "bg-blue-50 border-blue-200 text-blue-700";
  let Icon = BadgeCheck;
  let label = "AI Web-Verified";
  let title = "Verified via live web search of public health records by AI." + (fetchNotes ? ` ${fetchNotes}` : "");

  if (confidence === "high") {
    bg = "bg-teal-50 border-teal-200 text-teal-700";
    label = "AI · High Confidence";
    title = "AI found an official inspection record with a real score and date via live web search.";
  } else if (confidence === "medium") {
    bg = "bg-blue-50 border-blue-200 text-blue-700";
    label = "AI · Medium Confidence";
    title = "AI confirmed this restaurant exists with some inspection reference via live web search.";
  } else if (confidence === "low") {
    bg = "bg-amber-50 border-amber-200 text-amber-700";
    Icon = AlertCircle;
    label = "AI · Low Confidence";
    title = "AI found this restaurant but could not locate detailed inspection records. Score may be unavailable.";
  } else if (confidence === "none") {
    bg = "bg-slate-100 border-slate-300 text-slate-500";
    Icon = HelpCircle;
    label = "AI · Unverified";
    title = "AI could not fully verify this restaurant's inspection data. Treat with caution.";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${padX} ${padY} rounded-full border ${bg} font-extrabold ${textSize}`}
      title={title}
    >
      <Icon className={iconSize} aria-hidden="true" />
      {label}
      {operating === false && (
        <span className="ml-0.5 text-red-500" title="May be closed">· closed?</span>
      )}
    </span>
  );
}