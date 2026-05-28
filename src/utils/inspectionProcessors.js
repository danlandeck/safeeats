import { getGrade } from "./grading";

// ── King County ──────────────────────────────────────────────────────────────
export function processKingCountyResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.business_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.name || row.inspection_business_name,
        address: row.address, city: row.city, zip_code: row.zip_code,
        phone: row.phone, description: row.description,
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const serial = row.inspection_serial_num;
    if (!businesses[id].inspections.find((i) => i.serial === serial)) {
      businesses[id].inspections.push({
        serial, date: row.inspection_date,
        score: parseInt(row.inspection_score) || 0,
        result: row.inspection_result,
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
    const rowWithCoords = biz.allRows.find((r) => r.latitude && r.longitude);
    return {
      ...biz, safetyScore, grade: safetyScore !== null ? getGrade(safetyScore) : "U",
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult,
      latitude: rowWithCoords?.latitude, longitude: rowWithCoords?.longitude,
      isLLMData: false, source: "king",
      ada_compliance: "unknown",
    };
  });
}

export function kingToDetailRows(data) {
  return data; // raw rows pass through as-is
}

// ── NYC ───────────────────────────────────────────────────────────────────────
export function processNYCResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.camis;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.dba || row.aka_name,
        address: `${row.building || ""} ${row.street || ""}`.trim(),
        city: row.boro ? row.boro.charAt(0) + row.boro.slice(1).toLowerCase() : "New York City",
        zip_code: row.zipcode, phone: row.phone,
        description: row.cuisine_description || "",
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const key = `${row.inspection_date}-${row.inspection_type}`;
    if (!businesses[id].inspections.find((i) => i.serial === key)) {
      businesses[id].inspections.push({
        serial: key, date: row.inspection_date,
        score: parseInt(row.score) || 0, result: row.action || "",
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
    const rowWithCoords = biz.allRows.find((r) => r.latitude && r.longitude);
    return {
      ...biz, safetyScore, grade: safetyScore !== null ? getGrade(safetyScore) : "U",
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult,
      latitude: rowWithCoords?.latitude, longitude: rowWithCoords?.longitude,
      isLLMData: false, source: "nyc",
      ada_compliance: "unknown",
    };
  });
}

export function nycToDetailRows(data) {
  return data.map((row) => ({
    inspection_serial_num: `${row.inspection_date}-${row.inspection_type}-${row.violation_code || Math.random()}`,
    inspection_date: row.inspection_date,
    inspection_score: String(row.score || 0),
    inspection_result: row.action || "",
    inspection_type: row.inspection_type || "",
    violation_description: row.violation_description || "",
    violation_type: row.critical_flag === "Critical" ? "RED" : "BLUE",
    violation_points: String(row.score || 0),
  }));
}

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
      ...biz, safetyScore, grade: getGrade(safetyScore),
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
      ...biz, safetyScore, grade: getGrade(safetyScore),
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

// ── LLM (AI-assisted) ────────────────────────────────────────────────────────
export function llmToDetailRows(restaurant) {
  const rows = [];
  // Only process inspections that have a real date
  (restaurant.allInspections || []).filter((insp) => insp.date).forEach((insp, inspIndex) => {
    const violations = insp.violations || [];
    const penaltyPts = String(insp.violation_points ?? Math.max(0, 100 - (insp.score || 0)));
    if (violations.length === 0) {
      rows.push({
        inspection_serial_num: `llm-${inspIndex}`,
        inspection_date: insp.date, inspection_score: penaltyPts,
        inspection_result: insp.result || "Unknown", inspection_type: insp.type || "Routine",
        violation_description: "", violation_type: "", violation_points: "0",
      });
    } else {
      violations.forEach((v) => {
        rows.push({
          inspection_serial_num: `llm-${inspIndex}`,
          inspection_date: insp.date, inspection_score: penaltyPts,
          inspection_result: insp.result || "Unknown", inspection_type: insp.type || "Routine",
          violation_description: typeof v === "string" ? v : v.description || "",
          violation_type: typeof v === "object" && v.severity === "critical" ? "RED" : "BLUE",
          violation_points: typeof v === "object" ? String(v.points || 0) : "0",
        });
      });
    }
  });
  return rows;
}

