import { resolveGrade } from "../grading";
import { extractDate } from "../date";
import { buildDetailRowsFromMap } from "../detailRowBuilder";

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
        date: extractDate(row.insp_date || ""),
        violation: row.violation || "",
        type: row.insp_type || "",
      });
    }
  });
  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
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
      ...biz, safetyScore, grade: resolveGrade(safetyScore, violationCount === 0 ? "Pass" : "Violations Found"),
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
    const date = extractDate(row.insp_date || "");
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
    const dateKey = extractDate(row.resultdttm || "");
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
      ...biz, safetyScore, grade: resolveGrade(safetyScore, latest?.result || "Unknown"),
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
    const dateKey = extractDate(row.resultdttm || "") || "unknown";
    if (!inspMap[dateKey]) {
      const resultRaw = row.result || "";
      inspMap[dateKey] = {
        serial: `boston-${row.licenseno}-${dateKey}`,
        date: dateKey,
        score: "0",
        result: resultRaw === "HE_Pass" ? "Pass" : resultRaw === "HE_Fail" ? "Fail" : resultRaw === "HE_Filed" ? "Violations Filed" : resultRaw,
        type: row.descript || "Routine",
        violations: [],
      };
    }
    if (row.violdesc && row.violdesc.trim()) {
      const isCritical = (row.viol_level || "") === "**";
      inspMap[dateKey].violations.push({
        description: row.comments ? `${row.violdesc.trim()}: ${row.comments}` : row.violdesc.trim(),
        isCritical,
        points: isCritical ? "8" : "2",
        type: isCritical ? "RED" : "BLUE",
      });
    }
  });
  Object.values(inspMap).forEach((insp) => {
    const criticals = insp.violations.filter((v) => v.isCritical).length;
    const minors = insp.violations.filter((v) => !v.isCritical).length;
    insp.score = String(criticals * 8 + minors * 2);
  });
  return buildDetailRowsFromMap(inspMap);
}