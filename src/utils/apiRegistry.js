/**
 * SafeEats API Registry
 * ─────────────────────
 * Each entry describes one live government inspection API.
 * To add a new city: add an entry here + write its processor in inspectionProcessors.js.
 *
 * Fields:
 *   id          – matches the countyId used everywhere in the app
 *   name        – human-readable label
 *   endpoint    – Socrata/open-data base URL
 *   searchField – the column to LIKE-search against
 *   idField     – the unique establishment identifier column
 *   dateField   – the column used for ORDER BY (most-recent first)
 *   limit       – max rows to fetch per search
 *   source      – tag written onto each result row (used by detail fetchers)
 */

export const API_REGISTRY = {
  king: {
    id: "king",
    name: "King County, WA",
    // Socrata r878-4sxa "Food Establishment Inspection Data" — the county's
    // CURRENT feed (checked 2026-09-27: inspections through 2026-09-01, updated
    // daily; linked from kingcounty.gov's official ratings search).
    // Replaces vbyt-shxd "Food Establishment Inspections (spatial)", which
    // STOPPED publishing after 2025-11-26, and the older ArcGIS layer
    // RESTAURANT_INSPECTIONS_POINT_857 (frozen 2024-03-30).
    // NOTE: r878-4sxa has no latitude/longitude/phone columns and
    // program_identifier is null for ~80% of rows — group by business_id,
    // and let Home's geocoder fill map coordinates.
    endpoint: "https://data.kingcounty.gov/resource/r878-4sxa.json",
    searchField: "name",
    idField: "business_id",
    dateField: "inspection_date",
    limit: 1000,
    source: "king",
  },
  nyc: {
    id: "nyc",
    name: "New York City, NY",
    endpoint: "https://data.cityofnewyork.us/resource/43nn-pn8j.json",
    searchField: "dba",
    idField: "camis",
    dateField: "inspection_date",
    limit: 1000,
    source: "nyc",
  },
  cook: {
    id: "cook",
    name: "Chicago / Cook County, IL",
    endpoint: "https://data.cityofchicago.org/resource/4ijn-s7e5.json",
    searchField: "dba_name",
    idField: "license_",
    dateField: "inspection_date",
    limit: 1000,
    source: "chicago",
  },
  montgomery_md: {
    id: "montgomery_md",
    name: "Montgomery County, MD",
    // dkrp-gr48 "HHS - Food Inspection Data from July 2024 and onward".
    // Replaces 5pue-gfbe, whose newest record is 2024-10-03. Upstream repeats
    // every inspection ~300 times, so groupSelect makes Socrata return each
    // inspection once (919 raw rows -> 5 inspections in testing).
    endpoint: "https://data.montgomerycountymd.gov/resource/dkrp-gr48.json",
    searchField: "business_name",
    idField: "registration_number",
    dateField: "inspection_start_date",
    groupSelect: "registration_number,business_name,address,city,zip,inspection_type,inspection_number,inspection_start_date,status,food_from_approved_source,food_protected_from_contamination,workers_restricted,proper_hand_washing,cooling_time_and_temperature,cold_holding_temperature,hot_holding_temperature,cooking_time_and_temperature,reheating_time_and_temperature,hot_and_cold_running_water_provided,proper_sewage_disposal,toxic_substances_and_pesticides,rodents_and_insects",
    limit: 1000,
    source: "montgomery",
  },
  travis: {
    id: "travis",
    name: "Austin / Travis County, TX",
    endpoint: "https://data.austintexas.gov/resource/ecmv-9xxi.json",
    searchField: "restaurant_name",
    idField: "facility_id",
    dateField: "inspection_date",
    limit: 1000,
    source: "austin",
  },
  sf: {
    id: "sf",
    name: "San Francisco, CA",
    // Dataset: "Health Inspection Scores (2024-Present)" — replaces archived pyih-qa8i
    // Portal moved from data.sfgov.org to data.sf.gov (302 redirect since 2026).
    endpoint: "https://data.sf.gov/resource/tvy3-wexg.json",
    searchField: "dba",
    idField: "permit_number",
    dateField: "inspection_date",
    limit: 1000,
    source: "sf",
  },
  // LA (data.lacity.org/29fd-3paw) was frozen at 2018 — removed from live registry.
  // LA searches now fall through to AI web search which returns current data.
  delaware: {
    id: "delaware",
    name: "Delaware",
    endpoint: "https://data.delaware.gov/resource/384s-wygj.json",
    searchField: "restname",
    idField: "restname", // group by name+address for detail
    dateField: "insp_date",
    limit: 1000,
    source: "delaware",
  },
  ny_state: {
    id: "ny_state",
    name: "New York State",
    endpoint: "https://health.data.ny.gov/resource/cnih-y5dw.json",
    searchField: "facility",
    idField: "nys_health_operation_id",
    dateField: "date",
    limit: 1000,
    source: "ny_state",
  },
  // Tri-County Health Department (data.colorado.gov/869n-zj3f) dissolved on
  // 2022-12-31 into Adams, Arapahoe, and Douglas county health departments.
  // Removed from the live registry; those cities now resolve to their
  // successor county portals via usHealthContext.json.
  brla: {
    id: "brla",
    name: "Baton Rouge, LA (East Baton Rouge Parish)",
    endpoint: "https://data.brla.gov/resource/ux2t-b9wr.json",
    searchField: "permitname",
    idField: "permitid",
    dateField: "inspectiondate",
    limit: 1000,
    source: "brla",
  },
};

