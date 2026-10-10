import { resolveGrade } from "../grading";
import { standardizeDate } from "../date";

// ── King County (Seattle) ────────────────────────────────────────────────────
// King County publishes the same inspection records in three shapes:
//   - ArcGIS layer RESTAURANT_INSPECTIONS_POINT_857: UPPERCASE fields, epoch-ms
//     dates, newest record 2024-03-30 (frozen)
//   - Socrata vbyt-shxd: lowercase fields, ISO dates, through 2025-11-26 (frozen)
//   - Socrata r878-4sxa "Food Establishment Inspection Data": the CURRENT feed
//     (through 2026-09-01), one row per violation with shared
//     inspection_serial_num, no lat/long/phone, and a real business_id
// The registry now points at r878-4sxa. normalizeKingRow maps all Socrata names
// onto the ArcGIS names this module was written against, so both shapes work.
const SOCRATA_TO_ARCGIS = {
  name: "NAME",
  program_identifier: "PROGRAM_IDENTIFIER",
  business_id: "BUSINESS_ID",
  inspection_date: "DATE_INSPECTION",
  description: "SEAT_CAP",
  classification: "SEAT_CAP", // r878-4sxa facility type ("General Food Services")
  address: "ADDRESS",
  city: "CITY",
  zip_code: "ZIPCODE",
  phone: "PHONE",
  longitude: "LONGITUDE",
  latitude: "LATITUDE",
  inspection_business_name: "BUS_NAME_INSPECTION",
  inspection_type: "TYPE_INSPECTION",
  inspection_score: "SCORE_INSPECTION",
  inspection_result: "RESULT_INSPECTION",
  violation_type: "VIOLATIONTYPE",
  violation_description: "VIOLATIONDESCR",
  violation_points: "VIOLATIONPOINTS",
  violation_record_id: "FEATURE_ID",
  inspection_serial_num: "INSPECTION_SERIAL_NUM",
};

function normalizeKingRow(row) {
  if (!row || typeof row !== "object") return row;
  // Already ArcGIS-shaped
  if (row.NAME !== undefined || row.PROGRAM_IDENTIFIER !== undefined) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[SOCRATA_TO_ARCGIS[k] || k] = v;
  return out;
}

function kingRows(data) {
  const rows = Array.isArray(data) ? data : (data?.features?.map((f) => f.attributes) || []);
  return rows.map(normalizeKingRow);
}

export function processKingCountyResults(data) {
  const rows = kingRows(data);
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const businesses = {};
  rows.forEach((row) => {
    // r878-4sxa groups by business_id ("PFE-PR-…"); program_identifier is null
    // for ~80% of rows there and falls back to name (older datasets).
    const id = row.BUSINESS_ID || row.PROGRAM_IDENTIFIER || row.NAME;
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
    // Strip the internal allRows/inspections working arrays (Sacramento pattern)
    // so result cards, search-state cache, and router state stay small.
    const { allRows, inspections, ...card } = biz;
    // King County's only result labels are "Satisfactory"/"Unsatisfactory"/"Complete".
    // "Unsatisfactory" is routine wording (any red-critical violation found) and its
    // severity is ALREADY encoded in the penalty points we inverted into safetyScore.
    // resolveGrade no longer lets that keyword override a numeric score — the same
    // rule as every other jurisdiction — so the result passes through untouched.
    return {
      ...card, safetyScore, grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: inspections.length,
      latestDate: latest?.date, latestResult,
      latitude: rowWithCoords?.LATITUDE, longitude: rowWithCoords?.LONGITUDE,
      isLLMData: false, source: "king",
      ada_compliance: "unknown",
    };
  });
}

export function kingToDetailRows(data) {
  const rows = kingRows(data);
  // r878-4sxa (and the older feeds) emit one row PER VIOLATION, with rows of the
  // same visit sharing an inspection_serial_num. Collapse each visit into ONE
  // detail row with the violations joined — the same pattern as
  // sacramentoToDetailRows, and what RestaurantDetailPage's serial dedupe and
  // RestaurantDetail's grouping expect.
  const inspMap = {};
  rows.forEach((row) => {
    const serial = row.INSPECTION_SERIAL_NUM ||
      `${standardizeDate(row.DATE_INSPECTION)}-${row.TYPE_INSPECTION}`;
    if (!inspMap[serial]) {
      inspMap[serial] = {
        serial,
        date: standardizeDate(row.DATE_INSPECTION),
        score: row.SCORE_INSPECTION || 0,
        result: row.RESULT_INSPECTION || "",
        type: row.TYPE_INSPECTION || "",
        violations: [],
        hasRed: false,
        points: 0,
      };
    }
    const insp = inspMap[serial];
    if (row.VIOLATIONDESCR?.trim()) insp.violations.push(row.VIOLATIONDESCR.trim());
    if (row.VIOLATIONTYPE === "RED") insp.hasRed = true;
    insp.points += parseInt(row.VIOLATIONPOINTS) || 0;
  });
  return Object.values(inspMap).map((insp) => ({
    inspection_serial_num: insp.serial,
    inspection_date: insp.date,
    inspection_score: String(insp.score),
    inspection_result: insp.result,
    inspection_type: insp.type,
    violation_description: insp.violations.join("; "),
    violation_type: insp.violations.length ? (insp.hasRed ? "RED" : "BLUE") : "",
    violation_points: String(insp.points),
  }));
}