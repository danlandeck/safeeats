import { resolveGrade } from "../grading";

// ── Mississippi State Department of Health (MSDH) ─────────────────────────────
// Backend function: mississippiInspections (ASP.NET session-managed scraper)
// State-wide coverage: ALL 82 counties. A/B/C grading (A=90+, B=80+, C=70+).
// Backend returns normalized facility data and detail rows.

export function processMississippiResults(facilities) {
  if (!Array.isArray(facilities)) return [];
  return facilities.map((fac) => ({
    business_id: fac.business_id || fac.pimsId,
    name: fac.name || "",
    address: fac.address || "",
    city: fac.city || "",
    state: fac.state || "MS",
    zip_code: fac.zip_code || "",
    phone: fac.phone || "",
    description: "",
    county_id: "mississippi",
    source: "mississippi",
    safetyScore: fac.safetyScore ?? null,
    grade: fac.grade || resolveGrade(fac.safetyScore, fac.latestResult),
    totalInspections: fac.totalInspections || 0,
    latestDate: fac.latestDate || "",
    latestResult: fac.latestResult || "",
    isLLMData: false,
    ada_compliance: "unknown",
    latitude: null,
    longitude: null,
  }));
}

export function mississippiToDetailRows(data) {
  // Backend already returns rows in the correct detail row format
  if (!Array.isArray(data)) return [];
  return data;
}