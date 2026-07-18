import { resolveGrade, getGrade } from "../grading";
import { standardizeDate } from "../date";

// ── Louisville / Jefferson County, KY ──────────────────────────────────────────
export function processLouisvilleResults(data) {
  const records = Array.isArray(data) ? data : (data?.records || []);
  if (records.length === 0) return [];
  const businesses = {};
  records.forEach(row => {
    const id = row.EstablishmentID;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: String(id),
        name: row.EstablishmentName || "",
        address: row.Address || "",
        city: row.City || "Louisville",
        zip_code: row.Zip ? String(row.Zip) : "",
        phone: "",
        description: row.TypeDescription || "",
        inspections: [],
      };
    }
    const dateStr = row.InspectionDate ? row.InspectionDate.split(" ")[0] : null;
    const serial = `louisville-${row.InspectionID}`;
    if (!businesses[id].inspections.find(i => i.serial === serial)) {
      businesses[id].inspections.push({
        serial,
        date: dateStr,
        score: row.score ?? null,
        grade: row.Grade || null,
        type: row.Ins_TypeDesc || "",
      });
    }
  });
  return Object.values(businesses).map(biz => {
    biz.inspections.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const latest = biz.inspections[0];
    const score = latest?.score ?? null;
    const safetyScore = score !== null ? Math.max(0, Math.min(100, score)) : null;
    const grade = latest?.grade || (safetyScore !== null ? getGrade(safetyScore) : "U");
    return {
      ...biz,
      safetyScore,
      grade,
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: grade !== "U" ? `Grade ${grade} (Score: ${score}/100)` : (latest?.type || "Unknown"),
      latitude: null,
      longitude: null,
      isLLMData: false,
      source: "louisville",
      ada_compliance: "unknown",
    };
  });
}

export function louisvilleToDetailRows(data) {
  const records = Array.isArray(data) ? data : (data?.records || []);
  if (records.length === 0) return [];
  const seen = new Set();
  return records.map(row => {
    const dateStr = row.InspectionDate ? row.InspectionDate.split(" ")[0] : "unknown";
    const serial = `louisville-${row.InspectionID}`;
    if (seen.has(serial)) return null;
    seen.add(serial);
    const score = row.score ?? 0;
    return {
      inspection_serial_num: serial,
      inspection_date: dateStr,
      inspection_score: String(100 - score),
      inspection_result: row.Grade ? `Grade ${row.Grade} (Score: ${score}/100)` : `Score: ${score}/100`,
      inspection_type: row.Ins_TypeDesc || "Routine Inspection",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    };
  }).filter(Boolean);
}

// ── Wake County, NC (Raleigh area) ─────────────────────────────────────────────
export function processWakeCountyResults(data) {
  const restaurants = Array.isArray(data?.restaurants) ? data.restaurants : [];
  const inspections = Array.isArray(data?.inspections) ? data.inspections : [];
  if (restaurants.length === 0) return [];

  const inspByHsisid = {};
  inspections.forEach(row => {
    const id = row.HSISID;
    if (!id) return;
    if (!inspByHsisid[id]) inspByHsisid[id] = [];
    inspByHsisid[id].push(row);
  });
  Object.values(inspByHsisid).forEach(arr => {
    arr.sort((a, b) => (b.DATE_ || 0) - (a.DATE_ || 0));
  });

  return restaurants.map(rest => {
    const id = rest.HSISID;
    const restInspections = inspByHsisid[id] || [];
    const latest = restInspections[0];
    const score = latest?.SCORE ?? null;
    const safetyScore = score !== null ? Math.max(0, Math.min(100, score)) : null;
    const latestDate = latest?.DATE_ ? new Date(latest.DATE_).toISOString().split("T")[0] : null;
    const latestResult = latest?.TYPE || "";

    return {
      business_id: id,
      name: rest.NAME || "",
      address: rest.ADDRESS1 || "",
      city: rest.CITY || "Wake County",
      zip_code: rest.POSTALCODE || "",
      phone: rest.PHONENUMBER || "",
      description: rest.FACILITYTYPE || "",
      safetyScore,
      grade: safetyScore !== null ? getGrade(safetyScore) : "U",
      totalInspections: restInspections.length,
      latestDate,
      latestResult,
      latitude: rest.Y || null,
      longitude: rest.X || null,
      isLLMData: false,
      source: "wake",
      ada_compliance: "unknown",
    };
  });
}

