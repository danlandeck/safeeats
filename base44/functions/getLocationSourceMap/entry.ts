import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── CENTRAL SOURCE MAPPING TABLE ──────────────────────────────────────────────
// Single authoritative record of every location SafeEats covers, which health
// department serves it, what rating system that department uses, and how the
// app should retrieve/process its data.
//
// source_type values:
//   "live_api"        – direct browser fetch to a Socrata/ArcGIS open-data endpoint
//   "backend_proxy"   – server-side function (CORS-protected or CKAN/scraped portal)
//   "ai_enrichment"   – Google Places grounds the restaurant list; LLM finds inspection scores
//   "ai_only"         – pure LLM (fast training-data + web search), no Places grounding
//
// rating_scale values describe the native system so the frontend/LLM can convert
// to SafeEats' unified 0-100 score.

const SOURCE_MAP = [
  // ═══ LIVE API (direct browser fetch) ═══════════════════════════════════════
  {
    source_id: "king",
    health_department: "Public Health — Seattle & King County",
    location: { city: "Seattle", state: "WA", country: "US", coverage: ["Seattle", "Bellevue", "Kent", "Renton", "Redmond", "Kirkland", "Federal Way", "Sammamish", "Shoreline", "Burien", "Tukwila", "Issaquah", "Mercer Island", "Auburn", "Bothell", "Kenmore", "Newcastle", "Des Moines", "SeaTac", "Woodinville"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "king",
      backend_function: null,
      endpoint_description: "ArcGIS Feature Service — King County Restaurant Inspections",
      rating_system: "Red/Blue violation point deduction from 100. Red = critical violations, Blue = non-critical. Lower deduction = higher score.",
      rating_scale: "0-100 numeric (100 = perfect, deductions per violation)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "nyc",
    health_department: "NYC Department of Health and Mental Hygiene",
    location: { city: "New York", state: "NY", country: "US", coverage: ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "nyc",
      backend_function: null,
      endpoint_description: "NYC Open Data — DOHMH Restaurant Inspections",
      rating_system: "Letter grade A/B/C based on violation points. 0-13 = A, 14-27 = B, 28+ = C.",
      rating_scale: "A/B/C letter grade (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "cook",
    health_department: "Chicago Department of Public Health",
    location: { city: "Chicago", state: "IL", country: "US", coverage: ["Chicago"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "cook",
      backend_function: null,
      endpoint_description: "Chicago Data Portal — Food Inspections",
      rating_system: "Pass / Pass w/ Conditions / Fail. Risk level 1-3.",
      rating_scale: "Pass/Fail (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "montgomery_md",
    health_department: "Montgomery County Department of Health and Human Services",
    location: { city: "Rockville", state: "MD", country: "US", coverage: ["Rockville", "Bethesda", "Silver Spring", "Gaithersburg"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "montgomery_md",
      backend_function: null,
      endpoint_description: "Montgomery County Open Data — Food Inspection",
      rating_system: "Numeric score 0-100 based on critical and non-critical violations.",
      rating_scale: "0-100 numeric"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "travis",
    health_department: "Austin Public Health",
    location: { city: "Austin", state: "TX", country: "US", coverage: ["Austin"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "travis",
      backend_function: null,
      endpoint_description: "Austin Open Data — Restaurant Inspections",
      rating_system: "Score 0-100 based on demerit points deducted from 100.",
      rating_scale: "0-100 numeric"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "sf",
    health_department: "San Francisco Department of Public Health",
    location: { city: "San Francisco", state: "CA", country: "US", coverage: ["San Francisco"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "sf",
      backend_function: null,
      endpoint_description: "SF Open Data — Health Inspection Scores",
      rating_system: "Numeric score 0-100. Inspection results: Satisfactory, Unsatisfactory, Incomplete.",
      rating_scale: "0-100 numeric"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "delaware",
    health_department: "Delaware Health and Social Services",
    location: { city: "Statewide", state: "DE", country: "US", coverage: ["Wilmington", "Dover", "Newark", "Statewide"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "delaware",
      backend_function: null,
      endpoint_description: "Delaware Open Data — Food Inspections",
      rating_system: "Compliant / Non-Compliant with violation details.",
      rating_scale: "Pass/Fail (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "ny_state",
    health_department: "New York State Department of Health",
    location: { city: "Statewide", state: "NY", country: "US", coverage: ["Statewide (excluding NYC)"] },
    data_source: {
      source_type: "live_api",
      api_registry_id: "ny_state",
      backend_function: null,
      endpoint_description: "NY State Health Data — Food Service Establishment Inspections",
      rating_system: "Critical / Non-Critical violations. Pass/Fail outcome.",
      rating_scale: "Pass/Fail (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },

  // ═══ BACKEND PROXY (server-side fetch) ═════════════════════════════════════
  {
    source_id: "la",
    health_department: "LA County Department of Public Health",
    location: { city: "Los Angeles", state: "CA", country: "US", coverage: ["Los Angeles", "Long Beach", "Glendale", "Pasadena", "Santa Monica", "Burbank", "Torrance"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "laCountyInspections",
      endpoint_description: "ArcGIS Feature Service — LA County Restaurant Inspections (proxied)",
      rating_system: "Score 0-100 based on violation deductions. Grade A/B/C.",
      rating_scale: "0-100 numeric with A/B/C grade"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "toronto",
    health_department: "Toronto Public Health (DineSafe)",
    location: { city: "Toronto", state: "ON", country: "CA", coverage: ["Toronto"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "torontoDineSafe",
      endpoint_description: "Toronto Open Data CKAN — DineSafe Inspection Results",
      rating_system: "Pass / Conditional Pass / Closed. Yellow/Red/Green sign.",
      rating_scale: "Pass/Conditional/Closed (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "boston",
    health_department: "City of Boston Inspectional Services Department",
    location: { city: "Boston", state: "MA", country: "US", coverage: ["Boston"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "bostonFoodInspections",
      endpoint_description: "Analyze Boston — Food Establishment Inspections (CKAN)",
      rating_system: "Pass/Fail based on major and minor violation counts.",
      rating_scale: "Pass/Fail (converted to 0-100 from violation counts)"
    },
    enrichment: { needed: true, context: "Boston CKAN has current data but scores are computed from violation counts. Enrichment adds any missing dates/scores from LLM training data.", model: "gemini_3_flash" }
  },
  {
    source_id: "houston",
    health_department: "Houston Health Department",
    location: { city: "Houston", state: "TX", country: "US", coverage: ["Houston"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "houstonFoodInspections",
      endpoint_description: "Houston Open Data — Food Inspection Results (CKAN, frozen at 2012)",
      rating_system: "0-100 ded point system where lower is better. 0-10 ded → score 90-100, 11-20 → 70-89, 21-30 → 40-69, 30+ → 0-39.",
      rating_scale: "Deduction points (inverted to 0-100)"
    },
    enrichment: { needed: true, context: "Houston CKAN data is frozen at 2012 — background LLM enrichment provides current inspection scores from training data.", model: "gemini_3_flash" }
  },
  {
    source_id: "stanislaus",
    health_department: "Stanislaus County Environmental Health",
    location: { city: "Modesto", state: "CA", country: "US", coverage: ["Modesto", "Turlock", "Ceres"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "stanislausInspections",
      endpoint_description: "Stanislaus County Food Facility Inspection Portal (scraped)",
      rating_system: "Permit status (Active/Inactive) with inspection dates. No numeric scores published.",
      rating_scale: "No native score (enrichment provides 0-100)"
    },
    enrichment: { needed: true, context: "Stanislaus County Environmental Health (stancounty.com) food facility inspection results. Facilities are inspected 1-4 times per year. Scores based on critical and non-critical violations.", model: "gemini_3_flash" }
  },
  {
    source_id: "vancouver",
    health_department: "Vancouver Coastal Health (VCH)",
    location: { city: "Vancouver", state: "BC", country: "CA", coverage: ["Vancouver", "Richmond", "North Vancouver", "West Vancouver", "Squamish", "Whistler", "Pemberton", "Sechelt", "Gibsons", "Powell River", "Bowen Island"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "vancouverBCInspections",
      endpoint_description: "VCH Disclosure Portal — inspections.vch.ca",
      rating_system: "Pass / Conditional Pass / Closed. Hazard ratings: Low/Moderate/High.",
      rating_scale: "Pass/Conditional/Closed (converted to 0-100)"
    },
    enrichment: { needed: true, context: "Vancouver Coastal Health (VCH) restaurant inspection records from inspections.vch.ca. Inspection results: Pass, Conditional Pass, or Closed.", model: "gemini_3_flash" }
  },
  {
    source_id: "pierce",
    health_department: "Tacoma-Pierce County Health Department (TPCHD)",
    location: { city: "Tacoma", state: "WA", country: "US", coverage: ["Tacoma", "Puyallup", "Lakewood", "University Place", "Fircrest", "Parkland", "Spanaway", "Sumner", "Bonney Lake", "Gig Harbor", "DuPont", "Steilacoom", "Milton", "Edgewood", "Orting", "Eatonville", "Roy"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "tacomaPierceInspections",
      endpoint_description: "Accela Citizen Access — TPCHD facility permits",
      rating_system: "Great (≤135 red points)→90-100, Okay (136-299 red points)→70-89, Needs to Improve (≥300 red points)→40-69, Closed→0-39. Based on red critical violation points from last 4 routine inspections.",
      rating_scale: "Red point thresholds (converted to 0-100)"
    },
    enrichment: { needed: true, context: "Tacoma-Pierce County Health Department (TPCHD) food safety rating: Great, Okay, Needs to Improve, or Closed. Based on red critical violation points from last 4 routine inspections. Great=95, Okay=80, Needs to Improve=55, Closed=25.", model: "gemini_3_flash" }
  },
  {
    source_id: "uk_fsa",
    health_department: "Food Standards Agency (UK FSA)",
    location: { city: "Multiple", state: null, country: "GB", coverage: ["London", "Birmingham", "Manchester", "Leeds", "Glasgow", "Edinburgh", "Liverpool", "Bristol", "Sheffield", "Cardiff", "Belfast"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "ukFoodRatings",
      endpoint_description: "FSA Food Hygiene Rating Service API (FHRS)",
      rating_system: "FHRS 0-5 scale: 0=Urgent improvement, 1=Major improvement, 2=Improvement, 3=Generally satisfactory, 4=Good, 5=Very good.",
      rating_scale: "0-5 FHRS rating (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "singapore",
    health_department: "Singapore Food Agency (SFA) / NEA",
    location: { city: "Singapore", state: null, country: "SG", coverage: ["Singapore"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "singaporeInspections",
      endpoint_description: "data.gov.sg CKAN — SFA Food Establishment Hygiene Grades",
      rating_system: "SFA/NEA hygiene grades A/B/C/D/E scale (A=excellent, E=poor).",
      rating_scale: "A-E letter grade (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "sydney",
    health_department: "NSW Food Authority (Scores on Doors)",
    location: { city: "Sydney", state: "NSW", country: "AU", coverage: ["Sydney"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "australiaFoodSafety",
      endpoint_description: "NSW Open Data Portal — Scores on Doors ratings",
      rating_system: "5-star rating scale: 5=Excellent, 4=Very good, 3=Good, 2=Satisfactory, 1=Needs improvement.",
      rating_scale: "1-5 star rating (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },
  {
    source_id: "brisbane",
    health_department: "Brisbane City Council / Queensland Health",
    location: { city: "Brisbane", state: "QLD", country: "AU", coverage: ["Brisbane", "Gold Coast"] },
    data_source: {
      source_type: "backend_proxy",
      api_registry_id: null,
      backend_function: "australiaFoodSafety",
      endpoint_description: "Queensland Open Data Portal — Food Safety ratings",
      rating_system: "Star rating or Pass/Non-compliant based on council inspection.",
      rating_scale: "Star rating (converted to 0-100)"
    },
    enrichment: { needed: false, context: "", model: null }
  },

  // ═══ AI-ENRICHMENT (Google Places grounded + LLM inspection lookup) ════════
  {
    source_id: "manchester_ct",
    health_department: "Manchester CT Health Department",
    location: { city: "Manchester", state: "CT", country: "US", coverage: ["Manchester"] },
    data_source: {
      source_type: "ai_enrichment",
      api_registry_id: null,
      backend_function: "placesRestaurantSearch",
      endpoint_description: "Google Places verifies restaurant identity; LLM finds CT inspection data from decadeonline.com and manchesterct.gov PDFs",
      rating_system: "Green/Yellow/Red placard. Green = Pass (0-1 priority violations)→90-100, Yellow = Conditional Pass (2+ priority violations corrected on site)→70-89, Red = Closed/Fail (imminent health hazard)→0-39.",
      rating_scale: "Green/Yellow/Red placard (converted to 0-100)"
    },
    enrichment: { needed: true, context: "Manchester CT Health Department (manchesterct.gov) uses a Green/Yellow/Red placard system. Green = Pass (0-1 priority violations) → score 90-100, Yellow = Conditional Pass (2+ priority violations corrected on site) → score 70-89, Red = Closed/Fail (imminent health hazard) → score 0-39. Inspection reports published monthly as PDFs. Also check decadeonline.com which aggregates CT inspection data. CT DPH uses Priority (P), Priority Foundation (Pf), and Core (C) violation categories.", model: "gemini_3_flash" }
  },

  // ═══ AI-ONLY (pure LLM, no Places grounding) ════════════════════════════════
  {
    source_id: "dubai",
    health_department: "Dubai Municipality Food Safety Department",
    location: { city: "Dubai", state: null, country: "AE", coverage: ["Dubai"] },
    data_source: {
      source_type: "ai_only",
      api_registry_id: null,
      backend_function: null,
      endpoint_description: "LLM web search — Dubai Municipality food safety inspection grades",
      rating_system: "Dubai Municipality uses A/B/C/D/E grades for food establishments. A=excellent, E=poor.",
      rating_scale: "A-E letter grade (converted to 0-100)"
    },
    enrichment: { needed: false, context: "Dubai Municipality food safety inspection grades A-E.", model: null }
  },

  // ═══ AI-ENRICHMENT (Places grounded + web search) — US cities without live APIs ═══
  {
    source_id: "denver",
    health_department: "Denver Environmental Health & Safety",
    location: { city: "Denver", state: "CO", country: "US", coverage: ["Denver"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Denver inspection scores (denvergov.org)", rating_system: "Score 0-100 or Pass/Fail from Denver Environmental Health.", rating_scale: "0-100 numeric or Pass/Fail" },
    enrichment: { needed: true, context: "Prioritize: Denver Environmental Health & Safety restaurant inspection scores (denvergov.org). Score is 0-100 or Pass/Fail.", model: "gemini_3_flash" }
  },
  {
    source_id: "dallas",
    health_department: "Dallas County Health and Human Services",
    location: { city: "Dallas", state: "TX", country: "US", coverage: ["Dallas"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Dallas inspection records (dallascounty.org)", rating_system: "Demerit-based deduction from 100.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Dallas County Health and Human Services food establishment inspection records (dallascounty.org).", model: "gemini_3_flash" }
  },
  {
    source_id: "miami",
    health_department: "Miami-Dade County Environmental Health",
    location: { city: "Miami", state: "FL", country: "US", coverage: ["Miami"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Miami-Dade inspection database (miamidade.gov)", rating_system: "Numeric inspection scores and violation details.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Miami-Dade County food inspection database (miamidade.gov). Look for inspection scores and violation details.", model: "gemini_3_flash" }
  },
  {
    source_id: "las_vegas",
    health_department: "Southern Nevada Health District (SNHD)",
    location: { city: "Las Vegas", state: "NV", country: "US", coverage: ["Las Vegas", "Clark County"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for SNHD inspection database (snhd.info)", rating_system: "Letter grade A/B/C with demerit points. 0-10 demerits = A, 11-20 = B, 21+ = C.", rating_scale: "A/B/C letter grade (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Southern Nevada Health District (SNHD) restaurant inspection database (snhd.info). Clark County inspections.", model: "gemini_3_flash" }
  },
  {
    source_id: "phoenix",
    health_department: "Maricopa County Environmental Services",
    location: { city: "Phoenix", state: "AZ", country: "US", coverage: ["Phoenix"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Maricopa County inspection database (maricopa.gov)", rating_system: "Score 0-100 or Pass/Conditional/Fail.", rating_scale: "0-100 numeric or Pass/Fail" },
    enrichment: { needed: true, context: "Prioritize: Maricopa County Environmental Services (maricopa.gov) restaurant inspection database — search by facility name and address.", model: "gemini_3_flash" }
  },
  {
    source_id: "orlando",
    health_department: "Florida DBPR Division of Hotels and Restaurants",
    location: { city: "Orlando", state: "FL", country: "US", coverage: ["Orlando"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for FL DBPR inspection reports (myfloridalicense.com)", rating_system: "Pass/Conditional Pass/Closed with violation details.", rating_scale: "Pass/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Florida DBPR (myfloridalicense.com) Division of Hotels and Restaurants inspection reports — search by business name and address.", model: "gemini_3_flash" }
  },
  {
    source_id: "philadelphia",
    health_department: "Philadelphia Department of Public Health",
    location: { city: "Philadelphia", state: "PA", country: "US", coverage: ["Philadelphia"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Philadelphia inspection database (phila.gov)", rating_system: "Pass/Fail with violation categories.", rating_scale: "Pass/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Philadelphia Department of Public Health (phila.gov) restaurant inspection database and PA Department of Agriculture food safety records.", model: "gemini_3_flash" }
  },
  {
    source_id: "atlanta",
    health_department: "Fulton County Environmental Health Services",
    location: { city: "Atlanta", state: "GA", country: "US", coverage: ["Atlanta"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Fulton County inspection scores", rating_system: "Letter grade A/B/C/U or numeric score.", rating_scale: "A/B/C letter grade (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Fulton County Environmental Health Services restaurant inspection scores and Georgia Department of Public Health food safety records.", model: "gemini_3_flash" }
  },
  {
    source_id: "nashville",
    health_department: "Nashville/Davidson County Metro Public Health Department",
    location: { city: "Nashville", state: "TN", country: "US", coverage: ["Nashville"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Nashville inspection scores", rating_system: "Score 0-100 or Pass/Fail.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Nashville/Davidson County Metro Public Health Department restaurant inspection scores.", model: "gemini_3_flash" }
  },
  {
    source_id: "charlotte",
    health_department: "Mecklenburg County Environmental Health",
    location: { city: "Charlotte", state: "NC", country: "US", coverage: ["Charlotte"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Mecklenburg County inspection database (mecknc.gov)", rating_system: "Letter grade A/B/C or numeric score.", rating_scale: "A/B/C letter grade (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Mecklenburg County Environmental Health restaurant inspection database (mecknc.gov).", model: "gemini_3_flash" }
  },
  {
    source_id: "raleigh",
    health_department: "Wake County Environmental Health",
    location: { city: "Raleigh", state: "NC", country: "US", coverage: ["Raleigh"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Wake County inspection scores (wake.gov)", rating_system: "Numeric score or Pass/Fail.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Wake County Environmental Health (wake.gov) restaurant inspection scores and NC Department of Agriculture food safety records.", model: "gemini_3_flash" }
  },
  {
    source_id: "columbus",
    health_department: "Columbus Public Health",
    location: { city: "Columbus", state: "OH", country: "US", coverage: ["Columbus"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Columbus inspection database (columbus.gov)", rating_system: "Pass/Fail or numeric score.", rating_scale: "0-100 numeric or Pass/Fail" },
    enrichment: { needed: true, context: "Prioritize: Columbus Public Health (columbus.gov) restaurant inspection database and Ohio Department of Agriculture food safety records.", model: "gemini_3_flash" }
  },
  {
    source_id: "minneapolis",
    health_department: "Minneapolis Environmental Health / Hennepin County",
    location: { city: "Minneapolis", state: "MN", country: "US", coverage: ["Minneapolis"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Minneapolis inspection records (minneapolismn.gov)", rating_system: "Pass/Conditional/Fail.", rating_scale: "Pass/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Minneapolis Environmental Health (minneapolismn.gov) and Hennepin County Environmental Health restaurant inspection records.", model: "gemini_3_flash" }
  },
  {
    source_id: "pittsburgh",
    health_department: "Allegheny County Health Department",
    location: { city: "Pittsburgh", state: "PA", country: "US", coverage: ["Pittsburgh"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Allegheny County inspection database (achd.net)", rating_system: "Numeric score 0-100 or Pass/Fail.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Allegheny County Health Department (achd.net) restaurant inspection database and PA Department of Agriculture records.", model: "gemini_3_flash" }
  },
  {
    source_id: "sacramento",
    health_department: "Sacramento County Environmental Management Department",
    location: { city: "Sacramento", state: "CA", country: "US", coverage: ["Sacramento"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Sacramento County inspection database (emd.saccounty.gov)", rating_system: "Numeric score 0-100.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Sacramento County Environmental Management Department (emd.saccounty.gov) restaurant inspection database.", model: "gemini_3_flash" }
  },
  {
    source_id: "san_diego",
    health_department: "San Diego County Department of Environmental Health",
    location: { city: "San Diego", state: "CA", country: "US", coverage: ["San Diego"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for San Diego County inspection database (sdcounty.ca.gov)", rating_system: "Numeric score 0-100 or Pass/Fail.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: San Diego County Department of Environmental Health (sdcounty.ca.gov) food inspection database.", model: "gemini_3_flash" }
  },
  {
    source_id: "spokane",
    health_department: "Spokane Regional Health District",
    location: { city: "Spokane", state: "WA", country: "US", coverage: ["Spokane"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Spokane inspection records (srhd.org)", rating_system: "Numeric score or Pass/Fail.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Prioritize: Spokane Regional Health District (srhd.org) restaurant inspection records and food safety scores.", model: "gemini_3_flash" }
  },
  {
    source_id: "portland",
    health_department: "Multnomah County Environmental Health",
    location: { city: "Portland", state: "OR", country: "US", coverage: ["Portland"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Multnomah County inspection scores (multco.us)", rating_system: "Pass/Conditional/Fail.", rating_scale: "Pass/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Multnomah County Environmental Health (multco.us) restaurant inspection scores and Oregon Health Authority food safety records.", model: "gemini_3_flash" }
  },

  // ═══ AI-ENRICHMENT — International cities ═══════════════════════════════════
  {
    source_id: "paris",
    health_department: "DGCCRF (Alim'confiance)",
    location: { city: "Paris", state: null, country: "FR", coverage: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Bordeaux", "Strasbourg"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Alim'confiance (alim-confiance.gouv.fr) — official DGCCRF transparency database", rating_system: "4-tier: Très satisfaisant / Satisfaisant / À améliorer / À corriger de toute urgence.", rating_scale: "4-tier (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Alim'confiance platform (alim-confiance.gouv.fr) — official DGCCRF transparency database with 4-tier ratings.", model: "gemini_3_flash" }
  },
  {
    source_id: "berlin",
    health_department: "Berlin Senatsverwaltung Lebensmittelüberwachung",
    location: { city: "Berlin", state: null, country: "DE", coverage: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for verbraucherportal.de and regional Lebensmittelüberwachung records", rating_system: "Smiley-based rating (green/yellow/red) from German food safety authorities.", rating_scale: "Green/Yellow/Red smiley (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: verbraucherportal.de and Berlin Senatsverwaltung Lebensmittelüberwachung inspection records.", model: "gemini_3_flash" }
  },
  {
    source_id: "amsterdam",
    health_department: "NVWA (Nederlandse Voedsel- en Warenautoriteit)",
    location: { city: "Amsterdam", state: null, country: "NL", coverage: ["Amsterdam", "Rotterdam", "The Hague"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for NVWA (nvwa.nl) and inspectieresultaten.nl", rating_system: "Risk classification: laag/gemiddeld/hoog (low/average/high risk).", rating_scale: "3-tier risk (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: NVWA (nvwa.nl) inspection results and inspectieresultaten.nl — Dutch Food and Consumer Product Safety Authority.", model: "gemini_3_flash" }
  },
  {
    source_id: "copenhagen",
    health_department: "Fødevarestyrelsen (Danish Veterinary and Food Administration)",
    location: { city: "Copenhagen", state: null, country: "DK", coverage: ["Copenhagen"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for findsmiley.dk — official Danish smiley scheme", rating_system: "4-tier smiley: Elite (4 smileys), Very good (3), Good (2), Satisfactory (1). Smiley-with-frown = issued report.", rating_scale: "4-tier smiley (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Smiley scheme (findsmiley.dk) from Fødevarestyrelsen — 4-tier smiley rating for Danish restaurants.", model: "gemini_3_flash" }
  },
  {
    source_id: "tokyo",
    health_department: "Tokyo Metropolitan Government (東京都) — local 保健所",
    location: { city: "Tokyo", state: null, country: "JP", coverage: ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Sapporo", "Fukuoka", "Nagoya"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Japanese 保健所 (health center) food hygiene records", rating_system: "Pass/Fail from 食品衛生責任者 (food hygiene supervisor) inspection.", rating_scale: "Pass/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Search: Tokyo Metropolitan Government (東京都) food hygiene (食品衛生) from local 保健所 (health centers). Score is Pass/Fail from 食品衛生責任者.", model: "gemini_3_flash" }
  },
  {
    source_id: "seoul",
    health_department: "식품안전나라 (Food Safety Korea) / Seoul Metropolitan Government",
    location: { city: "Seoul", state: null, country: "KR", coverage: ["Seoul", "Busan", "Incheon"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for 식품안전나라 (foodsafetykorea.go.kr)", rating_system: "Score 0-100 from Korean food safety inspection.", rating_scale: "0-100 numeric" },
    enrichment: { needed: true, context: "Search: 식품안전나라 (foodsafetykorea.go.kr) and Seoul Metropolitan Government food inspection database. Score is 0-100.", model: "gemini_3_flash" }
  },
  {
    source_id: "hong_kong",
    health_department: "FEHD (Food and Environmental Hygiene Department)",
    location: { city: "Hong Kong", state: null, country: "HK", coverage: ["Hong Kong"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for FEHD inspection records (fehd.gov.hk)", rating_system: "License grading A/B/C from FEHD inspections.", rating_scale: "A/B/C license grade (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: FEHD (Food and Environmental Hygiene Department) Hong Kong (fehd.gov.hk) inspection records.", model: "gemini_3_flash" }
  },
  {
    source_id: "mumbai",
    health_department: "FSSAI (Food Safety and Standards Authority of India) / MCGM",
    location: { city: "Mumbai", state: null, country: "IN", coverage: ["Mumbai", "Delhi", "Bangalore"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for FSSAI registration (fssai.gov.in) and MCGM food safety records", rating_system: "FSSAI license/registration status. No standardized score.", rating_scale: "License status (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: FSSAI (fssai.gov.in) registration database and Mumbai Municipal Corporation (MCGM) food safety records.", model: "gemini_3_flash" }
  },
  {
    source_id: "sao_paulo",
    health_department: "VISA São Paulo (Vigilância Sanitária)",
    location: { city: "São Paulo", state: null, country: "BR", coverage: ["São Paulo", "Rio de Janeiro"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for VISA São Paulo inspection records (cvs.saude.sp.gov.br)", rating_system: "Conforme/Não conforme (compliant/non-compliant) with violation details.", rating_scale: "Pass/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: VISA São Paulo (cvs.saude.sp.gov.br) Vigilância Sanitária restaurant inspection records.", model: "gemini_3_flash" }
  },
  {
    source_id: "abu_dhabi",
    health_department: "ADAFSA (Abu Dhabi Agriculture and Food Safety Authority)",
    location: { city: "Abu Dhabi", state: null, country: "AE", coverage: ["Abu Dhabi", "Sharjah"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for ADAFSA inspection and grading records", rating_system: "A/B/C/D grades from ADAFSA food safety inspections.", rating_scale: "A-D letter grade (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: ADAFSA (Abu Dhabi Agriculture and Food Safety Authority) restaurant inspection and grading records.", model: "gemini_3_flash" }
  },
  {
    source_id: "auckland",
    health_department: "Auckland Council / MPI (Ministry for Primary Industries)",
    location: { city: "Auckland", state: null, country: "NZ", coverage: ["Auckland", "Wellington", "Christchurch"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for Auckland Council food inspection records", rating_system: "FoodSafe verification: Pass/Conditional/Fail.", rating_scale: "Pass/Conditional/Fail (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Auckland Council food premises inspection records and FoodSafe verification scheme.", model: "gemini_3_flash" }
  },
  {
    source_id: "dublin",
    health_department: "FSAI (Food Safety Authority of Ireland)",
    location: { city: "Dublin", state: null, country: "IE", coverage: ["Dublin", "Cork", "Galway", "Limerick", "Waterford"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for FSAI enforcement orders (fsai.ie)", rating_system: "Enforcement orders: Closure Order / Improvement Notice / Prohibition Order. No numeric score.", rating_scale: "Enforcement status (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: FSAI (fsai.ie) enforcement orders and closure notices, and Dublin City Council food safety inspection records.", model: "gemini_3_flash" }
  },
  {
    source_id: "vancouver_ca_other",
    health_department: "Various — Calgary/Edmonton (Alberta Health Services), Montreal (MAPAQ)",
    location: { city: "Calgary", state: null, country: "CA", coverage: ["Calgary", "Edmonton", "Montreal", "Ottawa"] },
    data_source: { source_type: "ai_enrichment", api_registry_id: null, backend_function: "placesRestaurantSearch", endpoint_description: "Google Places + LLM web search for provincial health authority inspection records", rating_system: "Varies by province: Pass/Conditional/Closed or numeric scores.", rating_scale: "Pass/Fail or numeric (converted to 0-100)" },
    enrichment: { needed: true, context: "Prioritize: Ottawa Public Health food premise inspection reports (ottawapublichealth.ca). Look for Pass/Conditional/Closed results.", model: "gemini_3_flash" }
  },
];

// ── GEO RESOLUTION ────────────────────────────────────────────────────────────
// Maps state + city to a source_id, mirroring the GEO_ROUTE logic in the
// frontend searchEngine but in a single queryable table.

const GEO_TABLE = [
  // WA — King County cities
  { state: "WA", city: "seattle", source_id: "king" },
  { state: "WA", city: "bellevue", source_id: "king" },
  { state: "WA", city: "kent", source_id: "king" },
  { state: "WA", city: "renton", source_id: "king" },
  { state: "WA", city: "redmond", source_id: "king" },
  { state: "WA", city: "kirkland", source_id: "king" },
  { state: "WA", city: "federal way", source_id: "king" },
  { state: "WA", city: "sammamish", source_id: "king" },
  { state: "WA", city: "shoreline", source_id: "king" },
  { state: "WA", city: "burien", source_id: "king" },
  { state: "WA", city: "tukwila", source_id: "king" },
  { state: "WA", city: "issaquah", source_id: "king" },
  { state: "WA", city: "mercer island", source_id: "king" },
  { state: "WA", city: "auburn", source_id: "king" },
  { state: "WA", city: "bothell", source_id: "king" },
  { state: "WA", city: "kenmore", source_id: "king" },
  { state: "WA", city: "newcastle", source_id: "king" },
  { state: "WA", city: "des moines", source_id: "king" },
  { state: "WA", city: "seatac", source_id: "king" },
  { state: "WA", city: "woodinville", source_id: "king" },
  // WA — Pierce County cities
  { state: "WA", city: "tacoma", source_id: "pierce" },
  { state: "WA", city: "puyallup", source_id: "pierce" },
  { state: "WA", city: "lakewood", source_id: "pierce" },
  { state: "WA", city: "university place", source_id: "pierce" },
  { state: "WA", city: "fircrest", source_id: "pierce" },
  { state: "WA", city: "parkland", source_id: "pierce" },
  { state: "WA", city: "spanaway", source_id: "pierce" },
  { state: "WA", city: "sumner", source_id: "pierce" },
  { state: "WA", city: "bonney lake", source_id: "pierce" },
  { state: "WA", city: "gig harbor", source_id: "pierce" },
  { state: "WA", city: "dupont", source_id: "pierce" },
  { state: "WA", city: "steilacoom", source_id: "pierce" },
  { state: "WA", city: "milton", source_id: "pierce" },
  { state: "WA", city: "edgewood", source_id: "pierce" },
  { state: "WA", city: "orting", source_id: "pierce" },
  { state: "WA", city: "eatonville", source_id: "pierce" },
  { state: "WA", city: "roy", source_id: "pierce" },
  // NY
  { state: "NY", city: "new york", source_id: "nyc" },
  { state: "NY", city: "brooklyn", source_id: "nyc" },
  { state: "NY", city: "queens", source_id: "nyc" },
  { state: "NY", city: "bronx", source_id: "nyc" },
  { state: "NY", city: "the bronx", source_id: "nyc" },
  { state: "NY", city: "manhattan", source_id: "nyc" },
  { state: "NY", city: "staten island", source_id: "nyc" },
  // IL
  { state: "IL", city: "chicago", source_id: "cook" },
  // CA
  { state: "CA", city: "san francisco", source_id: "sf" },
  { state: "CA", city: "los angeles", source_id: "la" },
  { state: "CA", city: "long beach", source_id: "la" },
  { state: "CA", city: "glendale", source_id: "la" },
  { state: "CA", city: "pasadena", source_id: "la" },
  { state: "CA", city: "santa monica", source_id: "la" },
  { state: "CA", city: "burbank", source_id: "la" },
  { state: "CA", city: "torrance", source_id: "la" },
  { state: "CA", city: "modesto", source_id: "stanislaus" },
  { state: "CA", city: "turlock", source_id: "stanislaus" },
  { state: "CA", city: "ceres", source_id: "stanislaus" },
  { state: "CA", city: "san diego", source_id: "san_diego" },
  { state: "CA", city: "sacramento", source_id: "sacramento" },
  // TX
  { state: "TX", city: "austin", source_id: "travis" },
  { state: "TX", city: "houston", source_id: "houston" },
  { state: "TX", city: "dallas", source_id: "dallas" },
  // MD
  { state: "MD", city: "rockville", source_id: "montgomery_md" },
  { state: "MD", city: "bethesda", source_id: "montgomery_md" },
  { state: "MD", city: "silver spring", source_id: "montgomery_md" },
  { state: "MD", city: "gaithersburg", source_id: "montgomery_md" },
  // MA
  { state: "MA", city: "boston", source_id: "boston" },
  // DE — statewide default
  { state: "DE", city: null, source_id: "delaware" },
  // CT
  { state: "CT", city: "manchester", source_id: "manchester_ct" },
  // NV
  { state: "NV", city: "las vegas", source_id: "las_vegas" },
  // FL
  { state: "FL", city: "miami", source_id: "miami" },
  { state: "FL", city: "orlando", source_id: "orlando" },
  // AZ
  { state: "AZ", city: "phoenix", source_id: "phoenix" },
  // PA
  { state: "PA", city: "philadelphia", source_id: "philadelphia" },
  { state: "PA", city: "pittsburgh", source_id: "pittsburgh" },
  // GA
  { state: "GA", city: "atlanta", source_id: "atlanta" },
  // TN
  { state: "TN", city: "nashville", source_id: "nashville" },
  // NC
  { state: "NC", city: "charlotte", source_id: "charlotte" },
  { state: "NC", city: "raleigh", source_id: "raleigh" },
  // OH
  { state: "OH", city: "columbus", source_id: "columbus" },
  // MN
  { state: "MN", city: "minneapolis", source_id: "minneapolis" },
  // OR
  { state: "OR", city: "portland", source_id: "portland" },
  // CO
  { state: "CO", city: "denver", source_id: "denver" },
  // WA — Spokane (different from King County)
  { state: "WA", city: "spokane", source_id: "spokane" },
  // Canada
  { state: "BC", city: "vancouver", source_id: "vancouver" },
  { state: "BC", city: "richmond", source_id: "vancouver" },
  { state: "BC", city: "north vancouver", source_id: "vancouver" },
  { state: "BC", city: "west vancouver", source_id: "vancouver" },
  { state: "BC", city: "squamish", source_id: "vancouver" },
  { state: "BC", city: "whistler", source_id: "vancouver" },
  { state: "BC", city: "pemberton", source_id: "vancouver" },
  { state: "BC", city: "sechelt", source_id: "vancouver" },
  { state: "BC", city: "gibsons", source_id: "vancouver" },
  { state: "BC", city: "powell river", source_id: "vancouver" },
  { state: "BC", city: "bowen island", source_id: "vancouver" },
  { state: "ON", city: "toronto", source_id: "toronto" },
  { state: "ON", city: "ottawa", source_id: "vancouver_ca_other" },
  { state: "AB", city: "calgary", source_id: "vancouver_ca_other" },
  { state: "AB", city: "edmonton", source_id: "vancouver_ca_other" },
  { state: "QC", city: "montreal", source_id: "vancouver_ca_other" },
];

// UK cities → uk_fsa
const UK_CITIES = ["london", "birmingham", "manchester", "leeds", "glasgow", "edinburgh", "liverpool", "bristol", "sheffield", "cardiff", "belfast"];
for (const c of UK_CITIES) {
  GEO_TABLE.push({ state: null, city: c, source_id: "uk_fsa" });
}

// ── HELPER: resolve a state+city to a source entry ───────────────────────────
function resolveGeo(state, city) {
  if (!state && !city) return null;
  const stateUp = (state || "").toUpperCase().trim();
  const cityLow = (city || "").toLowerCase().trim();
  // Try exact state + city match
  let match = GEO_TABLE.find(g =>
    (stateUp === "" || (g.state && g.state.toUpperCase() === stateUp)) &&
    g.city === cityLow
  );
  // If no city match, try state-only default (e.g. Delaware)
  if (!match && stateUp) {
    match = GEO_TABLE.find(g => g.state && g.state.toUpperCase() === stateUp && !g.city);
  }
  // If no state match, try city-only (international: UK cities, etc.)
  if (!match && cityLow) {
    match = GEO_TABLE.find(g => !g.state && g.city === cityLow);
  }
  if (!match) return null;
  return SOURCE_MAP.find(s => s.source_id === match.source_id) || null;
}

// ── HELPER: look up by source_id ─────────────────────────────────────────────
function lookupById(sourceId) {
  return SOURCE_MAP.find(s => s.source_id === sourceId) || null;
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
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
        return Response.json({ resolved: !!entry, source: entry });
      }
      case "lookup": {
        const entry = lookupById(source_id);
        if (!entry) return Response.json({ error: "Source not found" }, { status: 404 });
        return Response.json({ source: entry });
      }
      case "list": {
        return Response.json({
          total_sources: SOURCE_MAP.length,
          sources: SOURCE_MAP,
          geo_table: GEO_TABLE,
        });
      }
      default:
        return Response.json({ error: "Unknown action. Use: resolve, lookup, or list." }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});