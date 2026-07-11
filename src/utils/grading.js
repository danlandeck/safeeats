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

// Esri diverging ramp: deep green → light green → yellow → orange → red
// "P" (Pass) uses a distinct green — positive but visually distinguishable from "A"
export function getGradeColor(grade) {
  switch (grade) {
    case "A": return "bg-green-700 text-white";
    case "B": return "bg-green-400 text-white";
    case "C": return "bg-yellow-400 text-slate-800";
    case "D": return "bg-orange-400 text-white";
    case "F": return "bg-red-600 text-white";
    case "P": return "bg-teal-500 text-white";
    default:  return "bg-slate-300 text-slate-700";
  }
}