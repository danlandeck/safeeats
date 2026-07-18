import { resolveGrade } from "../grading";
import { extractDate } from "../date";

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
      ...biz, safetyScore, grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
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
    const dateKey = extractDate(row.date || "");
    if (dateKey && !businesses[id].inspections.find((i) => i.serial === dateKey)) {
      const criticals = parseInt(row.total_critical_violations) || 0;
      const nonCriticals = parseInt(row.total_noncritical_violations) || 0;
      businesses[id].inspections.push({ serial: dateKey, date: dateKey, criticals, nonCriticals, type: row.inspection_type || "" });
    }
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
    const pts = c * 7 + nc * 2;
    const safetyScore = Math.max(0, Math.min(100, 100 - pts));
    return {
      ...biz, safetyScore, grade: resolveGrade(safetyScore, c === 0 && nc === 0 ? "Pass" : c > 0 ? `${c} critical violation${c !== 1 ? "s" : ""}` : "Violations Found"),
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
    const dateKey = extractDate(row.date || "unknown");
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