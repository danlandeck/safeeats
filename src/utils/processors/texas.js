import { resolveGrade } from "../grading";
import { extractDate } from "../date";

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
    return { ...biz, safetyScore, grade: resolveGrade(safetyScore, latest?.result), totalInspections: biz.inspections.length, latestDate: latest?.date, latestResult: latest?.result, latitude: null, longitude: null, isLLMData: false, source: "austin", ada_compliance: "unknown" };
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
    const dateKey = extractDate(row.InspectionDate || "");
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
      ...biz, safetyScore, grade: resolveGrade(safetyScore, isPassing ? "Pass" : "Fail"),
      totalInspections: biz.inspections.length,
      latestDate: latest?.date || "",
      latestResult: isPassing ? "Pass" : "Fail",
      latitude: null, longitude: null, isLLMData: false, source: "houston", ada_compliance: "unknown",
    };
  });
}

export function houstonToDetailRows(records) {
  return records.map((row) => {
    const dateKey = extractDate(row.InspectionDate || "");
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