/** IDs of counties that have a live government API */
export const LIVE_API_IDS = new Set(Object.keys(API_REGISTRY));

/** Socrata $select/$group clause for sources that repeat rows upstream. */
function groupClause(entry) {
  return entry.groupSelect ? `&$select=${entry.groupSelect}&$group=${entry.groupSelect}` : "";
}

/** Build a SoQL LIKE query URL for a given registry entry + search term */
export function buildSearchUrl(entry, query) {
  // Strip apostrophes (straight and curly: iOS types ’ by default) BEFORE
  // turning other punctuation into spaces. The Socrata field side below uses
  // replace(field, chr(39), '') to REMOVE apostrophes, so "McDonald's" must
  // become "MCDONALDS", not "MCDONALD S" (which matched nothing: verified
  // 0 vs 5 NYC results on 2026-09-27).
  const clean = query
    .replace(/['\u2018\u2019\u02BC`]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const field = entry.searchField;
  if (entry.isArcGIS) {
    const where = `upper(${field}) LIKE '%${clean}%'`;
    return `${entry.endpoint}?where=${encodeURIComponent(where)}&outFields=*&f=json&orderByFields=${entry.dateField}+DESC&resultRecordCount=${entry.limit}`;
  }
  const encoded = encodeURIComponent(clean);
  // Field side mirrors the query cleaning: drop apostrophes, hyphens -> spaces.
  // Without the hyphen replace, "Chick-fil-A" only matched rows stored without
  // hyphens and missed the rest (verified against NYC on 2026-09-27).
  return `${entry.endpoint}?$where=upper(replace(replace(${field},chr(39),''),'-',' ')) like '%25${encoded}%25'&$limit=${entry.limit}&$order=${entry.dateField} DESC${groupClause(entry)}`;
}

/** Build a detail-fetch URL to load all inspections for one establishment */
export function buildDetailUrl(entry, establishmentId) {
  if (entry.isArcGIS) {
    const escaped = String(establishmentId).replace(/'/g, "''");
    const where = `${entry.idField}='${escaped}'`;
    return `${entry.endpoint}?where=${encodeURIComponent(where)}&outFields=*&f=json&orderByFields=${entry.dateField}+DESC&resultRecordCount=500`;
  }
  // IDs must be encoded: King County program identifiers contain '#', '@' and
  // spaces (e.g. "AFC ZENSHI @ SAFEWAY #1923"); an unencoded '#' truncates the URL.
  return `${entry.endpoint}?${entry.idField}=${encodeURIComponent(establishmentId)}&$limit=500&$order=${entry.dateField} DESC${groupClause(entry)}`;
}