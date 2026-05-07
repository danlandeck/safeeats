/**
 * SafetySnapshot — Plain-language summary block for a restaurant's safety record.
 * Fully localized via LanguageContext.
 */
import React from "react";
import { useLanguage } from "../lib/LanguageContext";

// English fallback texts
const EN_TEXTS = {
  noRecords: { title: "No inspection records found", body: "This restaurant hasn't been checked in our database yet. The score shown is an AI estimate — use it as a rough guide only." },
  cleanStreak: { title: "Consistently clean — passed multiple inspections in a row!", body: "Inspectors visited multiple times and found no problems. Great track record." },
  excellent: { title: "Excellent food safety record", body: "Very low risk. Inspectors found little to no issues. Safe to eat here." },
  good: { title: "Good safety record", body: "Only minor issues found. Generally safe, but worth glancing at the violations below." },
  concerns: { title: "Some concerns — check the violations", body: "A few issues were found during inspections. Not dangerous for most people, but keep an eye on repeats." },
  ongoing: { title: "Ongoing problems — same violations keep coming back", body: "This restaurant has the same issues showing up inspection after inspection. If you have young kids or anyone with a weak immune system, consider another option." },
  belowAverage: { title: "Below-average safety record", body: "Significant problems were found. They may have fixed things since — check the most recent inspection date." },
};

function getSnapshotKey(score, cleanStreak, repeatCount, totalInspections) {
  if (!totalInspections || score === null || score === undefined) return "noRecords";
  if (cleanStreak >= 3) return "cleanStreak";
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "concerns";
  if (repeatCount >= 2) return "ongoing";
  return "belowAverage";
}

const SNAP_META = {
  noRecords:    { emoji: "❓", color: "bg-slate-50 border-slate-200",   titleColor: "text-slate-700" },
  cleanStreak:  { emoji: "⭐", color: "bg-emerald-50 border-emerald-200", titleColor: "text-emerald-800" },
  excellent:    { emoji: "✅", color: "bg-green-50 border-green-200",    titleColor: "text-green-800" },
  good:         { emoji: "👍", color: "bg-green-50 border-green-200",    titleColor: "text-green-800" },
  concerns:     { emoji: "⚠️", color: "bg-yellow-50 border-yellow-200",  titleColor: "text-yellow-800" },
  ongoing:      { emoji: "🔴", color: "bg-red-50 border-red-200",        titleColor: "text-red-800" },
  belowAverage: { emoji: "⚠️", color: "bg-orange-50 border-orange-200",  titleColor: "text-orange-800" },
};

export default function SafetySnapshot({ score, grade, cleanStreak = 0, repeatCount = 0, totalInspections = 0 }) {
  const { t } = useLanguage();
  const key = getSnapshotKey(score, cleanStreak, repeatCount, totalInspections);
  const texts = t?.snapshotTexts?.[key] || EN_TEXTS[key];
  const meta = SNAP_META[key];
  const snap = { ...meta, ...texts };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${snap.color}`}>
      <span className="text-2xl flex-shrink-0 mt-0.5">{snap.emoji}</span>
      <div>
        <p className={`text-sm font-extrabold ${snap.titleColor}`}>{snap.title}</p>
        <p className="text-xs mt-1 leading-relaxed text-slate-600">{snap.body}</p>
      </div>
    </div>
  );
}