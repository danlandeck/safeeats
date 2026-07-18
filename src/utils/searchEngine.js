import { base44 } from "@/api/base44Client";
import { API_REGISTRY, LIVE_API_IDS, buildSearchUrl, buildDetailUrl } from "./apiRegistry";
import {
  processKingCountyResults, kingToDetailRows, processNYCResults, processChicagoResults,
  processMontgomeryResults, processAustinResults, processSFResults, processLAResults,
  nycToDetailRows, chicagoToDetailRows, montgomeryToDetailRows,
  austinToDetailRows, sfToDetailRows, laToDetailRows,
  llmToDetailRows, buildLLMRestaurant,
  processUKFSAResults, ukFSAToDetailRows,
  processDelawareResults, delawareToDetailRows,
  processNYStateResults, nyStateToDetailRows,
  processTorontoResults, torontoToDetailRows,
  processBostonResults, bostonToDetailRows,
  processHoustonResults, houstonToDetailRows,
  processStanislausResults, stanislausToDetailRows,
  processVancouverBCResults, vancouverBCToDetailRows,
  processSingaporeResults, singaporeToDetailRows,
  processNSWResults, nswToDetailRows,
  processTacomaPierceResults, tacomaPierceToDetailRows,
  processSNHDResults, snhdToDetailRows,
  processWakeCountyResults, wakeCountyToDetailRows,
  processLouisvilleResults, louisvilleToDetailRows,
  processRiversideResults, riversideToDetailRows,
  processAlabamaResults, alabamaToDetailRows,
  processMaricopaResults, maricopaToDetailRows,
  processArkansasResults, arkansasToDetailRows,
  processTriCountyCoResults, triCountyCoToDetailRows,
  processFVHDResults, fvhdToDetailRows,
  processDCResults, dcToDetailRows,
  processFloridaResults, floridaToDetailRows,
  processGeorgiaResults, georgiaToDetailRows,
  processIllinoisCDPResults, illinoisCDPToDetailRows,
  processIndianaMarionResults, indianaMarionToDetailRows,
} from "./inspectionProcessors";
import { getGrade } from "./grading";
import { enrichResults, isStale } from "./backgroundEnrich";
import { resolveJurisdiction } from "./routing";
import { getJurisdictionPortal, getJurisdictionContext } from "./jurisdictionResolver";
import usHealthContext from "@/config/usHealthContext.json";

// ── Cache version stamp ──
// Bumped when search logic changes in a way that invalidates old cached results.
// Module-level purge runs on every page load to nuke stale entries from prior
// versions before any search can read them.
const CACHE_VERSION = "v9";
(function purgeStaleCache() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("se-ai-cache-") && !k.startsWith(`se-ai-cache-${CACHE_VERSION}:`)) {
        localStorage.removeItem(k);
      }
    });
  } catch { /* localStorage unavailable */ }
})();

const PROCESSORS = {
  king:          { process: processKingCountyResults,  toDetailRows: kingToDetailRows },
  nyc:           { process: processNYCResults,         toDetailRows: nycToDetailRows },
  cook:          { process: processChicagoResults,     toDetailRows: chicagoToDetailRows },
  montgomery_md: { process: processMontgomeryResults,  toDetailRows: montgomeryToDetailRows },
  travis:        { process: processAustinResults,      toDetailRows: austinToDetailRows },
  sf:            { process: processSFResults,          toDetailRows: sfToDetailRows },
  la:            { process: processLAResults,          toDetailRows: laToDetailRows },
  delaware:      { process: processDelawareResults,    toDetailRows: delawareToDetailRows },
  ny_state:         { process: processNYStateResults,     toDetailRows: nyStateToDetailRows },
  tri_county_co:    { process: processTriCountyCoResults,  toDetailRows: triCountyCoToDetailRows },
  fvhd:             { process: processFVHDResults,         toDetailRows: fvhdToDetailRows },
  dc:               { process: processDCResults,           toDetailRows: dcToDetailRows },
  florida:          { process: processFloridaResults,      toDetailRows: floridaToDetailRows },
  illinois_cdp:     { process: processIllinoisCDPResults,   toDetailRows: illinoisCDPToDetailRows },
  indiana_marion:   { process: processIndianaMarionResults, toDetailRows: indianaMarionToDetailRows },
  toronto:          { process: processTorontoResults,     toDetailRows: torontoToDetailRows },
  };

const SOURCE_TO_COUNTY = {
  king: "king", nyc: "nyc", chicago: "cook",
  montgomery: "montgomery_md", austin: "travis",
  sf: "sf", la: "la", dubai: "dubai", llm: "llm",
  uk_fsa: "uk_fsa", delaware: "delaware",
  ny_state: "ny_state", toronto: "toronto",
  boston: "boston", houston: "houston",
  stanislaus: "stanislaus",
  tacoma_pierce: "pierce",
  snhd: "snhd",
  singapore: "singapore",
  australia_nsw: "sydney", australia_qld: "brisbane",
  wake: "wake",
  louisville: "jefferson_ky",
  riverside: "riverside",
  alabama: "alabama",
  maricopa: "maricopa",
  arkansas: "arkansas",
  tri_county_co: "tri_county_co",
  fvhd: "fvhd",
  dc: "dc",
  florida: "florida",
  georgia: "georgia",
  illinois_cdp: "illinois_cdp",
  indiana_marion: "indiana_marion",
};

// All UK city IDs that should route through the live UK FSA API
const UK_CITY_IDS = new Set([
  "london", "birmingham", "manchester", "leeds", "glasgow",
  "edinburgh", "liverpool", "bristol", "sheffield", "cardiff", "belfast",
]);

// Country-specific guidance for the LLM to find real inspection data
const COUNTRY_CONTEXT = {
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

// Trimmed schema — only fields needed for the search results list.
// Dietary/ADA fields removed to reduce LLM output tokens and speed up generation.
const LLM_SCHEMA = {
  type: "object",
  properties: {
    restaurants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name:                   { type: "string" },
          address:                { type: "string" },
          city:                   { type: "string" },
          zip_code:               { type: "string" },
          phone:                  { type: "string" },
          latest_score:           { type: "number" },
          latest_date:            { type: "string" },
          latest_result:          { type: "string" },
          total_inspections:      { type: "number" },
          violations:             { type: "array", items: { type: "string" } },
          cuisine:                { type: "string" },
          data_confidence:        { type: "string", enum: ["high", "medium", "low", "none"] },
          is_currently_operating: { type: "boolean" },
          verification_source:   { type: "string" },
        },
      },
    },
  },
};

// Schema for the inspection-enrichment pass: the LLM only reports inspection
// records for restaurants ALREADY verified via Google Places, keyed by idx.
const INSPECTION_SCHEMA = {
  type: "object",
  properties: {
    inspections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          idx:                 { type: "number" },
          latest_score:        { type: "number" },
          latest_date:         { type: "string" },
          latest_result:       { type: "string" },
          total_inspections:   { type: "number" },
          violations:          { type: "array", items: { type: "string" } },
          data_confidence:     { type: "string", enum: ["high", "medium", "low"] },
          verification_source: { type: "string" },
        },
      },
    },
  },
};

