import { resolveGrade } from "../grading";
import { standardizeDate } from "../date";

// ── Sacramento County, CA (live ArcGIS FeatureServer) ──────────────────────
// Official placard-based results; numeric scores are derived transparently
// from the county's own outcome vocabulary.
const SAC_SCORE = {
  "PASS": 95,
  "IN COMPLIANCE": 90,
  "REINSTATEMENT OF PERMIT FOLLOWING SUSPENSION": 80,
  "MINOR VIOLATIONS": 82,
  "CONDITIONAL PASS": 74,
  "CRITICAL VIOLATIONS": 55,
  "CLOSED": 30,
  "SUSPENSION OF PERMIT TO OPERATE": 25,
};

function groupSacramentoByFacility(data) {
  const businesses = {};
  (Array.isArray(data) ? data : []).forEach((row) => {
    const id = row.Facility_ID;
    if (!id) return;
    if (!businesses[id]) {
      const addr = row.Facility_Address || "";
      const cityMatch = addr.match(/,\s*([A-Za-z .]+?)\s+\d{5}/);
      businesses[id] = {
        business_id: id,
        name: row.Facility_Name || "",
        address: addr,
        city: cityMatch ? cityMatch[1].trim() : "Sacramento County",
        zip_code: "",
        phone: "",
        description: row.Description || "",
        inspections: {},
      };
    }
    const date = row.Inspection_Date;
    if (!date) return;
    if (!businesses[id].inspections[date]) {
      businesses[id].inspections[date] = { date, results: [], violations: [], type: row.Inspection_Type || "" };
    }
    const ins = businesses[id].inspections[date];
    const result = row.Inspection_Result || "";
    if (result && !ins.results.includes(result)) ins.results.push(result);
    if (row.Violation_Description && !ins.violations.includes(row.Violation_Description)) {
      ins.violations.push(row.Violation_Description);
    }
  });
  return businesses;
}

const sacWorstResult = (results) =>
  [...results].sort((a, b) => (SAC_SCORE[a] ?? 101) - (SAC_SCORE[b] ?? 101))[0] || null;

export function processSacramentoResults(data) {
  const businesses = groupSacramentoByFacility(data);
  return Object.values(businesses).map((biz) => {
    const inspections = Object.values(biz.inspections).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const latest = inspections[0] || {};
    const worst = sacWorstResult(latest.results || []);
    const safetyScore = worst !== null && SAC_SCORE[worst] !== undefined ? SAC_SCORE[worst] : null;
    const latestResult = worst || "Inspection on record";
    const { inspections: _insp, ...rest } = biz;
    return {
      ...rest,
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: inspections.length,
      latestDate: latest.date || null,
      latestResult,
      latitude: null, longitude: null,
      isLLMData: false, source: "sacramento",
      ada_compliance: "unknown",
      portal_url: "https://inspections.myhealthdepartment.com/sacramento/",
    };
  });
}

export function sacramentoToDetailRows(data) {
  const businesses = groupSacramentoByFacility(data);
  const rows = [];
  Object.values(businesses).forEach((biz) => {
    const inspections = Object.values(biz.inspections).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    inspections.forEach((ins, i) => {
      const worst = sacWorstResult(ins.results);
      const score = worst !== null && SAC_SCORE[worst] !== undefined ? SAC_SCORE[worst] : null;
      const type = ins.type ? ins.type.charAt(0) + ins.type.slice(1).toLowerCase() : "Routine Inspection";
      rows.push({
        inspection_serial_num: `sac-${biz.business_id}-${ins.date}-${i}`,
        inspection_date: ins.date || "",
        inspection_score: score !== null ? String(100 - score) : "",
        inspection_result: score !== null ? `${worst} (Score: ${score}/100)` : (worst || "Inspection on record"),
        inspection_type: type,
        violation_description: ins.violations.join("; "),
        violation_type: /CRITICAL|CLOSED|SUSPENSION/i.test(worst || "") ? "RED" : ins.violations.length ? "BLUE" : "",
        violation_points: String(ins.violations.length),
      });
    });
  });
  return rows;
}

// ── Marin County, CA (live Socrata feed, daily updates) ────────────────────
const MARIN_SCORE = { NOVIOL: 95, VIOLMINOR: 82, VIOLFOUND: 68, CASE: 45 };
const MARIN_PLACARD_TEXT = {
  GREEN: "Green placard (Pass)",
  YELLOW: "Yellow placard (Conditional Pass)",
  RED: "Red placard (Closed)",
};

