import { resolveGrade } from "../grading";

// ── Alabama (state-wide ADPH Food Establishment Scores) ──────────────────────
export function processAlabamaResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map(f => ({
    ...f,
    source: "alabama",
    ada_compliance: "unknown",
  }));
}

export function alabamaToDetailRows(restaurant) {
  return [{
    inspection_serial_num: `al-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: restaurant.safetyScore !== null ? String(Math.max(0, 100 - restaurant.safetyScore)) : "",
    inspection_result: restaurant.latestResult || "Unknown",
    inspection_type: "Routine Inspection (ADPH)",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}

// ── Arkansas (state-wide ADH Food Establishment Scores) ──────────────────────
export function processArkansasResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map(f => ({
    ...f,
    safetyScore: null,
    grade: "U",
    source: "arkansas",
    ada_compliance: "unknown",
  }));
}

export function arkansasToDetailRows(restaurant) {
  if (Array.isArray(restaurant.allInspections) && restaurant.allInspections.length > 0) {
    return restaurant.allInspections.map((insp, i) => ({
      inspection_serial_num: `arkansas-${restaurant.business_id}-${i}`,
      inspection_date: insp.date || insp.inspection_date || "",
      inspection_score: insp.score !== null && insp.score !== undefined
        ? String(Math.max(0, 100 - insp.score))
        : "",
      inspection_result: insp.result || insp.inspection_result || "",
      inspection_type: insp.type || insp.inspection_type || "Routine",
      violation_description: (insp.violations || []).map(v => v.description || v).join("; "),
      violation_type: "",
      violation_points: insp.violation_points || "0",
    }));
  }
  return [{
    inspection_serial_num: `arkansas-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: "",
    inspection_result: restaurant.latestResult || "Routine",
    inspection_type: restaurant.latestResult || "Routine",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}

// ── Florida DBPR (Division of Hotels & Restaurants) ───────────────────────────
export function processFloridaResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities
    .filter(f => f.name && f.license_id)
    .map((f, i) => ({
      business_id: f.license_id,
      name: f.name,
      address: f.address || "",
      city: f.city || "",
      zip_code: f.zip_code || "",
      phone: "",
      description: f.license_number || "",
      safetyScore: null,
      grade: "U",
      totalInspections: 0,
      latestDate: "",
      latestResult: f.status || "",
      latitude: null,
      longitude: null,
      isLLMData: false,
      source: "florida",
      ada_compliance: "unknown",
      portal_url: `https://www.myfloridalicense.com/inspectionDates.asp?SID=&id=${f.license_id}`,
      portal_name: "FL DBPR Inspection Portal",
      _license_id: f.license_id,
    }));
}

export function floridaToDetailRows(restaurant) {
  const inspections = restaurant._inspections || restaurant.allInspections || [];
  if (!Array.isArray(inspections) || inspections.length === 0) {
    return [{
      inspection_serial_num: `fl-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: "",
      inspection_result: restaurant.latestResult || "No inspections on file",
      inspection_type: "Routine",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    }];
  }
  return inspections.map((insp, i) => {
    const hp = insp.highPriority || 0;
    const int = insp.intermediate || 0;
    const basic = insp.basic || 0;
    const hasData = insp.safetyScore !== null && insp.safetyScore !== undefined;
    const totalViol = hp + int + basic;
    return {
      inspection_serial_num: `fl-${restaurant.business_id}-${insp.visit_id || i}`,
      inspection_date: insp.date || "",
      inspection_score: hasData ? String(Math.max(0, 100 - insp.safetyScore)) : "",
      inspection_result: insp.result || (hasData ? "Met Inspection Standards" : "Unknown"),
      inspection_type: insp.inspectionType || "Routine",
      violation_description: hasData
        ? totalViol === 0
          ? "No violations found"
          : `${hp} high priority, ${int} intermediate, ${basic} basic violation(s)`
        : "",
      violation_type: hp > 0 ? "RED" : "BLUE",
      violation_points: hasData ? String(hp * 10 + int * 5 + basic * 2) : "0",
    };
  });
}

// ── Georgia (ga.healthinspections.us) ─────────────────────────────────────────
export function processGeorgiaResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f) => {
    const inspections = (f.allInspections || []).map((insp, i) => ({
      serial: `ga-${f.permit_id}-${insp.inspection_id || i}`,
      date: insp.date || "",
      score: insp.score ?? null,
      grade: insp.grade || "",
      result: insp.result || "",
      report_url: insp.report_url || "",
    }));
    inspections.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const latest = inspections[0] || {};
    return {
      business_id: f.business_id,
      name: f.name,
      address: f.address,
      city: f.city || "",
      zip_code: f.zip_code || "",
      phone: "", description: "",
      safetyScore: f.safetyScore ?? null,
      grade: f.latestGrade || (f.safetyScore !== null ? resolveGrade(f.safetyScore, f.latestResult || "") : "U"),
      totalInspections: f.totalInspections || inspections.length,
      latestDate: f.latestDate || latest.date || "",
      latestResult: f.latestResult || latest.result || "",
      latitude: null, longitude: null,
      isLLMData: false, source: "georgia",
      ada_compliance: "unknown",
      portal_url: f.portal_url || null,
      portal_name: "GA DPH Health Inspections",
      _inspections: inspections,
    };
  });
}

export function georgiaToDetailRows(restaurant) {
  const inspections = restaurant._inspections || restaurant.allInspections || [];
  if (!Array.isArray(inspections) || inspections.length === 0) {
    return [{
      inspection_serial_num: `ga-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: restaurant.safetyScore !== null ? String(restaurant.safetyScore) : "",
      inspection_result: restaurant.latestResult || "No inspections on file",
      inspection_type: "Routine",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    }];
  }
  return inspections.map((insp, i) => ({
    inspection_serial_num: `ga-${restaurant.business_id}-${insp.inspection_id || i}`,
    inspection_date: insp.date || "",
    inspection_score: insp.score !== null ? String(insp.score) : "",
    inspection_result: insp.result || (insp.score !== null ? `Score: ${insp.score}, Grade: ${insp.grade}` : "Unknown"),
    inspection_type: "Routine",
    violation_description: insp.grade === "U"
      ? "Score below 70 — significant violations"
      : insp.grade === "C"
        ? "Score 70-79 — needs improvement"
        : insp.grade === "B"
          ? "Score 80-89 — minor violations"
          : "Score 90-100 — satisfactory",
    violation_type: insp.grade === "U" || insp.grade === "C" ? "RED" : "BLUE",
    violation_points: insp.score !== null ? String(Math.max(0, 100 - insp.score)) : "0",
  }));
}

// ── Washington DC (dc.healthinspections.us) ──────────────────────────────────
export function processDCResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f) => {
    const inspections = (f.allInspections || []).map((insp, i) => ({
      serial: `dc-${f.permit_id}-${insp.inspection_id || i}`,
      date: insp.date || "",
      score: insp.score ?? null,
      result: insp.result || "",
      type: insp.type || "Routine",
      priority_violations: insp.priority_violations || 0,
      priority_foundation_violations: insp.priority_foundation_violations || 0,
      core_violations: insp.core_violations || 0,
      report_url: insp.report_url || "",
    }));
    inspections.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const latest = inspections[0] || {};
    return {
      business_id: f.business_id,
      name: f.name,
      address: f.address,
      city: f.city || "Washington",
      zip_code: f.zip_code || "",
      phone: "", description: f.facility_type || "",
      safetyScore: f.safetyScore ?? null,
      grade: f.safetyScore !== null ? resolveGrade(f.safetyScore, f.latestResult || "") : "U",
      totalInspections: f.totalInspections || inspections.length,
      latestDate: f.latestDate || latest.date || "",
      latestResult: f.latestResult || latest.result || "",
      latitude: null, longitude: null,
      isLLMData: false, source: "dc",
      ada_compliance: "unknown",
      portal_url: f.portal_url || null,
      _inspections: inspections,
    };
  });
}