export function wakeCountyToDetailRows(data) {
  const inspections = Array.isArray(data?.inspections) ? data.inspections : (Array.isArray(data) ? data : []);
  if (inspections.length === 0) return [];
  const seen = new Set();
  return inspections.map(row => {
    const dateStr = row.DATE_ ? new Date(row.DATE_).toISOString().split("T")[0] : "unknown";
    const serial = `wake-${row.HSISID}-${dateStr}`;
    if (seen.has(serial)) return null;
    seen.add(serial);
    const score = row.SCORE ?? 0;
    return {
      inspection_serial_num: serial,
      inspection_date: dateStr,
      inspection_score: String(100 - score),
      inspection_result: row.TYPE || "Inspection",
      inspection_type: row.TYPE || "Routine Inspection",
      violation_description: row.DESCRIPTION || "",
      violation_type: "",
      violation_points: "0",
    };
  }).filter(Boolean);
}

// ── Farmington Valley Health District (FVHD), CT ──────────────────────────────
const FVHD_GRADE_TO_SCORE = { A: 95, B: 85, C: 75, U: 30 };
const FVHD_GRADE_TO_RESULT = {
  A: "Excellent — No significant issues",
  B: "Good — Minor non-critical issues",
  C: "Fair — Noticeable violations, needs improvement",
  U: "Unsatisfactory — Significant violations",
};

export function processFVHDResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f, i) => ({
    business_id: f.business_id || `fvhd-${i}`,
    name: f.name,
    address: f.address,
    city: f.city || f.town || "",
    zip_code: f.zip_code || "",
    phone: "", description: "",
    safetyScore: f.latest_score ?? null,
    grade: f.latest_grade || f.current_grade || "U",
    totalInspections: f.total_inspections || 1,
    latestDate: standardizeDate(f.current_date) || null,
    latestResult: f.latest_result || FVHD_GRADE_TO_RESULT[f.current_grade] || "",
    isLLMData: false, source: "fvhd",
    ada_compliance: "unknown",
    portal_url: f.source_url || `https://fvhd.org/environmental-health/food/food-ratings/`,
    portal_name: "FVHD Food Ratings",
    _history: f.history || "[]",
  }));
}

export function fvhdToDetailRows(restaurant) {
  let history = [];
  try {
    history = JSON.parse(restaurant._history || restaurant.history || "[]");
  } catch { history = []; }
  if (!Array.isArray(history) || history.length === 0) {
    return [{
      inspection_serial_num: `fvhd-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: String(restaurant.safetyScore ?? ""),
      inspection_result: restaurant.latestResult || "",
      inspection_type: "Routine Inspection",
      violation_description: restaurant.grade === "U"
        ? "Significant violations posing potential risks to public health"
        : "No significant issues noted in FVHD rating",
      violation_type: restaurant.grade === "U" ? "RED" : "BLUE",
      violation_points: restaurant.grade === "U" ? "1" : "0",
    }];
  }
  return history.map((h, i) => {
    const score = FVHD_GRADE_TO_SCORE[h.grade] ?? 0;
    const result = FVHD_GRADE_TO_RESULT[h.grade] || "";
    return {
      inspection_serial_num: `fvhd-${restaurant.business_id}-${i}`,
      inspection_date: standardizeDate(h.date) || "",
      inspection_score: String(score),
      inspection_result: result,
      inspection_type: "Routine Inspection",
      violation_description: h.grade === "U"
        ? "Significant violations posing potential risks to public health"
        : h.grade === "C"
          ? "Noticeable violations or areas needing improvement"
          : h.grade === "B"
            ? "Minor, non-critical issues present"
            : "Outstanding performance — no significant issues",
      violation_type: h.grade === "U" || h.grade === "C" ? "RED" : "BLUE",
      violation_points: h.grade === "U" ? "3" : h.grade === "C" ? "2" : h.grade === "B" ? "1" : "0",
    };
  });
}

// ── Illinois CDP Portal ────────────────────────────────────────────────────────
export function processIllinoisCDPResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f) => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address || "",
    city: f.city || "",
    zip_code: f.zip_code || "",
    phone: "", description: "",
    safetyScore: f.safetyScore ?? null,
    grade: f.safetyScore !== null ? resolveGrade(f.safetyScore, f.latestResult || "") : "U",
    totalInspections: f.totalInspections || 0,
    latestDate: f.latestDate || "",
    latestResult: f.latestResult || "",
    latitude: null, longitude: null,
    isLLMData: false, source: "illinois_cdp",
    ada_compliance: "unknown",
    portal_url: f.portal_url || null,
    portal_name: "IL County Health Dept (CDP Portal)",
    _inspections: f.allInspections || [],
  }));
}

export function illinoisCDPToDetailRows(restaurant) {
  const inspections = restaurant._inspections || restaurant.allInspections || [];
  if (!Array.isArray(inspections) || inspections.length === 0) {
    return [{
      inspection_serial_num: `il-cdp-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: "",
      inspection_result: restaurant.latestResult || "No inspections on file",
      inspection_type: "Routine",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    }];
  }
  return inspections.map((insp, i) => ({
    inspection_serial_num: `il-cdp-${restaurant.business_id}-${i}`,
    inspection_date: insp.date || "",
    inspection_score: insp.score !== null ? String(Math.max(0, 100 - insp.score)) : "",
    inspection_result: insp.result || "Inspection completed",
    inspection_type: insp.type || "Routine",
    violation_description: (insp.riskFactor || 0) + (insp.goodRetail || 0) === 0
      ? "No violations found"
      : `${insp.riskFactor || 0} risk factor, ${insp.goodRetail || 0} good retail practice, ${insp.repeatViolations || 0} repeat violation(s)`,
    violation_type: (insp.riskFactor || 0) > 0 ? "RED" : "BLUE",
    violation_points: String((insp.riskFactor || 0) * 7 + Math.round((insp.goodRetail || 0) * 1.5) + (insp.repeatViolations || 0) * 3),
  }));
}