export function buildLLMRestaurant(r, index, countyId, countyCity, fallbackScore) {
  // Determine if we actually have a real score from the LLM
  const hasViolationPoints = r.total_violation_points !== undefined && r.total_violation_points !== null;
  const hasLatestScore = r.latest_score !== undefined && r.latest_score !== null && Number(r.latest_score) > 0;

  let safetyScore = null;
  if (hasViolationPoints) {
    safetyScore = Math.max(0, Math.min(100, 100 - Number(r.total_violation_points)));
  } else if (hasLatestScore) {
    safetyScore = Math.max(0, Math.min(100, Number(r.latest_score)));
    // Only use passing-result inference if we truly have zero score but a clear pass result
    const isPassing = r.latest_result && /pass|satisf|complian|approved|ok/i.test(r.latest_result);
    if (isPassing && safetyScore < 75) safetyScore = 85;
  }
  // If neither is present, safetyScore stays null → shows as "U" / Unknown

  const history = r.inspection_history?.length > 0
    ? r.inspection_history
    : (r.latest_date ? [{ date: r.latest_date, total_violation_points: r.total_violation_points, result: r.latest_result, violations: r.violations }] : []);

  const allInspections = history.map((h, hi) => {
    const pts = h.total_violation_points != null ? Number(h.total_violation_points) : (safetyScore !== null ? Math.max(0, 100 - safetyScore) : 0);
    return {
      date: h.date || "",
      score: Math.max(0, Math.min(100, 100 - pts)),
      result: h.result || "",
      type: "Routine",
      violation_points: pts,
      violations: (h.violations || (hi === 0 ? r.violations : []) || []).map((v) => ({ description: v, severity: "minor", points: 0 })),
    };
  });

  const totalInspections = r.total_inspections || allInspections.length;

  return {
    business_id: `${countyId}-${index}-${r.name}`,
    name: r.name, address: r.address || "", city: r.city || countyCity,
    zip_code: r.zip_code || "", phone: r.phone || "", website: "", description: "",
    safetyScore,
    grade: safetyScore !== null ? getGrade(safetyScore) : "U",
    totalInspections,
    latestDate: r.latest_date || "", latestResult: r.latest_result || "",
    latitude: null, longitude: null,
    isLLMData: true, source: "llm",
    allInspections, allRows: [],
    cuisine: r.cuisine || "",
    is_vegan_friendly: r.is_vegan_friendly || false,
    is_vegetarian_friendly: r.is_vegetarian_friendly || false,
    is_kosher: r.is_kosher || false,
    is_halal: r.is_halal || false,
    is_gluten_free_options: r.is_gluten_free_options || false,
    dietary_tags: r.dietary_tags || [],
    ada_compliance: r.ada_compliance || "unknown",
  };
}

// ── Los Angeles CA (ArcGIS Feature Service, 2023–present) ────────────────────
// Fields (uppercase): FACILITY_ID, FACILITY_NAME, FACILITY_ADDRESS, FACILITY_CITY,
// FACILITY_ZIP, SCORE (0-100, higher=better), GRADE (A/B/C), ACTIVITY_DATE (epoch ms)
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
    const dateMs = row.ACTIVITY_DATE;
    const dateStr = dateMs ? new Date(dateMs).toISOString().split("T")[0] : "";
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
    const dateMs = row.ACTIVITY_DATE;
    const dateStr = dateMs ? new Date(dateMs).toISOString().split("T")[0] : "unknown";
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