const PROMPT_ENRICH = (list, location, today, ctx = "") =>
  `Today is ${today}. Below are VERIFIED, REAL restaurants${location ? ` in ${location}` : ""} (confirmed via Google Places — do NOT question their existence or alter their details).
Search the LIVE WEB for OFFICIAL health inspection records for these EXACT establishments:
${list.map((r, i) => `${i}. ${r.name} — ${r.address}`).join("\n")}
${ctx ? `SOURCE GUIDANCE: ${ctx}\n` : ""}RULES:
1. Return one entry per restaurant you find inspection data for, keyed by "idx" (the number above).
2. latest_score 0–100, latest_date, latest_result, violations: from REAL official inspection records ONLY.
3. If the inspection was CLEAN (no violations found), return latest_score: 100, latest_result: "No violations found", violations: [].
4. If the source uses a rating system instead of numeric scores, CONVERT to a 0-100 score: "Great/Excellent/A grade" → 90-100, "Okay/Satisfactory/B grade" → 70-89, "Needs to Improve/C grade" → 40-69, "Closed/Failed/F grade" → 0-39. Always return a numeric latest_score.
5. If you cannot find an official inspection record for a restaurant, OMIT that idx entirely. NEVER invent scores, dates, or results.
6. data_confidence: "high"=official record found; "medium"=inspection referenced secondhand; "low"=uncertain match.
7. verification_source: the URL or agency name where you found the record.`;

const PROMPT_LOCATION = (query, location, today) =>
  `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" in ${location} ONLY.
RULES:
1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.
2. city MUST be "${location}" or start with the same word. NEVER return results from outside ${location}.
3. latest_score: 0–100 from REAL inspection data. If not found, set null. latest_date/latest_result/violations: REAL only.
4. data_confidence: "high"=official inspection record found; "medium"=restaurant confirmed with inspection reference; "low"=found but no inspection details; "none"=unverified.
5. is_currently_operating: true ONLY if evidence it's open today.
6. verification_source: URL/name where you confirmed it exists.
7. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.
8. Return max 8 verified results. ZERO fabricated data. Identify cuisine type.`;

const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" anywhere in the world.
RULES:
1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.
2. Return up to 8 real, verifiable businesses. No invented data or fabricated scores.
3. latest_score: 0–100 from REAL inspection data. If not found, set null and data_confidence to "none".
4. latest_date/latest_result/violations: REAL only.
5. data_confidence: "high"=official record; "medium"=some reference; "low"=found but no details; "none"=unverified.
6. is_currently_operating: true ONLY if evidence it's open today.
7. verification_source: URL/name where you confirmed it exists.
8. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.
9. Identify cuisine type.`;

const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE ONLY.
RULES:
1. BLOCK all US cities, London, Paris, Tokyo, Abu Dhabi, Sharjah — ANY non-UAE location = REJECTED.
2. city MUST be exactly "Dubai". Address MUST include: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, or "Dubai, UAE".
3. ONLY return restaurants you can VERIFY exist via web search. If unsure = OMIT.
4. latest_score: 0–100 from REAL inspection data. If not found, set null. Never fabricate.
5. data_confidence: "high"=official record; "medium"=confirmed with reference; "low"=found no details; "none"=unverified.
6. is_currently_operating: true ONLY if evidence it's open today.
7. verification_source: URL/name where you confirmed it exists.
8. Return max 8 verified Dubai restaurants only.`;

const FAST_PROMPT = (query, location) => location
  ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
  : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;

function getCountryContext(countyId) {
  return COUNTRY_CONTEXT[countyId] || "";
}

/**
 * Look up enrichment context by countyId first, then by city name slug.
 * Lets the grounded-enrichment pass hint Gemini at the right health
 * department even when countyId is "global".
 */
function getContextForLocation(countyId, locationLabel, country) {
  const isUS = !country || country.toUpperCase().trim() === "US";
  // Non-US: check the new global jurisdiction registry first
  if (!isUS) {
    const ctx = getJurisdictionContext(countyId, locationLabel, country);
    if (ctx) return ctx;
  }
  // Fall back to COUNTRY_CONTEXT (US city slugs + legacy international entries)
  const direct = getCountryContext(countyId);
  if (direct) return direct;
  if (!locationLabel) return "";
  const city = locationLabel.split(",")[0].toLowerCase().trim().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, "_").trim();
  const cityCtx = COUNTRY_CONTEXT[city];
  if (cityCtx) return cityCtx;
  // US state-level fallback from location label
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

const FAST_PROMPT_DUBAI = (query) =>
  `DUBAI ONLY. REJECT: Miami, Boston, New York, Chicago, LA, SF, Austin, London, Paris, Tokyo, Abu Dhabi, any US city.
List ONLY restaurants in DUBAI, UAE. city="Dubai" ALWAYS. Address: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, Dubai.
Return max 8. If unsure = OMIT. ZERO non-Dubai results.`;

/**
 * Post-fetch relevance filter: ensures search results actually match the query name.
 * Strategy:
 *   - If query is short (<=2 chars), keep all results (avoid filtering "DQ" or "AM/PM" etc)
 *   - For multi-word queries: ANY query word must appear in the name (so "Chipotle" matches
 *     "Chipotle Mexican Grill")
 *   - For single-word queries: word must appear as substring in name
 *   - Punctuation in either is normalized away
 *   - Always case-insensitive
 *   - If filter would remove ALL results, return original list (fail-open — better to show
 *     too many results than zero)
 */
