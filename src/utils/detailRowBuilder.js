/**
 * Generic builder for inspection detail rows.
 * Replaces the duplicated violation-grouping logic that was copy-pasted
 * across torontoToDetailRows, bostonToDetailRows, etc.
 *
 * Each detail row follows the unified schema expected by RestaurantDetail.jsx:
 * { inspection_serial_num, inspection_date, inspection_score, inspection_result,
 *   inspection_type, violation_description, violation_type, violation_points }
 */

/**
 * Build detail rows from a normalized inspection map.
 *
 * @param {Object} inspMap - Map keyed by date string, values: { serial, date, score, result, type, violations: [{description, isCritical}] }
 * @returns {Array} Flat array of detail rows
 */
export function buildDetailRowsFromMap(inspMap) {
  const rows = [];
  Object.values(inspMap).forEach((insp) => {
    if (!insp.violations || insp.violations.length === 0) {
      rows.push({
        inspection_serial_num: insp.serial || `${insp.date}`,
        inspection_date: insp.date,
        inspection_score: insp.score || "0",
        inspection_result: insp.result || "",
        inspection_type: insp.type || "",
        violation_description: "",
        violation_type: "BLUE",
        violation_points: "0",
      });
    } else {
      insp.violations.forEach((v) => {
        rows.push({
          inspection_serial_num: insp.serial || `${insp.date}`,
          inspection_date: insp.date,
          inspection_score: insp.score || "0",
          inspection_result: insp.result || "",
          inspection_type: insp.type || "",
          violation_description: v.description,
          violation_type: v.type || (v.isCritical ? "RED" : "BLUE"),
          violation_points: v.points || (v.isCritical ? "10" : "2"),
        });
      });
    }
  });
  return rows;
}