function groupMarinByFacility(data) {
  const businesses = {};
  (Array.isArray(data) ? data : []).forEach((row) => {
    const id = row.business_id;
    if (!id) return;
    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: row.business_name || "",
        address: row.address || "",
        city: row.city || "Marin County",
        zip_code: row.zip || "",
        phone: "",
        description: row.inspection_type || "",
        latitude: row.latitude || null,
        longitude: row.longitude || null,
        inspections: {},
      };
    }
    const key = row.inspection_id || row.inspection_date;
    if (!key) return;
    if (!businesses[id].inspections[key]) {
      businesses[id].inspections[key] = {
        date: row.inspection_date,
        result: row.inspection_result || "",
        placard: row.placard || "",
        type: row.inspection_type || "Routine",
        violations: [],
      };
    }
    const ins = businesses[id].inspections[key];
    if (row.violation_description && !ins.violations.includes(row.violation_description)) {
      ins.violations.push(row.violation_description);
    }
  });
  return businesses;
}

export function processMarinResults(data) {
  const businesses = groupMarinByFacility(data);
  return Object.values(businesses).map((biz) => {
    const inspections = Object.values(biz.inspections).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const latest = inspections[0] || {};
    const safetyScore = MARIN_SCORE[latest.result] !== undefined ? MARIN_SCORE[latest.result] : null;
    const placardText = MARIN_PLACARD_TEXT[(latest.placard || "").toUpperCase()] || "";
    const latestResult = [
      placardText,
      latest.result === "NOVIOL" ? "No violations found" : latest.result || "",
    ].filter(Boolean).join(" — ") || "Inspection on record";
    const { inspections: _insp, ...rest } = biz;
    return {
      ...rest,
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: inspections.length,
      latestDate: latest.date || null,
      latestResult,
      isLLMData: false, source: "marin",
      ada_compliance: "unknown",
      portal_url: "https://data.marincounty.gov/Public-Health/Food-Facility-Inspections/73zb-z5me",
    };
  });
}

export function marinToDetailRows(data) {
  const businesses = groupMarinByFacility(data);
  const rows = [];
  Object.values(businesses).forEach((biz) => {
    const inspections = Object.values(biz.inspections).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    inspections.forEach((ins, i) => {
      const safetyScore = MARIN_SCORE[ins.result] !== undefined ? MARIN_SCORE[ins.result] : null;
      const placardText = MARIN_PLACARD_TEXT[(ins.placard || "").toUpperCase()] || ins.placard || "";
      const resultText = [
        placardText,
        ins.result === "NOVIOL" ? "No violations found" : ins.result,
      ].filter(Boolean).join(" — ") || "Inspection on record";
      rows.push({
        inspection_serial_num: `marin-${biz.business_id}-${ins.date}-${i}`,
        inspection_date: ins.date || "",
        inspection_score: safetyScore !== null ? String(100 - safetyScore) : "",
        inspection_result: resultText,
        inspection_type: ins.type || "Routine",
        violation_description: ins.violations.join("; "),
        violation_type: ins.placard === "RED" ? "RED" : ins.violations.length ? "BLUE" : "",
        violation_points: String(ins.violations.length),
      });
    });
  });
  return rows;
}

// ── Contra Costa County, CA (live EHD portal search) ───────────────────────
const CC_PLACARD_SCORE = { green: 95, yellow: 75, red: 35 };
const CC_PORTAL_URL = "https://hsdmobile.cchealth.org/ffinspectionsearch/InspectionSearch.aspx";

export function processContraCostaResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities.map((f) => {
    const t = String(f.placardTitle || "").toLowerCase();
    const placard = t.startsWith("green") ? "Green" : t.startsWith("yellow") ? "Yellow" : t.startsWith("red") ? "Red" : "Unknown";
    const safetyScore = CC_PLACARD_SCORE[placard.toLowerCase()] ?? null;
    const latestResult = placard !== "Unknown"
      ? `${placard} placard — ${f.placardTitle}`
      : "See official portal for status";
    return {
      business_id: `cc-${f.rowIndex}`,
      name: f.name || "",
      address: f.address || "",
      city: f.city || "",
      zip_code: "", phone: "",
      description: "Food facility",
      safetyScore,
      grade: safetyScore !== null ? resolveGrade(safetyScore, latestResult) : "U",
      totalInspections: 0,
      latestDate: null,
      latestResult,
      latitude: null, longitude: null,
      isLLMData: false, source: "contra_costa",
      ada_compliance: "unknown",
      portal_url: CC_PORTAL_URL,
    };
  });
}

export function contracostaToDetailRows(data) {
  const inspections = Array.isArray(data?.inspections) ? data.inspections : [];
  if (inspections.length === 0) return [];
  return inspections.map((ins, i) => {
    const dateStr = standardizeDate(ins.date) || ins.date || "";
    const description = String(ins.description || "").trim();
    return {
      inspection_serial_num: `cc-${dateStr}-${i}`,
      inspection_date: dateStr,
      inspection_score: "",
      inspection_result: description ? description.slice(0, 160) : "Inspection on record",
      inspection_type: (description.split(/[.,;:—-]/)[0] || "Inspection").trim(),
      violation_description: "",
      violation_type: /red|closed|suspend/i.test(String(data?.placardTitle || "")) ? "RED" : "",
      violation_points: "0",
    };
  });
}