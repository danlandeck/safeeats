import { resolveGrade } from "../grading";
import { extractDate } from "../date";

// ── Baton Rouge, LA (East Baton Rouge Parish) — Socrata Open Data ────────────
// Dataset: data.brla.gov/resource/ux2t-b9wr (Retail Food Inspections)
// Each row = one violation from one inspection. Group by permitid → establishment,
// then by inspectiondate → inspection. Score: critical=7pts, non-critical=2pts.
// safetyScore = 100 - penalty (clamped 0-100).
// Address format: "STREET \nCITY, STATE ZIP"
// Geo: geocoded_column.coordinates = [lng, lat]

function parseBRLAAddress(addrFull) {
  if (!addrFull) return { address: "", city: "", state: "LA", zip_code: "" };
  const parts = addrFull.split(/\n/).map(s => s.trim()).filter(Boolean);
  const address = parts[0] || "";
  const cityStateZip = parts[1] || "";
  const cityMatch = cityStateZip.match(/^([A-Za-z .]+?)(?:,\s*([A-Z]{2}))?\s+(\d{5}(?:-\d{4})?)?$/);
  return {
    address,
    city: cityMatch ? cityMatch[1].trim() : cityStateZip.split(",")[0] || "Baton Rouge",
    state: "LA",
    zip_code: cityMatch?.[3] || "",
  };
}

export function processBRLAResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};
  data.forEach((row) => {
    const id = row.permitid;
    if (!id) return;
    if (!businesses[id]) {
      const addr = parseBRLAAddress(row.address_full_core);
      const coords = row.geocoded_column?.coordinates;
      businesses[id] = {
        business_id: id,
        name: (row.permitname || "").trim(),
        address: addr.address,
        city: addr.city,
        state: addr.state,
        zip_code: addr.zip_code,
        phone: "", description: "",
        inspections: {}, allRows: [],
        latitude: coords ? coords[1] : null,
        longitude: coords ? coords[0] : null,
      };
    }
    businesses[id].allRows.push(row);
    const dateKey = extractDate(row.inspectiondate || "");
    if (dateKey && !businesses[id].inspections[dateKey]) {
      businesses[id].inspections[dateKey] = {
        date: dateKey,
        purpose: row.inspectionpurpose || "Routine",
        critical: 0,
        nonCritical: 0,
        violations: [],
      };
    }
    if (dateKey && row.violation) {
      const insp = businesses[id].inspections[dateKey];
      if (row.iscritical) insp.critical++;
      else insp.nonCritical++;
      insp.violations.push({
        description: row.shortdesc || "",
        detail: row.violation_comments || "",
        isCritical: !!row.iscritical,
        type: row.violationtype || "",
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    const inspList = Object.values(biz.inspections).sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = inspList[0];
    const pts = (latest?.critical || 0) * 7 + (latest?.nonCritical || 0) * 2;
    const safetyScore = Math.max(0, Math.min(100, 100 - pts));
    const latestResult = latest?.critical > 0
      ? `${latest.critical} critical, ${latest.nonCritical} non-critical violation${latest.nonCritical !== 1 ? "s" : ""}`
      : latest?.nonCritical > 0
        ? `${latest.nonCritical} non-critical violation${latest.nonCritical !== 1 ? "s" : ""}`
        : "No violations found";
    return {
      ...biz, safetyScore,
      grade: resolveGrade(safetyScore, latestResult),
      totalInspections: inspList.length,
      latestDate: latest?.date || "",
      latestResult,
      isLLMData: false, source: "brla",
      ada_compliance: "unknown",
      _inspList: inspList,
    };
  });
}

export function brlaToDetailRows(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  // Group violations by inspection date
  const inspMap = {};
  data.forEach((row) => {
    const dateKey = extractDate(row.inspectiondate || "");
    if (!dateKey) return;
    if (!inspMap[dateKey]) {
      inspMap[dateKey] = {
        inspection_serial_num: `brla-${row.permitid}-${dateKey}`,
        inspection_date: dateKey,
        inspection_score: "0",
        inspection_result: "",
        inspection_type: row.inspectionpurpose || "Routine",
        critical: 0,
        nonCritical: 0,
        violations: [],
      };
    }
    if (row.violation) {
      if (row.iscritical) inspMap[dateKey].critical++;
      else inspMap[dateKey].nonCritical++;
      inspMap[dateKey].violations.push({
        description: row.shortdesc || "",
        detail: row.violation_comments || "",
        isCritical: !!row.iscritical,
        type: row.violationtype || "",
      });
    }
  });
  // Compute scores and build detail rows
  const rows = [];
  Object.values(inspMap)
    .sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date))
    .forEach((insp) => {
      const pts = insp.critical * 7 + insp.nonCritical * 2;
      insp.inspection_score = String(pts);
      insp.inspection_result = insp.critical > 0
        ? `${insp.critical} critical, ${insp.nonCritical} non-critical violation${insp.nonCritical !== 1 ? "s" : ""}`
        : insp.nonCritical > 0
          ? `${insp.nonCritical} non-critical violation${insp.nonCritical !== 1 ? "s" : ""}`
          : "No violations found";
      if (insp.violations.length === 0) {
        rows.push({
          inspection_serial_num: insp.inspection_serial_num,
          inspection_date: insp.inspection_date,
          inspection_score: insp.inspection_score,
          inspection_result: insp.inspection_result,
          inspection_type: insp.inspection_type,
          violation_description: "No violations found",
          violation_type: "BLUE",
          violation_points: "0",
        });
      } else {
        insp.violations.forEach((v) => {
          rows.push({
            inspection_serial_num: insp.inspection_serial_num,
            inspection_date: insp.inspection_date,
            inspection_score: insp.inspection_score,
            inspection_result: insp.inspection_result,
            inspection_type: insp.inspection_type,
            violation_description: v.detail ? `${v.description}: ${v.detail}` : v.description,
            violation_type: v.isCritical ? "RED" : "BLUE",
            violation_points: v.isCritical ? "7" : "2",
          });
        });
      }
    });
  return rows;
}