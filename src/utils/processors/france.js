import { resolveGrade } from "../grading";

// ── France Alim'confiance (OpenDataSoft API) ──────────────────────────────────
// 4-tier evaluation: app_code_synthese_eval_sanit (1=best, 4=worst)
// Archetype 5 — Result-Based Discrete Mapping
const FR_CODE_TO_SCORE = { 1: 95, 2: 82, 3: 68, 4: 40 };
const FR_CODE_TO_LABEL = {
  1: "Très satisfaisant",
  2: "Satisfaisant",
  3: "Maîtrise des risques acceptable",
  4: "Maîtrise des risques à améliorer",
};

export function processFranceResults(records, commune = null) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((rec) => {
    const f = rec.fields || {};
    const siret = f.siret || rec.recordid;
    if (!siret) return;
    if (!businesses[siret]) {
      const addr = f.adresse_2_ua || f.adresse_activite || "";
      businesses[siret] = {
        business_id: `fr-${siret}`,
        name: f.enseigne || f.app_libelle_etablissement || f.libelle_etablissement || f.raison_sociale || "",
        address: addr,
        city: f.libelle_commune || f.localite || "",
        zip_code: f.code_postal || "",
        phone: "",
        description: f.app_libelle_activite_etablissement || f.type_activite || "",
        inspections: [],
        siret,
        latitude: f.geores ? f.geores[0] : null,
        longitude: f.geores ? f.geores[1] : null,
      };
    }
    const code = f.app_code_synthese_eval_sanit;
    const dateStr = f.date_inspection ? f.date_inspection.split("T")[0] : "";
    if (dateStr && !businesses[siret].inspections.find((i) => i.date === dateStr)) {
      businesses[siret].inspections.push({ date: dateStr, code, label: f.synthese_eval_sanit || FR_CODE_TO_LABEL[code] || "" });
    }
  });
  let results = Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = latest ? (FR_CODE_TO_SCORE[latest.code] ?? null) : null;
    const latestResult = latest?.label || (latest ? FR_CODE_TO_LABEL[latest.code] : "");
    return {
      ...biz,
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: biz.inspections.length,
      latestDate: latest?.date || "",
      latestResult,
      isLLMData: false,
      source: "france_alimconfiance",
      county_id: "france_alimconfiance",
      ada_compliance: "unknown",
    };
  });
  // Filter by commune (city) if specified — case-insensitive match on libelle_commune or localite
  if (commune) {
    const commLower = commune.toLowerCase();
    results = results.filter((r) =>
      (r.city || "").toLowerCase().includes(commLower)
    );
  }
  return results;
}

export function franceToDetailRows(restaurant) {
  if (!restaurant.siret) return [];
  const codeToScore = { 1: 5, 2: 18, 3: 32, 4: 60 };
  const codeToDesc = {
    1: "Très satisfaisant — Very satisfactory",
    2: "Satisfaisant — Satisfactory",
    3: "Maîtrise des risques acceptable — Acceptable risk management",
    4: "Maîtrise des risques à améliorer — Risk management needs improvement",
  };
  return [{
    inspection_serial_num: `fr-${restaurant.siret}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: String(codeToScore[restaurant._latestCode] ?? 0),
    inspection_result: restaurant.latestResult || "",
    inspection_type: "Alim'confiance — DGCCRF Inspection",
    violation_description: restaurant.latestResult ? codeToDesc[restaurant._latestCode] || restaurant.latestResult : "",
    violation_type: (restaurant._latestCode || 0) >= 3 ? "RED" : "BLUE",
    violation_points: String(codeToScore[restaurant._latestCode] ?? 0),
  }];
}