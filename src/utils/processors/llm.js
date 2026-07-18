import { resolveGrade } from "../grading";

// ── LLM (AI-assisted) ────────────────────────────────────────────────────────
export function llmToDetailRows(restaurant) {
  const rows = [];
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
  const hasViolationPoints = r.total_violation_points !== undefined && r.total_violation_points !== null;
  const hasLatestScore = r.latest_score !== undefined && r.latest_score !== null && Number(r.latest_score) > 0;

  let safetyScore = null;
  if (hasViolationPoints) {
    safetyScore = Math.max(0, Math.min(100, 100 - Number(r.total_violation_points)));
  } else if (hasLatestScore) {
    safetyScore = Math.max(0, Math.min(100, Number(r.latest_score)));
    const isPassing = r.latest_result && /pass|satisf|complian|approved|ok/i.test(r.latest_result);
    if (isPassing && safetyScore < 75) safetyScore = 85;
  }

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
    grade: safetyScore !== null ? resolveGrade(safetyScore, r.latest_result || "") : "U",
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
    data_confidence: r.data_confidence || "unknown",
    is_currently_operating: r.is_currently_operating !== undefined ? r.is_currently_operating : null,
    verification_source: r.verification_source || "",
  };
}