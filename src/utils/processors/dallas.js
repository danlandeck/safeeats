import { resolveGrade } from "../grading";

// ── Dallas County, TX (Socrata API) ───────────────────────────────────────────
// Score field is numeric 0-100 (100 = perfect). Archetype 1 — Direct Pass-Through.
export function processDallasResults(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row) => {
    const name = (row.program_identifier || "").trim();
    if (!name) return;
    const addr = (row.site_address || "").trim();
    const id = `${name.toUpperCase()}||${addr.toUpperCase()}`;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name,
        address: addr,
        city: "Dallas",
        zip_code: row.zip || "",
        phone: "",
        description: row.type || "",
        inspections: [],
        allRows: [],
        latitude: row.lat_long?.latitude ? parseFloat(row.lat_long.latitude) : null,
        longitude: row.lat_long?.longitude ? parseFloat(row.lat_long.longitude) : null,
      };
    }
    businesses[id].allRows.push(row);
    const dateStr = row.insp_date ? row.insp_date.split("T")[0] : "";
    if (dateStr && !businesses[id].inspections.find((i) => i.date === dateStr)) {
      businesses[id].inspections.push({ date: dateStr, score: row.score, type: row.type || "Routine" });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    // Dallas score is already 0-100 safety score (100 = perfect, deductions lower it)
    const safetyScore = latest ? Math.max(0, Math.min(100, parseInt(latest.score) || 0)) : null;
    const latestResult = safetyScore !== null
      ? (safetyScore >= 80 ? "Pass" : safetyScore >= 70 ? "Pass w/ Conditions" : "Fail")
      : "Unknown";
    return {
      ...biz,
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: biz.inspections.length,
      latestDate: latest?.date || "",
      latestResult,
      isLLMData: false,
      source: "dallas",
      county_id: "dallas",
      ada_compliance: "unknown",
    };
  });
}

export function dallasToDetailRows(restaurant) {
  if (!restaurant.business_id) return [];
  return [{
    inspection_serial_num: `dallas-${restaurant.business_id.split("||")[0]}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: String(Math.max(0, 100 - (restaurant.safetyScore || 0))),
    inspection_result: restaurant.latestResult || "",
    inspection_type: "Dallas County Health Inspection",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}