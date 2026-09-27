import { resolveGrade } from "../grading";

// ── Montgomery County MD ──────────────────────────────────────────────────────
// Source: data.montgomerycountymd.gov dkrp-gr48
//   "HHS - Food Inspection Data from July 2024 and onward"
// Replaces 5pue-gfbe, whose newest record is 2024-10-03.
//
// Three properties of this dataset that are easy to get wrong:
//
//  1. Violations read "Not In Compliance", NOT "Out of Compliance" as in the
//     old dataset. Matching the old string counts zero violations for every
//     restaurant and grades all of them as clean.
//
//  2. status "Closed" / "Closed With Complaint" means the inspection RECORD was
//     closed, not that the restaurant was shut down. Sampled rows carry zero
//     violations and are routine Annual / Comprehensive visits. grading.js
//     treats any result containing "closed" as a failure, so these statuses are
//     translated to a neutral "Complete" before grading. (~23,000 rows.)
//
//  3. Upstream repeats every inspection ~300 times. The registry entry uses
//     $group to dedupe server-side; the per-inspection serial check below is a
//     second guard.
//
// Scoring keeps the previous scale (0/1/2/3+ uncorrected violations -> 5/18/30/45
// points deducted) so Montgomery grades stay comparable across the switch.
// "Corrected Onsite" items are not deducted but are listed in the detail view.

const MONTGOMERY_CATEGORIES = {
  food_from_approved_source: "Food from approved source",
  food_protected_from_contamination: "Food protected from contamination",
  workers_restricted: "Ill workers restricted",
  proper_hand_washing: "Proper hand washing",
  cooling_time_and_temperature: "Cooling time and temperature",
  cold_holding_temperature: "Cold holding temperature",
  hot_holding_temperature: "Hot holding temperature",
  cooking_time_and_temperature: "Cooking time and temperature",
  reheating_time_and_temperature: "Reheating time and temperature",
  hot_and_cold_running_water_provided: "Hot and cold running water provided",
  proper_sewage_disposal: "Proper sewage disposal",
  toxic_substances_and_pesticides: "Toxic substances and pesticides",
  rodents_and_insects: "Rodents and insects",
};
const CATEGORY_KEYS = Object.keys(MONTGOMERY_CATEGORIES);

const isViolation = (v) => /^not in compliance/i.test(String(v || "").trim());
const isCorrected = (v) => /^corrected onsite/i.test(String(v || "").trim());
const isRepeat = (v) => /repeat violation/i.test(String(v || ""));

/** Translate upstream status into a result string grading.js reads correctly. */
function normalizeStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "pass") return "Pass";
  if (s === "fail") return "Fail";
  if (s === "closed" || s === "closed with complaint") return "Complete";
  return ""; // Incomplete, Cancelled, unknown: not a grading signal
}
const GRADEABLE = new Set(["Pass", "Fail", "Complete"]);

const pointsFor = (uncorrected) =>
  uncorrected === 0 ? 5 : uncorrected === 1 ? 18 : uncorrected === 2 ? 30 : 45;

/** "SILVER SPRING" and "Silver Spring" both appear upstream. */
function titleCase(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inspectionKey(row) {
  return row.inspection_number || `${row.inspection_start_date}-${row.inspection_type}`;
}

export function processMontgomeryResults(data) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const businesses = {};

  data.forEach((row) => {
    const id = row.registration_number;
    const name = row.business_name;
    if (!id || !name) return;

    if (!businesses[id]) {
      businesses[id] = {
        business_id: id,
        name: String(name).trim(),
        address: String(row.address || "").trim(),
        city: titleCase(row.city),
        state: "MD",
        zip_code: String(row.zip || "").trim(),
        phone: "",
        description: row.business_type || "",
        inspections: [],
        allRows: [],
      };
    }
    const biz = businesses[id];
    biz.allRows.push(row);

    const serial = inspectionKey(row);
    if (biz.inspections.find((i) => i.serial === serial)) return;

    const uncorrected = CATEGORY_KEYS.filter((k) => isViolation(row[k])).length;
    biz.inspections.push({
      serial,
      date: row.inspection_start_date,
      type: row.inspection_type || "",
      score: pointsFor(uncorrected),
      result: normalizeStatus(row.status),
    });
  });

  return Object.values(businesses).map((biz) => {
    biz.inspections.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Grade from the newest inspection that actually produced a result; a
    // Cancelled or Incomplete visit should not define the restaurant's grade.
    const latest = biz.inspections.find((i) => GRADEABLE.has(i.result)) || biz.inspections[0];
    const gradeable = latest && GRADEABLE.has(latest.result);
    const safetyScore = gradeable ? Math.max(0, Math.min(100, 100 - latest.score)) : null;
    return {
      ...biz,
      safetyScore,
      grade: gradeable ? resolveGrade(safetyScore, latest.result) : "U",
      totalInspections: biz.inspections.length,
      latestDate: biz.inspections[0]?.date,
      latestResult: latest?.result || "",
      latitude: null,
      longitude: null,
      isLLMData: false,
      source: "montgomery",
      ada_compliance: "unknown",
    };
  });
}

export function montgomeryToDetailRows(data) {
  if (!Array.isArray(data)) return [];
  const rows = [];
  const seen = new Set();

  data.forEach((row) => {
    const serial = inspectionKey(row);
    if (seen.has(serial)) return;
    seen.add(serial);

    const uncorrected = CATEGORY_KEYS.filter((k) => isViolation(row[k]));
    const corrected = CATEGORY_KEYS.filter((k) => isCorrected(row[k]));
    const base = {
      inspection_serial_num: serial,
      inspection_date: row.inspection_start_date,
      inspection_score: String(pointsFor(uncorrected.length)),
      inspection_result: normalizeStatus(row.status) || String(row.status || ""),
      inspection_type: row.inspection_type || "",
    };

    if (uncorrected.length === 0 && corrected.length === 0) {
      rows.push({ ...base, violation_description: "", violation_type: "", violation_points: "0" });
      return;
    }
    uncorrected.forEach((k) => {
      rows.push({
        ...base,
        violation_description: `${MONTGOMERY_CATEGORIES[k]}: not in compliance${isRepeat(row[k]) ? " (repeat violation)" : ""}`,
        violation_type: "RED",
        violation_points: "0",
      });
    });
    corrected.forEach((k) => {
      rows.push({
        ...base,
        violation_description: `${MONTGOMERY_CATEGORIES[k]}: corrected during inspection${isRepeat(row[k]) ? " (repeat violation)" : ""}`,
        violation_type: "Corrected on site",
        violation_points: "0",
      });
    });
  });
  return rows;
}
