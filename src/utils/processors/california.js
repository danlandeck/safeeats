import { resolveGrade, getGrade } from "../grading";
import { standardizeDate, extractDate } from "../date";

// ── Los Angeles CA (ArcGIS Feature Service, 2023–present) ────────────────────
export function processLAResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.FACILITY_ID;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.FACILITY_NAME || "",
        address: row.FACILITY_ADDRESS || "",
        city: row.FACILITY_CITY || "Los Angeles",
        zip_code: row.FACILITY_ZIP || "",
        phone: "", description: "",
        inspections: [],
      };
    }
    const dateStr = standardizeDate(row.ACTIVITY_DATE);
    if (dateStr && !businesses[id].inspections.find((i) => i.date === dateStr)) {
      businesses[id].inspections.push({
        date: dateStr,
        score: row.SCORE ?? null,
        grade: row.GRADE || "U",
        type: row.SERVICE_DESCRIPTION || "",
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const score = latest?.score ?? null;
    const grade = latest?.grade || "U";
    return {
      ...biz, safetyScore: score, grade,
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: grade !== "U" ? `Grade ${grade}` : "Unknown",
      latitude: null, longitude: null, isLLMData: false, source: "la",
      ada_compliance: "unknown",
    };
  });
}

export function laToDetailRows(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const seen = new Set();
  const rows = [];
  data.forEach((row) => {
    const dateStr = standardizeDate(row.ACTIVITY_DATE) || "unknown";
    const serial = `la-${row.FACILITY_ID}-${dateStr}`;
    if (seen.has(serial)) return;
    seen.add(serial);
    const score = row.SCORE ?? 0;
    const grade = row.GRADE || "U";
    rows.push({
      inspection_serial_num: serial,
      inspection_date: dateStr,
      inspection_score: String(100 - score),
      inspection_result: grade !== "U" ? `Grade ${grade} (Score: ${score}/100)` : `Score: ${score}/100`,
      inspection_type: row.SERVICE_DESCRIPTION || "Routine Inspection",
      violation_description: "",
      violation_type: "",
      violation_points: "0",
    });
  });
  return rows;
}

// ── San Francisco CA ──────────────────────────────────────────────────────────
export function processSFResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.permit_number;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.dba || "",
        address: (row.street_address_clean || row.street_address || "").replace(/\s{2,}/g, " ").trim(),
        city: "San Francisco", zip_code: "", phone: "", description: row.permit_type || "",
        inspections: [], allRows: [],
        latitude: row.latitude || null, longitude: row.longitude || null,
      };
    }
    businesses[id].allRows.push(row);
    const dateKey = extractDate(row.inspection_date || "");
    if (dateKey && !businesses[id].inspections.find((i) => i.date === dateKey)) {
      const status = row.facility_rating_status || "";
      const violCount = parseInt(row.violation_count) || 0;
      businesses[id].inspections.push({ date: dateKey, status, violCount });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const status = latest?.status || "";
    const isClosed = /closure/i.test(status);
    const isConditional = /conditional/i.test(status);
    const violCount = latest?.violCount || 0;
    const pts = isClosed ? 80 : isConditional ? 35 + violCount * 3 : violCount * 3;
    const safetyScore = Math.max(0, Math.min(100, 100 - pts));
    const latestResult = isClosed ? "Closed" : isConditional ? "Conditional Pass" : "Pass";
    return {
      ...biz, safetyScore, grade: resolveGrade(safetyScore, latestResult),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult,
      isLLMData: false, source: "sf", ada_compliance: "unknown",
    };
  });
}