// ── Austin TX ────────────────────────────────────────────────────────────────
export function processAustinResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.facility_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = { business_id: id, name: row.restaurant_name, address: row.address || "", city: row.city || "Austin", zip_code: row.zip_code || row.zip || "", phone: "", description: row.process_description || "", inspections: [], allRows: [] };
    }
    businesses[id].allRows.push(row);
    const key = `${row.inspection_date}-${row.inspection_type}`;
    if (!businesses[id].inspections.find((i) => i.serial === key)) {
      const pts = parseInt(row.score) || 0;
      const result = pts === 0 ? "Pass" : pts <= 15 ? "Pass" : pts <= 30 ? "Pass w/ Conditions" : "Fail";
      businesses[id].inspections.push({ serial: key, date: row.inspection_date, score: pts, result });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = Math.max(0, Math.min(100, 100 - (latest?.score || 0)));
    return { ...biz, safetyScore, grade: getGrade(safetyScore), totalInspections: biz.inspections.length, latestDate: latest?.date, latestResult: latest?.result, latitude: null, longitude: null, isLLMData: false, source: "austin", ada_compliance: "unknown" };
  });
}

export function austinToDetailRows(data) {
  return data.map((row) => {
    const pts = parseInt(row.score) || 0;
    const result = pts === 0 ? "Pass" : pts <= 15 ? "Pass" : pts <= 30 ? "Pass w/ Conditions" : "Fail";
    return {
      inspection_serial_num: `${row.inspection_date}-${row.inspection_type}-${row.facility_id}`,
      inspection_date: row.inspection_date,
      inspection_score: String(pts),
      inspection_result: result,
      inspection_type: row.inspection_type || "",
      violation_description: row.violation_description || "",
      violation_type: "BLUE",
      violation_points: String(pts),
    };
  });
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
    const dateKey = (row.inspection_date || "").split("T")[0];
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
      ...biz, safetyScore, grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult,
      isLLMData: false, source: "sf", ada_compliance: "unknown",
    };
  });
}

