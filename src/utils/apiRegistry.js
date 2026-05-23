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

/**
 * geoWhere (optional): extra SoQL condition ANDed into every search query to enforce
 * geographic isolation at the API level. Each city's endpoint already only contains
 * data for that jurisdiction, but this provides belt-and-suspenders scoping.
 */
export const API_REGISTRY = {
  king: {
    id: "king",
    name: "King County, WA",
    endpoint: "https://data.kingcounty.gov/resource/f29f-zza5.json",
    searchField: "name",
    idField: "business_id",
    dateField: "inspection_date",
    limit: 1000,
    source: "king",
    // King County API is already scoped to King County only (data.kingcounty.gov)
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
    // NYC API scoped to NYC only (data.cityofnewyork.us)
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
    geoWhere: "upper(city)='CHICAGO'",
  },
  montgomery_md: {
    id: "montgomery_md",
    name: "Montgomery County, MD",
    endpoint: "https://data.montgomerycountymd.gov/resource/5pue-gfbe.json",
    searchField: "name",
    idField: "establishment_id",
    dateField: "inspectiondate",
    limit: 1000,
    source: "montgomery",
    // Montgomery County API scoped to Montgomery County only
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
    // Austin API scoped to Austin/Travis County only (data.austintexas.gov)
  },
  sf: {
    id: "sf",
    name: "San Francisco, CA",
    endpoint: "https://data.sfgov.org/resource/pyih-qa8i.json",
    searchField: "business_name",
    idField: "business_id",
    dateField: "inspection_date",
    limit: 1000,
    source: "sf",
    geoWhere: "upper(business_city)='SAN FRANCISCO'",
  },
  la: {
    id: "la",
    name: "Los Angeles, CA",
    endpoint: "https://data.lacity.org/resource/29fd-3paw.json",
    searchField: "facility_name",
    idField: "facility_id",
    dateField: "activity_date",
    limit: 1000,
    source: "la",
    // LA City API scoped to City of Los Angeles only (data.lacity.org)
  },
  delaware: {
    id: "delaware",
    name: "Delaware",
    endpoint: "https://data.delaware.gov/resource/384s-wygj.json",
    searchField: "restname",
    idField: "restname",
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
};

/** IDs of counties that have a live government API */
export const LIVE_API_IDS = new Set(Object.keys(API_REGISTRY));

/** Build a SoQL LIKE query URL for a given registry entry + search term.
 *  If the entry has a geoWhere clause, it is ANDed into the query for belt-and-suspenders
 *  geographic isolation at the API level (on top of each endpoint being city-specific). */
export function buildSearchUrl(entry, query) {
  const clean = query.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const encoded = encodeURIComponent(clean);
  const field = entry.searchField;
  const nameClause = `upper(replace(${field},chr(39),'')) like '%25${encoded}%25'`;
  const where = entry.geoWhere ? `${nameClause} AND ${entry.geoWhere}` : nameClause;
  return `${entry.endpoint}?$where=${where}&$limit=${entry.limit}&$order=${entry.dateField} DESC`;
}

/** Build a detail-fetch URL to load all inspections for one establishment */
export function buildDetailUrl(entry, establishmentId) {
  return `${entry.endpoint}?${entry.idField}=${establishmentId}&$limit=500&$order=${entry.dateField} DESC`;
}