// ── Indiana Marion County (Indianapolis) — MCPHD Portal ──────────────────────
export function processIndianaMarionResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f) => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address || "",
    city: f.city || "Indianapolis",
    zip_code: f.zip_code || "",
    phone: "", description: f.facility_type || "",
    safetyScore: f.safetyScore ?? null,
    grade: f.safetyScore !== null ? resolveGrade(f.safetyScore, f.latestResult || "") : "U",
    totalInspections: f.totalInspections || 0,
    latestDate: f.latestDate || "",
    latestResult: f.latestResult || "",
    latitude: null, longitude: null,
    isLLMData: false, source: "indiana_marion",
    ada_compliance: "unknown",
    portal_url: f.portal_url || null,
    portal_name: "Marion County Public Health Dept",
    _inspections: f.allInspections || [],
  }));
}

export function indianaMarionToDetailRows(restaurant) {
  const inspections = restaurant._inspections || restaurant.allInspections || [];
  if (!Array.isArray(inspections) || inspections.length === 0) {
    return [{
      inspection_serial_num: `in-marion-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: "",
      inspection_result: restaurant.latestResult || "No inspections on file",
      inspection_type: "Routine",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    }];
  }
  const allRows = [];
  inspections.forEach((insp, i) => {
    const violations = insp.violations || [];
    if (violations.length === 0) {
      allRows.push({
        inspection_serial_num: `in-marion-${restaurant.business_id}-${insp.inspection_id || i}`,
        inspection_date: insp.date || "",
        inspection_score: insp.score !== null ? String(Math.max(0, 100 - insp.score)) : "",
        inspection_result: insp.result || "Unknown",
        inspection_type: insp.type || "Routine",
        violation_description: insp.comment || "No violations found",
        violation_type: /in violation/i.test(insp.result) ? "RED" : "BLUE",
        violation_points: "0",
      });
    } else {
      violations.forEach((v) => {
        allRows.push({
          inspection_serial_num: `in-marion-${restaurant.business_id}-${insp.inspection_id || i}`,
          inspection_date: insp.date || "",
          inspection_score: insp.score !== null ? String(Math.max(0, 100 - insp.score)) : "",
          inspection_result: insp.result || "Unknown",
          inspection_type: insp.type || "Routine",
          violation_description: v.detail ? `${v.description}: ${v.detail}` : v.description,
          violation_type: /priority/i.test(v.severity) && !/foundation/i.test(v.severity) ? "RED" : "BLUE",
          violation_points: /priority/i.test(v.severity) && !/foundation/i.test(v.severity) ? "7" : /foundation/i.test(v.severity) ? "4" : "2",
        });
      });
    }
  });
  return allRows;
}