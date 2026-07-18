import { resolveGrade } from "../grading";
import { extractDate } from "../date";
import { buildDetailRowsFromMap } from "../detailRowBuilder";

// ── UK Food Standards Agency (FHRS) ──────────────────────────────────────────
function fhrsRatingToScore(est) {
  const rv = est.RatingValue;
  if (typeof rv === "string" && isNaN(parseInt(rv))) {
    if (/^pass/i.test(rv)) return 92;
    if (/improvement required/i.test(rv)) return 55;
    if (/awaiting/i.test(rv)) return null;
    return null;
  }
  const rating = parseInt(rv);
  if (isNaN(rating)) return null;
  const h = est.scores?.Hygiene ?? null;
  const s = est.scores?.Structural ?? null;
  const c = est.scores?.ConfidenceInManagement ?? null;
  if (h !== null && s !== null && c !== null) {
    const penalty = h + s + c;
    return Math.max(0, Math.min(100, Math.round(100 - (penalty / 80) * 100)));
  }
  const starToScore = { 5: 95, 4: 82, 3: 68, 2: 52, 1: 35, 0: 15 };
  return starToScore[rating] ?? null;
}

export function processUKFSAResults(establishments) {
  if (!Array.isArray(establishments) || establishments.length === 0) return [];
  return establishments.map((est, i) => {
    const safetyScore = fhrsRatingToScore(est);
    const addr = [est.AddressLine1, est.AddressLine2].filter(Boolean).join(", ");
    const city = est.AddressLine3 || est.AddressLine4 || est.LocalAuthorityName || "UK";
    const ratingValue = est.RatingValue;
    const ratingLabel = isNaN(parseInt(ratingValue))
      ? ratingValue
      : `${ratingValue}/5 stars`;
    return {
      business_id: `uk-${est.FHRSID}`,
      name: est.BusinessName,
      address: addr,
      city,
      zip_code: est.PostCode || "",
      phone: est.Phone || "",
      website: "",
      description: est.BusinessType || "",
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, ratingLabel) : "U",
      totalInspections: est.RatingDate ? 1 : 0,
      latestDate: est.RatingDate ? est.RatingDate.split("T")[0] : "",
      latestResult: ratingLabel,
      latitude: est.geocode?.latitude || null,
      longitude: est.geocode?.longitude || null,
      isLLMData: false,
      source: "uk_fsa",
      county_id: "uk_fsa",
      fhrsId: est.FHRSID,
      localAuthority: est.LocalAuthorityName || "",
      newRatingPending: est.NewRatingPending,
      schemeType: est.SchemeType,
      _scores: est.scores || null,
      ada_compliance: "unknown",
    };
  });
}

export function ukFSAToDetailRows(restaurant) {
  if (!restaurant.fhrsId) return [];
  const h = restaurant._scores?.Hygiene;
  const s = restaurant._scores?.Structural;
  const c = restaurant._scores?.ConfidenceInManagement;
  const violations = [];
  if (h > 0) violations.push({ violation_description: `Hygiene: ${h > 15 ? "Major improvement necessary" : h > 5 ? "Some improvement necessary" : "Generally satisfactory"}`, violation_type: h > 15 ? "RED" : "BLUE", violation_points: String(h) });
  if (s > 0) violations.push({ violation_description: `Structural: ${s > 15 ? "Major improvement necessary" : s > 5 ? "Some improvement necessary" : "Generally satisfactory"}`, violation_type: s > 15 ? "RED" : "BLUE", violation_points: String(s) });
  if (c > 0) violations.push({ violation_description: `Confidence in Management: ${c > 20 ? "Major improvement necessary" : c > 10 ? "Some improvement necessary" : "Generally satisfactory"}`, violation_type: c > 20 ? "RED" : "BLUE", violation_points: String(c) });

  const row = {
    inspection_serial_num: `uk-${restaurant.fhrsId}`,
    inspection_date: restaurant.latestDate,
    inspection_score: String(Math.max(0, 100 - (restaurant.safetyScore || 0))),
    inspection_result: restaurant.latestResult || "",
    inspection_type: "Food Hygiene Rating (FSA)",
  };

  if (violations.length === 0) {
    return [{ ...row, violation_description: "", violation_type: "", violation_points: "0" }];
  }
  return violations.map((v) => ({ ...row, ...v }));
}

// ── Toronto DineSafe (CKAN) ───────────────────────────────────────────────────
export function processTorontoResults(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row) => {
    const id = row.estId || row["Establishment ID"];
    if (!id) return;
    if (!businesses[id]) {
      const addrRaw = row.address || row["Establishment Address"] || "";
      const address = addrRaw.replace(/\bNone\b/g, "").replace(/,\s*$/, "").trim();
      businesses[id] = {
        business_id: id,
        name: (row.estName || row["Establishment Name"] || "").trim(),
        address, city: "Toronto", zip_code: "",
        phone: "", description: "",
        inspections: [], allRows: [],
        latitude: row.latitude || row.Latitude || null,
        longitude: row.longitude || row.Longitude || null,
      };
    }
    businesses[id].allRows.push(row);
    const dateKey = row.inspectionDate || row["Inspection Date"] || "";
    const status = row.inspectionStatus || "";
    if (dateKey && !businesses[id].inspections.find((i) => i.date === dateKey)) {
      businesses[id].inspections.push({ date: dateKey, status });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const closedCount = biz.allRows.filter(r => /closed/i.test(r.inspectionStatus || r.Action || "")).length;
    const conditionalCount = biz.allRows.filter(r => /conditional/i.test(r.inspectionStatus || r.Action || "")).length;
    const violationRows = biz.allRows.filter(r => (r.typeDesc || r["Infraction Details"] || "").trim() && !/^None$/i.test((r.typeDesc || "").trim()));
    const pts = closedCount * 20 + conditionalCount * 5 + Math.max(0, violationRows.length - conditionalCount) * 1;
    const safetyScore = Math.max(0, Math.min(100, 100 - pts));
    const latestStatus = latest?.status || "";
    const latestResult = /closed/i.test(latestStatus) ? "Closed" : /conditional/i.test(latestStatus) ? "Conditional Pass" : "Pass";
    return {
      ...biz, safetyScore, grade: resolveGrade(safetyScore, latestResult),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult,
      isLLMData: false, source: "toronto",
      ada_compliance: "unknown",
    };
  });
}

