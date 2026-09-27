import { resolveOfficialPortal } from "./officialPortal";

/**
 * Stale-data detection, shared by StaleDataBanner and OfficialInspectionLink so
 * the two never disagree (and never both render a portal button).
 *
 * Principle: never show old inspection data as if it were current. When the
 * data behind a grade has stopped updating, say so plainly and point the user
 * at the official source for anything newer.
 *
 * Three layers, first match wins:
 *   1. An explicit data_warning set by a backend processor.
 *   2. A known-frozen source: a jurisdiction whose open-data feed has stopped
 *      updating. Every restaurant from it gets the notice, because even a
 *      recent-looking date can hide newer inspections that were never published.
 *   3. An automatic rule: any restaurant whose newest published inspection is
 *      older than AUTO_STALE_DAYS. This catches feeds that freeze in the future
 *      without anyone noticing.
 *
 * Maintenance: scripts/market-health.mjs reports each source's newest record.
 * If a source listed below shows FRESH again, remove its entry here.
 */

export const AUTO_STALE_DAYS = 548; // ~18 months; most jurisdictions inspect 1-3x a year

const MAY_BE_NEWER = "This restaurant may have newer inspections.";

// Verified 2026-09-27 against each source's newest record.
export const KNOWN_FROZEN_SOURCES = {
  king: {
    data_warning: `King County has not published inspections after November 26, 2025. ${MAY_BE_NEWER}`,
    portal_url: "https://info.kingcounty.gov/health/ehs/foodsafety/inspections/search.aspx",
    portal_name: "Public Health – Seattle & King County",
  },
  dallas: {
    data_warning: `Dallas stopped publishing inspection data in early 2024. ${MAY_BE_NEWER}`,
    portal_url: "https://dallascityhall.com/departments/codecompliance/consumer-health/Pages/restaurant_food_scores.aspx",
    portal_name: "City of Dallas Restaurant Food Scores",
  },
  sf: {
    data_warning: `San Francisco last updated its inspection data in January 2025. ${MAY_BE_NEWER}`,
    portal_url: "https://data.sf.gov/d/tvy3-wexg",
    portal_name: "DataSF Health Inspection Scores",
  },
  brla: {
    data_warning: `Baton Rouge last updated its inspection data in October 2025. ${MAY_BE_NEWER}`,
    portal_url: "https://data.brla.gov/d/ux2t-b9wr",
    portal_name: "Open Data BR Retail Food Inspections",
  },
  // No longer routed (Portland now resolves to the official county portals),
  // kept so any cached OregonLive result is still labeled correctly.
  portland_oregonlive: {
    data_warning: "Historical data from OregonLive (2019-2020). May not reflect current conditions.",
    portal_url: "https://inspections.myhealthdepartment.com/multco-eh",
    portal_name: "Multnomah County Official Inspection Portal",
  },
};

function daysSince(dateStr) {
  const t = Date.parse(dateStr);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
}

function monthYear(dateStr) {
  const d = new Date(Date.parse(dateStr));
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Official portal for the restaurant, ignoring the generic web-search fallback. */
function officialPortalFor(restaurant) {
  const p = resolveOfficialPortal(restaurant);
  return p && !p.isFallback ? { portal_url: p.url, portal_name: p.name } : {};
}

/**
 * @returns {{ data_warning: string, portal_url?: string, portal_name?: string, reason: string } | null}
 */
export function resolveStaleInfo(restaurant) {
  if (!restaurant) return null;

  // 1. Explicit warning from a backend processor
  if (restaurant.data_warning) {
    return {
      data_warning: restaurant.data_warning,
      portal_url: restaurant.portal_url,
      portal_name: restaurant.portal_name,
      reason: "explicit",
    };
  }

  // 2. Known-frozen source
  const known = KNOWN_FROZEN_SOURCES[restaurant.source] || KNOWN_FROZEN_SOURCES[restaurant.county_id];
  if (known) return { ...known, reason: "known-frozen" };

  // 3. Automatic: newest published inspection is too old to present as current
  const age = daysSince(restaurant.latestDate);
  if (age !== null && age > AUTO_STALE_DAYS && !restaurant.isLLMData) {
    return {
      data_warning: `The most recent published inspection is from ${monthYear(restaurant.latestDate)}. Newer inspections may exist.`,
      ...officialPortalFor(restaurant),
      reason: "auto-age",
    };
  }
  return null;
}
