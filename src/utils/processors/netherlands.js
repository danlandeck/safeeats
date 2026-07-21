import { resolveGrade } from "../grading";

// ── Netherlands NVWA (HTML scraping) ──────────────────────────────────────────
// Status: "Voldoet" (compliant) / "Niet voldoet" (non-compliant) / "Geen recente gegevens" (no data)
// Archetype 5 — Result-Based Discrete Mapping
export function processNetherlandsResults(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  return records.map((rec) => {
    const status = rec.status || "Onbekend";
    let safetyScore = null;
    let latestResult = "Onbekend";
    if (/voldoet/i.test(status) && !/niet/i.test(status)) {
      safetyScore = 88;
      latestResult = "Voldoet (Compliant)";
    } else if (/niet\s*voldoet/i.test(status)) {
      safetyScore = 45;
      latestResult = "Niet voldoet (Non-compliant)";
    } else if (/geen recente/i.test(status)) {
      safetyScore = null;
      latestResult = "Geen recente gegevens (No recent data)";
    }
    return {
      business_id: `nl-${rec.slug || rec.name}`,
      name: rec.name,
      address: "",
      city: "Netherlands",
      zip_code: "",
      phone: "",
      description: "",
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: 1,
      latestDate: "",
      latestResult,
      latitude: null,
      longitude: null,
      isLLMData: false,
      source: "netherlands_nvwa",
      county_id: "netherlands_nvwa",
      detailUrl: rec.detailUrl || "",
      ada_compliance: "unknown",
    };
  });
}

export function netherlandsToDetailRows(restaurant) {
  if (!restaurant.business_id) return [];
  return [{
    inspection_serial_num: restaurant.business_id,
    inspection_date: restaurant.latestDate || "",
    inspection_score: String(Math.max(0, 100 - (restaurant.safetyScore || 88))),
    inspection_result: restaurant.latestResult || "Onbekend",
    inspection_type: "NVWA Inspection (Nederlandse Voedsel- en Warenautoriteit)",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}