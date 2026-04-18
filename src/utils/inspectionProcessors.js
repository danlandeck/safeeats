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
  };
}

// ── Los Angeles CA ───────────────────────────────────────────────────────────
export function processLAResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.facility_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id, name: row.facility_name,
        address: row.facility_address || "", city: row.facility_city || "Los Angeles",
        zip_code: row.facility_zip || "", phone: "", description: row.pe_description || "",
        inspections: [], allRows: [],
      };
    }
    businesses[id].allRows.push(row);
    const serial = row.serial_number;
    if (serial && !businesses[id].inspections.find((i) => i.serial === serial)) {
      const score = parseInt(row.score) || 0; // LA score is 0-100 direct (higher=better)
      businesses[id].inspections.push({ serial, date: row.activity_date, score, result: row.grade || "", type: row.service_description || "" });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = latest?.score || 0; // already 0-100
    return {
      ...biz, safetyScore, grade: getGrade(safetyScore),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date, latestResult: latest?.result,
      latitude: null, longitude: null, isLLMData: false, source: "la",
    };
  });
}

export function laToDetailRows(data) {
  const inspMap = {};
  data.forEach((row) => {
    const serial = row.serial_number || `${row.activity_date}-${row.facility_id}`;
    if (!inspMap[serial]) {
      const score = parseInt(row.score) || 0;
      inspMap[serial] = {
        inspection_serial_num: serial,
        inspection_date: row.activity_date,
        inspection_score: String(100 - score), // convert to penalty points for display
        inspection_result: row.grade || "",
        inspection_type: row.service_description || "",
        violations: [],
      };
    }
  });
  return Object.values(inspMap).map((insp) => ({ ...insp, violation_description: "", violation_type: "", violation_points: "0" }));
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
    return { ...biz, safetyScore, grade: getGrade(safetyScore), totalInspections: biz.inspections.length, latestDate: latest?.date, latestResult: latest?.result, latitude: null, longitude: null, isLLMData: false, source: "austin" };
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
    const id = row.business_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = { business_id: id, name: row.business_name, address: row.business_address || "", city: row.business_city || "San Francisco", zip_code: row.business_zip || "", phone: "", description: "", inspections: [], allRows: [] };
    }
    businesses[id].allRows.push(row);
    const key = `${row.inspection_date}-${row.inspection_type || "routine"}`;
    if (!businesses[id].inspections.find((i) => i.serial === key)) {
      const score = parseInt(row.inspection_score) || 100;
      const pts = 100 - score;
      businesses[id].inspections.push({ serial: key, date: row.inspection_date, score: pts, result: score >= 90 ? "Pass" : score >= 70 ? "Conditional Pass" : "Fail" });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = biz.inspections[0];
    const safetyScore = Math.max(0, Math.min(100, 100 - (latest?.score || 0)));
    const rowWithCoords = biz.allRows.find((r) => r.business_latitude && r.business_longitude);
    return { ...biz, safetyScore, grade: getGrade(safetyScore), totalInspections: biz.inspections.length, latestDate: latest?.date, latestResult: latest?.result, latitude: rowWithCoords?.business_latitude, longitude: rowWithCoords?.business_longitude, isLLMData: false, source: "sf" };
  });
}

export function sfToDetailRows(data) {
  const inspMap = {};
  data.forEach((row) => {
    const key = `${row.inspection_date}-${row.inspection_type || "routine"}-${row.business_id}`;
    if (!inspMap[key]) {
      const score = parseInt(row.inspection_score) || 100;
      inspMap[key] = {
        inspection_serial_num: key,
        inspection_date: row.inspection_date,
        inspection_score: String(100 - score),
        inspection_result: score >= 90 ? "Pass" : score >= 70 ? "Conditional Pass" : "Fail",
        inspection_type: row.inspection_type || "",
        violations: [],
      };
    }
    if (row.violation_description) {
      inspMap[key].violations.push({
        violation_description: row.violation_description,
        violation_type: row.risk_category === "High Risk" ? "RED" : "BLUE",
        violation_points: row.risk_category === "High Risk" ? "5" : "2",
      });
    }
  });
  const rows = [];
  Object.values(inspMap).forEach((insp) => {
    if (insp.violations.length === 0) {
      rows.push({ ...insp, violation_description: "", violation_type: "", violation_points: "0" });
    } else {
      insp.violations.forEach((v) => rows.push({ ...insp, ...v }));
    }
  });
  return rows;
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