import { getJurisdictionContext } from "../jurisdictionResolver";
import usHealthContext from "@/config/usHealthContext.json";

// All UK city IDs that should route through the live UK FSA API
export const UK_CITY_IDS = new Set([
  "london", "birmingham", "manchester", "leeds", "glasgow",
  "edinburgh", "liverpool", "bristol", "sheffield", "cardiff", "belfast",
]);

// Country-specific guidance for the LLM to find real inspection data
export const COUNTRY_CONTEXT = {
  // Australia
  sydney:       "Prioritize: NSW Food Authority (foodauthority.nsw.gov.au), Scores on Doors A-E grades.",
  melbourne:    "Prioritize: VicHealth food safety, City of Melbourne restaurant inspections, FoodSmart Victoria.",
  brisbane:     "Prioritize: Brisbane City Council & Queensland Health restaurant inspection records.",
  perth:        "Prioritize: WA Department of Health (health.wa.gov.au) food premises inspection records.",
  adelaide:     "Prioritize: SA Health food premises inspection records, City of Adelaide.",
  gold_coast:   "Prioritize: Gold Coast City Council food safety inspection records.",
  canberra:     "Prioritize: ACT Health food premises inspection records.",
  hobart:       "Prioritize: Tasmania Health Service food premises inspection records.",
  // Japan
  tokyo:        "Search: Tokyo Metropolitan Government (東京都) food hygiene (食品衛生) from local 保健所 (health centers). Score is Pass/Fail from 食品衛生責任者.",
  osaka:        "Search: Osaka Prefecture food hygiene inspection records from 保健所 (hokenjo). Focus on 食品衛生 compliance.",
  kyoto:        "Search: Kyoto City food safety inspection records from local 保健所.",
  yokohama:     "Search: Yokohama City food hygiene inspection records from local 保健所.",
  sapporo:      "Search: Sapporo City food safety inspection records from local 保健所.",
  fukuoka:      "Search: Fukuoka City food hygiene inspection records from local 保健所.",
  nagoya:       "Search: Nagoya City food safety inspection records from 保健所.",
  // South Korea
  seoul:        "Search: 식품안전나라 (foodsafetykorea.go.kr) and Seoul Metropolitan Government food inspection database. Score is 0-100.",
  busan:        "Search: 식품안전나라 (foodsafetykorea.go.kr) and Busan Metropolitan City food safety records.",
  incheon:      "Search: 식품안전나라 (foodsafetykorea.go.kr) and Incheon City food hygiene inspection data.",
  // France
  paris:        "Prioritize: Alim'confiance platform (alim-confiance.gouv.fr) — official DGCCRF transparency database with 4-tier ratings.",
  lyon:         "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Lyon.",
  marseille:    "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Marseille.",
  toulouse:     "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Toulouse.",
  nice:         "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Nice.",
  bordeaux:     "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Bordeaux.",
  strasbourg:   "Prioritize: Alim'confiance (alim-confiance.gouv.fr) — DGCCRF food inspection results for Strasbourg.",
  // Germany
  berlin:       "Prioritize: verbraucherportal.de and Berlin Senatsverwaltung Lebensmittelüberwachung inspection records.",
  munich:       "Prioritize: LGL Bayern (lgl.bayern.de) food inspection records and verbraucherportal.de.",
  hamburg:      "Prioritize: Hamburg Lebensmittelüberwachung (hamburg.de/lmue) restaurant inspection records.",
  cologne:      "Prioritize: Köln Veterinär- und Lebensmittelüberwachungsamt food inspection records.",
  frankfurt:    "Prioritize: Frankfurt am Main food inspection (Lebensmittelüberwachung) records.",
  // Netherlands
  amsterdam:    "Prioritize: NVWA (nvwa.nl) inspection results and inspectieresultaten.nl — Dutch Food and Consumer Product Safety Authority.",
  rotterdam:    "Prioritize: NVWA (nvwa.nl) and inspectieresultaten.nl food inspection results for Rotterdam.",
  the_hague:    "Prioritize: NVWA (nvwa.nl) food inspection records for The Hague.",
  // Denmark
  copenhagen:   "Prioritize: Smiley scheme (findsmiley.dk) from Fødevarestyrelsen — 4-tier smiley rating for Danish restaurants.",
  // New Zealand
  auckland:     "Prioritize: Auckland Council food premises inspection records and FoodSafe verification scheme.",
  wellington:   "Prioritize: Wellington City Council environmental health food premises inspections.",
  christchurch: "Prioritize: Christchurch City Council food premises inspection records.",
  // Canada (non-Toronto)
  vancouver:    "Prioritize: Vancouver Coastal Health (vch.ca) restaurant inspection database, Fraser Health inspection records.",
  calgary:      "Prioritize: Alberta Health Services food inspection records for Calgary.",
  edmonton:     "Prioritize: Alberta Health Services food inspection records for Edmonton.",
  montreal:     "Prioritize: MAPAQ Québec food inspection records and Montreal public health inspection data.",
  // India
  mumbai:       "Prioritize: FSSAI (fssai.gov.in) registration database and Mumbai Municipal Corporation (MCGM) food safety records.",
  delhi:        "Prioritize: FSSAI (fssai.gov.in) registration and Delhi government food safety inspection records.",
  bangalore:    "Prioritize: FSSAI (fssai.gov.in) and BBMP (Bruhat Bengaluru Mahanagara Palike) food safety inspection records.",
  // China
  beijing:      "Prioritize: 国家市场监督管理总局 (SAMR) food inspection, Beijing food safety supervision (北京食品安全) database.",
  shanghai:     "Prioritize: Shanghai municipal food safety authority (上海市食品安全) inspection records.",
  hong_kong:    "Prioritize: FEHD (Food and Environmental Hygiene Department) Hong Kong (fehd.gov.hk) inspection records.",
  // Brazil
  sao_paulo:    "Prioritize: VISA São Paulo (cvs.saude.sp.gov.br) Vigilância Sanitária restaurant inspection records.",
  rio:          "Prioritize: VISA Rio de Janeiro Vigilância Sanitária (rio.rj.gov.br/web/cvs) food establishment inspection records.",
  // UAE (non-Dubai)
  abu_dhabi:    "Prioritize: ADAFSA (Abu Dhabi Agriculture and Food Safety Authority) restaurant inspection and grading records.",
  sharjah:      "Prioritize: Sharjah City Municipality food safety inspection records.",
  // Singapore handled by live API — keep as LLM fallback description
  singapore:    "Prioritize: SFA/NEA food hygiene grades (A/B/C/D/E scale), SFA food establishment inspections (sfa.gov.sg).",
  // US cities without live API connectors — AI reads official portals
  denver:       "Prioritize: Denver Environmental Health & Safety restaurant inspection scores (denvergov.org). Score is 0-100 or Pass/Fail.",
  dallas:       "Prioritize: Dallas County Health and Human Services food establishment inspection records (dallascounty.org).",
  miami:        "Prioritize: Miami-Dade County food inspection database (miamidade.gov). Look for inspection scores and violation details.",
  las_vegas:    "Prioritize: Southern Nevada Health District (SNHD) restaurant inspection database (snhd.info). Clark County inspections.",
  // Canada — cities without live API
  ottawa:       "Prioritize: Ottawa Public Health food premise inspection reports (ottawapublichealth.ca). Look for Pass/Conditional/Closed results.",
  // US cities without live API — county/city health departments
  pierce:       "Tacoma-Pierce County Health Department (tpchd.org). TPCHD rating system based on red critical violation points from last 4 routine inspections: Great (≤135 red points)→score 90-100, Okay (136-299 red points)→score 70-89, Needs to Improve (≥300 red points)→score 40-69, Closed→score 0-39. Inspection reports at aca-prod.accela.com/TPCHD. Blue=non-critical, Red=critical violations likely to cause foodborne illness. Inspections 1-4 times/year.",
  tacoma:       "Tacoma-Pierce County Health Department (tpchd.org). TPCHD rating system based on red critical violation points from last 4 routine inspections: Great (≤135 red points)→score 90-100, Okay (136-299 red points)→score 70-89, Needs to Improve (≥300 red points)→score 40-69, Closed→score 0-39. Inspection reports at aca-prod.accela.com/TPCHD. Blue=non-critical, Red=critical violations likely to cause foodborne illness.",
  seaside:      "Seaside, OR is in Clatsop County. Clatsop County Environmental Health (clatsopcounty.gov) conducts restaurant inspections. Score: 100-point (70=pass). Inspection results published on HealthSpace portal at inspections.myhealthdepartment.com/or-clatsop-county. Also check Oregon Health Authority statewide portal at oregon.gov/oha/ph/healthyenvironments/foodsafety. NOTE: The HealthSpace portal is JavaScript-rendered — if web search cannot find scores, the restaurant likely still has a valid inspection score that can only be viewed by visiting the portal directly.",
  spokane:      "Prioritize: Spokane Regional Health District (srhd.org) restaurant inspection records and food safety scores.",
  portland:     "Prioritize: Multnomah County Environmental Health (multco.us) restaurant inspection scores and Oregon Health Authority food safety records.",
  phoenix:      "Prioritize: Maricopa County Environmental Services (maricopa.gov) restaurant inspection database — search by facility name and address.",
  orlando:      "Prioritize: Florida DBPR (myfloridalicense.com) Division of Hotels and Restaurants inspection reports — search by business name and address.",
  philadelphia: "Prioritize: Philadelphia Department of Public Health (phila.gov) restaurant inspection database and PA Department of Agriculture food safety records.",
  atlanta:      "Prioritize: Fulton County Environmental Health Services restaurant inspection scores and Georgia Department of Public Health food safety records.",
  nashville:    "Prioritize: Nashville/Davidson County Metro Public Health Department restaurant inspection scores.",
  charlotte:    "Prioritize: Mecklenburg County Environmental Health restaurant inspection database (mecknc.gov).",
  raleigh:      "Prioritize: Wake County Environmental Health (wake.gov) restaurant inspection scores and NC Department of Agriculture food safety records.",
  columbus:     "Prioritize: Columbus Public Health (columbus.gov) restaurant inspection database and Ohio Department of Agriculture food safety records.",
  minneapolis:  "Prioritize: Minneapolis Environmental Health (minneapolismn.gov) and Hennepin County Environmental Health restaurant inspection records.",
  pittsburgh:   "Prioritize: Allegheny County Health Department (achd.net) restaurant inspection database and PA Department of Agriculture records.",
  sacramento:   "Prioritize: Sacramento County Environmental Management Department (emd.saccounty.gov) restaurant inspection database.",
  san_diego:    "Prioritize: San Diego County Department of Environmental Health (sdcounty.ca.gov) food inspection database.",
  seattle_no_kc: "Prioritize: Washington State Department of Health (doh.wa.gov) and local county health department restaurant inspection records.",
  // Connecticut — local health departments publish PDFs; AI finds data via web search
  manchester_ct: "Manchester CT Health Department (manchesterct.gov) uses a Green/Yellow/Red placard system. Green = Pass (0-1 priority violations) → score 90-100, Yellow = Conditional Pass (2+ priority violations corrected on site) → score 70-89, Red = Closed/Fail (imminent health hazard) → score 0-39. Inspection reports published monthly as PDFs at manchesterct.gov. CT DPH uses Priority (P), Priority Foundation (Pf), and Core (C) violation categories.",
  fvhd: "Farmington Valley Health District (fvhd.org) covers Avon, Barkhamsted, Canton, Colebrook, East Granby, Farmington, Granby, Hartland, New Hartford, and Simsbury CT. Uses A/B/C/U rating system: A=Excellent (no significant issues)→score 90-100, B=Good (minor non-critical issues)→score 80-89, C=Fair (noticeable violations)→score 70-79, U=Unsatisfactory (significant violations)→score 0-39. Ratings published on fvhd.org/environmental-health/food/food-ratings/ by town with full inspection history.",
  dc: "DC Health (dc.healthinspections.us) uses FDA Food Code pass/fail inspection with Priority, Priority Foundation, and Core violation categories. No letter grade or percentage assigned. Priority violations are most severe (foodborne illness risk factors), Priority Foundation are medium severity, Core are minor (good retail practices). Inspection reports include full violation details, corrective actions, and temperature readings. Follow-up inspections verify correction of cited violations.",
  florida: "Florida DBPR Division of Hotels & Restaurants (myfloridalicense.com) — state-wide portal covering ALL 67 counties. Food service establishments inspected 2+ times per year. Violations categorized as High Priority (could contribute directly to foodborne illness), Intermediate (could lead to risk factors), and Basic (best practices). Result is Pass/Fail: 'Met Inspection Standards' = pass, 'Inspection Not Met' = fail. Public portal at myfloridalicense.com/wl11.asp — search by business name and city. Inspection details at inspectionDetail.asp with full violation descriptions.",
  georgia: "Georgia Department of Public Health (ga.healthinspections.us) — state-wide portal covering most GA counties (excl. Gwinnett, Newton, Rockdale which have separate portals). Uses A/B/C/U grading: A=90-100 (satisfactory), B=80-89 (minor violations), C=70-79 (needs improvement), U=69 or below (unsatisfactory). Food establishments inspected 1-4 times per year. Numeric 100-point scores provided. Public portal at ga.healthinspections.us/georgia/search.cfm — search by establishment name and county.",
  hawaii: "Hawaii Department of Health Food Safety Branch (health.hawaii.gov/san) — state-wide coverage across all 4 counties (Honolulu/Oahu, Hawaii/Big Island, Maui, Kauai). Uses a Green/Yellow/Red placard system: Green=Pass (no critical violations)→score 90-100, Yellow=Conditional Pass (critical violations corrected on site)→score 70-89, Red=Closed (imminent health hazard)→score 0-39. Food establishments inspected 1-4 times per year. Public portals at hi.healthinspections.us/hawaii and inspections.myhealthdepartment.com/soh — both are JS-heavy or Cloudflare-blocked, so AI web search is required.",
  idaho: "Idaho food safety inspections are delegated to 7 independent Public Health Districts: Panhandle (Coeur d'Alene), North Central (Lewiston), Southwest District Health (Nampa/Caldwell), Central District Health (Boise/Ada County), South Central (Twin Falls), Southeastern (Pocatello), Eastern (Idaho Falls). Uses FDA Food Code with Priority/Priority Foundation/Core violation categories. Annual unannounced inspections. No state-wide portal — each district has its own system, most are JS-heavy SPAs (HedgehogPortal) or under maintenance. AI web search required for inspection scores.",
  riverside: "Riverside County Department of Environmental Health (rivcoeh.org) inspects food facilities 1-4 times per year. Public portal at weblink.rivcoeh.org allows searching facility inspection records by name, city, and record type. Facilities receive grade cards (A/B/C or color-coded). Convert: A=90-100, B=80-89, C=70-79, Closed/Failed=0-39. Prioritize: restaurantgrading.rivcoeh.org and weblink.rivcoeh.org for official inspection records.",
  alabama: "Alabama Department of Public Health (ADPH) foodscores.state.al.us — state-wide portal covering ALL 67 counties via county health departments. 100-point scale: 85+=satisfactory, 70-84=follow-up required within 60 days, 60-69=reinspection within 48h, <60=closed immediately. Food service establishments inspected minimum 3x/year. Critical violations have higher point values and must be corrected within 10 days.",
  tri_county_co: "Colorado Tri-County Health Department (TCHD) covers Adams, Arapahoe, and Douglas counties. Socrata open data at data.colorado.gov (dataset 869n-zj3f). CDPHE risk index scoring: 0-49 points=Pass, 50-109=Re-Inspection Required, 110+=Closed. Data includes foodborne illness risk violations (priority items) and good retail practices violations (core items). Dataset frozen at Dec 2022 — current scores may differ.",
  arkansas: "Arkansas Department of Health (ADH) foodserviceprod.adh.arkansas.gov — state-wide portal covering ALL 75 counties via county health departments. Food establishments inspected 1-4 times per year. 100-point scale: 85+=satisfactory, 70-84=follow-up required, 60-69=reinspection within 48h, <60=closed. Critical violations have higher point values and must be corrected within 10 days. Public portal at foodserviceprod.adh.arkansas.gov — search by establishment name and city.",
  maricopa: "Maricopa County Environmental Services (envapp.maricopa.gov) Restaurant Ratings Tool. Letter grades A-R: A=90-100 (no priority violations), B=80-89, C=70-79 (2+ priority violations), R=Re-Inspection required (score 50-69). Priority violations are major violations that directly contribute to increasing the risk of foodborne illness. Inspections 1-4 times per year. Public portal at envapp.maricopa.gov/EnvironmentalHealth/FoodInspections — search by business name, address, or city.",
  // Ireland
  dublin:       "Prioritize: FSAI (fsai.ie) enforcement orders and closure notices, and Dublin City Council food safety inspection records.",
  cork:         "Prioritize: FSAI (fsai.ie) and Cork City Council food safety inspection records.",
  galway:       "Prioritize: FSAI (fsai.ie) and Galway City Council food safety inspection records.",
  limerick:     "Prioritize: FSAI (fsai.ie) and Limerick City Council food safety inspection records.",
  waterford:    "Prioritize: FSAI (fsai.ie) and Waterford City Council food safety inspection records.",
};

export function getCountryContext(countyId) {
  return COUNTRY_CONTEXT[countyId] || "";
}

/**
 * Look up enrichment context by countyId first, then by city name slug.
 */
export function getContextForLocation(countyId, locationLabel, country) {
  const isUS = !country || country.toUpperCase().trim() === "US";
  if (!isUS) {
    const ctx = getJurisdictionContext(countyId, locationLabel, country);
    if (ctx) return ctx;
  }
  const direct = getCountryContext(countyId);
  if (direct) return direct;
  if (!locationLabel) return "";
  const city = locationLabel.split(",")[0].toLowerCase().trim().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, "_").trim();
  const cityCtx = COUNTRY_CONTEXT[city];
  if (cityCtx) return cityCtx;
  if (isUS) {
    const stateMatch = locationLabel.match(/,\s*([A-Z]{2})\b/);
    if (stateMatch) {
      const code = stateMatch[1].toUpperCase();
      if (usHealthContext[code]) {
        const entry = usHealthContext[code];
        return typeof entry === 'string' ? entry : (entry.description || '');
      }
    }
  }
  return "";
}