function filterByNameRelevance(results, query) {
  if (!Array.isArray(results) || results.length === 0) return results;
  
  // Normalize: lowercase, strip apostrophes/dashes, collapse spaces
  const normalize = (str) => (str || "")
    .toLowerCase()
    .replace(/['\-]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanQuery = normalize(query);
  if (cleanQuery.length <= 1) return results;

  const queryWords = cleanQuery.split(" ").filter(w => w.length >= 2);
  if (queryWords.length === 0) return results;

  // Remove stop words that shouldn't affect brand matching ("Jack in the Box" → ["jack", "box"])
  const STOP_WORDS = new Set(["in", "the", "on", "at", "of", "and", "or", "an", "to", "for", "up"]);
  const brandWords = queryWords.filter(w => !STOP_WORDS.has(w));
  if (brandWords.length === 0) return results;

  // Single-word queries are food-type searches (e.g. "tacos", "pizza") —
  // trust the API/Places results without additional name filtering.
  if (brandWords.length === 1) return results;

  // Multi-word queries are brand-name searches (e.g. "Taco Bell") —
  // ALL words must appear in the name to prevent loose matches like "Taco Time".
  // NO fail-open: if nothing matches, return empty — better to show "nothing found"
  // than to show random taco places when the user searched for Taco Bell.
  const filtered = results.filter(r => {
    const cleanName = normalize(r.name);
    if (!cleanName) return false;
    return brandWords.every(w => cleanName.includes(w));
  });

  return filtered;
}

/**
 * Split a raw query like "Pagliacci Pizza on Mercer Island, WA" into the
 * restaurant-name part and a location hint. Location words inside the query
 * poison API name-searches, so the name goes to the API and the hint goes to
 * ranking. Handles commas ("Name, City, ST"), prepositions ("Name in/on/at/
 * near City"), and a trailing state abbreviation.
 */
const US_STATE_ABBRS = /^(al|ak|az|ar|ca|co|ct|de|dc|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)$/i;

// Canadian province/territory abbreviations (for disambiguation)
const CA_PROVINCES = new Set(["ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt"]);

// Country name/code → ISO 3166-1 alpha-2 (for global disambiguation)
const COUNTRY_ALIASES = {
  "uk": "GB", "united kingdom": "GB", "britain": "GB", "england": "GB", "scotland": "GB", "wales": "GB", "gb": "GB",
  "france": "FR", "fr": "FR",
  "germany": "DE", "de": "DE", "deutschland": "DE",
  "australia": "AU", "au": "AU",
  "canada": "CA",
  "japan": "JP", "jp": "JP",
  "south korea": "KR", "korea": "KR", "kr": "KR",
  "netherlands": "NL", "nl": "NL", "holland": "NL",
  "denmark": "DK", "dk": "DK",
  "new zealand": "NZ", "nz": "NZ",
  "india": "IN", "in": "IN",
  "china": "CN", "cn": "CN",
  "hong kong": "HK", "hk": "HK",
  "brazil": "BR", "br": "BR",
  "uae": "AE", "united arab emirates": "AE", "ae": "AE",
  "singapore": "SG", "sg": "SG",
  "ireland": "IE", "ie": "IE",
  "united states": "US", "usa": "US", "us": "US", "america": "US",
  "spain": "ES", "es": "ES",
  "italy": "IT", "it": "IT",
  "mexico": "MX", "mx": "MX",
  "thailand": "TH", "th": "TH",
  "turkey": "TR", "tr": "TR",
  "greece": "GR", "gr": "GR",
  "portugal": "PT", "pt": "PT",
  "sweden": "SE", "se": "SE",
  "switzerland": "CH", "ch": "CH",
  "austria": "AT", "at": "AT",
  "belgium": "BE", "be": "BE",
  "norway": "NO", "no": "NO",
  "finland": "FI", "fi": "FI",
  "poland": "PL", "pl": "PL",
  "russia": "RU", "ru": "RU",
  "south africa": "ZA", "za": "ZA",
  "argentina": "AR", "ar": "AR",
  "chile": "CL", "cl": "CL",
  "israel": "IL", "il": "IL",
  "egypt": "EG", "eg": "EG",
  "indonesia": "ID", "id": "ID",
  "malaysia": "MY", "my": "MY",
  "philippines": "PH", "ph": "PH",
  "vietnam": "VN", "vn": "VN",
};

/**
 * Resolve the expected country (and optionally state) from a location label.
 * Handles US states ("City, CT" → US/CT), Canadian provinces ("City, BC" → CA/BC),
 * and country names/codes ("City, UK" → GB, "City, France" → FR).
 * Returns { country: "ISO", state?: "CODE" } or null if undeterminable.
 */
function resolveExpectedGeo(location) {
  if (!location) return null;
  const parts = location.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const suffix = parts[parts.length - 1].toLowerCase();
  // US state abbreviation → US
  if (US_STATE_ABBRS.test(suffix)) return { country: "US", state: suffix.toUpperCase() };
  // Canadian province → CA
  if (CA_PROVINCES.has(suffix)) return { country: "CA", state: suffix.toUpperCase() };
  // Country name or code
  const country = COUNTRY_ALIASES[suffix];
  if (country) return { country };
  return null;
}

function parseSearchQuery(raw) {
  let name = (raw || "").trim();
  let hint = "";
  const commaIdx = name.indexOf(",");
  if (commaIdx > 0) {
    hint = name.slice(commaIdx + 1);
    name = name.slice(0, commaIdx);
  } else {
    const m = name.match(/^(.+?)\s+(?:in|on|at|near)\s+(.+)$/i);
    if (m && m[1].trim().length >= 3) { name = m[1]; hint = m[2]; }
  }
  if (!hint) {
    const st = name.match(/^(.+?)\s+([A-Za-z]{2})$/);
    if (st && US_STATE_ABBRS.test(st[2])) { name = st[1]; hint = st[2]; }
  }
  return {
    nameQuery: name.trim(),
    locationHint: hint.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(),
  };
}

/**
 * Order results so the most relevant location is FIRST — no scrolling to find
 * the right branch. Name-match strength plus location-hint presence in the
 * result's city/address/zip. Stable sort: ties keep source order.
 */
function rankByQueryRelevance(results, nameQuery, locationHint) {
  if (!Array.isArray(results) || results.length < 2) return results;
  const norm = (s) => (s || "").toLowerCase().replace(/['\-]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const nameWords = norm(nameQuery).split(" ").filter(w => w.length >= 2);
  const hintWords = (locationHint || "").split(" ").filter(w => w.length >= 2);
  const scoreOf = (r) => {
    const n = norm(r.name);
    const loc = norm(`${r.city || ""} ${r.address || ""} ${r.zip_code || ""}`);
    let s = 0;
    for (const w of nameWords) if (n.includes(w)) s += 2;
    if (nameWords.length > 0 && n === nameWords.join(" ")) s += 2;
    for (const w of hintWords) if (loc.includes(w)) s += 3;
    return s;
  };
  return results
    .map((r, i) => ({ r, i, s: scoreOf(r) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.r);
}

/**
 * Deduplicate results by normalized name + address prefix.
 * Removes redundant entries (same restaurant appearing twice with slight address variations).
 */
function deduplicateResults(results) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const seen = new Set();
  return results.filter(r => {
    const normalize = (str) => (str || "")
      .toLowerCase()
      .replace(/['\-]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const name = normalize(r.name);
    const addr = normalize(r.address).split(" ").slice(0, 3).join(" "); // first 3 address words
    const key = `${name}|${addr}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Filter out unverified / hallucinated / closed results.
 * Drops results where:
 *   - data_confidence is "none" (could not verify the restaurant exists)
 *   - is_currently_operating is explicitly false (confirmed closed)
 * Keeps "low" confidence (restaurant found but no inspection details) since the
 * restaurant is verified to exist — just without a score.
 */
function filterUnverified(results) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const filtered = results.filter(r => {
    const confidence = (r.data_confidence || "").toLowerCase();
    // Drop results the LLM could not verify at all
    if (confidence === "none") return false;
    // Drop confirmed-closed restaurants
    if (r.is_currently_operating === false) return false;
    return true;
  });
  // Fail-open: if filtering removes everything, return original (better to show something)
  const base = filtered.length > 0 ? filtered : results;
  // HARD requirement (no fail-open): AI results must have a street address.
  // An entry with no address can't be tied to a real location — showing it as
  // "Unknown" with no address erodes trust more than showing nothing.
  return base.filter(r => (r.address || "").trim().length >= 5);
}

function llmCall(prompt, internet = false, schema = LLM_SCHEMA) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: schema,
    // Gemini 3 Flash: supports web search, much faster than 3.1 Pro.
    // GPT-5 Mini: fast training-data-only lookup for preliminary results.
    ...(internet ? { model: "gemini_3_flash" } : { model: "gpt_5_mini" }),
  });
}

// GEO-ROUTING: now handled by src/utils/routing.js (backed by src/config/dataSources.json)
// resolveJurisdiction(state, city) → { type: "registry"|"none"|"unknown", countyId? }

// Re-entrancy guard: a geo-routed search() call that itself falls back to AI
// must not geo-route again.
let _geoRouting = false;

/**
 * County-level portal resolver. For states with a `counties` map in
 * usHealthContext.json, looks up the city to find the right county portal.
 * Falls back to state-level description parsing if no county match.
 */
function getStatePortalInfo(state, city, country) {
  return getJurisdictionPortal(state, city, country);
}

function getStateFallbackNote(state, city, country) {
  return getStatePortalInfo(state, city, country).note;
}

async function aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, fetchInfo = {}) {
  // "Worldwide (AI Search)" is a UI placeholder, not a place — passing it to
  // Google Places poisons the query ("...restaurant in Worldwide (AI Search)").
  const rawLabel = locationLabel?.trim() || "";
  const location = rawLabel && rawLabel !== "Worldwide (AI Search)" ? rawLabel : null;
  const primaryCity = location ? location.split(",")[0].trim() : "";
  const { nameQuery: filterQuery } = parseSearchQuery(query);
  const ctx = getCountryContext(countyId);
  const buildFn = (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location || "", primaryCity);

  // 24h result cache: repeat searches render instantly. Enriched results
  // overwrite grounded-only results as they land.
  const seCacheKey = `se-ai-cache-${CACHE_VERSION}:${(location || "global").toLowerCase()}:${query.toLowerCase().trim()}`;
  try {
    const hit = JSON.parse(localStorage.getItem(seCacheKey) || "null");
    const hitTtl = hit?.ttl || 5 * 60 * 1000;
    if (hit && Date.now() - hit.at < hitTtl && Array.isArray(hit.results) && hit.results.length > 0) {
      // Cached results are final — no background enrichment is running.
      // isAI: false prevents a phantom "verifying" spinner that never resolves.
      return { results: hit.results, isAI: false };
    }
  } catch { /* unreadable cache — proceed */ }
  const saveCache = (results) => {
    try { localStorage.setItem(seCacheKey, JSON.stringify({ at: Date.now(), ttl: 24 * 60 * 60 * 1000, results })); } catch { /* quota */ }
  };
  // Short-lived cache (5 min) for grounded-only results before enrichment completes.
  const saveCacheShort = (results) => {
    try { localStorage.setItem(seCacheKey, JSON.stringify({ at: Date.now(), ttl: 5 * 60 * 1000, results })); } catch { /* quota */ }
  };

  // GROUNDED PATH — Google Places establishes which restaurants exist and where
  // (real names, addresses, zips, operating status). The LLM's only job is then
  // finding inspection records for those exact establishments. This prevents
  // hallucinated/address-less entries in jurisdictions with no live API.
  try {
    const placesRes = await base44.functions.invoke("placesRestaurantSearch", { query: filterQuery || query, location });
    const verified = placesRes.data?.restaurants || [];
    if (verified.length > 0) {
      const liveApiNote = fetchInfo.liveApiFailed
        ? "Live government data source was temporarily unavailable. "
        : "";
      const groundedRaw = verified.map(p => ({
        name: p.name,
        address: p.address,
        city: p.city || primaryCity,
        state: p.state || "",
        country: p.country || "",
        zip_code: p.zip_code || "",
        cuisine: p.cuisine || "",
        data_confidence: "low", // verified to exist; no inspection record (yet)
        data_fetch_notes: liveApiNote,
        is_currently_operating: p.business_status === "OPERATIONAL" ? true : null,
        verification_source: "Google Places",
      }));
      const overlay = (built, i) => ({
        ...built,
        latitude: verified[i].latitude,
        longitude: verified[i].longitude,
        place_id: verified[i].place_id,
        country: verified[i].country,
      });
      // Places addresses are authoritative. A result is in-location if the strict
      // city check passes OR the searched city/county appears in the result's
      // address or locality (handles village-vs-town mismatches like
      // Willimantic → Windham CT, and "Windham County" vs locality "Windham").
      const needle = (primaryCity || "").toLowerCase().replace(/\s+county$/i, "").trim();
      const inLocation = (r) => {
        if (r._wrongState) return false; // Hard reject: state/country mismatch
        if (!needle) return true;
        if (!r._wrongLocation) return true;
        return (r.address || "").toLowerCase().includes(needle) ||
               (r.city || "").toLowerCase().includes(needle);
      };
      let grounded = groundedRaw.map((r, i) => ({ ...overlay(buildFn(r, i), i), data_fetch_notes: r.data_fetch_notes || "" })).filter(inLocation);
      grounded = filterByNameRelevance(grounded, filterQuery);
      grounded = deduplicateResults(grounded);

      if (grounded.length > 0) {
        // GEO-ROUTING: derive the inspection jurisdiction from the verified
        // address rather than the user's dropdown selection.
        const route = resolveJurisdiction(verified[0].state, verified[0].city, verified[0].country);

        // Address sits in live-API territory → query the real source (no LLM)
        if (route.type === "registry" && route.countyId !== countyId && !_geoRouting) {
          _geoRouting = true;
          try {
            const routed = await search({ query, countyId: route.countyId, locationLabel, today, onAccurateResults });
            if (routed?.results?.length > 0 && !routed.isAI) {
              saveCache(routed.results);
              return routed;
            }
          } catch { /* routed source failed — continue with grounded flow */ }
          finally { _geoRouting = false; }
        }

        // Jurisdiction is known to publish nothing machine-readable → the
        // grounded list IS the final answer; skip the slow web-search pass.
        // Return isAI: false so the UI doesn't show a "verifying" spinner
        // for a background task that was never started.
        if (route.type === "none") {
          const portal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
          const withNotes = portal.note
            ? grounded.map(r => ({
                ...r,
                portal_url: portal.url,
                portal_name: portal.name,
                data_fetch_notes: (r.data_fetch_notes || "") + portal.note + "Inspection data is not available via automated systems for this jurisdiction.",
              }))
            : grounded;
          saveCache(withNotes);
          return { results: withNotes, isAI: false };
        }

        // Background: inspection enrichment for the verified list only.
        // CT uses training-data-only enrichment (~5s) — web search is too slow
        // for CT's PDF-based inspection system (30-120s timeouts).
        if (verified[0]?.state === "CT") {
          // Set the correct portal link on grounded results so it shows
          // immediately (before enrichment completes). enrichResults spreads
          // ...r so portal_url persists into enriched results too.
          const ctPortal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
          if (ctPortal.url) {
            grounded = grounded.map(r => ({
              ...r,
              portal_url: ctPortal.url,
              portal_name: ctPortal.name,
              data_fetch_notes: (r.data_fetch_notes || "") + (ctPortal.note || ""),
            }));
          }
          enrichResults(grounded, "manchester_ct", (enriched) => {
            if (enriched && enriched.length > 0) {
              saveCache(enriched);
              if (onAccurateResults) onAccurateResults(enriched);
            }
          });
        } else {
        // Other locales: web-search enrichment with location context.
        const enrichCtx = getContextForLocation(countyId, location, verified[0]?.country);
        llmCall(PROMPT_ENRICH(groundedRaw, location, today, enrichCtx), true, INSPECTION_SCHEMA)
          .then((res) => {
            const found = Array.isArray(res?.inspections) ? res.inspections : [];
            const byIdx = new Map(found.filter(f => Number.isInteger(f.idx)).map(f => [f.idx, f]));
            const portal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
            const enriched = groundedRaw.map((raw, i) => {
              const insp = byIdx.get(i);
              const merged = insp ? {
                ...raw,
                latest_score: insp.latest_score ?? null,
                latest_date: insp.latest_date || "",
                latest_result: insp.latest_result || "",
                total_inspections: insp.total_inspections || null,
                violations: insp.violations || [],
                data_confidence: insp.data_confidence || "low",
                verification_source: insp.verification_source || "Google Places",
              } : {
                ...raw,
                portal_url: portal.url,
                portal_name: portal.name,
                data_fetch_notes: (raw.data_fetch_notes || "") + portal.note + "No public inspection records found by AI web search.",
              };
              return { ...overlay(buildFn(merged, i), i), data_fetch_notes: merged.data_fetch_notes || "", portal_url: merged.portal_url, portal_name: merged.portal_name };
            }).filter(inLocation);
            const finalResults = deduplicateResults(filterByNameRelevance(enriched, filterQuery));
            if (finalResults.length > 0) {
              saveCache(finalResults);
              if (onAccurateResults) onAccurateResults(finalResults);
            }
          }).catch(() => {
            try {
              const portal = getStatePortalInfo(verified[0]?.state, verified[0]?.city, verified[0]?.country);
              const failed = grounded.map(r => ({
                ...r,
                portal_url: portal.url,
                portal_name: portal.name,
                data_fetch_notes: (r.data_fetch_notes || "") + portal.note + "AI web search was unable to complete — please try again later.",
              }));
              saveCache(failed);
              if (portal.note && onAccurateResults) onAccurateResults(failed);
            } catch {}
          });
        }
        // Cache grounded-only results with a SHORT TTL (5 min) so a slow/failed
        // enrichment doesn't lock users into "U" grades for 24 hours. When the
        // enrichment completes above, saveCache overwrites with enriched results.
        saveCacheShort(grounded);
        return { results: grounded, isAI: true };
      }
    }
  } catch { /* Places unavailable — fall through to pure-AI flow */ }

  // PURE-AI PATH (previous behavior): only when Places fails or returns nothing
  const basePrompt = location ? PROMPT_LOCATION(query, location, today) : PROMPT_GLOBAL(query, today);
  const enhancedPrompt = ctx ? `${basePrompt}\n- ${ctx}` : basePrompt;
  const restaurants = await runWithFastResults(
    llmCall(FAST_PROMPT(query, location), false),
    llmCall(enhancedPrompt, true),
    buildFn,
    false,
    onAccurateResults,
    filterQuery
  );
  return { results: restaurants, isAI: true };
}

// EXHAUSTIVE forbidden locations
// Dubai location filter — restaurants outside Dubai must be rejected.
// Three lists of forbidden tokens, deduplicated and de-collided.
const US_CITIES = ["miami", "boston", "chicago", "los angeles", "san francisco", "austin", "seattle", "denver", "atlanta", "dallas", "houston", "phoenix", "orlando", "las vegas", "philadelphia"];
const US_STATES = ["florida", "new york", "massachusetts", "illinois", "california", "texas", "colorado", "georgia", "nevada", "pennsylvania", "washington dc"];
const NON_DUBAI = ["london", "paris", "tokyo", "abu dhabi", "dubai creek", "ras al khaimah", "fujairah", "umm al quwain", "ajman", "sharjah"];
// Deduplicate just in case any tokens overlap across lists
const ALL_FORBIDDEN = [...new Set([...US_CITIES, ...US_STATES, ...NON_DUBAI])];

function isDubaiLocation(city, address) {
  const cityLower = (city || "").toLowerCase().trim();
  const addressLower = (address || "").toLowerCase();
  
  // REJECT if any forbidden location found
  if (ALL_FORBIDDEN.some(f => cityLower.includes(f) || addressLower.includes(f))) {
    return false;
  }
  
  // ACCEPT only if city is "dubai" AND address has Dubai marker
  const isDubaiCity = cityLower === "dubai" || cityLower.startsWith("dubai,");
  const hasDubaiAddress = ["jumeirah", "deira", "bur dubai", "marina", "downtown dubai", "jbr", "difc", "business bay", "palm jumeirah", "sheikh zayed", "dubai", "uae"].some(m => addressLower.includes(m));
  
  return isDubaiCity && hasDubaiAddress;
}

function buildRestaurantWithLocationCheck(r, i, countyId, location, expectedCity) {
  // VALIDATE LOCATION ON ORIGINAL DATA BEFORE ANY OVERRIDES
  let isWrongLocation = false;
  let isWrongState = false;
  
  if (countyId === "dubai") {
    isWrongLocation = !isDubaiLocation(r.city, r.address);
    // If wrong location, return early with flag set
    if (isWrongLocation) {
      const built = buildLLMRestaurant(r, i, countyId, location, null);
      return { ...built, _wrongLocation: true };
    }
    // Only override city if location is valid
    const built = {
      ...buildLLMRestaurant(r, i, countyId, location, null),
      city: "Dubai",
      region: "uae",
      country: "UAE",
    };
    return { ...built, _wrongLocation: false };
  } else if (expectedCity && expectedCity !== "Worldwide (AI Search)") {
    const resultCityLower = (r.city || "").toLowerCase().trim();
    const expectedLower = expectedCity.toLowerCase().trim();

    // Use the FULL expected city string for matching, not just the first word.
    // Strip trailing state/country suffixes like ", CT" or ", UAE" for comparison.
    const expectedCleaned = expectedLower.replace(/,.*$/, "").trim();

    // Match if the result city equals or contains the full expected name.
    // For multi-word cities ("New York"), require the entire phrase, not just "new".
    // For single-word cities, allow exact match or "Cityname, ST" style.
    const isMatch = resultCityLower === expectedCleaned ||
                    resultCityLower.startsWith(expectedCleaned + ",") ||
                    resultCityLower.startsWith(expectedCleaned + " ");

    isWrongLocation = expectedCleaned.length > 2 && !isMatch;

    // Guard against city-name collisions across states/countries
    // (Manchester CT vs Manchester UK, Las Vegas NV vs Las Vegas NM,
    // Paris TX vs Paris FR, Vancouver BC vs Vancouver WA, London UK vs London OH).
    // Only fires when the result has state/country data from Google Places.
    if (!isWrongLocation) {
      const expected = resolveExpectedGeo(location);
      if (expected) {
        const resultCountryRaw = (r.country || "").toUpperCase().trim();
        const resultCountry = COUNTRY_ALIASES[resultCountryRaw.toLowerCase()] || resultCountryRaw;
        // Country mismatch → hard reject
        if (resultCountry && resultCountry !== expected.country) {
          isWrongState = true;
        }
        // State mismatch within same country → hard reject
        if (!isWrongState && expected.state) {
          const resultState = (r.state || "").toUpperCase().trim();
          if (resultState && resultState !== expected.state) {
            isWrongState = true;
          }
        }
      }
    }
  }
  
  const built = buildLLMRestaurant(r, i, countyId, location, null);
  return { ...built, _wrongLocation: isWrongLocation, _wrongState: isWrongState };
}

/**
 * FAST-FIRST STRATEGY: return the fast (training-data) LLM results immediately
 * so the user sees results in 2-4 seconds. The accurate (web-search) LLM runs
 * in the background and silently updates results via onAccurateResults when done.
 * Only if fast results are empty do we wait for the web search.
 */
async function runWithFastResults(fastPromise, accuratePromise, buildFn, isDubaiSearch = false, onAccurateResults, nameQuery = "") {
  // Await fast results — this returns in 2-4 seconds.
  // Fast (training-data) results get the SAME verification filter as accurate
  // results — address-less or unverified entries must never reach the UI.
  const fastRes = await fastPromise;
  let fast = filterUnverified(fastRes?.restaurants || []).map(buildFn).filter(r => !r._wrongLocation && !r._wrongState);
  if (isDubaiSearch) {
    fast = fast.filter(r => isDubaiLocation(r.city, r.address));
  }
  if (nameQuery) {
    fast = filterByNameRelevance(fast, nameQuery);
  }
  fast = deduplicateResults(fast);

  // If fast results exist, return them immediately and fire web search in background
  if (fast.length > 0) {
    accuratePromise.then((res) => {
      const verified = filterUnverified(res?.restaurants || []);
      let accurate = verified.map(buildFn).filter(r => !r._wrongLocation && !r._wrongState);
      if (isDubaiSearch) {
        accurate = accurate.filter(r => isDubaiLocation(r.city, r.address));
      }
      if (nameQuery) {
        accurate = filterByNameRelevance(accurate, nameQuery);
      }
      accurate = deduplicateResults(accurate);
      if (accurate.length > 0 && onAccurateResults) onAccurateResults(accurate);
    }).catch(() => {});
    return fast;
  }

  // No fast results — wait for web search to get something to show
  const result = await accuratePromise;
  const verified = filterUnverified(result?.restaurants || []);
  let restaurants = verified.map(buildFn).filter(r => !r._wrongLocation && !r._wrongState);
  if (isDubaiSearch) {
    restaurants = restaurants.filter(r => isDubaiLocation(r.city, r.address));
  }
  if (nameQuery) {
    restaurants = filterByNameRelevance(restaurants, nameQuery);
  }
  return deduplicateResults(restaurants);
}

export async function search({ query, countyId, locationLabel, today, signal, onAccurateResults, onCountUpdate }) {
  // All UK cities route through the live FSA API (national search, UK-wide coverage)
  if (UK_CITY_IDS.has(countyId) || countyId === "uk_fsa") {
    try {
      const res = await base44.functions.invoke("ukFoodRatings", { action: "search", name: query });
      const establishments = res.data?.establishments || [];
      const cityFilter = countyId !== "uk_fsa" ? countyId.replace(/_/g, " ").toLowerCase() : null;
      const filtered = cityFilter
        ? establishments.filter(e => {
            const auth = (e.LocalAuthorityName || "").toLowerCase();
            const addr = [e.AddressLine1, e.AddressLine2, e.AddressLine3, e.AddressLine4].join(" ").toLowerCase();
            return auth.includes(cityFilter) || addr.includes(cityFilter);
          })
        : establishments;
      const pool = filtered.length > 0 ? filtered : establishments;
      const liveResults = filterByNameRelevance(processUKFSAResults(pool), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Singapore — live data via data.gov.sg CKAN API
  if (countyId === "singapore") {
    try {
      const res = await base44.functions.invoke("singaporeInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      if (records.length > 0) {
        const liveResults = filterByNameRelevance(processSingaporeResults(records, res.data?.resourceId), query);
        if (liveResults.length > 0) return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Australia NSW / QLD — live data via state open data portals
  if (countyId === "sydney" || countyId === "brisbane" || countyId === "gold_coast") {
    try {
      const state = (countyId === "brisbane" || countyId === "gold_coast") ? "qld" : "nsw";
      const res = await base44.functions.invoke("australiaFoodSafety", { action: "search", name: query, state });
      const records = res.data?.records || [];
      if (records.length > 0) {
        const liveResults = filterByNameRelevance(processNSWResults(records, res.data?.state), query);
        if (liveResults.length > 0) return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Vancouver, BC — live data from Vancouver Coastal Health disclosure portal
  if (countyId === "vancouver") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("vancouverBCInspections", { action: "search", name: nameQuery });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processVancouverBCResults(facilities), nameQuery),
        nameQuery,
        locationHint
      );
      if (liveResults.length > 0) {
        // VCH returns infraction counts but often null lastInspectionDate —
        // background LLM enrichment fills in dates and current inspection results.
        enrichResults(liveResults, "vancouver", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Toronto DineSafe (CKAN — needs backend proxy)
  if (countyId === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processTorontoResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Boston (CKAN — needs backend proxy)
  if (countyId === "boston") {
    try {
      const res = await base44.functions.invoke("bostonFoodInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processBostonResults(records), query);
      if (liveResults.length > 0) {
        // Boston CKAN has current data but scores are computed from violation
        // counts. Enrichment adds any missing dates/scores from LLM training data.
        enrichResults(liveResults, "boston", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Stanislaus County CA (scraped portal, with AI fallback)
  if (countyId === "stanislaus") {
    try {
      const res = await base44.functions.invoke("stanislausInspections", { action: "search", name: query });
      const facilities = res.data?.facilities || [];
      const liveResults = filterByNameRelevance(processStanislausResults(facilities), query);
      if (liveResults.length > 0) {
        // Stanislaus portal returns dates + permit status but no numeric scores.
        // Background LLM enrichment fills in inspection scores.
        enrichResults(liveResults, "stanislaus", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    // Not in county database — fall back to AI web search
    const location = locationLabel?.trim() || "Modesto, Stanislaus County, CA";
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT(query, location), false),
      llmCall(PROMPT_LOCATION(query, location, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, countyId, location, "Modesto"),
      false,
      onAccurateResults,
      parseSearchQuery(query).nameQuery
    );
    return { results: restaurants, isAI: true };
  }

  // Los Angeles County (ArcGIS Feature Service via backend proxy)
  if (countyId === "la") {
    try {
      const res = await base44.functions.invoke("laCountyInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processLAResults(records), query);
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Houston (CKAN — needs backend proxy)
  if (countyId === "houston") {
    try {
      const res = await base44.functions.invoke("houstonFoodInspections", { action: "search", name: query });
      const records = res.data?.records || [];
      const liveResults = filterByNameRelevance(processHoustonResults(records), query);
      if (liveResults.length > 0) {
        // Houston CKAN data is frozen at 2012 — background LLM enrichment
        // provides current inspection scores from training data.
        enrichResults(liveResults, "houston", onAccurateResults);
        return { results: liveResults, isAI: false };
      }
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Live government API
  if (LIVE_API_IDS.has(countyId)) {
    const entry = API_REGISTRY[countyId];
    // Location words poison name searches ("Pagliacci Pizza on Mercer Island"
    // matches no NAME field) — search the API with the name, rank with the hint.
    const { nameQuery, locationHint } = parseSearchQuery(query);
    let allResults;
    try {
      const raw = await fetch(buildSearchUrl(entry, nameQuery), signal ? { signal } : {}).then(r => r.json());
      allResults = PROCESSORS[countyId].process(raw);
    } catch {
      // Network error, CORS, or abort — fall back to AI search
      return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
    }

    // Post-fetch relevance filter: keep only results whose name actually matches the query.
    // Then rank so the right location is FIRST (e.g. the Mercer Island branch
    // when the query says Mercer Island).
    const results = rankByQueryRelevance(filterByNameRelevance(allResults, nameQuery), nameQuery, locationHint);

    // If live API returned nothing, fall back to AI
    if (results.length === 0) {
      return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
    }

    // Background-fetch true inspection counts and fire onCountUpdate per business
    if (onCountUpdate && countyId !== "delaware" && !entry.isArcGIS) {
      results.forEach(async (biz) => {
        try {
          const countUrl = `${entry.endpoint}?$select=${entry.dateField}&${entry.idField}=${biz.business_id}&$limit=500&$order=${entry.dateField} DESC`;
          const rows = await fetch(countUrl, signal ? { signal } : {}).then(r => r.json());
          if (!Array.isArray(rows) || rows.length === 0) return;
          const keys = new Set(rows.map(row => {
            const v = row[entry.dateField];
            return v ? v.split("T")[0] : null;
          }).filter(Boolean));
          const trueCount = keys.size;
          if (trueCount > biz.totalInspections) {
            onCountUpdate(biz.business_id, trueCount);
          }
        } catch (err) {
          // AbortError is expected when search is replaced; silently ignore.
          // Other errors also silently ignored — these are background polish requests.
        }
        });
        }

    // If any results have stale or missing inspection dates, run background
    // LLM enrichment to provide current scores from training data.
    if (results.some(r => isStale(r.latestDate) || r.safetyScore === null)) {
      enrichResults(results, countyId, onAccurateResults);
    }

    return { results, isAI: false };
  }

  // Wake County, NC (Raleigh area) — ArcGIS REST API
  if (countyId === "wake") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("wakeCountyInspections", { action: "search", name: nameQuery });
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processWakeCountyResults(res.data), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Louisville / Jefferson County, KY — ArcGIS Hub FeatureServer
  if (countyId === "jefferson_ky") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("louisvilleInspections", { action: "search", name: nameQuery });
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processLouisvilleResults(res.data?.records || []), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* live API failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Riverside County, CA — DEH Facility Records Portal (HTML scrape)
  if (countyId === "riverside") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("riversideInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processRiversideResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        // Portal returns facility info + inspection count but no scores/dates.
        // Background LLM enrichment fills in scores from training data.
        enrichResults(liveResults, "riverside", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Maricopa County, AZ (Phoenix metro) — ArcGIS Online FeatureServer
  if (countyId === "maricopa") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("maricopaInspections", { action: "search", query: nameQuery, city: cityName });
      const facilities = res.data?.results || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processMaricopaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        // FeatureServer gives restaurant data but no inspection grades (those
        // are on the Cloudflare-blocked county portal). Background LLM enrichment
        // fills in scores from training data + web search.
        enrichResults(liveResults, "maricopa", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* ArcGIS search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Alabama — state-wide ADPH Food Establishment Scores portal (all 67 counties)
  if (countyId === "alabama") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("alabamaFoodScores", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processAlabamaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Arkansas — state-wide ADH Food Establishment Scores portal (all 75 counties)
  if (countyId === "arkansas") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("arkansasFoodScores", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processArkansasResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        // Portal returns inspection date + type but no numeric scores.
        // Background LLM enrichment fills in scores from training data.
        enrichResults(liveResults, "arkansas", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Washington DC (dc.healthinspections.us)
  if (countyId === "dc") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const res = await base44.functions.invoke("dcInspections", { action: "search", name: nameQuery });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processDCResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Florida — state-wide DBPR Division of Hotels & Restaurants (all 67 counties)
  if (countyId === "florida") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("floridaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processFloridaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) {
        // Portal returns facility data but scores require detail fetches.
        // Background LLM enrichment fills in scores from training data.
        enrichResults(liveResults, "florida", onAccurateResults);
        return { results: liveResults, isAI: true };
      }
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Georgia — state-wide DPH portal (ga.healthinspections.us)
  if (countyId === "georgia") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("georgiaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processGeorgiaResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Illinois CDP Portal — multi-county (Sangamon, Madison, Peoria, Whiteside, McLean, Christian)
  if (countyId === "illinois_cdp") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("illinoisInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processIllinoisCDPResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Indiana Marion County (Indianapolis) — MCPHD Portal
  if (countyId === "indiana_marion") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "Indianapolis";
      const res = await base44.functions.invoke("indianaInspections", { action: "search", name: nameQuery, city: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processIndianaMarionResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Farmington Valley Health District (FVHD) — CT
  // Covers Avon, Barkhamsted, Canton, Colebrook, East Granby, Farmington,
  // Granby, Hartland, New Hartford, Simsbury
  if (countyId === "fvhd") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "";
      const res = await base44.functions.invoke("fvhdInspections", { action: "search", name: nameQuery, town: cityName });
      const facilities = res.data?.facilities || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processFVHDResults(facilities), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* portal search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Southern Nevada Health District — Clark County (Las Vegas)
  if (countyId === "snhd") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      const cityName = locationLabel?.split(",")[0]?.trim() || "Las Vegas, NV";
      const res = await base44.functions.invoke("snhdInspections", { action: "search", name: nameQuery, city_name: cityName });
      const restaurants = res.data?.restaurants || [];
      const liveResults = rankByQueryRelevance(
        filterByNameRelevance(processSNHDResults(restaurants), nameQuery),
        nameQuery, locationHint
      );
      if (liveResults.length > 0) return { results: liveResults, isAI: false };
    } catch { /* SNHD search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Tacoma-Pierce County (Accela Citizen Access portal)
  if (countyId === "pierce") {
    try {
      const { nameQuery, locationHint } = parseSearchQuery(query);
      // Accela does a contains-match but fails on long multi-word queries.
      // Try the full name first; if nothing, fall back to first word only.
      let res = await base44.functions.invoke("tacomaPierceInspections", { action: "search", name: nameQuery });
      let facilities = res.data?.facilities || [];
      if (facilities.length === 0) {
        const firstWord = nameQuery.split(/\s+/)[0];
        if (firstWord && firstWord.length >= 3 && firstWord.toLowerCase() !== nameQuery.toLowerCase()) {
          res = await base44.functions.invoke("tacomaPierceInspections", { action: "search", name: firstWord });
          facilities = res.data?.facilities || [];
        }
      }
      if (facilities.length > 0) {
        const liveResults = rankByQueryRelevance(
          filterByNameRelevance(processTacomaPierceResults(facilities), nameQuery),
          nameQuery, locationHint
        );
        if (liveResults.length > 0) {
          // Background LLM enrichment for TPCHD inspection scores.
          // Accela returns facility permit data but not inspection scores.
          enrichResults(liveResults, "pierce", onAccurateResults);
          return { results: liveResults, isAI: true };
        }
      }
    } catch { /* Accela search failed — fall through to AI */ }
    return aiSearchFallback(query, countyId, locationLabel, today, onAccurateResults, { liveApiFailed: true });
  }

  // Dubai — fully isolated path
  if (countyId === "dubai") {
    const restaurants = await runWithFastResults(
      llmCall(FAST_PROMPT_DUBAI(query), false),
      llmCall(PROMPT_DUBAI(query, today), true),
      (r, i) => buildRestaurantWithLocationCheck(r, i, "dubai", "Dubai", "Dubai"),
      true,
      onAccurateResults,
      parseSearchQuery(query).nameQuery
      );
    return { results: restaurants, isAI: true };
  }

  // AI global/location search — route through the Places-grounded fallback so
  // uncovered cities (e.g. "Subway in Ellensburg, WA") return verified real
  // restaurants (with addresses/zips that unlock the water card) instead of
  // the pure-LLM path. Places also autocorrects typos ("ellenburg" → Ellensburg).
  // aiSearchFallback degrades to the pure-AI path itself if Places finds nothing.
  const location = locationLabel?.trim() && locationLabel !== "Worldwide (AI Search)" ? locationLabel.trim() : null;
  return aiSearchFallback(query, countyId, location, today, onAccurateResults);
}

export async function fetchDetail(restaurant) {
  const { source, business_id, isLLMData } = restaurant;
  if (isLLMData || source === "dubai" || source === "llm") return llmToDetailRows(restaurant);

  // Toronto DineSafe — CKAN detail fetch
  if (source === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "detail", establishmentId: business_id });
      const records = res.data?.records || [];
      return torontoToDetailRows(records);
    } catch { return []; }
  }

  // Vancouver, BC — VCH disclosure portal inspection history
  if (source === "vancouver_bc") {
    try {
      const res = await base44.functions.invoke("vancouverBCInspections", { action: "detail", facilityId: business_id });
      return vancouverBCToDetailRows(res.data?.inspections || []);
    } catch { return []; }
  }

  // Boston — CKAN detail fetch
  if (source === "boston") {
    try {
      const res = await base44.functions.invoke("bostonFoodInspections", { action: "detail", licenseno: business_id });
      return bostonToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  // Singapore
  if (source === "singapore") {
    return singaporeToDetailRows(restaurant);
  }

  // Australia NSW / QLD
  if (source === "australia_nsw" || source === "australia_qld") {
    return nswToDetailRows(restaurant);
  }

  // Los Angeles County (ArcGIS)
  if (source === "la") {
    try {
      const res = await base44.functions.invoke("laCountyInspections", { action: "detail", facilityId: business_id });
      return laToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  // Stanislaus County
  if (source === "stanislaus") {
    return stanislausToDetailRows(restaurant);
  }

  // Riverside County, CA
  if (source === "riverside") {
    return riversideToDetailRows(restaurant);
  }

  // Alabama (state-wide ADPH)
  if (source === "alabama") {
    return alabamaToDetailRows(restaurant);
  }

  // Arkansas (state-wide ADH)
  if (source === "arkansas") {
    return arkansasToDetailRows(restaurant);
  }

  // Farmington Valley Health District (FVHD), CT
  if (source === "fvhd") {
    return fvhdToDetailRows(restaurant);
  }

  // Washington DC
  if (source === "dc") {
    return dcToDetailRows(restaurant);
  }

  // Georgia DPH
  if (source === "georgia") {
    return georgiaToDetailRows(restaurant);
  }

  // Florida DBPR
  if (source === "florida") {
    try {
      const res = await base44.functions.invoke("floridaInspections", { action: "detail", license_id: restaurant._license_id || restaurant.business_id });
      const inspections = res.data?.inspections || [];
      const enriched = { ...restaurant, _inspections: inspections };
      // Update restaurant with latest inspection data
      if (inspections.length > 0) {
        const latest = inspections[0];
        enriched.safetyScore = latest.safetyScore;
        enriched.latestDate = latest.date;
        enriched.latestResult = latest.result;
        enriched.totalInspections = inspections.length;
        enriched.grade = latest.safetyScore >= 90 ? "A" : latest.safetyScore >= 80 ? "B" : latest.safetyScore >= 70 ? "C" : latest.safetyScore >= 50 ? "D" : "F";
      }
      return floridaToDetailRows(enriched);
    } catch { return floridaToDetailRows(restaurant); }
  }

  // Maricopa County, AZ — detail from enrichment data (portal is Cloudflare-blocked)
  if (source === "maricopa") {
    return maricopaToDetailRows(restaurant);
  }

  // Tacoma-Pierce County — detail from enrichment data stored on restaurant
  if (source === "tacoma_pierce") {
    return tacomaPierceToDetailRows(restaurant);
  }

  // Southern Nevada Health District — full inspection history
  if (source === "snhd") {
    try {
      const res = await base44.functions.invoke("snhdInspections", { action: "detail", permit_number: restaurant.business_id });
      return snhdToDetailRows(res.data);
    } catch { return []; }
  }

  // Houston — CKAN detail fetch
  if (source === "houston") {
    try {
      const res = await base44.functions.invoke("houstonFoodInspections", { action: "detail", facilityAccountNumber: business_id });
      return houstonToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  // Wake County, NC — full inspection history
  if (source === "wake") {
    try {
      const res = await base44.functions.invoke("wakeCountyInspections", { action: "detail", hsisid: business_id });
      return wakeCountyToDetailRows(res.data);
    } catch { return []; }
  }

  // Louisville / Jefferson County, KY — full inspection history
  if (source === "louisville") {
    try {
      const res = await base44.functions.invoke("louisvilleInspections", { action: "detail", establishmentId: business_id });
      return louisvilleToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  // UK FSA — use score descriptor endpoint
  if (source === "uk_fsa") {
    try {
      const res = await base44.functions.invoke("ukFoodRatings", { action: "detail", fhrsId: restaurant.fhrsId });
      const descriptors = res.data?.scoreDescriptors || [];
      // Build detail rows from score descriptors
      if (descriptors.length > 0) {
        return descriptors.map((d, i) => ({
          inspection_serial_num: `uk-${restaurant.fhrsId}-${i}`,
          inspection_date: restaurant.latestDate,
          inspection_score: String(d.Score || 0),
          inspection_result: restaurant.latestResult || "",
          inspection_type: "Food Hygiene Rating (FSA)",
          violation_description: d.Score > 0 ? `${d.ScoreCategory}: ${d.Description || "Improvement required"}` : `${d.ScoreCategory}: ${d.Description || "Very good"}`,
          violation_type: d.Score > 15 ? "RED" : "BLUE",
          violation_points: String(d.Score || 0),
        }));
      }
    } catch {}
    return ukFSAToDetailRows(restaurant);
  }

  const countyId = SOURCE_TO_COUNTY[source] || source;
  const entry = API_REGISTRY[countyId];
  if (!entry) return [];

  // Delaware: business_id is "name-address", need to split and query
  if (countyId === "delaware") {
    try {
      const [restname, ...addrParts] = business_id.split("-");
      const restaddress = addrParts.join("-");
      const url = `${entry.endpoint}?$where=upper(restname)='${encodeURIComponent((restname || "").toUpperCase())}' AND upper(restaddress)='${encodeURIComponent((restaddress || "").toUpperCase())}'&$limit=500&$order=${entry.dateField} DESC`;
      const data = await fetch(url).then(r => r.json());
      return delawareToDetailRows(Array.isArray(data) ? data : []);
    } catch { return []; }
  }

  try {
    const data = await fetch(buildDetailUrl(entry, business_id)).then(r => r.json());
    const rows = Array.isArray(data) ? data : (data?.features?.map(f => f.attributes) || []);
    return PROCESSORS[countyId].toDetailRows(rows);
  } catch { return []; }
}