export function sfToDetailRows(data) {
  const inspMap = {};
  data.forEach((row) => {
    const dateKey = (row.inspection_date || "unknown").split("T")[0];
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
    // violation_codes is a long string with codes and descriptions, e.g.
    // "114xxx, 114yyy - Description text., 114zzz - Other text."
    const violCodes = (row.violation_codes || "").trim();
    if (violCodes) {
      // Split on " - " separator into individual violation descriptions
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

// ── UK Food Standards Agency (FHRS) ──────────────────────────────────────────
// RatingValue: 0-5 (5=best). Scotland uses Pass/Improvement Required/Awaiting inspection.
// scores object: Hygiene (0=best,25=worst), Structural (0-25), ConfidenceInManagement (0-30)
// Total penalty = Hygiene + Structural + ConfidenceInManagement (max ~80)
// We convert to 0-100 safety score: 100 - (totalPenalty / 80 * 100), clamped.

function fhrsRatingToScore(est) {
  const rv = est.RatingValue;
  // Scotland/Wales use Pass/Improvement Required etc — map directly
  if (typeof rv === "string" && isNaN(parseInt(rv))) {
    if (/^pass/i.test(rv)) return 92;
    if (/improvement required/i.test(rv)) return 55;
    if (/awaiting/i.test(rv)) return null;
    return null;
  }
  const rating = parseInt(rv);
  if (isNaN(rating)) return null;
  // Use component scores if available (more precise)
  const h = est.scores?.Hygiene ?? null;
  const s = est.scores?.Structural ?? null;
  const c = est.scores?.ConfidenceInManagement ?? null;
  if (h !== null && s !== null && c !== null) {
    const penalty = h + s + c; // max ~80
    return Math.max(0, Math.min(100, Math.round(100 - (penalty / 80) * 100)));
  }
  // Fallback: map 0-5 star rating
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
      grade: safetyScore !== null ? getGrade(safetyScore) : "U",
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
      ada_compliance: "unknown",
    };
  });
}

export function ukFSAToDetailRows(restaurant) {
  if (!restaurant.fhrsId) return [];
  // Build a synthetic inspection row from the data we have
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

// ── Delaware ─────────────────────────────────────────────────────────────────
export function processDelawareResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const key = `${(row.restname || "").trim()}-${(row.restaddress || "").trim()}`;
    if (!key || key === "-") return;
    if (!businesses[key]) {
      businesses[key] = {
        business_id: key,
        name: (row.restname || "").trim(),
        address: (row.restaddress || "").trim(),
        city: (row.restcity || "").trim(),
        zip_code: (row.restzip || "").trim(),
        phone: "", description: "",
        inspections: [], allRows: [],
      };
    }
    businesses[key].allRows.push(row);
    const dateKey = `${row.insp_date}-${row.insp_type}`;
    if (!businesses[key].inspections.find((i) => i.serial === dateKey)) {
      businesses[key].inspections.push({
        serial: dateKey,
        date: row.insp_date ? row.insp_date.split("T")[0] : "",
        violation: row.violation || "",
        type: row.insp_type || "",
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Group by inspection date to count violations per inspection
    const inspGroups = {};
    biz.allRows.forEach((r) => {
      const dk = `${r.insp_date}-${r.insp_type}`;
      if (!inspGroups[dk]) inspGroups[dk] = { date: r.insp_date ? r.insp_date.split("T")[0] : "", violations: 0 };
      if (r.violation && r.violation.trim()) inspGroups[dk].violations++;
    });
    const groups = Object.values(inspGroups).sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = groups[0];
    const violationCount = latest?.violations || 0;
    const safetyScore = violationCount === 0 ? 95 : violationCount <= 2 ? 80 : violationCount <= 5 ? 65 : violationCount <= 10 ? 50 : 30;
    return {
      ...biz, safetyScore, grade: getGrade(safetyScore),
      totalInspections: groups.length,
      latestDate: latest?.date,
      latestResult: violationCount === 0 ? "Pass" : "Violations Found",
      latitude: null, longitude: null, isLLMData: false, source: "delaware",
      ada_compliance: "unknown",
    };
  });
}

export function delawareToDetailRows(data) {
  const inspMap = {};
  data.forEach((row) => {
    const dateKey = `${row.insp_date}-${row.insp_type}`;
    const date = row.insp_date ? row.insp_date.split("T")[0] : "";
    if (!inspMap[dateKey]) {
      inspMap[dateKey] = { date, type: row.insp_type || "", violations: [] };
    }
    if (row.violation && row.violation.trim()) {
      inspMap[dateKey].violations.push(row.violation.trim());
    }
  });
  const rows = [];
  Object.entries(inspMap).forEach(([key, insp]) => {
    const violCount = insp.violations.length;
    const score = violCount === 0 ? 95 : violCount <= 2 ? 80 : violCount <= 5 ? 65 : 50;
    if (insp.violations.length === 0) {
      rows.push({ inspection_serial_num: key, inspection_date: insp.date, inspection_score: "0", inspection_result: "Pass", inspection_type: insp.type, violation_description: "", violation_type: "", violation_points: "0" });
    } else {
      insp.violations.forEach((v) => {
        rows.push({ inspection_serial_num: key, inspection_date: insp.date, inspection_score: String(100 - score), inspection_result: "Violations Found", inspection_type: insp.type, violation_description: v, violation_type: "BLUE", violation_points: "0" });
      });
    }
  });
  return rows;
}

// ── New York State ────────────────────────────────────────────────────────────
export function processNYStateResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.nys_health_operation_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: (row.facility || row.operation_name || "").trim(),
        address: (row.facility_address || row.address || "").trim(),
        city: (row.city || row.municipality || "").trim(),
        zip_code: (row.zip_code || "").trim(),
        phone: "", description: (row.description || "").trim(),
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const dateKey = row.date ? row.date.split("T")[0] : "";
    if (dateKey && !businesses[id].inspections.find((i) => i.serial === dateKey)) {
      const criticals = parseInt(row.total_critical_violations) || 0;
      const nonCriticals = parseInt(row.total_noncritical_violations) || 0;
      businesses[id].inspections.push({ serial: dateKey, date: dateKey, criticals, nonCriticals, type: row.inspection_type || "" });
    }
    // Update coords if available
    if (row.location1?.latitude && !businesses[id].latitude) {
      businesses[id].latitude = row.location1.latitude;
      businesses[id].longitude = row.location1.longitude;
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const c = latest?.criticals || 0;
    const nc = latest?.nonCriticals || 0;
    const pts = c * 7 + nc * 2; // weight criticals more
    const safetyScore = Math.max(0, Math.min(100, 100 - pts));
    return {
      ...biz, safetyScore, grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date,
      latestResult: c === 0 && nc === 0 ? "Pass" : c > 0 ? `${c} critical violation${c !== 1 ? "s" : ""}` : "Violations Found",
      isLLMData: false, source: "ny_state",
      ada_compliance: "unknown",
    };
  });
}

