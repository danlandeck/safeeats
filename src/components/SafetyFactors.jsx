import React from "react";
import { CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

/**
 * SafetyFactors — plain-language, factor-by-factor safety breakdown.
 * Classifies REAL violation records into the factors consumers actually care
 * about (handwashing, food temps, pests, cross-contamination, cleanliness)
 * using deterministic keyword matching. No AI, no guessing: if there's no
 * inspection data, it says so honestly instead of pretending.
 */

const FACTORS = [
  {
    id: "handwashing",
    label: "Hand Washing",
    why: "Clean hands keep germs off your food.",
    pattern: /hand\s?wash|handwash|hygien|hand\s?sink|bare\s?hand/i,
  },
  {
    id: "temps",
    label: "Food Temperatures",
    why: "Food kept too warm or too cold lets bacteria grow.",
    pattern: /temperatur|cold\s?holding|hot\s?holding|cooling|reheat|thermometer|time.{0,3}temp|refrigerat/i,
  },
  {
    id: "pests",
    label: "Pests",
    why: "Bugs and rodents carry germs into the kitchen.",
    pattern: /pest|rodent|roach|cockroach|\bmice\b|\bmouse\b|\brats?\b|vermin|\bflies\b|\bfly\b|insect|droppings/i,
  },
  {
    id: "crosscontam",
    label: "Cross-Contamination",
    why: "Raw meat juices must never touch ready-to-eat food.",
    pattern: /cross.?contam|raw\s+(meat|chicken|poultry|egg|fish)|food.?contact\s?surface|sanitiz|contaminat|adulterat/i,
  },
  {
    id: "cleanliness",
    label: "Cleanliness",
    why: "A clean kitchen is a safer kitchen.",
    pattern: /\bclean\b|unclean|\bsoil|debris|grease|garbage|refuse|\bfloor|\bwall|\bceiling|\bmold\b/i,
  },
];

function harvestViolationTexts(restaurant, inspections) {
  const texts = [];
  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v)) { v.forEach(push); return; }
    if (typeof v === "string" && v.trim().length > 2) texts.push(v);
  };
  push(restaurant?.violations);
  push(restaurant?.latestResult);
  push(restaurant?.latest_result);
  (inspections || []).forEach((row) => {
    push(row?.violation_description);
    push(row?.violation);
    push(row?.violations);
    push(row?.description);
    push(row?.result);
    push(row?.latest_result);
  });
  return texts;
}

export default function SafetyFactors({ restaurant, inspections }) {
  const texts = harvestViolationTexts(restaurant, inspections);
  const hasAnyRecord =
    texts.length > 0 ||
    (restaurant?.totalInspections || 0) > 0 ||
    restaurant?.safetyScore != null;

  // No inspection record at all — say so honestly, in plain words.
  if (!hasAnyRecord) {
    return (
      <section
        aria-label="Safety factor breakdown"
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="text-sm font-extrabold text-slate-900 mb-1">Safety Checkup</h3>
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            This area doesn't publish inspection reports we can read, so we can't
            check the details yet. That doesn't mean this place is unsafe — it
            means the report card isn't public. When in doubt: look for a clean
            dining room, staff washing hands, and hot food served hot.
          </p>
        </div>
      </section>
    );
  }

  const rows = FACTORS.map((f) => {
    const hits = texts.filter((t) => f.pattern.test(t));
    return { ...f, count: hits.length };
  });
  const flagged = rows.filter((r) => r.count > 0);
  const clean = rows.filter((r) => r.count === 0);

  return (
    <section
      aria-label="Safety factor breakdown"
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <h3 className="text-sm font-extrabold text-slate-900 mb-0.5">Safety Checkup</h3>
      <p className="text-[11px] text-slate-500 mb-3">
        What the official inspection reports found, in plain words.
      </p>

      <ul className="space-y-2">
        {flagged.map((f) => (
          <li key={f.id} className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">
                {f.label}: {f.count} issue{f.count > 1 ? "s" : ""} noted on inspection reports
              </p>
              <p className="text-[11px] text-slate-500">{f.why}</p>
            </div>
          </li>
        ))}
        {clean.map((f) => (
          <li key={f.id} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">{f.label}: no problems on record</p>
            </div>
          </li>
        ))}
      </ul>

      {texts.length === 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          The most recent inspection report didn't list any written violations.
        </p>
      )}
    </section>
  );
}
