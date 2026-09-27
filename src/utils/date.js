/**
 * Centralized date parsing utilities.
 * Standardizes various government API date formats into 'YYYY-MM-DD'.
 */
import { parse, isValid, format } from "date-fns";

/**
 * Convert any date string to ISO 'YYYY-MM-DD' format.
 * Handles: ISO (2024-01-15), US (MM/DD/YYYY), and timestamp (epoch ms).
 * Returns original string if format is unrecognized.
 */
export function standardizeDate(dateStr) {
  if (!dateStr) return "";

  const str = String(dateStr).trim();

  // Already ISO format (2024-01-15 or 2024-01-15T10:30:00)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  // MM/DD/YYYY (common in US government datasets like Stanislaus County)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parsed = parse(str.slice(0, 10), "MM/dd/yyyy", new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }

  // Epoch timestamp (milliseconds) — used by ArcGIS (King County, LA County)
  const asNum = Number(str);
  if (!isNaN(asNum) && asNum > 1000000000000) {
    const d = new Date(asNum);
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }

  // Try splitting on 'T' or space for datetime strings
  const parts = str.split(/[T ]/);
  if (parts[0] && /^\d{4}-\d{2}-\d{2}/.test(parts[0])) return parts[0];

  return str;
}

/**
 * Extract just the date portion from a datetime or timestamp string.
 * Useful for fields like `inspectionDate` or `resultdttm`.
 */
export function extractDate(rawDate) {
  if (!rawDate) return "";
  const str = String(rawDate).trim();
  // Split on T or space, take the first part
  return str.split(/[T ]/)[0] || "";
}

/**
 * True when a date is later than today (plus a small grace window for
 * timezone skew). An inspection cannot happen in the future, so such rows are
 * upstream data-entry errors. Delaware's dataset contained a record dated
 * 2026-12-03 when checked on 2026-09-27; left in, it sorted to the top and
 * became that restaurant's "latest inspection".
 */
export function isFutureDate(value, graceDays = 1) {
  const t = Date.parse(standardizeDate(value));
  return Number.isFinite(t) && t > Date.now() + graceDays * 86400000;
}