export function nyStateToDetailRows(data) {
  const inspMap = {};
  data.forEach((row) => {
    const dateKey = row.date ? row.date.split("T")[0] : "unknown";
    if (!inspMap[dateKey]) {
      const c = parseInt(row.total_critical_violations) || 0;
      const nc = parseInt(row.total_noncritical_violations) || 0;
      const pts = c * 7 + nc * 2;
      inspMap[dateKey] = {
        inspection_serial_num: dateKey,
        inspection_date: dateKey,
        inspection_score: String(pts),
        inspection_result: c === 0 && nc === 0 ? "Pass" : `${c} critical, ${nc} non-critical violations`,
        inspection_type: row.inspection_type || "",
        violations: (row.violations || "").split(";").map((v) => v.trim()).filter(Boolean),
      };
    }
  });
  const rows = [];
  Object.values(inspMap).forEach((insp) => {
    if (insp.violations.length === 0) {
      rows.push({ ...insp, violation_description: "", violation_type: "", violation_points: "0" });
    } else {
      insp.violations.forEach((v) => {
        rows.push({ ...insp, violation_description: v, violation_type: "BLUE", violation_points: "0" });
      });
    }
  });
  return rows;
}

// ── Toronto DineSafe (CKAN) ───────────────────────────────────────────────────
export function processTorontoResults(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row) => {
    // New schema uses camelCase fields (estId, estName, address, inspectionDate, etc.)
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
      ...biz, safetyScore, grade: getGrade(safetyScore),
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
    // Support both old and new schema
    const dateKey = row.inspectionDate || row["Inspection Date"] || "unknown";
    const status = row.inspectionStatus || row.Action || "";
    if (!inspMap[dateKey]) {
      const isConditional = /conditional/i.test(status);
      const isClosed = /closed/i.test(status);
      inspMap[dateKey] = {
        inspection_serial_num: `toronto-${dateKey}`,
        inspection_date: dateKey,
        inspection_score: isClosed ? "40" : isConditional ? "20" : "0",
        inspection_result: isClosed ? "Closed" : isConditional ? "Conditional Pass" : "Pass",
        inspection_type: "DineSafe Inspection",
        violations: [],
      };
    }
    const infraction = (row.typeDesc || row["Infraction Details"] || "").trim();
    if (infraction && !/^None$/i.test(infraction)) {
      const isConditional = /conditional/i.test(row.inspectionStatus || "");
      inspMap[dateKey].violations.push({ description: infraction, isConditional });
    }
  });
  const rows = [];
  Object.values(inspMap).forEach((insp) => {
    if (insp.violations.length === 0) {
      rows.push({ ...insp, violation_description: "", violation_type: "BLUE", violation_points: "0" });
    } else {
      insp.violations.forEach((v) => {
        rows.push({ ...insp, violation_description: v.description, violation_type: v.isConditional ? "RED" : "BLUE", violation_points: v.isConditional ? "10" : "2" });
      });
    }
  });
  return rows;
}

