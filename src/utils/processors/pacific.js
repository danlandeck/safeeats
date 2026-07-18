import { resolveGrade } from "../grading";
import { buildDetailRowsFromMap } from "../detailRowBuilder";

// ── Vancouver, BC (Vancouver Coastal Health disclosure portal) ─────────────────
export function processVancouverBCResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities
    .map((f) => {
      const crit = Number(f.outstandingCriticalInfractions) || 0;
      const noncrit = Number(f.outstandingNonCriticalInfractions) || 0;
      const closed = !!f.closure;
      let score = 100 - crit * 15 - noncrit * 4 - (closed ? 40 : 0);
      score = Math.max(0, Math.min(100, score));
      const postal = ((f.siteAddress || "").match(/[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d/) || [""])[0].toUpperCase();
      const community = (f.community || "").split(" - ")[0].trim() || "Vancouver";
      return {
        business_id: f.id,
        name: (f.facilityName || "").trim(),
        address: (f.siteAddress || "").trim(),
        city: community,
        zip_code: postal,
        phone: f.phoneNumber || "",
        description: f.facilityType || "",
        latitude: f.latitude ?? null,
        longitude: f.longitude ?? null,
        safetyScore: score,
        grade: resolveGrade(score, closed ? "Closed" : crit > 0 ? "Critical infractions found" : "Pass"),
        totalInspections: Number(f.numberOfInspections) || 0,
        latestDate: f.lastInspectionDate || "",
        latestResult: closed
          ? "Closed by health authority"
          : crit > 0
            ? `${crit} outstanding critical infraction${crit > 1 ? "s" : ""}`
            : "No outstanding critical infractions",
        violations: [],
        isLLMData: false,
        source: "vancouver_bc",
        ada_compliance: "unknown",
      };
    })
    .filter((r) => r.name && r.address);
}

export function vancouverBCToDetailRows(inspections) {
  return (inspections || [])
    .map((insp) => {
      const crit = Number(insp.criticalInfractionCount) || 0;
      const noncrit = Number(insp.nonCriticalInfractionCount) || 0;
      const date = (insp.inspectionDate || "").slice(0, 10);
      const actions = Array.isArray(insp.actionsTakenList) ? insp.actionsTakenList.join("; ") : "";
      const summary =
        crit + noncrit === 0
          ? ""
          : `${crit} critical and ${noncrit} non-critical infraction(s) found${actions ? ` — actions taken: ${actions}` : ""}`;
      return {
        inspection_serial_num: insp.inspectionNumber || `vch-${date}`,
        inspection_date: date,
        inspection_score: String(crit * 15 + noncrit * 4),
        inspection_result: crit > 0 ? "Critical infractions found" : noncrit > 0 ? "Non-critical infractions found" : "Pass",
        inspection_type: insp.inspectionType || "Inspection",
        violation_description: summary,
        violation_type: crit > 0 ? "RED" : "BLUE",
        violation_points: String(crit * 15 + noncrit * 4),
      };
    })
    .sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
}

// ── Tacoma-Pierce County (Accela Citizen Access portal) ──────────────────────
export function processTacomaPierceResults(facilities) {
  if (!Array.isArray(facilities) || facilities.length === 0) return [];
  return facilities
    .map((f) => ({
      business_id: f.prId,
      name: (f.name || "").trim(),
      address: (f.address || "").trim(),
      city: (f.city || "").trim() || "Pierce County",
      zip_code: (f.zip || "").trim(),
      phone: "",
      description: (f.facilityType || "").trim(),
      safetyScore: null,
      grade: "U",
      totalInspections: 0,
      latestDate: "",
      latestResult: "",
      isLLMData: false,
      source: "tacoma_pierce",
      ada_compliance: "unknown",
    }))
    .filter((r) => r.name && r.address);
}

export function tacomaPierceToDetailRows(restaurant) {
  if (restaurant.safetyScore !== null && restaurant.safetyScore !== undefined) {
    const violations = Array.isArray(restaurant.violations) ? restaurant.violations : [];
    return [{
      inspection_serial_num: `tpchd-${restaurant.business_id}`,
      inspection_date: restaurant.latestDate || "",
      inspection_score: "",
      inspection_result: restaurant.latestResult || (violations.length === 0 ? "No violations found" : "Violations found"),
      inspection_type: "Routine Inspection (TPCHD)",
      violation_description: violations.length > 0 ? violations.join("; ") : "No violations found during inspection",
      violation_type: violations.length > 0 ? "RED" : "BLUE",
      violation_points: "",
    }];
  }
  return [{
    inspection_serial_num: `tpchd-${restaurant.business_id}`,
    inspection_date: restaurant.latestDate || "",
    inspection_score: "",
    inspection_result: restaurant.latestResult || "Facility registered with Tacoma-Pierce County Health Department — inspection data pending",
    inspection_type: "",
    violation_description: "",
    violation_type: "",
    violation_points: "",
  }];
}