export function sfToDetailRows(data) {
  const inspMap = {};
  data.forEach((row) => {
    const dateKey = extractDate(row.inspection_date || "unknown");
    const status = row.facility_rating_status || "";
    const isClosed = /closure/i.test(status);
    const isConditional = /conditional/i.test(status);
    if (!inspMap[dateKey]) {
      const violCount = parseInt(row.violation_count) || 0;
      const pts = isClosed ? 80 : isConditional ? 35 : violCount * 3;
      inspMap[dateKey] = {
        inspection_serial_num: `sf-${row.permit_number}-${dateKey}`,
        inspection_date: dateKey,
        inspection_score: String(pts),
        inspection_result: isClosed ? "Closed" : isConditional ? "Conditional Pass" : "Pass",
        inspection_type: row.permit_type || "Routine Inspection",
        violations: [],
      };
    }
    const violCodes = (row.violation_codes || "").trim();
    if (violCodes) {
      const parts = violCodes.split(/(?<=\.),\s*(?=\d)/);
      parts.forEach((part) => {
        const trimmed = part.trim().replace(/^\d[\d,\s]*-\s*/, "").trim();
        if (trimmed && !inspMap[dateKey].violations.includes(trimmed)) {
          inspMap[dateKey].violations.push(trimmed);
        }
      });
    }
  });
  const rows = [];
  Object.values(inspMap).forEach((insp) => {
    const isCritical = /closed|conditional/i.test(insp.inspection_result);
    if (insp.violations.length === 0) {
      rows.push({ ...insp, violation_description: "", violation_type: "BLUE", violation_points: "0" });
    } else {
      insp.violations.forEach((v) => {
        rows.push({ ...insp, violation_description: v, violation_type: isCritical ? "RED" : "BLUE", violation_points: isCritical ? "5" : "2" });
      });
    }
  });
  return rows;
}

// ── Stanislaus County CA ────────────────────────────────────────────────────
export function processStanislausResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f, i) => {
    const isClosed = /closed/i.test(f.permit_status) || f.permit_status === "Closed";
    const safetyScore = isClosed ? 25 : 85;
    const latestDate = standardizeDate(f.latest_date || "");
    const name = (f.name || "").charAt(0) + (f.name || "").slice(1).toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase());
    const city = (f.city || "").charAt(0) + (f.city || "").slice(1).toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase());
    return {
      business_id: f.business_id ? `stanislaus-${f.business_id}` : `stanislaus-${i}-${f.name}`,
      name, address: f.address, city,
      zip_code: "", phone: "", description: f.inspection_type || "",
      safetyScore, grade: resolveGrade(safetyScore, isClosed ? "Closed" : "Open / Pass"),
      totalInspections: 1,
      latestDate,
      latestResult: isClosed ? "Closed" : "Open / Pass",
      latitude: null, longitude: null,
      isLLMData: false, source: "stanislaus",
      ada_compliance: "unknown",
      portal_url: f.portal_url || null,
      _rawFacility: f,
    };
  });
}

export function stanislausToDetailRows(restaurant) {
  const f = restaurant._rawFacility || {};
  const latestDate = standardizeDate(f.latest_date || "");
  const isClosed = /closed/i.test(f.permit_status);
  return [{
    inspection_serial_num: `stanislaus-${restaurant.business_id}`,
    inspection_date: latestDate,
    inspection_score: isClosed ? "75" : "15",
    inspection_result: isClosed ? "Closed" : "Open / Pass",
    inspection_type: f.inspection_type || "Routine",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}

// ── Riverside County, CA ──────────────────────────────────────────────────────
export function processRiversideResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f, i) => ({
    business_id: f.facility_id || `riverside-${i}-${f.name}`,
    name: f.name,
    address: f.address,
    city: f.city,
    zip_code: f.zip_code || "",
    phone: "", description: "",
    safetyScore: null,
    grade: "U",
    totalInspections: f.inspection_count || 0,
    latestDate: null,
    latestResult: "Open",
    latitude: null, longitude: null,
    isLLMData: false, source: "riverside",
    ada_compliance: "unknown",
    portal_url: f.portal_url || null,
    _rawFacility: f,
  }));
}

