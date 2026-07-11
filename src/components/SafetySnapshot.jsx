/**
 * SafetySnapshot — Plain-English summary block for a restaurant's safety record.
 * Designed to be instantly readable by anyone, including kids.
 */
import React from "react";

function getSnapshotData(score, grade, cleanStreak, repeatCount, totalInspections) {
  if (!totalInspections || (score === null || score === undefined)) {
    return {
      emoji: "❓",
      color: "bg-slate-50 border-slate-200",
      title: "No inspection records found",
      body: "This restaurant hasn't been checked in our database yet. The score shown is an AI estimate — use it as a rough guide only.",
      titleColor: "text-slate-700",
    };
  }
  if (grade === "P") return {
    emoji: "✅",
    color: "bg-teal-50 border-teal-200",
    title: "Passed inspection",
    body: "This restaurant met health inspection standards. The jurisdiction uses a Pass/Fail system rather than a numeric score.",
    titleColor: "text-teal-800",
  };
  if (cleanStreak >= 3) return {
    emoji: "⭐",
    color: "bg-emerald-50 border-emerald-200",
    title: "Consistently clean — passed multiple inspections in a row!",
    body: "Inspectors visited multiple times and found no problems. Great track record.",
    titleColor: "text-emerald-800",
  };
  if (score >= 90) return {
    emoji: "✅",
    color: "bg-green-50 border-green-200",
    title: "Excellent food safety record",
    body: "Very low risk. Inspectors found little to no issues. Safe to eat here.",
    titleColor: "text-green-800",
  };
  if (score >= 80) return {
    emoji: "👍",
    color: "bg-green-50 border-green-200",
    title: "Good safety record",
    body: "Only minor issues found. Generally safe, but worth glancing at the violations below.",
    titleColor: "text-green-800",
  };
  if (score >= 70) return {
    emoji: "⚠️",
    color: "bg-yellow-50 border-yellow-200",
    title: "Some concerns — check the violations",
    body: "A few issues were found during inspections. Not dangerous for most people, but keep an eye on repeats.",
    titleColor: "text-yellow-800",
  };
  if (repeatCount >= 2) return {
    emoji: "🔴",
    color: "bg-red-50 border-red-200",
    title: "Ongoing problems — same violations keep coming back",
    body: "This restaurant has the same issues showing up inspection after inspection. If you have young kids or anyone with a weak immune system, consider another option.",
    titleColor: "text-red-800",
  };
  return {
    emoji: "⚠️",
    color: "bg-orange-50 border-orange-200",
    title: "Below-average safety record",
    body: "Significant problems were found. They may have fixed things since — check the most recent inspection date.",
    titleColor: "text-orange-800",
  };
}

export default function SafetySnapshot({ score, grade, cleanStreak = 0, repeatCount = 0, totalInspections = 0 }) {
  const snap = getSnapshotData(score, grade, cleanStreak, repeatCount, totalInspections);

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