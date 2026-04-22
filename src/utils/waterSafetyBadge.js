/**
 * Compute water safety badge based on EPA data and validation status
 */

export function computeWaterSafetyBadge(epaData, epaStatus) {
  // No EPA data = UNSAFE
  if (!epaData || !epaStatus) {
    return "UNSAFE";
  }

  // Status checks — unsafe statuses
  const unsafeStatuses = [
    "state_mismatch",
    "zip_mismatch",
    "distance_exceeded",
    "invalid_facility_type",
    "no_valid_facilities",
    "geocoding_failed",
    "epa_request_failed",
    "missing_address_data",
    "no_results",
    "error",
  ];

  if (unsafeStatuses.includes(epaStatus)) {
    return "UNSAFE";
  }

  if (epaStatus !== "ok") {
    return "UNSAFE";
  }

  // At this point, epaStatus === "ok"
  const violations = epaData.water_quality_violations || 0;
  const hazardScore = epaData.hazardous_waste_score || 0;

  // SAFE: no violations + low hazard + passed validation
  if (violations === 0 && hazardScore >= 0 && hazardScore <= 3) {
    return "SAFE";
  }

  // CAUTION: some violations or moderate hazard
  if (violations > 0 || (hazardScore > 3 && hazardScore <= 6)) {
    return "CAUTION";
  }

  // UNSAFE: high hazard score
  if (hazardScore > 6) {
    return "UNSAFE";
  }

  // Default to CAUTION if uncertain
  return "CAUTION";
}