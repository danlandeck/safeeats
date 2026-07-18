import { resolveGrade } from "../grading";

// ── Montgomery County MD ──────────────────────────────────────────────────────
const MONTGOMERY_VKEYS = ["violation1","violation2","violation3","violation4","violation5","violation6a","violation6b","violation7a","violation7b","violation8","violation9"];

export function processMontgomeryResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.establishment_id;
    const name = row.name;
    if (!id || !name) return;
    if (!businesses[id]) {
      businesses[id] = { business_id: id, name, address: row.address1 || "", city: "Rockville", zip_code: row.zip || "", phone: "", description: "", inspections: [], allRows: [] };
    }
    businesses[id].allRows.push(row);
    const key = `${row.inspectiondate}-${row.inspectiontype}`;
    if (!businesses[id].inspections.find((i) => i.serial === key)) {
      const out = MONTGOMERY_VKEYS.filter((k) => row[k] === "Out of Compliance").length;
      const pts = out === 0 ? 5 : out === 1 ? 18 : out === 2 ? 30 : 45;
      businesses[id].inspections.push({ serial: key, date: row.inspectiondate, score: pts, result: row.inspectionresults || "" });
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
      latitude: null, longitude: null, isLLMData: false, source: "montgomery",
      ada_compliance: "unknown",
    };
  });
}

export function montgomeryToDetailRows(data) {
  const rows = [];
  data.forEach((row) => {
    const outViolations = MONTGOMERY_VKEYS.filter((k) => row[k] === "Out of Compliance");
    const pts = outViolations.length === 0 ? 5 : outViolations.length === 1 ? 18 : outViolations.length === 2 ? 30 : 45;
    const key = `${row.inspectiondate}-${row.inspectiontype || "inspection"}`;
    if (outViolations.length === 0) {
      rows.push({ inspection_serial_num: key, inspection_date: row.inspectiondate, inspection_score: String(pts), inspection_result: row.inspectionresults || "", inspection_type: row.inspectiontype || "", violation_description: "", violation_type: "", violation_points: "0" });
    } else {
      outViolations.forEach((k) => {
        rows.push({ inspection_serial_num: key, inspection_date: row.inspectiondate, inspection_score: String(pts), inspection_result: row.inspectionresults || "", inspection_type: row.inspectiontype || "", violation_description: `${k.replace("violation", "Violation ").toUpperCase()}: Out of Compliance`, violation_type: "RED", violation_points: "0" });
      });
    }
  });
  return rows;
}