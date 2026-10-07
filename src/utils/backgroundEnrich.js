import { resolveGrade } from "./grading";
import { llmTrainingEnrich } from "./search/llmConfig";

// ── Reusable background LLM enrichment ─────────────────────────────────────────
// Same pattern as Pierce County: government data verifies the facility exists,
// then a fast training-data pass (no web search, ~5s) fills in inspection scores.
// The LLM call runs server-side on the Vercel proxy (llmRestaurantSearch,
// task "training_enrich") so API keys stay off the client. Per-locale source
// context is applied there. Results update live via onAccurateResults callback.

export function isStale(latestDate) {
  if (!latestDate) return true;
  const date = new Date(latestDate);
  if (isNaN(date.getTime())) return true;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return date < twoYearsAgo;
}

/**
 * Run background LLM enrichment for a list of restaurants.
 * Calls onAccurateResults with the enriched list when done.
 *
 * @param {Array} results - Current restaurant results
 * @param {string} countyId - Locale identifier for source context
 * @param {Function|null} onAccurateResults - Callback for live updates
 */
export function enrichResults(results, countyId, onAccurateResults) {
  if (!results || results.length === 0 || !onAccurateResults) return;

  const enrichList = results.map(r => ({
    name: r.name,
    address: r.address,
    city: r.city,
    zip_code: r.zip_code,
  }));

  llmTrainingEnrich(enrichList, countyId).then((res) => {
    const found = Array.isArray(res?.inspections) ? res.inspections : [];
    const byIdx = new Map(found.filter(f => Number.isInteger(f.idx)).map(f => [f.idx, f]));
    const enriched = results.map((r, i) => {
      const insp = byIdx.get(i);
      if (!insp) return r;
      let score = insp.latest_score ?? null;
      const resultText = (insp.latest_result || "").toLowerCase();
      const violations = insp.violations || [];
      // Infer score from result text if LLM returned null
      if (score === null) {
        if (resultText.includes("great") || resultText.includes("excellent") || resultText.includes("a grade") || resultText.includes("no violations") || resultText.includes("clean") || resultText.includes("pass")) {
          score = 95;
        } else if (resultText.includes("okay") || resultText.includes("satisfactory") || resultText.includes("b grade") || resultText.includes("minor") || resultText.includes("conditional")) {
          score = 80;
        } else if (resultText.includes("needs to improve") || resultText.includes("poor") || resultText.includes("c grade") || resultText.includes("critical")) {
          score = 55;
        } else if (resultText.includes("closed") || resultText.includes("f grade") || resultText.includes("shut down") || resultText.includes("fail")) {
          score = 25;
        } else if (violations.length === 0) {
          score = 95;
        }
      }
      return {
        ...r,
        safetyScore: score,
        grade: score !== null ? resolveGrade(score, insp.latest_result || "") : "U",
        latestDate: insp.latest_date || r.latestDate || "",
        latestResult: insp.latest_result || r.latestResult || "",
        totalInspections: insp.total_inspections || r.totalInspections || (score !== null ? 1 : 0),
        violations,
        isLLMData: true,
        allInspections: insp.latest_date ? [{
          date: insp.latest_date,
          score: score,
          result: insp.latest_result || "",
          type: "Routine",
          violation_points: score !== null ? Math.max(0, 100 - score) : 0,
          violations: (insp.violations || []).map(v => ({ description: v, severity: "minor", points: 0 })),
        }] : (r.allInspections || []),
      };
    });
    onAccurateResults(enriched);
  }).catch(() => {});
}