export function riversideToDetailRows(restaurant) {
  if (Array.isArray(restaurant.allInspections) && restaurant.allInspections.length > 0) {
    return restaurant.allInspections.map((insp, i) => ({
      inspection_serial_num: `riverside-${restaurant.business_id}-${i}`,
      inspection_date: insp.date || "",
      inspection_score: insp.score !== null && insp.score !== undefined
        ? String(Math.max(0, 100 - insp.score))
        : "",
      inspection_result: insp.result || "",
      inspection_type: insp.type || "Routine",
      violation_description: (insp.violations || []).map(v => v.description || v).join("; "),
      violation_type: "",
      violation_points: insp.violation_points || "0",
    }));
  }
  return [{
    inspection_serial_num: `riverside-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: "",
    inspection_result: restaurant.latestResult || "Open",
    inspection_type: "Routine",
    violation_description: "",
    violation_type: "",
    violation_points: "0",
  }];
}

// ── Tri-County Colorado (Adams, Arapahoe, Douglas) ──────────────────────────
function approxScoreFromViolations(riskViolations, goodRetailViolations) {
  const risk = parseInt(riskViolations) || 0;
  const grp = parseInt(goodRetailViolations) || 0;
  const approxRiskIndex = risk * 7 + Math.round(grp * 1.5);
  if (approxRiskIndex >= 110) return 20;
  if (approxRiskIndex >= 50) return 45;
  return Math.max(55, 95 - approxRiskIndex);
}

export function processTriCountyCoResults(data) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return [];
  const businesses = {};
  rows.forEach((row) => {
    const id = row.facility_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.program_identifier || "Unknown",
        address: row.site_address || "",
        city: (row.city || "").toUpperCase().charAt(0) + (row.city || "").slice(1).toLowerCase(),
        zip_code: (row.zip || "").split("-")[0],
        phone: "",
        description: row.description || "",
        county_id: "tri_county_co",
        source: "tri_county_co",
        inspections: [],
        allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const dateStr = standardizeDate(row.activity_date);
    const serial = row.serial_number || `${dateStr}-${row.service_desc}`;
    if (!businesses[id].inspections.find((i) => i.serial === serial)) {
      businesses[id].inspections.push({
        serial, date: dateStr,
        score: approxScoreFromViolations(row.total_foodborne_illness_risk, row.total_good_retail_practices),
        result: row.service_desc || "Routine",
        riskViolations: parseInt(row.total_foodborne_illness_risk) || 0,
        coreViolations: parseInt(row.total_good_retail_practices) || 0,
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const latest = biz.inspections[0] || {};
    const score = latest.score ?? null;
    return {
      ...biz,
      safetyScore: score,
      grade: score !== null ? resolveGrade(score) : "U",
      latestDate: latest.date || null,
      latestResult: latest.result || "",
      totalInspections: biz.inspections.length,
      latitude: biz.allRows[0]?.gis_latitude ? parseFloat(biz.allRows[0].gis_latitude) : null,
      longitude: biz.allRows[0]?.gis_longitude ? parseFloat(biz.allRows[0].gis_longitude) : null,
    };
  });
}

export function triCountyCoToDetailRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const seen = new Set();
  const detailRows = [];
  rows.forEach((row) => {
    const serial = row.serial_number || `${row.activity_date}-${row.service_desc}`;
    if (seen.has(serial)) return;
    seen.add(serial);
    const risk = parseInt(row.total_foodborne_illness_risk) || 0;
    const core = parseInt(row.total_good_retail_practices) || 0;
    detailRows.push({
      inspection_serial_num: serial,
      inspection_date: standardizeDate(row.activity_date),
      inspection_score: String(approxScoreFromViolations(risk, core)),
      inspection_result: row.service_desc || "Routine",
      inspection_type: row.service_desc || "Routine",
      violation_description: risk > 0 || core > 0
        ? `${risk} foodborne illness risk violation(s), ${core} good retail practice violation(s)`
        : "No violations found",
      violation_type: risk > 0 ? "RED" : "BLUE",
      violation_points: String(risk + core),
    });
  });
  return detailRows;
}