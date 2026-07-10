import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE EATS — GLOBAL HEALTH DEPARTMENT SOURCE MAP (SOURCE OF TRUTH)
// ═══════════════════════════════════════════════════════════════════════════════
// Every entry maps a city/municipality to its governing health department and
// the rating system that department uses, so the app always knows which scoring
// system to apply for any given location.
//
// source_type:
//   "live_api"      — direct browser fetch to Socrata/ArcGIS open-data endpoint
//   "backend_proxy" — server-side function (CORS-protected / CKAN / scraped portal)
//   "ai_enrichment" — Google Places grounds the list; LLM finds inspection scores
//   "ai_only"       — pure LLM (training data + web search), no Places grounding
//
// rating_scale describes the NATIVE system; the app converts everything to a
// unified 0-100 SafeEats score.
// ═══════════════════════════════════════════════════════════════════════════════

const SOURCES = [
  // ─── NORTH AMERICA: UNITED STATES (LIVE API) ───────────────────────────────
  { id: "king", dept: "Public Health — Seattle & King County", city: "Seattle", state: "WA", country: "US", type: "live_api", api: "king", fn: null, rating: "Red/Blue violation point deduction from 100. Red = critical, Blue = non-critical.", scale: "0-100 numeric (100 = perfect)", enrich: false, ctx: "" },
  { id: "nyc", dept: "NYC Department of Health and Mental Hygiene", city: "New York", state: "NY", country: "US", type: "live_api", api: "nyc", fn: null, rating: "Letter grade A/B/C based on violation points. 0-13 = A, 14-27 = B, 28+ = C.", scale: "A/B/C letter grade → 0-100", enrich: false, ctx: "" },
  { id: "cook", dept: "Chicago Department of Public Health", city: "Chicago", state: "IL", country: "US", type: "live_api", api: "cook", fn: null, rating: "Pass / Pass w/ Conditions / Fail. Risk level 1-3.", scale: "Pass/Fail → 0-100", enrich: false, ctx: "" },
  { id: "montgomery_md", dept: "Montgomery County DHHS", city: "Rockville", state: "MD", country: "US", type: "live_api", api: "montgomery_md", fn: null, rating: "Numeric score 0-100 based on critical and non-critical violations.", scale: "0-100 numeric", enrich: false, ctx: "" },
  { id: "travis", dept: "Austin Public Health", city: "Austin", state: "TX", country: "US", type: "live_api", api: "travis", fn: null, rating: "Score 0-100 based on demerit points deducted from 100.", scale: "0-100 numeric", enrich: false, ctx: "" },
  { id: "sf", dept: "San Francisco Department of Public Health", city: "San Francisco", state: "CA", country: "US", type: "live_api", api: "sf", fn: null, rating: "Numeric score 0-100. Results: Satisfactory, Unsatisfactory, Incomplete.", scale: "0-100 numeric", enrich: false, ctx: "" },
  { id: "delaware", dept: "Delaware Health and Social Services", city: "Statewide", state: "DE", country: "US", type: "live_api", api: "delaware", fn: null, rating: "Compliant / Non-Compliant with violation details.", scale: "Pass/Fail → 0-100", enrich: false, ctx: "" },
  { id: "ny_state", dept: "New York State Department of Health", city: "Statewide", state: "NY", country: "US", type: "live_api", api: "ny_state", fn: null, rating: "Critical / Non-Critical violations. Pass/Fail outcome.", scale: "Pass/Fail → 0-100", enrich: false, ctx: "" },

  // ─── NORTH AMERICA: UNITED STATES (BACKEND PROXY) ──────────────────────────
  { id: "la", dept: "LA County Department of Public Health", city: "Los Angeles", state: "CA", country: "US", type: "backend_proxy", api: null, fn: "laCountyInspections", rating: "Score 0-100 based on violation deductions. Grade A/B/C.", scale: "0-100 numeric with A/B/C grade", enrich: false, ctx: "" },
  { id: "houston", dept: "Houston Health Department", city: "Houston", state: "TX", country: "US", type: "backend_proxy", api: null, fn: "houstonFoodInspections", rating: "0-100 ded point system, lower is better. 0-10 ded→90-100, 11-20→70-89, 21-30→40-69, 30+→0-39.", scale: "Deduction points (inverted to 0-100)", enrich: true, ctx: "Houston CKAN data frozen at 2012 — LLM provides current scores from training data." },
  { id: "boston", dept: "Boston Inspectional Services Department", city: "Boston", state: "MA", country: "US", type: "backend_proxy", api: null, fn: "bostonFoodInspections", rating: "Pass/Fail based on major and minor violation counts.", scale: "Pass/Fail → 0-100 from violation counts", enrich: true, ctx: "Boston CKAN has current data but scores computed from violation counts." },
  { id: "stanislaus", dept: "Stanislaus County Environmental Health", city: "Modesto", state: "CA", country: "US", type: "backend_proxy", api: null, fn: "stanislausInspections", rating: "Permit status (Active/Inactive) with inspection dates. No numeric scores published.", scale: "No native score (enrichment provides 0-100)", enrich: true, ctx: "Stanislaus County Environmental Health (stancounty.com). Facilities inspected 1-4 times/year." },
  { id: "pierce", dept: "Tacoma-Pierce County Health Department (TPCHD)", city: "Tacoma", state: "WA", country: "US", type: "backend_proxy", api: null, fn: "tacomaPierceInspections", rating: "Great (≤135 red pts)→90-100, Okay (136-299)→70-89, Needs to Improve (≥300)→40-69, Closed→0-39.", scale: "Red point thresholds → 0-100", enrich: true, ctx: "TPCHD rating: Great, Okay, Needs to Improve, or Closed. Based on red critical violation points from last 4 routine inspections." },

  // ─── NORTH AMERICA: UNITED STATES (AI ENRICHMENT — county/city health depts) ──
  { id: "manchester_ct", dept: "Manchester CT Health Department", city: "Manchester", state: "CT", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Green/Yellow/Red placard. Green=Pass(0-1 priority violations)→90-100, Yellow=Conditional(2+)→70-89, Red=Closed→0-39.", scale: "Green/Yellow/Red placard → 0-100", enrich: true, ctx: "Manchester CT (manchesterct.gov) Green/Yellow/Red placard system. CT DPH uses Priority (P), Priority Foundation (Pf), Core (C) categories. Also check decadeonline.com." },
  { id: "denver", dept: "Denver Environmental Health & Safety", city: "Denver", state: "CO", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail from Denver Environmental Health.", scale: "0-100 numeric or Pass/Fail", enrich: true, ctx: "Denver Environmental Health & Safety restaurant inspection scores (denvergov.org)." },
  { id: "dallas", dept: "Dallas County Health and Human Services", city: "Dallas", state: "TX", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Demerit-based deduction from 100.", scale: "0-100 numeric", enrich: true, ctx: "Dallas County Health and Human Services food establishment inspection records (dallascounty.org)." },
  { id: "miami", dept: "Miami-Dade County Environmental Health", city: "Miami", state: "FL", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric inspection scores and violation details.", scale: "0-100 numeric", enrich: true, ctx: "Miami-Dade County food inspection database (miamidade.gov)." },
  { id: "las_vegas", dept: "Southern Nevada Health District (SNHD)", city: "Las Vegas", state: "NV", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Letter grade A/B/C with demerit points. 0-10 demerits=A, 11-20=B, 21+=C.", scale: "A/B/C letter grade → 0-100", enrich: true, ctx: "SNHD restaurant inspection database (snhd.info). Clark County inspections." },
  { id: "phoenix", dept: "Maricopa County Environmental Services", city: "Phoenix", state: "AZ", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Conditional/Fail.", scale: "0-100 numeric or Pass/Fail", enrich: true, ctx: "Maricopa County Environmental Services (maricopa.gov) restaurant inspection database." },
  { id: "orlando", dept: "Florida DBPR Division of Hotels and Restaurants", city: "Orlando", state: "FL", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional Pass/Closed with violation details.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Florida DBPR (myfloridalicense.com) Division of Hotels and Restaurants inspection reports." },
  { id: "philadelphia", dept: "Philadelphia Department of Public Health", city: "Philadelphia", state: "PA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail with violation categories.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Philadelphia Department of Public Health (phila.gov) restaurant inspection database." },
  { id: "atlanta", dept: "Fulton County Environmental Health Services", city: "Atlanta", state: "GA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Letter grade A/B/C/U or numeric score.", scale: "A/B/C letter grade → 0-100", enrich: true, ctx: "Fulton County Environmental Health Services restaurant inspection scores." },
  { id: "nashville", dept: "Nashville/Davidson County Metro Public Health Dept", city: "Nashville", state: "TN", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Nashville/Davidson County Metro Public Health Department restaurant inspection scores." },
  { id: "charlotte", dept: "Mecklenburg County Environmental Health", city: "Charlotte", state: "NC", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Letter grade A/B/C or numeric score.", scale: "A/B/C letter grade → 0-100", enrich: true, ctx: "Mecklenburg County Environmental Health restaurant inspection database (mecknc.gov)." },
  { id: "raleigh", dept: "Wake County Environmental Health", city: "Raleigh", state: "NC", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric score or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Wake County Environmental Health (wake.gov) restaurant inspection scores." },
  { id: "columbus", dept: "Columbus Public Health", city: "Columbus", state: "OH", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail or numeric score.", scale: "0-100 numeric or Pass/Fail", enrich: true, ctx: "Columbus Public Health (columbus.gov) restaurant inspection database." },
  { id: "minneapolis", dept: "Minneapolis Environmental Health / Hennepin County", city: "Minneapolis", state: "MN", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Minneapolis Environmental Health (minneapolismn.gov) and Hennepin County." },
  { id: "pittsburgh", dept: "Allegheny County Health Department", city: "Pittsburgh", state: "PA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Allegheny County Health Department (achd.net) restaurant inspection database." },
  { id: "sacramento", dept: "Sacramento County Environmental Management Dept", city: "Sacramento", state: "CA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric score 0-100.", scale: "0-100 numeric", enrich: true, ctx: "Sacramento County Environmental Management Department (emd.saccounty.gov)." },
  { id: "san_diego", dept: "San Diego County Dept of Environmental Health", city: "San Diego", state: "CA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "San Diego County Department of Environmental Health (sdcounty.ca.gov)." },
  { id: "spokane", dept: "Spokane Regional Health District", city: "Spokane", state: "WA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric score or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Spokane Regional Health District (srhd.org) restaurant inspection records." },
  { id: "portland", dept: "Multnomah County Environmental Health", city: "Portland", state: "OR", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Multnomah County Environmental Health (multco.us) restaurant inspection scores." },
  { id: "milwaukee", dept: "City of Milwaukee Health Department", city: "Milwaukee", state: "WI", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Letter grade A/B/C assigned to point value from routine annual inspection.", scale: "A/B/C letter grade → 0-100", enrich: true, ctx: "City of Milwaukee Health Department Food Sanitation Grading System (city.milwaukee.gov)." },
  { id: "detroit", dept: "Detroit Health Department", city: "Detroit", state: "MI", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail with violation points.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Detroit Health Department restaurant inspection records." },
  { id: "st_louis", dept: "St. Louis County Dept of Public Health", city: "St. Louis", state: "MO", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "St. Louis County Department of Public Health restaurant inspection records." },
  { id: "tampa", dept: "Florida DBPR / Hillsborough County", city: "Tampa", state: "FL", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional Pass/Closed (FL DBPR standard).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Florida DBPR (myfloridalicense.com) inspection reports for Tampa/Hillsborough County." },
  { id: "memphis", dept: "Shelby County Health Department", city: "Memphis", state: "TN", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Shelby County Health Department restaurant inspection scores." },
  { id: "louisville", dept: "Louisville Metro Department of Public Health", city: "Louisville", state: "KY", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Louisville Metro Department of Public Health and Wellness restaurant inspections." },
  { id: "baltimore", dept: "Baltimore City Health Department", city: "Baltimore", state: "MD", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Baltimore City Health Department restaurant inspection records." },
  { id: "el_paso", dept: "El Paso Department of Public Health", city: "El Paso", state: "TX", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "El Paso Department of Public Health restaurant inspection records." },
  { id: "fort_worth", dept: "Tarrant County Public Health", city: "Fort Worth", state: "TX", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Tarrant County Public Health restaurant inspection records." },
  { id: "indianapolis", dept: "Marion County Public Health Department", city: "Indianapolis", state: "IN", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Marion County Public Health Department restaurant inspection records." },
  { id: "jacksonville", dept: "Florida DBPR / Duval County", city: "Jacksonville", state: "FL", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional Pass/Closed (FL DBPR standard).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Florida DBPR (myfloridalicense.com) inspection reports for Jacksonville/Duval County." },
  { id: "cleveland", dept: "Cuyahoga County Board of Health", city: "Cleveland", state: "OH", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Cuyahoga County Board of Health restaurant inspection records." },
  { id: "cincinnati", dept: "Cincinnati Health Department", city: "Cincinnati", state: "OH", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Cincinnati Health Department restaurant inspection records." },
  { id: "kansas_city", dept: "Kansas City Health Department", city: "Kansas City", state: "MO", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Kansas City Health Department restaurant inspection records." },
  { id: "new_orleans", dept: "Louisiana Dept of Health / New Orleans", city: "New Orleans", state: "LA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Letter grade A/B/C or Pass/Fail.", scale: "A/B/C → 0-100", enrich: true, ctx: "Louisiana Department of Health restaurant inspection records for New Orleans." },
  { id: "honolulu", dept: "Hawaii Department of Health", city: "Honolulu", state: "HI", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail with colored placard (green/yellow/red).", scale: "Placard → 0-100", enrich: true, ctx: "Hawaii Department of Health (health.hawaii.gov) restaurant inspection placard system." },
  { id: "anchorage", dept: "Anchorage Health Department", city: "Anchorage", state: "AK", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Anchorage Health Department restaurant inspection records." },
  { id: "albuquerque", dept: "Albuquerque Environmental Health Dept", city: "Albuquerque", state: "NM", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Albuquerque Environmental Health Department restaurant inspection records." },
  { id: "tucson", dept: "Pima County Health Department", city: "Tucson", state: "AZ", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Pima County Health Department restaurant inspection records." },
  { id: "fresno", dept: "Fresno County Department of Public Health", city: "Fresno", state: "CA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Fresno County Department of Public Health restaurant inspection records." },
  { id: "long_beach_ca", dept: "Long Beach Department of Health and Human Services", city: "Long Beach", state: "CA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Long Beach Department of Health and Human Services restaurant inspection records." },
  { id: "miami_beach", dept: "Miami Beach Environmental Health", city: "Miami Beach", state: "FL", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Numeric inspection scores.", scale: "0-100 numeric", enrich: true, ctx: "Miami Beach Environmental Health restaurant inspection records." },
  { id: "arlington_va", dept: "Arlington County Dept of Human Services", city: "Arlington", state: "VA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Arlington County Department of Human Services restaurant inspection records." },
  { id: "newark", dept: "Newark Dept of Health and Community Wellness", city: "Newark", state: "NJ", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Newark Department of Health and Community Wellness restaurant inspection records." },
  { id: "buffalo", dept: "Erie County Dept of Health", city: "Buffalo", state: "NY", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Erie County Department of Health restaurant inspection records." },
  { id: "richmond_va", dept: "Virginia Department of Health / Richmond", city: "Richmond", state: "VA", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Virginia Department of Health restaurant inspection records for Richmond." },
  { id: "oklahoma_city", dept: "Oklahoma City-County Health Dept", city: "Oklahoma City", state: "OK", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Oklahoma City-County Health Department restaurant inspection records." },
  { id: "tucson_az", dept: "Pima County Health Department", city: "Tucson", state: "AZ", country: "US", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 or Pass/Fail.", scale: "0-100 numeric", enrich: true, ctx: "Pima County Health Department restaurant inspection records." },

  // ─── NORTH AMERICA: CANADA ─────────────────────────────────────────────────
  { id: "vancouver", dept: "Vancouver Coastal Health (VCH)", city: "Vancouver", state: "BC", country: "CA", type: "backend_proxy", api: null, fn: "vancouverBCInspections", rating: "Pass / Conditional Pass / Closed. Hazard: Low/Moderate/High.", scale: "Pass/Conditional/Closed → 0-100", enrich: true, ctx: "Vancouver Coastal Health (VCH) restaurant inspection records from inspections.vch.ca." },
  { id: "toronto", dept: "Toronto Public Health (DineSafe)", city: "Toronto", state: "ON", country: "CA", type: "backend_proxy", api: null, fn: "torontoDineSafe", rating: "Pass / Conditional Pass / Closed. Yellow/Red/Green sign.", scale: "Pass/Conditional/Closed → 0-100", enrich: false, ctx: "" },
  { id: "calgary", dept: "Alberta Health Services", city: "Calgary", state: "AB", country: "CA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Closed.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Alberta Health Services food inspection records for Calgary." },
  { id: "edmonton", dept: "Alberta Health Services", city: "Edmonton", state: "AB", country: "CA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Closed.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Alberta Health Services food inspection records for Edmonton." },
  { id: "montreal", dept: "MAPAQ (Ministère de l'Agriculture, des Pêcheries et de l'Alimentation)", city: "Montreal", state: "QC", country: "CA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail. Letter grade A/B/C from MAPAQ.", scale: "A/B/C or Pass/Fail → 0-100", enrich: true, ctx: "MAPAQ Québec food inspection records and Montreal public health inspection data." },
  { id: "ottawa", dept: "Ottawa Public Health", city: "Ottawa", state: "ON", country: "CA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Closed.", scale: "Pass/Conditional/Closed → 0-100", enrich: true, ctx: "Ottawa Public Health food premise inspection reports (ottawapublichealth.ca)." },
  { id: "winnipeg", dept: "Manitoba Health / Winnipeg Regional Health Authority", city: "Winnipeg", state: "MB", country: "CA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Closed.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Manitoba Health / Winnipeg Regional Health Authority food inspection records." },
  { id: "halifax", dept: "Halifax Regional Municipality / NS Health", city: "Halifax", state: "NS", country: "CA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Closed.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Halifax Regional Municipality / Nova Scotia Health food inspection records." },

  // ─── NORTH AMERICA: MEXICO ─────────────────────────────────────────────────
  { id: "mexico_city", dept: "COFEPRIS (Federal Commission for Protection Against Sanitary Risks)", city: "Mexico City", state: null, country: "MX", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme (compliant/non-compliant) with violation categories.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "COFEPRIS (cofepris.gob.mx) food safety inspection. Focus on food handling conditions, temperature controls, supplier traceability." },
  { id: "guadalajara", dept: "COFEPRIS / Jalisco Health Dept", city: "Guadalajara", state: "JAL", country: "MX", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "COFEPRIS / Jalisco State Health Department food inspection records." },
  { id: "monterrey", dept: "COFEPRIS / Nuevo León Health Dept", city: "Monterrey", state: "NL", country: "MX", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "COFEPRIS / Nuevo León State Health Department food inspection records." },
  { id: "cancun", dept: "COFEPRIS / Quintana Roo Health Dept", city: "Cancún", state: "QR", country: "MX", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "COFEPRIS / Quintana Roo State Health Department food inspection records." },
  { id: "tijuana", dept: "COFEPRIS / Baja California Health Dept", city: "Tijuana", state: "BC", country: "MX", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "COFEPRIS / Baja California State Health Department food inspection records." },

  // ─── SOUTH AMERICA ──────────────────────────────────────────────────────────
  { id: "sao_paulo", dept: "VISA São Paulo (Vigilância Sanitária)", city: "São Paulo", state: null, country: "BR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Não conforme with violation details.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "VISA São Paulo (cvs.saude.sp.gov.br) Vigilância Sanitária restaurant inspection records." },
  { id: "rio", dept: "VISA Rio de Janeiro (Vigilância Sanitária)", city: "Rio de Janeiro", state: null, country: "BR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Não conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "VISA Rio de Janeiro (rio.rj.gov.br/web/cvs) food establishment inspection records." },
  { id: "brasilia", dept: "ANVISA / VISA Distrito Federal", city: "Brasília", state: null, country: "BR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Não conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ANVISA / VISA Distrito Federal food inspection records." },
  { id: "buenos_aires", dept: "SENASA / AGA (Buenos Aires City Health)", city: "Buenos Aires", state: null, country: "AR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Apto/No apto (suitable/not suitable).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SENASA / AGA Buenos Aires food establishment inspection records." },
  { id: "santiago", dept: "SEREMI Health / ACHIPEG", city: "Santiago", state: null, country: "CL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Sí/No conforme. Regional SEREMI Health inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SEREMI Health (Región Metropolitana) / ACHIPEG restaurant inspection records." },
  { id: "bogota", dept: "INVIMA (Instituto Nacional de Vigilancia de Medicamentos y Alimentos)", city: "Bogotá", state: null, country: "CO", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme with sanitary registry.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "INVIMA (invima.gov.co) food establishment inspection records." },
  { id: "lima", dept: "DIGESA (Dirección General de Salud Ambiental)", city: "Lima", state: null, country: "PE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme. Sanitary certification required.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "DIGESA (digesa.minsa.gob.pe) food establishment inspection records." },
  { id: "quito", dept: "ARCSA (Agencia de Regulación y Control Sanitario)", city: "Quito", state: null, country: "EC", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ARCSA Ecuador food establishment inspection records." },
  { id: "caracas", dept: "SACS / Ministerio de Salud (Venezuela)", city: "Caracas", state: null, country: "VE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SACS / Ministerio de Salud Venezuela food establishment inspection records." },
  { id: "montevideo", dept: "DGSS / Ministerio de Salud Pública (Uruguay)", city: "Montevideo", state: null, country: "UY", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "DGSS / Ministerio de Salud Pública Uruguay food establishment inspection records." },

  // ─── EUROPE: UNITED KINGDOM & IRELAND ───────────────────────────────────────
  { id: "uk_fsa", dept: "Food Standards Agency (UK FSA)", city: "Multiple", state: null, country: "GB", type: "backend_proxy", api: null, fn: "ukFoodRatings", rating: "FHRS 0-5: 0=Urgent improvement, 1=Major improvement, 2=Improvement, 3=Generally satisfactory, 4=Good, 5=Very good.", scale: "0-5 FHRS → 0-100", enrich: false, ctx: "" },
  { id: "dublin", dept: "FSAI (Food Safety Authority of Ireland)", city: "Dublin", state: null, country: "IE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Enforcement orders: Closure Order / Improvement Notice / Prohibition Order. No numeric score.", scale: "Enforcement status → 0-100", enrich: true, ctx: "FSAI (fsai.ie) enforcement orders and closure notices, Dublin City Council food safety inspection records." },
  { id: "cork", dept: "FSAI / Cork City Council", city: "Cork", state: null, country: "IE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Enforcement orders / inspection compliance.", scale: "Enforcement status → 0-100", enrich: true, ctx: "FSAI (fsai.ie) and Cork City Council food safety inspection records." },
  { id: "galway", dept: "FSAI / Galway City Council", city: "Galway", state: null, country: "IE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Enforcement orders / inspection compliance.", scale: "Enforcement status → 0-100", enrich: true, ctx: "FSAI (fsai.ie) and Galway City Council food safety inspection records." },

  // ─── EUROPE: FRANCE ─────────────────────────────────────────────────────────
  { id: "paris", dept: "DGCCRF (Alim'confiance)", city: "Paris", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier: Très satisfaisant / Satisfaisant / À améliorer / À corriger de toute urgence.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance platform (alim-confiance.gouv.fr) — official DGCCRF transparency database." },
  { id: "lyon", dept: "DGCCRF (Alim'confiance)", city: "Lyon", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier Alim'confiance.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance (alim-confiance.gouv.fr) — DGCCRF results for Lyon." },
  { id: "marseille", dept: "DGCCRF (Alim'confiance)", city: "Marseille", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier Alim'confiance.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance (alim-confiance.gouv.fr) — DGCCRF results for Marseille." },
  { id: "toulouse", dept: "DGCCRF (Alim'confiance)", city: "Toulouse", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier Alim'confiance.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance (alim-confiance.gouv.fr) — DGCCRF results for Toulouse." },
  { id: "nice", dept: "DGCCRF (Alim'confiance)", city: "Nice", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier Alim'confiance.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance (alim-confiance.gouv.fr) — DGCCRF results for Nice." },
  { id: "bordeaux", dept: "DGCCRF (Alim'confiance)", city: "Bordeaux", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier Alim'confiance.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance (alim-confiance.gouv.fr) — DGCCRF results for Bordeaux." },
  { id: "strasbourg", dept: "DGCCRF (Alim'confiance)", city: "Strasbourg", state: null, country: "FR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier Alim'confiance.", scale: "4-tier → 0-100", enrich: true, ctx: "Alim'confiance (alim-confiance.gouv.fr) — DGCCRF results for Strasbourg." },

  // ─── EUROPE: GERMANY, AUSTRIA, SWITZERLAND ──────────────────────────────────
  { id: "berlin", dept: "Berlin Senatsverwaltung (Lebensmittelüberwachung)", city: "Berlin", state: null, country: "DE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley-based rating (green/yellow/red) from German Lebensmittelüberwachung.", scale: "Green/Yellow/Red smiley → 0-100", enrich: true, ctx: "verbraucherportal.de and Berlin Senatsverwaltung Lebensmittelüberwachung inspection records." },
  { id: "munich", dept: "LGL Bayern (Landesamt für Gesundheit und Lebensmittelsicherheit)", city: "Munich", state: null, country: "DE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley-based rating from LGL Bayern.", scale: "Green/Yellow/Red smiley → 0-100", enrich: true, ctx: "LGL Bayern (lgl.bayern.de) food inspection records and verbraucherportal.de." },
  { id: "hamburg", dept: "Hamburg Lebensmittelüberwachung (LMUE)", city: "Hamburg", state: null, country: "DE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley-based rating.", scale: "Green/Yellow/Red smiley → 0-100", enrich: true, ctx: "Hamburg Lebensmittelüberwachung (hamburg.de/lmue) restaurant inspection records." },
  { id: "cologne", dept: "Köln Veterinär- und Lebensmittelüberwachungsamt", city: "Cologne", state: null, country: "DE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley-based rating.", scale: "Green/Yellow/Red smiley → 0-100", enrich: true, ctx: "Köln Veterinär- und Lebensmittelüberwachungsamt food inspection records." },
  { id: "frankfurt", dept: "Frankfurt am Main Lebensmittelüberwachung", city: "Frankfurt", state: null, country: "DE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley-based rating.", scale: "Green/Yellow/Red smiley → 0-100", enrich: true, ctx: "Frankfurt am Main food inspection (Lebensmittelüberwachung) records." },
  { id: "vienna", dept: "AGES / Wiener Marktamt (Lebensmittelkontrolle)", city: "Vienna", state: null, country: "AT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley-based rating from AGES / municipal market authority.", scale: "Green/Yellow/Red smiley → 0-100", enrich: true, ctx: "AGES (ages.at) / Wiener Marktamt food inspection records. Austria uses smiley system." },
  { id: "zurich", dept: "Kanton Zürich Lebensmittelkontrolle", city: "Zurich", state: null, country: "CH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non-conforme. Cantonal food control authority inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Kanton Zürich Lebensmittelkontrolle (lebensmittelkontrolle.zh.ch) food inspection records." },
  { id: "geneva", dept: "Canton de Genève — Contrôle des aliments", city: "Geneva", state: null, country: "CH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non-conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Canton de Genève contrôle des aliments food inspection records." },

  // ─── EUROPE: NETHERLANDS, BELGIUM, LUXEMBOURG ───────────────────────────────
  { id: "amsterdam", dept: "NVWA (Nederlandse Voedsel- en Warenautoriteit)", city: "Amsterdam", state: null, country: "NL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Risk classification: laag/gemiddeld/hoog (low/average/high risk).", scale: "3-tier risk → 0-100", enrich: true, ctx: "NVWA (nvwa.nl) inspection results and inspectieresultaten.nl." },
  { id: "rotterdam", dept: "NVWA", city: "Rotterdam", state: null, country: "NL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Risk classification: laag/gemiddeld/hoog.", scale: "3-tier risk → 0-100", enrich: true, ctx: "NVWA (nvwa.nl) and inspectieresultaten.nl for Rotterdam." },
  { id: "the_hague", dept: "NVWA / GGD Den Haag", city: "The Hague", state: null, country: "NL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Risk classification: laag/gemiddeld/hoog.", scale: "3-tier risk → 0-100", enrich: true, ctx: "NVWA (nvwa.nl) food inspection records for The Hague." },
  { id: "brussels", dept: "FAVV (Federaal Agentschap voor de Veiligheid van de Voedselketen)", city: "Brussels", state: null, country: "BE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conform/Non-conform with risk classification.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "FAVV / AFSCA (favv.be) food safety inspection records." },
  { id: "antwerp", dept: "FAVV", city: "Antwerp", state: null, country: "BE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conform/Non-conform with risk classification.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "FAVV (favv.be) food safety inspection records for Antwerp." },

  // ─── EUROPE: NORDIC COUNTRIES ───────────────────────────────────────────────
  { id: "copenhagen", dept: "Fødevarestyrelsen (Danish Veterinary and Food Administration)", city: "Copenhagen", state: null, country: "DK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier smiley: Elite (4 smileys), Very good (3), Good (2), Satisfactory (1). Smiley-with-frown = issued report.", scale: "4-tier smiley → 0-100", enrich: true, ctx: "Smiley scheme (findsmiley.dk) from Fødevarestyrelsen." },
  { id: "aarhus", dept: "Fødevarestyrelsen", city: "Aarhus", state: null, country: "DK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "4-tier smiley.", scale: "4-tier smiley → 0-100", enrich: true, ctx: "Smiley scheme (findsmiley.dk) for Aarhus." },
  { id: "stockholm", dept: "Livsmedelsverket (Swedish National Food Agency)", city: "Stockholm", state: null, country: "SE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Approved with remarks/Not approved. Municipal environmental health inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Livsmedelsverket (livsmedelsverket.se) / Stockholm Stad Miljöförvaltningen food inspection records." },
  { id: "gothenburg", dept: "Livsmedelsverket / Göteborg Miljöförvaltningen", city: "Gothenburg", state: null, country: "SE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Approved with remarks/Not approved.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Livsmedelsverket / Göteborg Stad food inspection records." },
  { id: "oslo", dept: "Mattilsynet (Norwegian Food Safety Authority)", city: "Oslo", state: null, country: "NO", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Smiley rating: broadly approved / approved with remarks / not approved.", scale: "3-tier smiley → 0-100", enrich: true, ctx: "Mattilsynet (mattilsynet.no) food inspection records. Norway uses smiley system similar to Denmark." },
  { id: "helsinki", dept: "Ruokavirasto (Finnish Food Authority)", city: "Helsinki", state: null, country: "FI", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Oiva rating: Excellent / Good / Correctable / Poor. Based on food safety inspection.", scale: "4-tier Oiva → 0-100", enrich: true, ctx: "Ruokavirasto (ruokavirasto.fi) / Oiva system (oivahymy.fi) food inspection records. Finland uses the Oiva smiley system." },
  { id: "reykjavik", dept: "Matvælastofnun (Icelandic Food and Veterinary Authority)", city: "Reykjavik", state: null, country: "IS", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail from municipal health inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Matvælastofnun (mast.is) food inspection records for Reykjavik." },

  // ─── EUROPE: SOUTHERN EUROPE ────────────────────────────────────────────────
  { id: "madrid", dept: "AESAN / Comunidad de Madrid (Sanidad)", city: "Madrid", state: null, country: "ES", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme. Regional health authority inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "AESAN / Comunidad de Madrid Sanidad food inspection records." },
  { id: "barcelona", dept: "AESAN / Generalitat de Catalunya (Sanitat)", city: "Barcelona", state: null, country: "ES", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "AESAN / Generalitat de Catalunya Sanitat food inspection records." },
  { id: "valencia", dept: "AESAN / Generalitat Valenciana", city: "Valencia", state: null, country: "ES", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/No conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "AESAN / Generalitat Valenciana food inspection records." },
  { id: "rome", dept: "ASL Roma (Azienda Sanitaria Locale)", city: "Rome", state: null, country: "IT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme. ASL local health authority inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ASL Roma (aslroma.it) food inspection records. Italy uses regional ASL (Azienda Sanitaria Locale) for inspections." },
  { id: "milan", dept: "ASL Milano / ATS Milano", city: "Milan", state: null, country: "IT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ATS Milano (ats-milano.it) food inspection records." },
  { id: "naples", dept: "ASL Napoli", city: "Naples", state: null, country: "IT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ASL Napoli food inspection records." },
  { id: "florence", dept: "ASL Firenze", city: "Florence", state: null, country: "IT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ASL Firenze food inspection records." },
  { id: "lisbon", dept: "ASAE (Autoridade de Segurança Alimentar e Económica)", city: "Lisbon", state: null, country: "PT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Não conforme. ASAE enforcement actions.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ASAE (asae.gov.pt) food inspection records for Lisbon." },
  { id: "porto", dept: "ASAE", city: "Porto", state: null, country: "PT", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Não conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ASAE (asae.gov.pt) food inspection records for Porto." },
  { id: "athens", dept: "EFET (Ενιαίος Φορέας Ελέγχου Τροφίμων)", city: "Athens", state: null, country: "GR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme with violation categories.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "EFET (efet.gr) food inspection records for Athens." },
  { id: "thessaloniki", dept: "EFET", city: "Thessaloniki", state: null, country: "GR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "EFET (efet.gr) food inspection records for Thessaloniki." },

  // ─── EUROPE: CENTRAL & EASTERN EUROPE ───────────────────────────────────────
  { id: "warsaw", dept: "Sanepid (Powiatowa Stacja Sanitarno-Epidemiologiczna)", city: "Warsaw", state: null, country: "PL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pozytywny/Negatywny (positive/negative). Sanepid sanitary inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Sanepid (gis.gov.pl) food inspection records for Warsaw. Poland uses Sanepid (Sanitary-epidemiological stations)." },
  { id: "krakow", dept: "Sanepid Kraków", city: "Kraków", state: null, country: "PL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pozytywny/Negatywny.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Sanepid Kraków food inspection records." },
  { id: "prague", dept: "SZPI (Státní zemědělská a potravinářská inspekce)", city: "Prague", state: null, country: "CZ", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Vyhovuje/Nevyhovuje (compliant/non-compliant).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SZPI (szpi.gov.cz) food inspection records for Prague." },
  { id: "budapest", dept: "NÉBIH (Nemzeti Élelmiszerlánc-biztonsági Hivatal)", city: "Budapest", state: null, country: "HU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Megfelel/Nem felel meg (compliant/non-compliant).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "NÉBIH (nebih.gov.hu) food inspection records for Budapest." },
  { id: "bucharest", dept: "ANSVSA (Agenția Națională Sanitară Veterinară și pentru Siguranța Alimentelor)", city: "Bucharest", state: null, country: "RO", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conform/Non-conform.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ANSVSA (ansvsa.ro) food inspection records for Bucharest." },
  { id: "sofia", dept: "Bulgarian Food Safety Agency (БАБХ)", city: "Sofia", state: null, country: "BG", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Съответства/Не съответства (compliant/non-compliant).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Bulgarian Food Safety Agency (babh.government.bg) food inspection records." },
  { id: "moscow", dept: "Rospotrebnadzor (Роспотребнадзор)", city: "Moscow", state: null, country: "RU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Соответствует/Не соответствует (compliant/non-compliant). Sanitary-epidemiological inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Rospotrebnadzor (rospotrebnadzor.gov.ru) food inspection records for Moscow." },
  { id: "st_petersburg", dept: "Rospotrebnadzor St. Petersburg", city: "St. Petersburg", state: null, country: "RU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Соответствует/Не соответствует.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Rospotrebnadzor food inspection records for St. Petersburg." },
  { id: "kyiv", dept: "State Service of Ukraine on Food Safety and Consumer Protection", city: "Kyiv", state: null, country: "UA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Відповідає/Не відповідає (compliant/non-compliant).", scale: "Pass/Fail → 0-100", enrich: true, ctx: "State Service of Ukraine on Food Safety (consumer.gov.ua) food inspection records." },

  // ─── MIDDLE EAST ────────────────────────────────────────────────────────────
  { id: "dubai", dept: "Dubai Municipality Food Safety Department", city: "Dubai", state: null, country: "AE", type: "ai_only", api: null, fn: null, rating: "A/B/C/D/E grades from Dubai Municipality food safety inspections. A=excellent, E=poor.", scale: "A-E letter grade → 0-100", enrich: false, ctx: "Dubai Municipality food safety inspection grades A-E." },
  { id: "abu_dhabi", dept: "ADAFSA (Abu Dhabi Agriculture and Food Safety Authority)", city: "Abu Dhabi", state: null, country: "AE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "A/B/C/D grades from ADAFSA food safety inspections.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "ADAFSA (adafsa.gov.ae) restaurant inspection and grading records." },
  { id: "sharjah", dept: "Sharjah City Municipality", city: "Sharjah", state: null, country: "AE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "A/B/C/D grades from Sharjah Municipality food safety inspections.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "Sharjah City Municipality food safety inspection records." },
  { id: "riyadh", dept: "SFDA (Saudi Food and Drug Authority)", city: "Riyadh", state: null, country: "SA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant with violation categories. SFDA inspects food establishments for compliance with SFDA food codes.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SFDA (sfda.gov.sa) food establishment inspection records. Evaluates food labels, ingredient safety, and production process compliance." },
  { id: "jeddah", dept: "SFDA / Jeddah Municipality", city: "Jeddah", state: null, country: "SA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SFDA (sfda.gov.sa) / Jeddah Municipality food inspection records." },
  { id: "mecca", dept: "SFDA / Holy Makkah Municipality", city: "Mecca", state: null, country: "SA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SFDA / Holy Makkah Municipality food inspection records." },
  { id: "doha", dept: "Ministry of Public Health (MoPH) Qatar", city: "Doha", state: null, country: "QA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "A/B/C/D grades or Compliant/Non-compliant from MoPH food safety inspections.", scale: "A-D or Pass/Fail → 0-100", enrich: true, ctx: "Qatar Ministry of Public Health (moph.gov.qa) food establishment inspection records." },
  { id: "kuwait_city", dept: "Kuwait Municipality — Public Health Dept", city: "Kuwait City", state: null, country: "KW", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Kuwait Municipality Public Health Department food inspection records." },
  { id: "manama", dept: "Ministry of Health Bahrain — Environmental Health", city: "Manama", state: null, country: "BH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Ministry of Health Bahrain Environmental Health food inspection records." },
  { id: "muscat", dept: "Muscat Municipality — Health Services", city: "Muscat", state: null, country: "OM", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Muscat Municipality Health Services food inspection records." },
  { id: "tel_aviv", dept: "Israeli Ministry of Health — Food Service", city: "Tel Aviv", state: null, country: "IL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail. MoH environmental health inspection with violation categories.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Israeli Ministry of Health (health.gov.il) food service inspection records for Tel Aviv." },
  { id: "jerusalem", dept: "Israeli Ministry of Health — Jerusalem District", city: "Jerusalem", state: null, country: "IL", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Israeli Ministry of Health (health.gov.il) Jerusalem District food inspection records." },
  { id: "istanbul", dept: "Ministry of Agriculture and Forestry (Turkey)", city: "Istanbul", state: null, country: "TR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Uygun/Uygun değil (compliant/non-compliant). Municipal food inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Ministry of Agriculture and Forestry (tarimorman.gov.tr) / Istanbul Municipality food inspection records." },
  { id: "ankara", dept: "Ministry of Agriculture and Forestry / Ankara Municipality", city: "Ankara", state: null, country: "TR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Uygun/Uygun değil.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Ministry of Agriculture and Forestry / Ankara Municipality food inspection records." },
  { id: "cairo", dept: "Egyptian Ministry of Health — Food Safety", city: "Cairo", state: null, country: "EG", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Egyptian Ministry of Health (mohp.gov.eg) food safety inspection records." },
  { id: "amman", dept: "Jordan Food and Drug Administration (JFDA)", city: "Amman", state: null, country: "JO", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Jordan Food and Drug Administration (jfda.jo) food inspection records." },
  { id: "beirut", dept: "Lebanese Ministry of Economy — Consumer Protection", city: "Beirut", state: null, country: "LB", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Lebanese Ministry of Economy Consumer Protection food inspection records." },

  // ─── ASIA: EAST ASIA ────────────────────────────────────────────────────────
  { id: "tokyo", dept: "Tokyo Metropolitan Government (東京都) — local 保健所", city: "Tokyo", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from 食品衛生責任者 (food hygiene supervisor) inspection. Local health center (保健所) conducts inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Tokyo Metropolitan Government (東京都) food hygiene (食品衛生) from local 保健所 (health centers)." },
  { id: "osaka", dept: "Osaka Prefecture — local 保健所", city: "Osaka", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from food hygiene inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Osaka Prefecture food hygiene inspection records from 保健所." },
  { id: "kyoto", dept: "Kyoto City — local 保健所", city: "Kyoto", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from food hygiene inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Kyoto City food safety inspection records from local 保健所." },
  { id: "yokohama", dept: "Yokohama City — local 保健所", city: "Yokohama", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from food hygiene inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Yokohama City food hygiene inspection records." },
  { id: "sapporo", dept: "Sapporo City — local 保健所", city: "Sapporo", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from food hygiene inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Sapporo City food safety inspection records." },
  { id: "fukuoka", dept: "Fukuoka City — local 保健所", city: "Fukuoka", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from food hygiene inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Fukuoka City food hygiene inspection records." },
  { id: "nagoya", dept: "Nagoya City — local 保健所", city: "Nagoya", state: null, country: "JP", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Fail from food hygiene inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Nagoya City food safety inspection records." },
  { id: "seoul", dept: "식품안전나라 (Food Safety Korea) / Seoul Metropolitan Gov", city: "Seoul", state: null, country: "KR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100 from Korean food safety inspection.", scale: "0-100 numeric", enrich: true, ctx: "식품안전나라 (foodsafetykorea.go.kr) and Seoul Metropolitan Government food inspection database." },
  { id: "busan", dept: "식품안전나라 / Busan Metropolitan City", city: "Busan", state: null, country: "KR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100.", scale: "0-100 numeric", enrich: true, ctx: "식품안전나라 (foodsafetykorea.go.kr) and Busan Metropolitan City food safety records." },
  { id: "incheon", dept: "식품안전나라 / Incheon City", city: "Incheon", state: null, country: "KR", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Score 0-100.", scale: "0-100 numeric", enrich: true, ctx: "식품안전나라 (foodsafetykorea.go.kr) and Incheon City food hygiene inspection data." },
  { id: "beijing", dept: "SAMR (国家市场监督管理总局) / Beijing Municipal Gov", city: "Beijing", state: null, country: "CN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "量化分级 A/B/C/D (quantitative grading A=best, D=worst).", scale: "A-D letter grade → 0-100", enrich: true, ctx: "SAMR / Beijing municipal food safety authority (北京市食品安全) inspection records." },
  { id: "shanghai", dept: "Shanghai Municipal Food Safety Authority (上海市食品安全)", city: "Shanghai", state: null, country: "CN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "量化分级 A/B/C/D.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "Shanghai municipal food safety authority inspection records." },
  { id: "guangzhou", dept: "Guangzhou FDA / SAMR Guangdong", city: "Guangzhou", state: null, country: "CN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "量化分级 A/B/C/D.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "Guangzhou FDA / SAMR Guangdong food inspection records." },
  { id: "shenzhen", dept: "Shenzhen Market Supervision Administration", city: "Shenzhen", state: null, country: "CN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "量化分级 A/B/C/D.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "Shenzhen Market Supervision Administration food inspection records." },
  { id: "hong_kong", dept: "FEHD (Food and Environmental Hygiene Department)", city: "Hong Kong", state: null, country: "HK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "License grading A/B/C from FEHD inspections.", scale: "A/B/C license grade → 0-100", enrich: true, ctx: "FEHD Hong Kong (fehd.gov.hk) inspection records." },
  { id: "taipei", dept: "FDA Taiwan (食品藥物管理署) / Taipei City Health Dept", city: "Taipei", state: null, country: "TW", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "優/良/普/加強改善 (Excellent/Good/Average/Needs improvement).", scale: "4-tier → 0-100", enrich: true, ctx: "FDA Taiwan (fda.gov.tw) / Taipei City Health Department food inspection records." },
  { id: "kaohsiung", dept: "FDA Taiwan / Kaohsiung City Health Dept", city: "Kaohsiung", state: null, country: "TW", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "優/良/普/加強改善.", scale: "4-tier → 0-100", enrich: true, ctx: "FDA Taiwan / Kaohsiung City Health Department food inspection records." },

  // ─── ASIA: SOUTHEAST ASIA ───────────────────────────────────────────────────
  { id: "singapore", dept: "Singapore Food Agency (SFA) / NEA", city: "Singapore", state: null, country: "SG", type: "backend_proxy", api: null, fn: "singaporeInspections", rating: "SFA/NEA hygiene grades A/B/C/D/E scale (A=excellent, E=poor).", scale: "A-E letter grade → 0-100", enrich: false, ctx: "" },
  { id: "bangkok", dept: "Thai FDA (อย.) / Bangkok Metropolitan Admin", city: "Bangkok", state: null, country: "TH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. Thai FDA food categorization: Specifically Controlled Food, Food with Quality/Standard Requirements, Food with Labeling Requirements.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Thai FDA (fda.moph.go.th) / Bangkok Metropolitan Administration food inspection records." },
  { id: "chiang_mai", dept: "Thai FDA / Chiang Mai Provincial Health", city: "Chiang Mai", state: null, country: "TH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Thai FDA / Chiang Mai Provincial Health Office food inspection records." },
  { id: "phuket", dept: "Thai FDA / Phuket Provincial Health", city: "Phuket", state: null, country: "TH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Thai FDA / Phuket Provincial Health Office food inspection records." },
  { id: "kuala_lumpur", dept: "MOH Malaysia — Food Safety and Quality Division", city: "Kuala Lumpur", state: null, country: "MY", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. BeSS (Bersih, Selamat, Sihat) recognition for compliant establishments.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "MOH Malaysia Food Safety and Quality Division (fsq.moh.gov.my) food inspection records." },
  { id: "penang", dept: "MOH Malaysia — Penang State Health Dept", city: "Penang", state: null, country: "MY", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "MOH Malaysia / Penang State Health Department food inspection records." },
  { id: "jakarta", dept: "BPOM (Badan Pengawas Obat dan Makanan)", city: "Jakarta", state: null, country: "ID", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. BPOM registration required for food establishments.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "BPOM (bpom.go.id) food establishment inspection records for Jakarta." },
  { id: "bali", dept: "BPOM / Dinas Kesehatan Bali", city: "Denpasar", state: null, country: "ID", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "BPOM / Dinas Kesehatan Bali food inspection records." },
  { id: "manila", dept: "FDA Philippines — Center for Food Regulation", city: "Manila", state: null, country: "PH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. FDA license to operate required.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "FDA Philippines (fda.gov.ph) food establishment inspection records." },
  { id: "cebu", dept: "FDA Philippines / Cebu City Health Dept", city: "Cebu", state: null, country: "PH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "FDA Philippines / Cebu City Health Department food inspection records." },
  { id: "ho_chi_minh", dept: "VFA (Vietnam Food Administration)", city: "Ho Chi Minh City", state: null, country: "VN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Đạt/Không đạt (pass/fail). VFA food safety inspection.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "VFA (vfa.gov.vn) food inspection records for Ho Chi Minh City." },
  { id: "hanoi", dept: "VFA / Hanoi Health Dept", city: "Hanoi", state: null, country: "VN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Đạt/Không đạt.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "VFA (vfa.gov.vn) / Hanoi Health Department food inspection records." },
  { id: "phnom_penh", dept: "CamControl / Cambodia MoH", city: "Phnom Penh", state: null, country: "KH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "CamControl / Cambodia Ministry of Health food inspection records." },
  { id: "yangon", dept: "FDA Myanmar / Yangon City Development Committee", city: "Yangon", state: null, country: "MM", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "FDA Myanmar / Yangon City Development Committee food inspection records." },
  { id: "vientiane", dept: " Laos FDA / Vientiane Health Dept", city: "Vientiane", state: null, country: "LA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Laos FDA / Vientiane Health Department food inspection records." },

  // ─── ASIA: SOUTH ASIA ───────────────────────────────────────────────────────
  { id: "mumbai", dept: "FSSAI / MCGM (Mumbai Municipal Corporation)", city: "Mumbai", state: null, country: "IN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FSSAI license/registration status. No standardized score.", scale: "License status → 0-100", enrich: true, ctx: "FSSAI (fssai.gov.in) registration database and Mumbai Municipal Corporation (MCGM) food safety records." },
  { id: "delhi", dept: "FSSAI / Delhi Govt Food Safety", city: "Delhi", state: null, country: "IN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FSSAI license/registration status.", scale: "License status → 0-100", enrich: true, ctx: "FSSAI (fssai.gov.in) and Delhi government food safety inspection records." },
  { id: "bangalore", dept: "FSSAI / BBMP (Bruhat Bengaluru Mahanagara Palike)", city: "Bangalore", state: null, country: "IN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FSSAI license/registration status.", scale: "License status → 0-100", enrich: true, ctx: "FSSAI (fssai.gov.in) and BBMP food safety inspection records." },
  { id: "chennai", dept: "FSSAI / Greater Chennai Corporation", city: "Chennai", state: null, country: "IN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FSSAI license/registration status.", scale: "License status → 0-100", enrich: true, ctx: "FSSAI / Greater Chennai Corporation food safety inspection records." },
  { id: "kolkata", dept: "FSSAI / Kolkata Municipal Corporation", city: "Kolkata", state: null, country: "IN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FSSAI license/registration status.", scale: "License status → 0-100", enrich: true, ctx: "FSSAI / Kolkata Municipal Corporation food safety inspection records." },
  { id: "hyderabad", dept: "FSSAI / GHMC (Greater Hyderabad Municipal Corp)", city: "Hyderabad", state: null, country: "IN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FSSAI license/registration status.", scale: "License status → 0-100", enrich: true, ctx: "FSSAI / GHMC food safety inspection records." },
  { id: "karachi", dept: "Punjab Food Authority (PFA) / Sindh Food Authority", city: "Karachi", state: null, country: "PK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. SFA uses A/B/C/D grades for food establishments.", scale: "A-D or Pass/Fail → 0-100", enrich: true, ctx: "Sindh Food Authority (sfa.gos.pk) / Punjab Food Authority (pfa.punjab.gov.pk) food inspection records." },
  { id: "lahore", dept: "Punjab Food Authority (PFA)", city: "Lahore", state: null, country: "PK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "A/B/C/D grades from PFA inspections. A=excellent, D=poor.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "Punjab Food Authority (pfa.punjab.gov.pk) food inspection and grading records." },
  { id: "islamabad", dept: "Islamabad Food Authority", city: "Islamabad", state: null, country: "PK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "A/B/C/D grades.", scale: "A-D letter grade → 0-100", enrich: true, ctx: "Islamabad Food Authority food inspection and grading records." },
  { id: "dhaka", dept: "BFSA (Bangladesh Food Safety Authority)", city: "Dhaka", state: null, country: "BD", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "BFSA (bfsa.gov.bd) food inspection records for Dhaka." },
  { id: "colombo", dept: "PHAI (Public Health Inspectors) / Colombo Municipal Council", city: "Colombo", state: null, country: "LK", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "PHAI / Colombo Municipal Council food inspection records." },

  // ─── OCEANIA ────────────────────────────────────────────────────────────────
  { id: "sydney", dept: "NSW Food Authority (Scores on Doors)", city: "Sydney", state: "NSW", country: "AU", type: "backend_proxy", api: null, fn: "australiaFoodSafety", rating: "5-star rating: 5=Excellent, 4=Very good, 3=Good, 2=Satisfactory, 1=Needs improvement.", scale: "1-5 star → 0-100", enrich: false, ctx: "" },
  { id: "brisbane", dept: "Brisbane City Council / Queensland Health", city: "Brisbane", state: "QLD", country: "AU", type: "backend_proxy", api: null, fn: "australiaFoodSafety", rating: "Star rating or Pass/Non-compliant based on council inspection.", scale: "Star rating → 0-100", enrich: false, ctx: "" },
  { id: "melbourne", dept: "VicHealth / City of Melbourne (FoodSmart)", city: "Melbourne", state: "VIC", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail. FoodSmart Victoria program.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "VicHealth food safety, City of Melbourne restaurant inspections, FoodSmart Victoria." },
  { id: "perth", dept: "WA Department of Health", city: "Perth", state: "WA", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "WA Department of Health (health.wa.gov.au) food premises inspection records." },
  { id: "adelaide", dept: "SA Health / City of Adelaide", city: "Adelaide", state: "SA", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "SA Health food premises inspection records, City of Adelaide." },
  { id: "gold_coast", dept: "Gold Coast City Council", city: "Gold Coast", state: "QLD", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Star rating or Pass/Non-compliant.", scale: "Star rating → 0-100", enrich: true, ctx: "Gold Coast City Council food safety inspection records." },
  { id: "canberra", dept: "ACT Health — Health Protection Service", city: "Canberra", state: "ACT", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ACT Health (health.act.gov.au) food premises inspection records." },
  { id: "hobart", dept: "Tasmania Health Service — Public Health", city: "Hobart", state: "TAS", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Tasmania Health Service food premises inspection records." },
  { id: "darwin", dept: "NT Department of Health — Environmental Health", city: "Darwin", state: "NT", country: "AU", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "NT Department of Health Environmental Health food premises inspection records." },
  { id: "auckland", dept: "Auckland Council / MPI (Ministry for Primary Industries)", city: "Auckland", state: null, country: "NZ", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "FoodSafe verification: Pass/Conditional/Fail.", scale: "Pass/Conditional/Fail → 0-100", enrich: true, ctx: "Auckland Council food premises inspection records and FoodSafe verification scheme." },
  { id: "wellington", dept: "Wellington City Council — Environmental Health", city: "Wellington", state: null, country: "NZ", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Wellington City Council environmental health food premises inspections." },
  { id: "christchurch", dept: "Christchurch City Council — Environmental Health", city: "Christchurch", state: null, country: "NZ", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Pass/Conditional/Fail.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Christchurch City Council food premises inspection records." },

  // ─── AFRICA ─────────────────────────────────────────────────────────────────
  { id: "cape_town", dept: "City of Cape Town — Environmental Health", city: "Cape Town", state: null, country: "ZA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. Certificate of Acceptability required under R638 regulations.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "City of Cape Town Environmental Health (capetown.gov.za) food inspection records. South Africa requires Certificate of Acceptability under R638." },
  { id: "johannesburg", dept: "City of Johannesburg — Environmental Health", city: "Johannesburg", state: null, country: "ZA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. Certificate of Acceptability required.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "City of Johannesburg Environmental Health food inspection records." },
  { id: "durban", dept: "eThekwini Municipality — Environmental Health", city: "Durban", state: null, country: "ZA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "eThekwini Municipality Environmental Health food inspection records." },
  { id: "lagos", dept: "NAFDAC (National Agency for Food and Drug Administration and Control)", city: "Lagos", state: null, country: "NG", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. NAFDAC registration required.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "NAFDAC (nafdac.gov.ng) food inspection records and Lagos State Ministry of Health." },
  { id: "abuja", dept: "NAFDAC / FCT Health Dept", city: "Abuja", state: null, country: "NG", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "NAFDAC / Federal Capital Territory Health Department food inspection records." },
  { id: "nairobi", dept: "Nairobi County Health Dept / KEBS", city: "Nairobi", state: null, country: "KE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant. Public Health Act compliance.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Nairobi County Health Department / KEBS (kebs.org) food inspection records." },
  { id: "casablanca", dept: "ONSSA (Office National de Sécurité Sanitaire des Produits Alimentaires)", city: "Casablanca", state: null, country: "MA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ONSSA (onssa.gov.ma) food inspection records for Casablanca." },
  { id: "marrakech", dept: "ONSSA / Marrakech Municipal Health", city: "Marrakech", state: null, country: "MA", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "ONSSA / Marrakech Municipal Health food inspection records." },
  { id: "cairo_eg", dept: "Egyptian Ministry of Health — Food Control", city: "Cairo", state: null, country: "EG", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Egyptian Ministry of Health (mohp.gov.eg) Food Control Department inspection records." },
  { id: "alexandria", dept: "Egyptian Ministry of Health — Alexandria", city: "Alexandria", state: null, country: "EG", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Egyptian Ministry of Health Alexandria branch food inspection records." },
  { id: "nairobi", dept: "Nairobi County Health Department", city: "Nairobi", state: null, country: "KE", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Nairobi County Health Department food inspection records." },
  { id: "addis_ababa", dept: "Ethiopian Food and Drug Authority (EFDA)", city: "Addis Ababa", state: null, country: "ET", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Ethiopian Food and Drug Authority (efda.gov.et) food inspection records." },
  { id: "accra", dept: "Ghana Food and Drugs Authority (FDA Ghana)", city: "Accra", state: null, country: "GH", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Compliant/Non-compliant.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Ghana FDA (fdaghana.gov.gh) food inspection records." },
  { id: "dakar", dept: "Senegal — Direction de la Protection des Consommateurs", city: "Dakar", state: null, country: "SN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Senegal Direction de la Protection des Consommateurs food inspection records." },
  { id: "tunis", dept: "Tunisian Ministry of Health — Direction de l'Hygiène", city: "Tunis", state: null, country: "TN", type: "ai_enrichment", api: null, fn: "placesRestaurantSearch", rating: "Conforme/Non conforme.", scale: "Pass/Fail → 0-100", enrich: true, ctx: "Tunisian Ministry of Health Direction de l'Hygiène food inspection records." },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GEO RESOLUTION TABLE — maps state + city to source_id
// ═══════════════════════════════════════════════════════════════════════════════

const GEO_TABLE = [
  // ── US ──
  { state: "WA", city: "seattle", sid: "king" }, { state: "WA", city: "bellevue", sid: "king" },
  { state: "WA", city: "kent", sid: "king" }, { state: "WA", city: "renton", sid: "king" },
  { state: "WA", city: "redmond", sid: "king" }, { state: "WA", city: "kirkland", sid: "king" },
  { state: "WA", city: "federal way", sid: "king" }, { state: "WA", city: "sammamish", sid: "king" },
  { state: "WA", city: "shoreline", sid: "king" }, { state: "WA", city: "burien", sid: "king" },
  { state: "WA", city: "tukwila", sid: "king" }, { state: "WA", city: "issaquah", sid: "king" },
  { state: "WA", city: "mercer island", sid: "king" }, { state: "WA", city: "auburn", sid: "king" },
  { state: "WA", city: "bothell", sid: "king" }, { state: "WA", city: "kenmore", sid: "king" },
  { state: "WA", city: "newcastle", sid: "king" }, { state: "WA", city: "des moines", sid: "king" },
  { state: "WA", city: "seatac", sid: "king" }, { state: "WA", city: "woodinville", sid: "king" },
  { state: "WA", city: "tacoma", sid: "pierce" }, { state: "WA", city: "puyallup", sid: "pierce" },
  { state: "WA", city: "lakewood", sid: "pierce" }, { state: "WA", city: "university place", sid: "pierce" },
  { state: "WA", city: "fircrest", sid: "pierce" }, { state: "WA", city: "parkland", sid: "pierce" },
  { state: "WA", city: "spanaway", sid: "pierce" }, { state: "WA", city: "sumner", sid: "pierce" },
  { state: "WA", city: "bonney lake", sid: "pierce" }, { state: "WA", city: "gig harbor", sid: "pierce" },
  { state: "WA", city: "dupont", sid: "pierce" }, { state: "WA", city: "steilacoom", sid: "pierce" },
  { state: "WA", city: "milton", sid: "pierce" }, { state: "WA", city: "edgewood", sid: "pierce" },
  { state: "WA", city: "orting", sid: "pierce" }, { state: "WA", city: "eatonville", sid: "pierce" },
  { state: "WA", city: "roy", sid: "pierce" }, { state: "WA", city: "spokane", sid: "spokane" },
  { state: "NY", city: "new york", sid: "nyc" }, { state: "NY", city: "brooklyn", sid: "nyc" },
  { state: "NY", city: "queens", sid: "nyc" }, { state: "NY", city: "bronx", sid: "nyc" },
  { state: "NY", city: "the bronx", sid: "nyc" }, { state: "NY", city: "manhattan", sid: "nyc" },
  { state: "NY", city: "staten island", sid: "nyc" }, { state: "NY", city: "buffalo", sid: "buffalo" },
  { state: "IL", city: "chicago", sid: "cook" },
  { state: "CA", city: "san francisco", sid: "sf" }, { state: "CA", city: "los angeles", sid: "la" },
  { state: "CA", city: "long beach", sid: "la" }, { state: "CA", city: "glendale", sid: "la" },
  { state: "CA", city: "pasadena", sid: "la" }, { state: "CA", city: "santa monica", sid: "la" },
  { state: "CA", city: "burbank", sid: "la" }, { state: "CA", city: "torrance", sid: "la" },
  { state: "CA", city: "modesto", sid: "stanislaus" }, { state: "CA", city: "turlock", sid: "stanislaus" },
  { state: "CA", city: "ceres", sid: "stanislaus" }, { state: "CA", city: "san diego", sid: "san_diego" },
  { state: "CA", city: "sacramento", sid: "sacramento" }, { state: "CA", city: "fresno", sid: "fresno" },
  { state: "TX", city: "austin", sid: "travis" }, { state: "TX", city: "houston", sid: "houston" },
  { state: "TX", city: "dallas", sid: "dallas" }, { state: "TX", city: "el paso", sid: "el_paso" },
  { state: "TX", city: "fort worth", sid: "fort_worth" },
  { state: "MD", city: "rockville", sid: "montgomery_md" }, { state: "MD", city: "bethesda", sid: "montgomery_md" },
  { state: "MD", city: "silver spring", sid: "montgomery_md" }, { state: "MD", city: "gaithersburg", sid: "montgomery_md" },
  { state: "MD", city: "baltimore", sid: "baltimore" },
  { state: "MA", city: "boston", sid: "boston" },
  { state: "DE", city: null, sid: "delaware" },
  { state: "CT", city: "manchester", sid: "manchester_ct" },
  { state: "NV", city: "las vegas", sid: "las_vegas" },
  { state: "FL", city: "miami", sid: "miami" }, { state: "FL", city: "miami beach", sid: "miami_beach" },
  { state: "FL", city: "orlando", sid: "orlando" }, { state: "FL", city: "tampa", sid: "tampa" },
  { state: "FL", city: "jacksonville", sid: "jacksonville" },
  { state: "AZ", city: "phoenix", sid: "phoenix" }, { state: "AZ", city: "tucson", sid: "tucson" },
  { state: "PA", city: "philadelphia", sid: "philadelphia" }, { state: "PA", city: "pittsburgh", sid: "pittsburgh" },
  { state: "GA", city: "atlanta", sid: "atlanta" },
  { state: "TN", city: "nashville", sid: "nashville" }, { state: "TN", city: "memphis", sid: "memphis" },
  { state: "NC", city: "charlotte", sid: "charlotte" }, { state: "NC", city: "raleigh", sid: "raleigh" },
  { state: "OH", city: "columbus", sid: "columbus" }, { state: "OH", city: "cleveland", sid: "cleveland" },
  { state: "OH", city: "cincinnati", sid: "cincinnati" },
  { state: "MN", city: "minneapolis", sid: "minneapolis" },
  { state: "OR", city: "portland", sid: "portland" },
  { state: "CO", city: "denver", sid: "denver" },
  { state: "WI", city: "milwaukee", sid: "milwaukee" },
  { state: "MI", city: "detroit", sid: "detroit" },
  { state: "MO", city: "st. louis", sid: "st_louis" }, { state: "MO", city: "kansas city", sid: "kansas_city" },
  { state: "KY", city: "louisville", sid: "louisville" },
  { state: "IN", city: "indianapolis", sid: "indianapolis" },
  { state: "LA", city: "new orleans", sid: "new_orleans" },
  { state: "HI", city: "honolulu", sid: "honolulu" },
  { state: "AK", city: "anchorage", sid: "anchorage" },
  { state: "NM", city: "albuquerque", sid: "albuquerque" },
  { state: "NJ", city: "newark", sid: "newark" },
  { state: "VA", city: "arlington", sid: "arlington_va" }, { state: "VA", city: "richmond", sid: "richmond_va" },
  { state: "OK", city: "oklahoma city", sid: "oklahoma_city" },
  // ── Additional US counties (AI enrichment) ──
  { state: "AL", city: "birmingham", sid: "al_birmingham" }, { state: "AL", city: "mobile", sid: "al_mobile" },
  { state: "AL", city: "huntsville", sid: "al_madison" }, { state: "AL", city: "montgomery", sid: "al_montgomery" },
  { state: "AK", city: "fairbanks", sid: "ak_fairbanks" }, { state: "AK", city: "juneau", sid: "ak_juneau" },
  { state: "AZ", city: "flagstaff", sid: "az_coconino" }, { state: "AZ", city: "prescott", sid: "az_yavapai" },
  { state: "AZ", city: "mesa", sid: "az_maricopa" }, { state: "AZ", city: "gilbert", sid: "az_maricopa" },
  { state: "AR", city: "little rock", sid: "ar_pulaski" }, { state: "AR", city: "bentonville", sid: "ar_benton" },
  { state: "AR", city: "fayetteville", sid: "ar_washington" },
  { state: "CA", city: "oakland", sid: "ca_alameda" }, { state: "CA", city: "santa ana", sid: "ca_orange" },
  { state: "CA", city: "riverside", sid: "ca_riverside" }, { state: "CA", city: "san bernardino", sid: "ca_sanbernardino" },
  { state: "CA", city: "san jose", sid: "ca_santaclara" }, { state: "CA", city: "bakersfield", sid: "ca_kern" },
  { state: "CA", city: "ventura", sid: "ca_ventura" }, { state: "CA", city: "long beach", sid: "la" },
  { state: "CO", city: "colorado springs", sid: "co_el_paso" }, { state: "CO", city: "boulder", sid: "co_boulder" },
  { state: "CO", city: "aurora", sid: "co_arapahoe" }, { state: "CO", city: "fort collins", sid: "co_larimer" },
  { state: "CO", city: "lakewood", sid: "co_jefferson" },
  { state: "CT", city: "hartford", sid: "ct_hartford" }, { state: "CT", city: "new haven", sid: "ct_new_haven" },
  { state: "CT", city: "bridgeport", sid: "ct_fairfield" },
  { state: "FL", city: "fort lauderdale", sid: "fl_broward" }, { state: "FL", city: "west palm beach", sid: "fl_palm_beach" },
  { state: "FL", city: "clearwater", sid: "fl_pinellas" }, { state: "FL", city: "lakeland", sid: "fl_polk" },
  { state: "FL", city: "fort myers", sid: "fl_lee" },
  { state: "GA", city: "decatur", sid: "ga_dekalb" }, { state: "GA", city: "lawrenceville", sid: "ga_gwinnett" },
  { state: "GA", city: "marietta", sid: "ga_cobb" }, { state: "GA", city: "savannah", sid: "ga_chatham" },
  { state: "GA", city: "macon", sid: "ga_bibb" },
  { state: "ID", city: "boise", sid: "id_ada" }, { state: "ID", city: "nampa", sid: "id_canyon" },
  { state: "ID", city: "coeur d'alene", sid: "id_kootenai" },
  { state: "IL", city: "wheaton", sid: "il_dupage" }, { state: "IL", city: "waukegan", sid: "il_lake" },
  { state: "IL", city: "joliet", sid: "il_will" }, { state: "IL", city: "geneva", sid: "il_kane" },
  { state: "IL", city: "springfield", sid: "il_sangamon" },
  { state: "IN", city: "gary", sid: "in_lake" }, { state: "IN", city: "fort wayne", sid: "in_allen" },
  { state: "IN", city: "carmel", sid: "in_hamilton" },
  { state: "IA", city: "des moines", sid: "ia_polk" }, { state: "IA", city: "cedar rapids", sid: "ia_linn" },
  { state: "IA", city: "davenport", sid: "ia_scott" }, { state: "IA", city: "iowa city", sid: "ia_johnson" },
  { state: "KS", city: "overland park", sid: "ks_johnson" }, { state: "KS", city: "wichita", sid: "ks_sedgwick" },
  { state: "KS", city: "topeka", sid: "ks_shawnee" },
  { state: "KY", city: "lexington", sid: "ky_fayette" }, { state: "KY", city: "burlington", sid: "ky_boone" },
  { state: "LA", city: "baton rouge", sid: "la_ebr" }, { state: "LA", city: "metairie", sid: "la_jefferson" },
  { state: "LA", city: "shreveport", sid: "la_caddo" },
  { state: "ME", city: "portland", sid: "me_cumberland" }, { state: "ME", city: "bangor", sid: "me_penobscot" },
  { state: "MD", city: "towson", sid: "md_baltimore_co" }, { state: "MD", city: "upper marlboro", sid: "md_pg" },
  { state: "MD", city: "annapolis", sid: "md_anne_arundel" }, { state: "MD", city: "ellicott city", sid: "md_howard" },
  { state: "MA", city: "cambridge", sid: "ma_middlesex" }, { state: "MA", city: "worcester", sid: "ma_worcester" },
  { state: "MA", city: "springfield", sid: "ma_hampden" }, { state: "MA", city: "salem", sid: "ma_essex" },
  { state: "MI", city: "grand rapids", sid: "mi_kent" }, { state: "MI", city: "pontiac", sid: "mi_oakland" },
  { state: "MI", city: "lansing", sid: "mi_ingham" }, { state: "MI", city: "ann arbor", sid: "mi_washtenaw" },
  { state: "MN", city: "st. paul", sid: "mn_ramsey" }, { state: "MN", city: "duluth", sid: "mn_st_louis" },
  { state: "MS", city: "jackson", sid: "ms_hinds" }, { state: "MS", city: "gulfport", sid: "ms_harrison" },
  { state: "MO", city: "clayton", sid: "mo_st_louis_co" }, { state: "MO", city: "springfield", sid: "mo_greene" },
  { state: "MO", city: "columbia", sid: "mo_boone" },
  { state: "MT", city: "billings", sid: "mt_yellowstone" }, { state: "MT", city: "great falls", sid: "mt_cascade" },
  { state: "MT", city: "missoula", sid: "mt_missoula" }, { state: "MT", city: "bozeman", sid: "mt_gallatin" },
  { state: "NE", city: "omaha", sid: "ne_douglas" }, { state: "NE", city: "lincoln", sid: "ne_lancaster" },
  { state: "NV", city: "reno", sid: "nv_washoe" }, { state: "NV", city: "carson city", sid: "nv_carson" },
  { state: "NH", city: "manchester", sid: "nh_hillsborough" }, { state: "NH", city: "nashua", sid: "nh_rockingham" },
  { state: "NH", city: "concord", sid: "nh_merrimack" },
  { state: "NJ", city: "hackensack", sid: "nj_bergen" }, { state: "NJ", city: "jersey city", sid: "nj_hudson" },
  { state: "NJ", city: "new brunswick", sid: "nj_middlesex" }, { state: "NJ", city: "freehold", sid: "nj_monmouth" },
  { state: "NJ", city: "toms river", sid: "nj_ocean" }, { state: "NJ", city: "elizabeth", sid: "nj_union" },
  { state: "NJ", city: "camden", sid: "nj_camden" },
  { state: "NM", city: "las cruces", sid: "nm_dona_ana" }, { state: "NM", city: "santa fe", sid: "nm_santa_fe" },
  { state: "NY", city: "mineola", sid: "ny_nassau" }, { state: "NY", city: "riverhead", sid: "ny_suffolk" },
  { state: "NY", city: "white plains", sid: "ny_westchester" }, { state: "NY", city: "rochester", sid: "ny_monroe" },
  { state: "NY", city: "albany", sid: "ny_albany" }, { state: "NY", city: "syracuse", sid: "ny_onondaga" },
  { state: "NC", city: "greensboro", sid: "nc_guilford" }, { state: "NC", city: "winston-salem", sid: "nc_forsyth" },
  { state: "NC", city: "durham", sid: "nc_durham" }, { state: "NC", city: "fayetteville", sid: "nc_cumberland" },
  { state: "NC", city: "asheville", sid: "nc_buncombe" },
  { state: "ND", city: "fargo", sid: "nd_cass" }, { state: "ND", city: "bismarck", sid: "nd_burleigh" },
  { state: "ND", city: "grand forks", sid: "nd_grand_forks" },
  { state: "OH", city: "akron", sid: "oh_summit" }, { state: "OH", city: "dayton", sid: "oh_montgomery" },
  { state: "OH", city: "toledo", sid: "oh_lucas" }, { state: "OH", city: "canton", sid: "oh_stark" },
  { state: "OK", city: "tulsa", sid: "ok_tulsa" }, { state: "OK", city: "norman", sid: "ok_cleveland" },
  { state: "OR", city: "eugene", sid: "or_lane" }, { state: "OR", city: "salem", sid: "or_marion" },
  { state: "OR", city: "hillsboro", sid: "or_washington" }, { state: "OR", city: "oregon city", sid: "or_clackamas" },
  { state: "OR", city: "medford", sid: "or_jackson" }, { state: "OR", city: "bend", sid: "or_deschutes" },
  { state: "OR", city: "seaside", sid: "or_clatsop" },
  { state: "PA", city: "norristown", sid: "pa_montgomery" }, { state: "PA", city: "doylestown", sid: "pa_bucks" },
  { state: "PA", city: "west chester", sid: "pa_chester" }, { state: "PA", city: "lancaster", sid: "pa_lancaster" },
  { state: "PA", city: "york", sid: "pa_york" }, { state: "PA", city: "reading", sid: "pa_berks" },
  { state: "RI", city: "providence", sid: "ri_providence" }, { state: "RI", city: "warwick", sid: "ri_kent" },
  { state: "SC", city: "greenville", sid: "sc_greenville" }, { state: "SC", city: "columbia", sid: "sc_richland" },
  { state: "SC", city: "charleston", sid: "sc_charleston" }, { state: "SC", city: "spartanburg", sid: "sc_spartanburg" },
  { state: "SD", city: "sioux falls", sid: "sd_minnehaha" }, { state: "SD", city: "rapid city", sid: "sd_pennington" },
  { state: "TN", city: "knoxville", sid: "tn_knox" }, { state: "TN", city: "chattanooga", sid: "tn_hamilton" },
  { state: "TN", city: "murfreesboro", sid: "tn_rutherford" },
  { state: "TX", city: "san antonio", sid: "tx_bexar" }, { state: "TX", city: "plano", sid: "tx_collin" },
  { state: "TX", city: "frisco", sid: "tx_collin" }, { state: "TX", city: "mcallen", sid: "tx_hidalgo" },
  { state: "TX", city: "denton", sid: "tx_denton" }, { state: "TX", city: "corpus christi", sid: "tx_nueces" },
  { state: "TX", city: "round rock", sid: "tx_williamson" }, { state: "TX", city: "lubbock", sid: "tx_lubbock" },
  { state: "UT", city: "salt lake city", sid: "ut_salt_lake" }, { state: "UT", city: "provo", sid: "ut_utah" },
  { state: "UT", city: "orem", sid: "ut_utah" }, { state: "UT", city: "ogden", sid: "ut_weber" },
  { state: "UT", city: "st. george", sid: "ut_washington" },
  { state: "VT", city: "burlington", sid: "vt_chittenden" }, { state: "VT", city: "rutland", sid: "vt_rutland" },
  { state: "VT", city: "montpelier", sid: "vt_washington" },
  { state: "VA", city: "virginia beach", sid: "va_virginia_beach" }, { state: "VA", city: "chesapeake", sid: "va_chesapeake" },
  { state: "VA", city: "norfolk", sid: "va_norfolk" }, { state: "VA", city: "leesburg", sid: "va_loudoun" },
  { state: "WA", city: "everett", sid: "wa_snohomish" }, { state: "WA", city: "vancouver", sid: "wa_clark" },
  { state: "WA", city: "olympia", sid: "wa_thurston" }, { state: "WA", city: "bremerton", sid: "wa_kitsap" },
  { state: "WA", city: "bellingham", sid: "wa_whatcom" }, { state: "WA", city: "kennewick", sid: "wa_benton" },
  { state: "WA", city: "yakima", sid: "wa_yakima" },
  { state: "WV", city: "charleston", sid: "wv_kanawha" }, { state: "WV", city: "huntington", sid: "wv_cabell" },
  { state: "WV", city: "morgantown", sid: "wv_monongalia" },
  { state: "WI", city: "madison", sid: "wi_dane" }, { state: "WI", city: "waukesha", sid: "wi_waukesha" },
  { state: "WI", city: "green bay", sid: "wi_brown" }, { state: "WI", city: "racine", sid: "wi_racine" },
  { state: "WY", city: "cheyenne", sid: "wy_laramie" }, { state: "WY", city: "casper", sid: "wy_natrona" },
  { state: "WY", city: "jackson", sid: "wy_teton" },

  // ── Canada ──
  { state: "BC", city: "vancouver", sid: "vancouver" }, { state: "BC", city: "richmond", sid: "vancouver" },
  { state: "BC", city: "north vancouver", sid: "vancouver" }, { state: "BC", city: "west vancouver", sid: "vancouver" },
  { state: "BC", city: "squamish", sid: "vancouver" }, { state: "BC", city: "whistler", sid: "vancouver" },
  { state: "BC", city: "pemberton", sid: "vancouver" }, { state: "BC", city: "sechelt", sid: "vancouver" },
  { state: "BC", city: "gibsons", sid: "vancouver" }, { state: "BC", city: "powell river", sid: "vancouver" },
  { state: "BC", city: "bowen island", sid: "vancouver" },
  { state: "ON", city: "toronto", sid: "toronto" }, { state: "ON", city: "ottawa", sid: "ottawa" },
  { state: "AB", city: "calgary", sid: "calgary" }, { state: "AB", city: "edmonton", sid: "edmonton" },
  { state: "QC", city: "montreal", sid: "montreal" },
  { state: "MB", city: "winnipeg", sid: "winnipeg" },
  { state: "NS", city: "halifax", sid: "halifax" },

  // ── Mexico ──
  { state: null, city: "mexico city", sid: "mexico_city" },
  { state: null, city: "guadalajara", sid: "guadalajara" },
  { state: null, city: "monterrey", sid: "monterrey" },
  { state: null, city: "cancún", sid: "cancun" }, { state: null, city: "cancun", sid: "cancun" },
  { state: null, city: "tijuana", sid: "tijuana" },

  // ── UK (all route through uk_fsa) ──
  ...["london", "birmingham", "manchester", "leeds", "glasgow", "edinburgh", "liverpool", "bristol", "sheffield", "cardiff", "belfast"]
    .map(c => ({ state: null, city: c, sid: "uk_fsa" })),

  // ── Ireland ──
  { state: null, city: "dublin", sid: "dublin" }, { state: null, city: "cork", sid: "cork" },
  { state: null, city: "galway", sid: "galway" },

  // ── France ──
  { state: null, city: "paris", sid: "paris" }, { state: null, city: "lyon", sid: "lyon" },
  { state: null, city: "marseille", sid: "marseille" }, { state: null, city: "toulouse", sid: "toulouse" },
  { state: null, city: "nice", sid: "nice" }, { state: null, city: "bordeaux", sid: "bordeaux" },
  { state: null, city: "strasbourg", sid: "strasbourg" },

  // ── Germany ──
  { state: null, city: "berlin", sid: "berlin" }, { state: null, city: "munich", sid: "munich" },
  { state: null, city: "hamburg", sid: "hamburg" }, { state: null, city: "cologne", sid: "cologne" },
  { state: null, city: "frankfurt", sid: "frankfurt" },

  // ── Austria / Switzerland ──
  { state: null, city: "vienna", sid: "vienna" }, { state: null, city: "zurich", sid: "zurich" },
  { state: null, city: "geneva", sid: "geneva" },

  // ── Netherlands / Belgium ──
  { state: null, city: "amsterdam", sid: "amsterdam" }, { state: null, city: "rotterdam", sid: "rotterdam" },
  { state: null, city: "the hague", sid: "the_hague" }, { state: null, city: "the Hague", sid: "the_hague" },
  { state: null, city: "brussels", sid: "brussels" }, { state: null, city: "antwerp", sid: "antwerp" },

  // ── Nordic ──
  { state: null, city: "copenhagen", sid: "copenhagen" }, { state: null, city: "aarhus", sid: "aarhus" },
  { state: null, city: "stockholm", sid: "stockholm" }, { state: null, city: "gothenburg", sid: "gothenburg" },
  { state: null, city: "oslo", sid: "oslo" }, { state: null, city: "helsinki", sid: "helsinki" },
  { state: null, city: "reykjavik", sid: "reykjavik" },

  // ── Southern Europe ──
  { state: null, city: "madrid", sid: "madrid" }, { state: null, city: "barcelona", sid: "barcelona" },
  { state: null, city: "valencia", sid: "valencia" },
  { state: null, city: "rome", sid: "rome" }, { state: null, city: "milan", sid: "milan" },
  { state: null, city: "naples", sid: "naples" }, { state: null, city: "florence", sid: "florence" },
  { state: null, city: "lisbon", sid: "lisbon" }, { state: null, city: "porto", sid: "porto" },
  { state: null, city: "athens", sid: "athens" }, { state: null, city: "thessaloniki", sid: "thessaloniki" },

  // ── Central / Eastern Europe ──
  { state: null, city: "warsaw", sid: "warsaw" }, { state: null, city: "kraków", sid: "krakow" },
  { state: null, city: "krakow", sid: "krakow" },
  { state: null, city: "prague", sid: "prague" }, { state: null, city: "budapest", sid: "budapest" },
  { state: null, city: "bucharest", sid: "bucharest" }, { state: null, city: "sofia", sid: "sofia" },
  { state: null, city: "moscow", sid: "moscow" }, { state: null, city: "st. petersburg", sid: "st_petersburg" },
  { state: null, city: "st petersburg", sid: "st_petersburg" },
  { state: null, city: "kyiv", sid: "kyiv" },

  // ── Middle East ──
  { state: null, city: "dubai", sid: "dubai" }, { state: null, city: "abu dhabi", sid: "abu_dhabi" },
  { state: null, city: "sharjah", sid: "sharjah" }, { state: null, city: "riyadh", sid: "riyadh" },
  { state: null, city: "jeddah", sid: "jeddah" }, { state: null, city: "mecca", sid: "mecca" },
  { state: null, city: "doha", sid: "doha" }, { state: null, city: "kuwait city", sid: "kuwait_city" },
  { state: null, city: "manama", sid: "manama" }, { state: null, city: "muscat", sid: "muscat" },
  { state: null, city: "tel aviv", sid: "tel_aviv" }, { state: null, city: "jerusalem", sid: "jerusalem" },
  { state: null, city: "istanbul", sid: "istanbul" }, { state: null, city: "ankara", sid: "ankara" },
  { state: null, city: "cairo", sid: "cairo_eg" }, { state: null, city: "alexandria", sid: "alexandria" },
  { state: null, city: "amman", sid: "amman" }, { state: null, city: "beirut", sid: "beirut" },

  // ── East Asia ──
  { state: null, city: "tokyo", sid: "tokyo" }, { state: null, city: "osaka", sid: "osaka" },
  { state: null, city: "kyoto", sid: "kyoto" }, { state: null, city: "yokohama", sid: "yokohama" },
  { state: null, city: "sapporo", sid: "sapporo" }, { state: null, city: "fukuoka", sid: "fukuoka" },
  { state: null, city: "nagoya", sid: "nagoya" },
  { state: null, city: "seoul", sid: "seoul" }, { state: null, city: "busan", sid: "busan" },
  { state: null, city: "incheon", sid: "incheon" },
  { state: null, city: "beijing", sid: "beijing" }, { state: null, city: "shanghai", sid: "shanghai" },
  { state: null, city: "guangzhou", sid: "guangzhou" }, { state: null, city: "shenzhen", sid: "shenzhen" },
  { state: null, city: "hong kong", sid: "hong_kong" },
  { state: null, city: "taipei", sid: "taipei" }, { state: null, city: "kaohsiung", sid: "kaohsiung" },

  // ── Southeast Asia ──
  { state: null, city: "singapore", sid: "singapore" },
  { state: null, city: "bangkok", sid: "bangkok" }, { state: null, city: "chiang mai", sid: "chiang_mai" },
  { state: null, city: "phuket", sid: "phuket" },
  { state: null, city: "kuala lumpur", sid: "kuala_lumpur" }, { state: null, city: "penang", sid: "penang" },
  { state: null, city: "jakarta", sid: "jakarta" }, { state: null, city: "denpasar", sid: "bali" },
  { state: null, city: "bali", sid: "bali" },
  { state: null, city: "manila", sid: "manila" }, { state: null, city: "cebu", sid: "cebu" },
  { state: null, city: "ho chi minh city", sid: "ho_chi_minh" }, { state: null, city: "hanoi", sid: "hanoi" },
  { state: null, city: "phnom penh", sid: "phnom_penh" }, { state: null, city: "yangon", sid: "yangon" },
  { state: null, city: "vientiane", sid: "vientiane" },

  // ── South Asia ──
  { state: null, city: "mumbai", sid: "mumbai" }, { state: null, city: "delhi", sid: "delhi" },
  { state: null, city: "bangalore", sid: "bangalore" }, { state: null, city: "chennai", sid: "chennai" },
  { state: null, city: "kolkata", sid: "kolkata" }, { state: null, city: "hyderabad", sid: "hyderabad" },
  { state: null, city: "karachi", sid: "karachi" }, { state: null, city: "lahore", sid: "lahore" },
  { state: null, city: "islamabad", sid: "islamabad" },
  { state: null, city: "dhaka", sid: "dhaka" }, { state: null, city: "colombo", sid: "colombo" },

  // ── Oceania ──
  { state: "NSW", city: "sydney", sid: "sydney" }, { state: "QLD", city: "brisbane", sid: "brisbane" },
  { state: "QLD", city: "gold coast", sid: "gold_coast" },
  { state: "VIC", city: "melbourne", sid: "melbourne" }, { state: "WA", city: "perth", sid: "perth" },
  { state: "SA", city: "adelaide", sid: "adelaide" },
  { state: "ACT", city: "canberra", sid: "canberra" }, { state: "TAS", city: "hobart", sid: "hobart" },
  { state: "NT", city: "darwin", sid: "darwin" },
  { state: null, city: "auckland", sid: "auckland" }, { state: null, city: "wellington", sid: "wellington" },
  { state: null, city: "christchurch", sid: "christchurch" },

  // ── South America ──
  { state: null, city: "são paulo", sid: "sao_paulo" }, { state: null, city: "sao paulo", sid: "sao_paulo" },
  { state: null, city: "rio de janeiro", sid: "rio" },
  { state: null, city: "brasília", sid: "brasilia" }, { state: null, city: "brasilia", sid: "brasilia" },
  { state: null, city: "buenos aires", sid: "buenos_aires" },
  { state: null, city: "santiago", sid: "santiago" },
  { state: null, city: "bogotá", sid: "bogota" }, { state: null, city: "bogota", sid: "bogota" },
  { state: null, city: "lima", sid: "lima" }, { state: null, city: "quito", sid: "quito" },
  { state: null, city: "caracas", sid: "caracas" }, { state: null, city: "montevideo", sid: "montevideo" },

  // ── Africa ──
  { state: null, city: "cape town", sid: "cape_town" }, { state: null, city: "johannesburg", sid: "johannesburg" },
  { state: null, city: "durban", sid: "durban" },
  { state: null, city: "lagos", sid: "lagos" }, { state: null, city: "abuja", sid: "abuja" },
  { state: null, city: "nairobi", sid: "nairobi" },
  { state: null, city: "casablanca", sid: "casablanca" }, { state: null, city: "marrakech", sid: "marrakech" },
  { state: null, city: "addis ababa", sid: "addis_ababa" },
  { state: null, city: "accra", sid: "accra" }, { state: null, city: "dakar", sid: "dakar" },
  { state: null, city: "tunis", sid: "tunis" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// US STATE-LEVEL FALLBACK — any US state not in GEO_TABLE resolves to AI enrichment
// ═══════════════════════════════════════════════════════════════════════════════
const US_STATES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]);

const US_STATE_INFO: Record<string, {dept:string;rating:string;scale:string;ctx:string}> = {
  AL: { dept:"AL county health depts (ADPH)", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Alabama: county health departments under Alabama Department of Public Health (alabamapublichealth.gov). Score: Pass/Fail." },
  AK: { dept:"Alaska DEC", rating:"Pass/Unsatisfactory/Fail", scale:"Pass/Fail → 0-100", ctx:"Alaska: Alaska Dept of Environmental Conservation (dec.alaska.gov/eh). Statewide. Score: Pass/Unsatisfactory/Fail." },
  AZ: { dept:"AZ county environmental health depts", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Arizona: county environmental health departments — Maricopa (maricopa.gov), Pima (pima.gov), Coconino, Yavapai, Pinal." },
  AR: { dept:"Arkansas Dept of Health", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Arkansas: Arkansas Dept of Health (healthy.arkansas.gov). Statewide. Score: Pass/Fail." },
  CA: { dept:"CA county environmental health depts", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"California: county environmental health departments — San Diego, Sacramento, Orange, Alameda, Santa Clara, Fresno, Kern, Ventura, San Bernardino, Riverside." },
  CO: { dept:"CO county/city health depts (CDPHE)", rating:"100-point", scale:"0-100 numeric", ctx:"Colorado: CDPHE (cdphe.colorado.gov). County/city health depts — Denver, El Paso, Boulder, Arapahoe, Larimer, Jefferson, Adams." },
  CT: { dept:"CT local health depts (CT DPH)", rating:"Green/Yellow/Red placard", scale:"Placard → 0-100", ctx:"Connecticut: CT DPH (portal.ct.gov/dph). Local health departments conduct inspections. Green/Yellow/Red placard. Priority (P), Priority Foundation (Pf), Core (C) violations." },
  DE: { dept:"DE Division of Public Health", rating:"100-point", scale:"0-100 numeric", ctx:"Delaware: Delaware Division of Public Health — Office of Food Protection (dhss.delaware.gov/dph/hsp). Statewide." },
  DC: { dept:"DC Health Food Protection Program", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Washington DC: DC Health (dchealth.dc.gov). Food Protection Program. Score: Pass/Fail." },
  FL: { dept:"FL DBPR Division of Hotels & Restaurants", rating:"Pass/Fail with violations", scale:"Pass/Fail → 0-100", ctx:"Florida: FL DBPR (myfloridalicense.com). Division of Hotels & Restaurants. Statewide." },
  GA: { dept:"GA county health depts (DPH)", rating:"100-point or letter grade", scale:"0-100 or A/B/C → 0-100", ctx:"Georgia: GA Dept of Public Health (dph.georgia.gov). County health departments." },
  HI: { dept:"Hawaii Dept of Health", rating:"Pass/Conditional/Closed", scale:"Pass/Fail → 0-100", ctx:"Hawaii: Hawaii Dept of Health (health.hawaii.gov). Statewide. Score: Pass/Conditional/Closed." },
  ID: { dept:"Idaho Public Health Districts", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Idaho: seven Public Health Districts conduct inspections. Score: Pass/Fail." },
  IL: { dept:"IL county/city health depts (IDPH)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Illinois: IDPH (dph.illinois.gov). County/city health departments." },
  IN: { dept:"IN county health depts (ISDH)", rating:"Pass/Fail or 100-point", scale:"Pass/Fail → 0-100", ctx:"Indiana: Indiana State Dept of Health (in.gov/isdh). County health departments." },
  IA: { dept:"Iowa Dept of Inspections & Appeals", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Iowa: Iowa Dept of Inspections & Appeals (dia.iowa.gov)." },
  KS: { dept:"Kansas Dept of Agriculture", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Kansas: Kansas Dept of Agriculture (agriculture.ks.gov). Statewide." },
  KY: { dept:"KY county health depts (CHFS)", rating:"Pass/Fail or 100-point", scale:"Pass/Fail → 0-100", ctx:"Kentucky: Cabinet for Health & Family Services (chfs.ky.gov). County health departments." },
  LA: { dept:"LA parish health depts (LDH)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Louisiana: LA Dept of Health (ldh.la.gov). Parish-level inspections." },
  ME: { dept:"ME county/local health depts", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Maine: Maine CDC/DHHS (maine.gov/dhhs). County/local health departments." },
  MD: { dept:"MD county health depts", rating:"Pass/Fail or 100-point", scale:"Pass/Fail → 0-100", ctx:"Maryland: MD Dept of Health (health.maryland.gov). County health departments." },
  MA: { dept:"MA local boards of health", rating:"Pass/Fail or 100-point", scale:"Pass/Fail → 0-100", ctx:"Massachusetts: MA DPH (mass.gov). Local boards of health conduct inspections." },
  MI: { dept:"MI county health depts (MDARD)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Michigan: MI Dept of Agriculture & Rural Development (michigan.gov/mdard). County health departments." },
  MN: { dept:"MN county/city health depts (MDH)", rating:"Pass/Fail with risk categories", scale:"Pass/Fail → 0-100", ctx:"Minnesota: MN Dept of Health (health.state.mn.us). County/city health departments." },
  MS: { dept:"MS State Dept of Health", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Mississippi: MS State Dept of Health (msdh.ms.gov). Statewide." },
  MO: { dept:"MO county/city health depts (DHSS)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Missouri: MO Dept of Health & Senior Services (health.mo.gov). County/city health departments." },
  MT: { dept:"MT county health depts (DPHHS)", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Montana: MT DPHHS (dphhs.mt.gov). County health departments." },
  NE: { dept:"NE county/city health depts (DHHS)", rating:"Pass/Fail or 100-point", scale:"Pass/Fail → 0-100", ctx:"Nebraska: NE DHHS (dhhs.ne.gov). County/city health departments." },
  NV: { dept:"NV health districts (SNHD, WCHD)", rating:"100-point with letter grades", scale:"0-100 with A/B/C", ctx:"Nevada: SNHD (snhd.info) for Clark County, Washoe County (washoecounty.us/health)." },
  NH: { dept:"NH city/town health officers (DHHS)", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"New Hampshire: NH DHHS (dhhs.nh.gov). City/town health officers." },
  NJ: { dept:"NJ county/local health depts", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"New Jersey: NJ Dept of Health (nj.gov/health). County/local health departments." },
  NM: { dept:"NM Environment Dept", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"New Mexico: NM Environment Dept (env.nm.gov). Statewide." },
  NY: { dept:"NY State DOH / NYC DOHMH", rating:"100-point or letter grade", scale:"0-100 or A/B/C → 0-100", ctx:"New York: NY State DOH (health.data.ny.gov). NYC DOHMH for 5 boroughs, county health depts for rest of state." },
  NC: { dept:"NC county health depts (NCDA&CS)", rating:"100-point with A/B/C", scale:"0-100 with A/B/C", ctx:"North Carolina: NC Dept of Agriculture (ncagr.gov). County health departments." },
  ND: { dept:"ND county/local health depts", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"North Dakota: ND Health & Human Services (hhs.nd.gov). County/local health departments." },
  OH: { dept:"OH county health depts (ODA)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Ohio: Ohio Dept of Agriculture (agri.ohio.gov) and county health departments." },
  OK: { dept:"OK county health depts", rating:"Pass/Fail or 100-point", scale:"Pass/Fail → 0-100", ctx:"Oklahoma: OK State Dept of Health (oklahoma.gov/health). County health departments." },
  OR: { dept:"OR county health depts (OHA)", rating:"100-point (70=pass)", scale:"0-100 numeric", ctx:"Oregon: OHA (oregon.gov/oha/ph/healthyenvironments/foodsafety). County health depts — Multnomah, Clatsop, Lane, Marion, Washington, Deschutes, Jackson, Clackamas. Statewide portal available. Inspections 1-2 times/year." },
  PA: { dept:"PA county/local health depts (PDA)", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Pennsylvania: PA Dept of Agriculture (agriculture.pa.gov). County/local health departments." },
  RI: { dept:"RI Dept of Health", rating:"Pass/Fail with violations", scale:"Pass/Fail → 0-100", ctx:"Rhode Island: RI Dept of Health (health.ri.gov). Statewide." },
  SC: { dept:"SC DHEC", rating:"100-point with A/B/C", scale:"0-100 with A/B/C", ctx:"South Carolina: SC DHEC (scdhec.gov). Statewide." },
  SD: { dept:"SD county/local health depts", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"South Dakota: SD Dept of Health (doh.sd.gov). County/local health departments." },
  TN: { dept:"TN county health depts", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Tennessee: TN Dept of Health (tn.gov/health). County health departments." },
  TX: { dept:"TX county/city health depts (DSHS)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Texas: TX DSHS (dshs.texas.gov). County/city health departments." },
  UT: { dept:"UT county health depts (UDAF)", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Utah: UT Dept of Agriculture & Food (ag.utah.gov). County health departments." },
  VT: { dept:"VT Dept of Health", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Vermont: VT Dept of Health (healthvermont.gov). Statewide." },
  VA: { dept:"VA Dept of Health", rating:"Pass/Fail with risk categories", scale:"Pass/Fail → 0-100", ctx:"Virginia: VA Dept of Health (vdh.virginia.gov). Statewide." },
  WA: { dept:"WA county health depts (DOH)", rating:"Varies by county", scale:"0-100 or Pass/Fail", ctx:"Washington: WA State DOH (doh.wa.gov). County health depts — King, Pierce, Snohomish, Spokane, Clark, Thurston, Kitsap, Whatcom, Benton, Yakima." },
  WV: { dept:"WV county health depts", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"West Virginia: WV Bureau for Public Health (dhhr.wv.gov). County health departments." },
  WI: { dept:"WI county health depts (DATCP)", rating:"100-point or Pass/Fail", scale:"0-100 numeric or Pass/Fail", ctx:"Wisconsin: WI DATCP (datcp.wi.gov) and county health departments." },
  WY: { dept:"WY county health depts (WDA)", rating:"Pass/Fail", scale:"Pass/Fail → 0-100", ctx:"Wyoming: WY Dept of Agriculture (wyomingagriculture.gov). County health departments." },
};

function resolveGeo(state, city) {
  if (!state && !city) return null;
  const stateUp = (state || "").toUpperCase().trim();
  const cityLow = (city || "").toLowerCase().trim();
  // Try exact state + city match
  let match = GEO_TABLE.find(g =>
    (stateUp === "" || (g.state && g.state.toUpperCase() === stateUp)) &&
    g.city === cityLow
  );
  // State-only default (e.g. Delaware)
  if (!match && stateUp) {
    match = GEO_TABLE.find(g => g.state && g.state.toUpperCase() === stateUp && !g.city);
  }
  // City-only (international)
  if (!match && cityLow) {
    match = GEO_TABLE.find(g => !g.state && g.city === cityLow);
  }
  // Look up source from GEO_TABLE match (may be null if sid not in SOURCES)
  let source = match ? (SOURCES.find(s => s.id === match.sid) || null) : null;

  // US state-level fallback: any US state not in SOURCES gets AI enrichment
  if (!source && US_STATES.has(stateUp)) {
    const info = US_STATE_INFO[stateUp];
    if (info) {
      return {
        id: stateUp.toLowerCase(),
        dept: info.dept,
        city: cityLow ? cityLow.charAt(0).toUpperCase() + cityLow.slice(1) : "Statewide",
        state: stateUp,
        country: "US",
        type: "ai_enrichment",
        api: null,
        fn: "placesRestaurantSearch",
        rating: info.rating,
        scale: info.scale,
        enrich: true,
        ctx: info.ctx,
      };
    }
  }
  return source;
}

function lookupById(sourceId) {
  return SOURCES.find(s => s.id === sourceId) || null;
}

function formatSource(s) {
  return {
    source_id: s.id,
    health_department: s.dept,
    location: { city: s.city, state: s.state || null, country: s.country },
    data_source: {
      source_type: s.type,
      api_registry_id: s.api || null,
      backend_function: s.fn || null,
      rating_system: s.rating,
      rating_scale: s.scale,
    },
    enrichment: {
      needed: s.enrich,
      context: s.ctx || "",
      model: s.enrich ? (s.ctx ? "gemini_3_flash" : null) : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, state, city, source_id } = body;

    switch (action) {
      case "resolve": {
        const entry = resolveGeo(state, city);
        return Response.json({ resolved: !!entry, source: entry ? formatSource(entry) : null });
      }
      case "lookup": {
        const entry = lookupById(source_id);
        if (!entry) return Response.json({ error: "Source not found" }, { status: 404 });
        return Response.json({ source: formatSource(entry) });
      }
      case "list": {
        return Response.json({
          total_sources: SOURCES.length,
          total_geo_entries: GEO_TABLE.length,
          sources: SOURCES.map(formatSource),
          geo_table: GEO_TABLE,
        });
      }
      case "list_countries": {
        const countries = [...new Set(SOURCES.map(s => s.country))].sort();
        return Response.json({
          total_countries: countries.length,
          countries: countries.map(c => ({
            country: c,
            city_count: SOURCES.filter(s => s.country === c).length,
            cities: SOURCES.filter(s => s.country === c).map(s => s.city),
          })),
        });
      }
      default:
        return Response.json({ error: "Unknown action. Use: resolve, lookup, list, or list_countries." }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});