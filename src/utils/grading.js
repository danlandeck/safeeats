// Pass/Fail result detection — used by resolveGrade to avoid showing
// "F" for a restaurant that officially Passed inspection.
const PASS_PATTERN = /\b(?:pass\b|satisfactor|complian|conforme?|approved)/i;
const FAIL_PATTERN = /\b(?:fail|closed|closure|non[- ]?complian|unsatisfactor)/i;

export function getGrade(score) {
  if (score === null || score === undefined) return "U";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Resolve a grade from both numeric score AND inspection result text.
 *
 * When a jurisdiction uses Pass/Fail, the synthesized numeric score may
 * land in the D or F range — but showing "F" for a restaurant that
 * officially Passed is misleading. This function returns "P" (Pass) in
 * those cases, giving Pass/Fail restaurants their own positive tier.
 *
 * @param {number|null} score  — 0-100 safety score (null if unknown)
 * @param {string} result      — inspection result text ("Pass", "Fail", etc.)
 * @returns {string}           — A/B/C/D/F/P/U
 */
export function resolveGrade(score, result = "") {
  if (score === null || score === undefined) {
    if (FAIL_PATTERN.test(result)) return "F";
    if (PASS_PATTERN.test(result)) return "P";
    return "U";
  }
  const letterGrade = getGrade(score);
  // A "Fail" result always shows "F" — regardless of the synthesized numeric score.
  if (FAIL_PATTERN.test(result)) return "F";
  // A "Pass" result should never display as D or F
  if (letterGrade === "D" || letterGrade === "F") {
    if (PASS_PATTERN.test(result)) return "P";
  }
  return letterGrade;
}

// Single source of truth for grade colors. Every badge AND every legend reads
// from here, so the legend a visitor learns matches the badge on a result.
// (Previously five legends used five different palettes.)
//
// Esri diverging ramp: deep green -> light green -> yellow -> orange -> red.
// Light fills (B, C, D) take dark text. P uses a deeper teal than before.
// Every pair meets WCAG 2.2 AA (4.5:1) for text, verified:
//   A 5.02  B 8.55  C 9.55  D 7.89  F 4.83  P 5.47  U 6.97
// Previously B was 1.74:1, D 2.26:1, P 2.49:1 (white text on light fills).
export const GRADE_STYLES = {
  A: { bg: "bg-green-700",  text: "text-white" },
  B: { bg: "bg-green-400",  text: "text-green-950" },
  C: { bg: "bg-yellow-400", text: "text-slate-800" },
  D: { bg: "bg-orange-400", text: "text-slate-900" },
  F: { bg: "bg-red-600",    text: "text-white" },
  P: { bg: "bg-teal-700",   text: "text-white" },
  U: { bg: "bg-slate-300",  text: "text-slate-700" },
};

export function getGradeColor(grade) {
  const s = GRADE_STYLES[grade] || GRADE_STYLES.U;
  return `${s.bg} ${s.text}`;
}