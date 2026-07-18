import { base44 } from "@/api/base44Client";
import { getGrade, resolveGrade } from "./grading";

// ── Reusable background LLM enrichment ─────────────────────────────────────────
// Same pattern as Pierce County: government data verifies the facility exists,
// then gemini_3_flash (no web search, ~5s) fills in inspection scores from
// training data. Results update live via onAccurateResults callback.

const INSPECTION_SCHEMA = {
  type: "object",
  properties: {
    inspections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          idx:                 { type: "number" },
          latest_score:        { type: "number" },
          latest_date:         { type: "string" },
          latest_result:       { type: "string" },
          total_inspections:   { type: "number" },
          violations:          { type: "array", items: { type: "string" } },
          data_confidence:     { type: "string", enum: ["high", "medium", "low"] },
          verification_source: { type: "string" },
        },
      },
    },
  },
};

// Per-locale context to help the LLM find the right health department
const ENRICH_CONTEXT = {
  houston: "City of Houston Health Department food inspection scores. Houston uses a 0-100 ded point system where lower is better. Convert: 0-10 ded → score 90-100, 11-20 → 70-89, 21-30 → 40-69, 30+ → 0-39.",
  stanislaus: "Stanislaus County Environmental Health (stancounty.com) food facility inspection results. Facilities are inspected 1-4 times per year. Scores based on critical and non-critical violations.",
  vancouver: "Vancouver Coastal Health (VCH) restaurant inspection records from inspections.vch.ca. Inspection results: Pass, Conditional Pass, or Closed.",
  pierce: "Tacoma-Pierce County Health Department (TPCHD) food safety rating: Great, Okay, Needs to Improve, or Closed. Based on red critical violation points from last 4 routine inspections. Great=95, Okay=80, Needs to Improve=55, Closed=25.",
  tacoma: "Tacoma-Pierce County Health Department (TPCHD) food safety rating: Great, Okay, Needs to Improve, or Closed. Based on red critical violation points from last 4 routine inspections. Great=95, Okay=80, Needs to Improve=55, Closed=25.",
  manchester_ct: "Manchester CT Health Department (manchesterct.gov) uses a Green/Yellow/Red placard system. Green = Pass (0-1 priority violations) → score 90-100, Yellow = Conditional Pass (2+ priority violations corrected on site) → score 70-89, Red = Closed/Fail (imminent health hazard) → score 0-39. Inspection reports published monthly as PDFs at manchesterct.gov. CT DPH uses Priority (P), Priority Foundation (Pf), and Core (C) violation categories.",
  riverside: "Riverside County Department of Environmental Health (rivcoeh.org) restaurant inspection records. Facilities inspected 1-4 times per year. Uses a grade card system (A/B/C or color-coded). Search portal at weblink.rivcoeh.org. Convert letter grades: A=90-100, B=80-89, C=70-79. If closed/failed → 0-39.",
  arkansas: "Arkansas Department of Health (ADH) foodserviceprod.adh.arkansas.gov — state-wide portal covering all 75 counties. 100-point scale: 85+=satisfactory, 70-84=follow-up required, 60-69=reinspection within 48h, <60=closed. Food establishments inspected 1-4 times per year. Critical violations have higher point values.",
  maricopa: "Maricopa County Environmental Services (envapp.maricopa.gov) restaurant inspection grades. Letter grades A-R: A=90-100 (no priority violations), B=80-89, C=70-79 (2+ priority violations), R=Re-Inspection required (score 50-69). Priority violations directly contribute to foodborne illness risk. Inspections 1-4 times per year.",
};

function getContext(countyId) {
  return ENRICH_CONTEXT[countyId] || "";
}

/**
 * Check if inspection data is stale (more than 2 years old).
 * Used to decide whether to run LLM enrichment on top of live API data.
 */
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
 * Uses gemini_3_flash (no web search) for fast ~5s results.
 * Calls onAccurateResults with the enriched list when done.
 *
 * @param {Array} results - Current restaurant results
 * @param {string} countyId - Locale identifier for context
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

  const ctx = getContext(countyId);
  const prompt = `For each restaurant below, return the most recent health inspection score if you know it from your training data. Only return restaurants you have real data for — do NOT guess or fabricate.
${ctx ? `SOURCE CONTEXT: ${ctx}\n` : ""}${enrichList.map((r, i) => `${i}. ${r.name} — ${r.address}, ${r.city}${r.zip_code ? " " + r.zip_code : ""}`).join("\n")}
Return JSON with "inspections" array. Each entry has "idx" (the number above), "latest_score" (0-100), "latest_date", "latest_result", "total_inspections", "violations" (array of strings), "data_confidence" (high/medium/low), "verification_source".
If a restaurant had a CLEAN inspection (no violations), return latest_score: 100, latest_result: "No violations found", violations: [].
If you don't have data for a restaurant, OMIT it from the array.`;

  base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
    response_json_schema: INSPECTION_SCHEMA,
    model: "gemini_3_flash",
  }).then((res) => {
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