/**
 * Global coverage tiers for SafeEats.
 * Green  — Live API integration (real-time government data)
 * Yellow — Confirmed open data source (verified, manual/LLM-pulled)
 * Blue   — AI Search fallback (no public API yet)
 *
 * Keys are ISO 3166-1 alpha-3 codes to match Natural Earth GeoJSON.
 */

export const COVERAGE_TIERS = {
  green: {
    label: "Live API",
    color: "#1a9641",
    description: "Real-time government inspection data via public API.",
  },
  yellow: {
    label: "Confirmed Source",
    color: "#f59e0b",
    description: "Verified open data source — manually or AI-pulled.",
  },
  blue: {
    label: "AI Search",
    color: "#3b82f6",
    description: "No public API yet — AI reads official sources to find data.",
  },
};

const COVERAGE_MAP = {
  // ─── GREEN: Live API ──────────────────────────────────────────────
  USA: { tier: "green", name: "United States", detail: "NYC, LA, SF, Chicago, King County, Austin, Montgomery, Houston, Boston, Delaware, Stanislaus, NY State" },
  GBR: { tier: "green", name: "United Kingdom", detail: "FSA FHRS — every establishment, every local authority, free public API" },
  CAN: { tier: "green", name: "Canada", detail: "Toronto DineSafe open data API + Vancouver/Calgary/Ottawa sources" },
  SGP: { tier: "green", name: "Singapore", detail: "SFA grades via data.gov.sg CKAN API" },
  AUS: { tier: "green", name: "Australia", detail: "NSW Scores on Doors + QLD open data portals" },
  ARE: { tier: "green", name: "United Arab Emirates", detail: "Dubai Municipality via Dubai Pulse API" },

  // ─── YELLOW: Confirmed Sources ─────────────────────────────────────
  FRA: { tier: "yellow", name: "France", detail: "Alim'confiance — DGCCRF national transparency database" },
  DEU: { tier: "yellow", name: "Germany", detail: "Lebensmittelüberwachung — Berlin, Bayern, Hamburg portals" },
  NLD: { tier: "yellow", name: "Netherlands", detail: "NVWA inspectieresultaten.nl" },
  DNK: { tier: "yellow", name: "Denmark", detail: "Smiley scheme — findsmiley.dk, every establishment since 2001" },
  IRL: { tier: "yellow", name: "Ireland", detail: "FSAI enforcement orders publicly published" },
  KOR: { tier: "yellow", name: "South Korea", detail: "식품안전나라 + Seoul Open Data Plaza" },
  JPN: { tier: "yellow", name: "Japan", detail: "Local 保健所 (health center) food hygiene records" },
  NZL: { tier: "yellow", name: "New Zealand", detail: "MPI + council food premises inspections" },
  BRA: { tier: "yellow", name: "Brazil", detail: "VISA São Paulo + Rio Vigilância Sanitária" },
  IND: { tier: "yellow", name: "India", detail: "FSSAI licensing database + municipal records" },
  CHN: { tier: "yellow", name: "China", detail: "SAMR + municipal food safety supervision databases" },
  HKG: { tier: "yellow", name: "Hong Kong", detail: "FEHD inspection results publicly searchable" },
  ESP: { tier: "yellow", name: "Spain", detail: "Regional health authority inspection portals" },
  ITA: { tier: "yellow", name: "Italy", detail: "ASL regional food safety inspection records" },
  PRT: { tier: "yellow", name: "Portugal", detail: "ASAE food safety inspection records" },
  BEL: { tier: "yellow", name: "Belgium", detail: "FASVC regional inspection data" },
  CHE: { tier: "yellow", name: "Switzerland", detail: "Canton-level Lebensmittelkontrolle records" },
  AUT: { tier: "yellow", name: "Austria", detail: "AGES + municipal food inspection records" },
  SWE: { tier: "yellow", name: "Sweden", detail: "Livsmedelsverket municipal inspection data" },
  NOR: { tier: "yellow", name: "Norway", detail: "Mattilsynet inspection results portal" },
  FIN: { tier: "yellow", name: "Finland", detail: "Ruokavirasto food inspection records" },
  ISR: { tier: "yellow", name: "Israel", detail: "Ministry of Health restaurant grading system" },
  TUR: { tier: "yellow", name: "Turkey", detail: "Ministry of Agriculture food safety inspections" },
  ZAF: { tier: "yellow", name: "South Africa", detail: "Municipal environmental health inspections" },
  MEX: { tier: "yellow", name: "Mexico", detail: "COFEPRIS food establishment records" },
  ARG: { tier: "yellow", name: "Argentina", detail: "SENASA + municipal food safety data" },
  CHL: { tier: "yellow", name: "Chile", detail: "SERNAC + municipal health inspections" },
  THA: { tier: "yellow", name: "Thailand", detail: "FDA Thailand food establishment inspections" },
  MYS: { tier: "yellow", name: "Malaysia", detail: "MOH food safety inspection records" },
  IDN: { tier: "yellow", name: "Indonesia", detail: "BPOM food establishment compliance data" },
  PHL: { tier: "yellow", name: "Philippines", detail: "FDA Philippines food establishment records" },
  VNM: { tier: "yellow", name: "Vietnam", detail: "VFA food safety inspection records" },
};

/**
 * Returns tier info for a given ISO alpha-3 code.
 * Defaults to "blue" (AI Search) for any country not explicitly mapped.
 */
export function getCoverage(iso) {
  if (!iso || iso === "-99") return { tier: "blue", name: "Unknown", detail: "AI search fallback" };
  return COVERAGE_MAP[iso] || { tier: "blue", name: iso, detail: "AI search — no public API yet" };
}