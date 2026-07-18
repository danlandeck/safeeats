import { resolveGrade } from "../grading";
import { standardizeDate } from "../date";

// ── King County (Seattle) ────────────────────────────────────────────────────
export function processKingCountyResults(data) {
  const rows = Array.isArray(data) ? data : (data?.features?.map(f => f.attributes) || []);
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const businesses = {};
  rows.forEach((row) => {
    const id = row.PROGRAM_IDENTIFIER || row.NAME;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.NAME || row.BUS_NAME_INSPECTION,
        address: row.ADDRESS, city: row.CITY, zip_code: row.ZIPCODE,
        phone: row.PHONE, description: row.SEAT_CAP || "",
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const dateStr = standardizeDate(row.DATE_INSPECTION);
    const serial = `${dateStr}-${row.TYPE_INSPECTION}`;
    if (!businesses[id].inspections.find((i) => i.serial === serial)) {
      businesses[id].inspections.push({
        serial, date: dateStr,
        score: parseInt(row.SCORE_INSPECTION) || 0,
        result: row.RESULT_INSPECTION,
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const hasResult = latest?.result && latest.result.trim() !== "";
    const hasScore = latest?.score !== undefined && latest?.score !== null;
    const safetyScore = (hasResult || hasScore) && latest
      ? Math.max(0, Math.min(100, 100 - (latest.score || 0)))
      : null;
    const latestResult = hasResult ? latest.result : "Unknown";
    const rowWithCoords = biz.allRows.find((r) => r.LATITUDE && r.LONGITUDE);
    return {
      ...biz, safetyScore, grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult,
      latitude: rowWithCoords?.LATITUDE, longitude: rowWithCoords?.LONGITUDE,
      isLLMData: false, source: "king",
      ada_compliance: "unknown",
    };
  });
}

export function kingToDetailRows(data) {
  const rows = Array.isArray(data) ? data : (data?.features?.map(f => f.attributes) || []);
  return rows.map((row) => ({
    inspection_serial_num: `${standardizeDate(row.DATE_INSPECTION)}-${row.TYPE_INSPECTION}-${row.FEATURE_ID || row.OBJECTID || Math.random()}`,
    inspection_date: standardizeDate(row.DATE_INSPECTION),
    inspection_score: String(row.SCORE_INSPECTION || 0),
    inspection_result: row.RESULT_INSPECTION || "",
    inspection_type: row.TYPE_INSPECTION || "",
    violation_description: row.VIOLATIONDESCR || "",
    violation_type: row.VIOLATIONTYPE || "",
    violation_points: String(row.VIOLATIONPOINTS || 0),
  }));
}