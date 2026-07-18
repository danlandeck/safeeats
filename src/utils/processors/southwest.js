import { resolveGrade } from "../grading";

// ── Southern Nevada Health District (SNHD) — Clark County, NV ──────────────────
const SNHD_RESULT_MAP = {
  'A': 'Grade A', 'B': 'Grade B', 'C': 'Grade C',
  'O': 'Approved to Open',
  'N': 'Not Approved to Open',
  'P': 'Pass',
  'F': 'Fail',
  'S': 'Permit Suspended',
  'R': 'Permit Revoked',
  'X': 'Closed by SNHD',
  'Y': 'Grade B or C',
};

export function processSNHDResults(restaurants) {
  if (!Array.isArray(restaurants) || restaurants.length === 0) return [];
  return restaurants.map((r) => {
    const demerits = r.current_demerits || 0;
    const grade = (r.current_grade || "").toUpperCase();
    const resultStr = SNHD_RESULT_MAP[grade] || grade || "Unknown";
    const isClosed = ['S', 'R', 'X', 'N'].includes(grade);
    const isPass = grade === 'P' || grade === 'O';
    let safetyScore;
    if (isClosed) {
      safetyScore = Math.min(demerits > 0 ? 100 - demerits : 25, 25);
    } else if (isPass && demerits === 0) {
      safetyScore = 92;
    } else {
      safetyScore = Math.max(0, Math.min(100, 100 - demerits));
    }
    const latestDate = r.date_current ? r.date_current.split(" ")[0] : "";
    return {
      business_id: r.permit_number,
      name: (r.restaurant_name || "").trim(),
      address: (r.address || "").trim(),
      city: (r.city_name || "Las Vegas").trim(),
      zip_code: (r.zip_code || "").trim(),
      phone: "",
      description: r.category_name || "",
      cuisine: r.category_name === "Restaurant" ? "" : (r.category_name || ""),
      safetyScore,
      grade: resolveGrade(safetyScore, resultStr),
      totalInspections: 1,
      latestDate,
      latestResult: resultStr,
      latitude: r.latitude || null,
      longitude: r.longitude || null,
      isLLMData: false,
      source: "snhd",
      county_id: "snhd",
      ada_compliance: "unknown",
      _rawSnhd: r,
    };
  }).filter(r => r.name && r.address);
}

export function snhdToDetailRows(detail) {
  if (!detail || !detail.permit_number) return [];
  const rows = [];
  const permitNum = detail.permit_number;

  const currentDate = detail.date_current ? detail.date_current.split(" ")[0] : "";
  const currentGrade = (detail.current_grade || "").toUpperCase();
  const currentResult = SNHD_RESULT_MAP[currentGrade] || currentGrade || "Unknown";
  const currentDemerits = detail.current_demerits || 0;
  const currentViolations = detail.current_violations_resolved || [];

  if (currentViolations.length === 0) {
    rows.push({
      inspection_serial_num: `${permitNum}-${currentDate}`,
      inspection_date: currentDate,
      inspection_score: String(currentDemerits),
      inspection_result: currentResult,
      inspection_type: detail.inspection_type || "Routine Inspection",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    });
  } else {
    currentViolations.forEach((v) => {
      rows.push({
        inspection_serial_num: `${permitNum}-${currentDate}`,
        inspection_date: currentDate,
        inspection_score: String(currentDemerits),
        inspection_result: currentResult,
        inspection_type: detail.inspection_type || "Routine Inspection",
        violation_description: v.description || "",
        violation_type: (v.demerits || 0) >= 5 ? "RED" : "BLUE",
        violation_points: String(v.demerits || 0),
      });
    });
  }

  const prevInspections = detail.previous_inspections || [];
  prevInspections.forEach((insp) => {
    const date = insp.inspection_date ? insp.inspection_date.split(" ")[0] : "";
    const grade = (insp.inspection_grade || "").toUpperCase();
    const result = SNHD_RESULT_MAP[grade] || grade || "Unknown";
    const demerits = insp.inspection_demerits || 0;
    const violations = insp.violations_resolved || [];

    if (violations.length === 0) {
      rows.push({
        inspection_serial_num: `${permitNum}-${date}`,
        inspection_date: date,
        inspection_score: String(demerits),
        inspection_result: result,
        inspection_type: insp.inspection_type || "Routine Inspection",
        violation_description: "",
        violation_type: "",
        violation_points: "0",
      });
    } else {
      violations.forEach((v) => {
        rows.push({
          inspection_serial_num: `${permitNum}-${date}`,
          inspection_date: date,
          inspection_score: String(demerits),
          inspection_result: result,
          inspection_type: insp.inspection_type || "Routine Inspection",
          violation_description: v.description || "",
          violation_type: (v.demerits || 0) >= 5 ? "RED" : "BLUE",
          violation_points: String(v.demerits || 0),
        });
      });
    }
  });

  rows.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
  return rows;
}

// ── Maricopa County, AZ ───────────────────────────────────────────────────────
export function processMaricopaResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f, i) => ({
    business_id: f.business_id || `maricopa-${i}`,
    name: f.name,
    address: f.address,
    city: f.city,
    zip_code: f.zip_code || "",
    phone: "", description: "",
    safetyScore: null,
    grade: "U",
    totalInspections: 0,
    latestDate: null,
    latestResult: "Licensed",
    latitude: f.latitude || null,
    longitude: f.longitude || null,
    isLLMData: false, source: "maricopa",
    ada_compliance: "unknown",
    permit_url: f.permit_url || null,
    inspection_url: f.inspection_url || null,
    license_number: f.license_number || "",
  }));
}

export function maricopaToDetailRows(restaurant) {
  if (Array.isArray(restaurant.allInspections) && restaurant.allInspections.length > 0) {
    return restaurant.allInspections.map((insp, i) => ({
      inspection_serial_num: `maricopa-${restaurant.business_id}-${i}`,
      inspection_date: insp.inspection_date || insp.date || "",
      inspection_score: insp.inspection_score || insp.score || "",
      inspection_result: insp.inspection_result || insp.result || "",
      inspection_type: insp.inspection_type || "Routine",
      violation_description: insp.violation_description || "",
      violation_type: insp.violation_type || "",
      violation_points: insp.violation_points || "0",
    }));
  }
  return [{
    inspection_serial_num: `maricopa-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: "",
    inspection_result: restaurant.latestResult || "Licensed",
    inspection_type: "Routine",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}