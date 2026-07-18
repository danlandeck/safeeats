import { resolveGrade } from "../grading";

// ── Chicago ───────────────────────────────────────────────────────────────────
export function processChicagoResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.license_;
    const name = row.dba_name || row.aka_name;
    if (!id || !name) return;
    if (!businesses[id]) {
      businesses[id] = { business_id: id, name, address: row.address || "", city: "Chicago", zip_code: row.zip || "", phone: "", description: row.facility_type || "", inspections: [], allRows: [] };
    }
    businesses[id].allRows.push(row);
    if (!businesses[id].inspections.find((i) => i.serial === row.inspection_id)) {
      const result = row.results || "";
      const pts = result === "Pass" ? 8 : result === "Pass w/ Conditions" ? 24 : 55;
      businesses[id].inspections.push({ serial: row.inspection_id, date: row.inspection_date, score: pts, result });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = Math.max(0, Math.min(100, 100 - (latest?.score || 0)));
    return {
      ...biz, safetyScore, grade: resolveGrade(safetyScore, latest?.result),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult: latest?.result,
      latitude: null, longitude: null, isLLMData: false, source: "chicago",
      ada_compliance: "unknown",
    };
  });
}

export function chicagoToDetailRows(data) {
  const rows = [];
  data.forEach((row) => {
    const result = row.results || "";
    const pts = result === "Pass" ? 8 : result === "Pass w/ Conditions" ? 24 : 55;
    const violations = (row.violations || "").split("|").map((v) => v.trim()).filter(Boolean);
    if (violations.length === 0) {
      rows.push({ inspection_serial_num: row.inspection_id, inspection_date: row.inspection_date, inspection_score: String(pts), inspection_result: result, inspection_type: row.inspection_type || "", violation_description: "", violation_type: "", violation_points: "0" });
    } else {
      violations.forEach((v) => {
        rows.push({ inspection_serial_num: row.inspection_id, inspection_date: row.inspection_date, inspection_score: String(pts), inspection_result: result, inspection_type: row.inspection_type || "", violation_description: v, violation_type: "BLUE", violation_points: "0" });
      });
    }
  });
  return rows;
}