// ── Boston (CKAN) ───────────────────────────────────────────────────────────────
export function processBostonResults(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row) => {
    const id = row.licenseno;
    if (!id) return;
    if (!businesses[id]) {
      const locMatch = (row.location || "").match(/\(([\-\d.]+),\s*([\-\d.]+)\)/);
      businesses[id] = {
        business_id: id,
        name: row.dbaname || row.businessname || "",
        address: row.address || "",
        city: row.city ? row.city.charAt(0) + row.city.slice(1).toLowerCase() : "Boston",
        zip_code: row.zip || "",
        phone: "", description: row.descript || "",
        inspections: {}, allRows: [],
        latitude: locMatch ? locMatch[1] : null,
        longitude: locMatch ? locMatch[2] : null,
      };
    }
    businesses[id].allRows.push(row);
    // Group violations by inspection date
    const rawDate = (row.resultdttm || "");
    const dateKey = rawDate.split("T")[0] || rawDate.split(" ")[0] || "";
    if (dateKey) {
      if (!businesses[id].inspections[dateKey]) {
        const resultRaw = row.result || "";
        businesses[id].inspections[dateKey] = {
          result: resultRaw === "HE_Pass" ? "Pass" : resultRaw === "HE_Fail" ? "Fail" : resultRaw === "HE_Filed" ? "Violations Filed" : resultRaw,
          critical: 0, minor: 0,
        };
      }
      if (row.violdesc && row.violdesc.trim()) {
        if ((row.viol_level || "") === "**") businesses[id].inspections[dateKey].critical++;
        else businesses[id].inspections[dateKey].minor++;
      }
    }
  });
  return Object.values(businesses).map((biz) => {
    const inspList = Object.entries(biz.inspections)
      .map(([date, insp]) => ({ date, ...insp }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = inspList[0];
    const pts = (latest?.critical || 0) * 8 + (latest?.minor || 0) * 2;
    const safetyScore = Math.max(0, Math.min(100, 100 - pts));
    return {
      ...biz, safetyScore, grade: getGrade(safetyScore),
      totalInspections: inspList.length,
      latestDate: latest?.date || "",
      latestResult: latest?.result || "Unknown",
      isLLMData: false, source: "boston", ada_compliance: "unknown",
    };
  });
}

export function bostonToDetailRows(records) {
  const inspMap = {};
  records.forEach((row) => {
    const rawDate = (row.resultdttm || "");
    const dateKey = rawDate.split("T")[0] || rawDate.split(" ")[0] || "unknown";
    if (!inspMap[dateKey]) {
      const resultRaw = row.result || "";
      inspMap[dateKey] = {
        inspection_serial_num: `boston-${row.licenseno}-${dateKey}`,
        inspection_date: dateKey,
        inspection_score: "0",
        inspection_result: resultRaw === "HE_Pass" ? "Pass" : resultRaw === "HE_Fail" ? "Fail" : resultRaw === "HE_Filed" ? "Violations Filed" : resultRaw,
        inspection_type: row.descript || "Routine",
        violations: [],
      };
    }
    if (row.violdesc && row.violdesc.trim()) {
      inspMap[dateKey].violations.push({
        description: row.comments ? `${row.violdesc.trim()}: ${row.comments}` : row.violdesc.trim(),
        level: row.viol_level || "",
      });
    }
  });
  const rows = [];
  Object.values(inspMap).forEach((insp) => {
    const criticals = insp.violations.filter((v) => v.level === "**").length;
    const minors = insp.violations.filter((v) => v.level !== "**").length;
    insp.inspection_score = String(criticals * 8 + minors * 2);
    if (insp.violations.length === 0) {
      rows.push({ ...insp, violation_description: "", violation_type: "", violation_points: "0" });
    } else {
      insp.violations.forEach((v) => {
        rows.push({ ...insp, violation_description: v.description, violation_type: v.level === "**" ? "RED" : "BLUE", violation_points: v.level === "**" ? "8" : "2" });
      });
    }
  });
  return rows;
}

// ── Houston (CKAN) ───────────────────────────────────────────────────────────────
export function processHoustonResults(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const businesses = {};
  records.forEach((row) => {
    const id = row.FacilityAccountNumber;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.FacilityName || "",
        address: row.FacilityFullStreetAddress || "",
        city: row.FacilityCity ? row.FacilityCity.charAt(0) + row.FacilityCity.slice(1).toLowerCase() : "Houston",
        zip_code: row.FacilityZip || "",
        phone: row.FacilityPhone || "",
        description: row.EstablishmentType || "",
        cuisine: row.Cuisine ? row.Cuisine.split(", ")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "",
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const dateKey = (row.InspectionDate || "").split(" ")[0];
    const uid = row.InspectionUID || dateKey;
    if (uid && !businesses[id].inspections.find((i) => i.serial === uid)) {
      businesses[id].inspections.push({
        serial: uid, date: dateKey,
        score: parseInt(row.InspectionScore) || 0,
        status: row.InspectionStatus || "",
        type: row.InspectionType || "",
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const pts = latest?.score || 0;
    const safetyScore = Math.max(0, Math.min(100, 100 - pts * 4));
    const isPassing = /pass/i.test(latest?.status || "");
    return {
      ...biz, safetyScore, grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date || "",
      latestResult: isPassing ? "Pass" : "Fail",
      latitude: null, longitude: null, isLLMData: false, source: "houston", ada_compliance: "unknown",
    };
  });
}

export function houstonToDetailRows(records) {
  return records.map((row) => {
    const dateKey = (row.InspectionDate || "").split(" ")[0];
    const pts = parseInt(row.InspectionScore) || 0;
    const isPassing = /pass/i.test(row.InspectionStatus || "");
    return {
      inspection_serial_num: row.InspectionUID || `houston-${dateKey}`,
      inspection_date: dateKey,
      inspection_score: String(pts),
      inspection_result: isPassing ? "Pass" : "Fail",
      inspection_type: row.InspectionType || "",
      violation_description: row.InspectionComments || "",
      violation_type: isPassing ? "BLUE" : "RED",
      violation_points: String(pts),
    };
  });
}

// ── Stanislaus County CA ────────────────────────────────────────────────────
export function processStanislausResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f, i) => {
    const isClosed = /closed/i.test(f.permit_status);
    const safetyScore = isClosed ? 25 : 85;
    // Parse MM/DD/YYYY date to ISO
    let latestDate = f.latest_date || "";
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(latestDate)) {
      const [mm, dd, yyyy] = latestDate.split("/");
      latestDate = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    }
    return {
      business_id: `stanislaus-${i}-${f.name}`,
      name: f.name.charAt(0) + f.name.slice(1).toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase()),
      address: f.address,
      city: f.city.charAt(0) + f.city.slice(1).toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase()),
      zip_code: "", phone: "", description: f.inspection_type || "",
      safetyScore, grade: getGrade(safetyScore),
      totalInspections: 1,
      latestDate,
      latestResult: isClosed ? "Closed" : "Open / Pass",
      latitude: null, longitude: null,
      isLLMData: false, source: "stanislaus",
      ada_compliance: "unknown",
      _rawFacility: f,
    };
  });
}