export function torontoToDetailRows(records) {
  const inspMap = {};
  records.forEach((row) => {
    const dateKey = row.inspectionDate || row["Inspection Date"] || "unknown";
    const status = row.inspectionStatus || row.Action || "";
    if (!inspMap[dateKey]) {
      const isConditional = /conditional/i.test(status);
      const isClosed = /closed/i.test(status);
      inspMap[dateKey] = {
        serial: `toronto-${dateKey}`,
        date: dateKey,
        score: isClosed ? "40" : isConditional ? "20" : "0",
        result: isClosed ? "Closed" : isConditional ? "Conditional Pass" : "Pass",
        type: "DineSafe Inspection",
        violations: [],
      };
    }
    const infraction = (row.typeDesc || row["Infraction Details"] || "").trim();
    if (infraction && !/^None$/i.test(infraction)) {
      const isConditional = /conditional/i.test(row.inspectionStatus || "");
      inspMap[dateKey].violations.push({ description: infraction, isConditional });
    }
  });
  return buildDetailRowsFromMap(inspMap);
}

// ── Singapore (data.gov.sg / SFA / NEA) ────────────────────────────────────────
export function processSingaporeResults(records, resourceId) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row, i) => {
    const name = row.businessname || row.name || row.establishment_name || row.trade_name || "";
    const address = row.address || row.premises_address || "";
    const id = row.id || row.establishment_id || row.licence_no || `sg-${i}-${name}`;
    if (!name) return;
    if (!businesses[id]) {
      businesses[id] = { business_id: String(id), name, address, city: "Singapore",
        zip_code: row.postal_code || row.postalcode || "", phone: "",
        description: row.business_type || row.category || "",
        grade: row.grade || row.hygiene_grade || row.food_hygiene_grade || "U",
        lastDate: row.last_inspected_date || row.inspection_date || "",
        _resourceId: resourceId || "",
      };
    }
  });
  return Object.values(businesses).map((biz) => {
    const gradeMap = { A: 95, B: 80, C: 60, D: 40, E: 20 };
    const gradeUpper = (biz.grade || "").toUpperCase();
    const safetyScore = gradeMap[gradeUpper] ?? null;
    return {
      ...biz, safetyScore,
      grade: safetyScore !== null ? gradeUpper : "U",
      totalInspections: 1,
      latestDate: biz.lastDate,
      latestResult: gradeUpper && gradeUpper !== "U" ? `Grade ${gradeUpper}` : "Unknown",
      latitude: null, longitude: null, isLLMData: false, source: "singapore",
      ada_compliance: "unknown",
    };
  });
}

export function singaporeToDetailRows(restaurant) {
  const gradeMap = { A: 5, B: 20, C: 40, D: 60, E: 80 };
  const grade = (restaurant.grade || "").toUpperCase();
  const pts = gradeMap[grade] ?? 0;
  return [{
    inspection_serial_num: `sg-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: String(pts),
    inspection_result: grade ? `Grade ${grade} — NEA/SFA Food Hygiene Rating` : "Unknown",
    inspection_type: "Food Hygiene Inspection (SFA/NEA)",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}

// ── Australia NSW (data.nsw.gov.au CKAN) ─────────────────────────────────────
export function processNSWResults(records, state = "NSW") {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row, i) => {
    const name = row.premises_name || row.businessname || row.name || row.trading_name || "";
    const address = row.address || row.premises_address || row.street_address || "";
    const suburb = row.suburb || row.city || row.locality || "";
    const id = row.id || row.premises_id || row.licence_no || `nsw-${i}-${name}`;
    if (!name) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: String(id), name, address,
        city: suburb || (state === "QLD" ? "Brisbane" : "Sydney"),
        zip_code: row.postcode || "", phone: "", description: row.food_business_type || row.category || "",
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const dateKey = extractDate(row.inspection_date || row.date || row.compliance_date || "");
    const result = row.result || row.outcome || row.compliance_status || "";
    if (dateKey && !businesses[id].inspections.find((insp) => insp.date === dateKey)) {
      const isFail = /fail|notice|order|prohibition/i.test(result);
      businesses[id].inspections.push({ date: dateKey, result, isFail });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const failCount = biz.inspections.filter((i) => i.isFail).length;
    const safetyScore = !latest ? null : latest.isFail ? 45 : failCount === 0 ? 88 : 72;
    const latestResult = latest?.result || "Unknown";
    return {
      ...biz, safetyScore, grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: biz.inspections.length,
      latestDate: latest?.date || "",
      latestResult,
      latitude: null, longitude: null, isLLMData: false,
      source: state === "QLD" ? "australia_qld" : "australia_nsw",
      ada_compliance: "unknown",
    };
  });
}

export function nswToDetailRows(restaurant) {
  return [{
    inspection_serial_num: `nsw-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: String(Math.max(0, 100 - (restaurant.safetyScore || 88))),
    inspection_result: restaurant.latestResult || "Pass",
    inspection_type: "NSW Food Authority Inspection",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}