export function dcToDetailRows(restaurant) {
  const inspections = restaurant._inspections || restaurant.allInspections || [];
  if (inspections.length === 0) {
    return [{
      inspection_serial_num: `dc-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: restaurant.safetyScore !== null ? String(Math.max(0, 100 - restaurant.safetyScore)) : "",
      inspection_result: restaurant.latestResult || "Unknown",
      inspection_type: "Routine",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    }];
  }
  return inspections.map((insp, i) => {
    const priority = insp.priority_violations || 0;
    const foundation = insp.priority_foundation_violations || 0;
    const core = insp.core_violations || 0;
    const hasData = insp.score !== null && insp.score !== undefined;
    return {
      inspection_serial_num: insp.serial || `dc-${restaurant.business_id}-${i}`,
      inspection_date: insp.date || "",
      inspection_score: hasData ? String(Math.max(0, 100 - insp.score)) : "",
      inspection_result: insp.result || (hasData ? "Pass" : "Unknown"),
      inspection_type: insp.type || "Routine",
      violation_description: hasData
        ? priority + foundation + core === 0
          ? "No violations found"
          : `${priority} priority, ${foundation} priority foundation, ${core} core violation(s)`
        : "",
      violation_type: priority > 0 ? "RED" : "BLUE",
      violation_points: hasData ? String(priority * 7 + foundation * 4 + Math.round(core * 1.5)) : "0",
    };
  });
}