export function stanislausToDetailRows(restaurant) {
  const f = restaurant._rawFacility || {};
  let latestDate = f.latest_date || "";
  if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(latestDate)) {
    const [mm, dd, yyyy] = latestDate.split("/");
    latestDate = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }
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

// ── Reverse Geocoding ─────────────────────────────────────────────────────────
// Given lat/lng, returns { city, county, state, country } using Nominatim
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
    const data = await res.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.suburb || "",
      county: addr.county || "",
      state: addr.state || "",
      country: addr.country || "",
      countryCode: (addr.country_code || "").toUpperCase(),
      displayName: data.display_name || "",
    };
  } catch {
    return null;
  }
}

// ── Geocoding ─────────────────────────────────────────────────────────────────
// Works globally — stateOrCountry can be a US state abbr, country name, or city
export async function geocodeAddress(address, city, stateOrCountry) {
  // Build the most specific query we can, filtering out empty parts
  const parts = [address, city, stateOrCountry].filter(Boolean);
  const q = parts.join(", ");
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
  const data = await res.json();
  if (data.length > 0) return { latitude: data[0].lat, longitude: data[0].lon };
  // Fallback: try just city + country
  if (city && stateOrCountry) {
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${city}, ${stateOrCountry}`)}&format=json&limit=1`;
    const fallbackRes = await fetch(fallbackUrl, { headers: { "User-Agent": "SafeEats/1.0" } });
    const fallbackData = await fallbackRes.json();
    if (fallbackData.length > 0) return { latitude: fallbackData[0].lat, longitude: fallbackData[0].lon };
  }
  return null;
}