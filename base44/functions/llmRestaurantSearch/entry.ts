import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Narrow, task-based LLM endpoint for restaurant search & inspection enrichment.
// The client can only trigger these fixed operations with validated inputs —
// it can never pass a raw prompt, model, or schema (protects integration credits).

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

const COUNTY_SCHEMA = {
  type: "object",
  properties: {
    inspections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          idx:               { type: "number" },
          latest_score:      { type: "number" },
          latest_date:       { type: "string" },
          latest_result:     { type: "string" },
          total_inspections: { type: "number" },
          violations:        { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

// Per-locale context to help the LLM find the right health department
const ENRICH_CONTEXT = {
  houston: "City of Houston Health Department food inspection scores. Houston uses a 0-100 ded point system where lower is better. Convert: 0-10 ded → score 90-100, 11-20 → 70-89, 21-30 → 40-69, 30+ → 0-39.",
  stanislaus: "Stanislaus County Environmental Health (stancounty.com) food facility inspection results. Facilities are inspected 1-4 times per year. Scores based on critical and non-critical violations.",
  vancouver: "Vancouver Coastal Health (VCH) restaurant inspection records from inspections.vch.ca. Inspection results: Pass, Conditional Pass, or Closed.",
  pierce: "Tacoma-Pierce County Health Department (TPCHD) food safety rating: Great, Okay, Needs to Improve, or Closed. Based on red critical violation points from last 4 routine inspections. Great=95, Okay=80, Needs to Improve=55, Closed=25.",
  tacoma: "Tacoma-Pierce County Health Department (TPCHD) food safety rating: Great, Okay, Needs to Improve, or Closed. Based on red critical violation points from last 4 routine inspections. Great=95, Okay=80, Needs to Improve=55, Closed=25.",
  manchester_ct: "Manchester CT Health Department (manchesterct.gov) uses a Green/Yellow/Red placard system. Green = Pass (0-1 priority violations) → score 90-100, Yellow = Conditional Pass (2+ priority violations corrected on site) → score 70-89, Red = Closed/Fail (imminent health hazard) → score 0-39. Inspection reports published monthly as PDFs at manchesterct.gov. CT DPH uses Priority (P), Priority Foundation (Pf), and Core (C) violation categories.",
  riverside: "Riverside County Department of Environmental Health (rivcoeh.org) restaurant inspection records. Facilities inspected 1-4 times per year. Uses a grade card system (A/B/C or color-coded). Search portal at weblink.rivcoeh.org. Convert letter grades: A=90-100, B=80-89, C=70-79. If closed/failed → 0-39.",
  arkansas: "Arkansas Department of Health (ADH) foodserviceprod.adh.arkansas.gov — state-wide portal covering all 75 counties. 100-point scale: 85+=satisfactory, 70-84=follow-up required, 60-69=reinspection within 48h, <60=closed. Food establishments inspected 1-4 times per year. Critical violations have higher point values.",
  tri_county_co: "Colorado Tri-County Health Department (TCHD) covers Adams, Arapahoe, and Douglas counties. CDPHE risk index scoring: 0-49=Pass, 50-109=Re-Inspection Required, 110+=Closed. Food establishments inspected 1-3 times per year. Priority violations (foodborne illness risk) have higher point values than core violations (good retail practices).",
  maricopa: "Maricopa County Environmental Services (envapp.maricopa.gov) restaurant inspection grades. Letter grades A-R: A=90-100 (no priority violations), B=80-89, C=70-79 (2+ priority violations), R=Re-Inspection required (score 50-69). Priority violations directly contribute to foodborne illness risk. Inspections 1-4 times per year.",
  dc: "DC Health (dc.healthinspections.us) uses FDA Food Code pass/fail inspection with Priority, Priority Foundation, and Core violation categories. No letter grade or percentage assigned. Priority violations are most severe (foodborne illness risk factors), Priority Foundation are medium severity, Core are minor (good retail practices). Follow-up inspections verify correction of cited violations. Search portal at dc.healthinspections.us.",
  florida: "Florida DBPR Division of Hotels & Restaurants (myfloridalicense.com) — state-wide portal covering all 67 counties. Food service inspected 2+ times/year. Violations: High Priority (foodborne illness risk), Intermediate (risk factors), Basic (best practices). Result: 'Met Inspection Standards' = pass, 'Inspection Not Met' = fail. Scoring: HP=10pts, INT=5pts, Basic=2pts. Search portal at myfloridalicense.com/wl11.asp.",
  georgia: "Georgia Department of Public Health (ga.healthinspections.us) — state-wide portal covering most GA counties. Uses A/B/C/U grading: A=90-100, B=80-89, C=70-79, U=69 or below. 100-point numeric scores. Food establishments inspected 1-4 times per year. Search portal at ga.healthinspections.us/georgia/search.cfm.",
  hawaii: "Hawaii Department of Health Food Safety Branch (health.hawaii.gov/san) — state-wide across all 4 counties. Uses Green/Yellow/Red placard system: Green=Pass→score 90-100, Yellow=Conditional Pass→score 70-89, Red=Closed→score 0-39. Food establishments inspected 1-4 times per year. Portals at hi.healthinspections.us/hawaii and inspections.myhealthdepartment.com/soh.",
  idaho: "Idaho food safety inspections delegated to 7 independent Public Health Districts (Panhandle, North Central, Southwest, Central/Boise, South Central, Southeastern, Eastern). Uses FDA Food Code: Priority/Priority Foundation/Core violations. Annual unannounced inspections. No state-wide portal — district portals are JS-heavy SPAs or under maintenance. AI web search required.",
  illinois_cdp: "Illinois county health departments using CDP portal (public.cdpehs.com/ILENVPBL) — covers Sangamon, Madison, Peoria, Whiteside, McLean, Christian counties. Uses FDA Food Code: Risk Factor Interventions (Priority violations) and Good Retail Practices (Core violations). No letter grades. Annual unannounced inspections. CDP portal already provides real violation counts; enrichment only needed for counties not on the CDP platform.",
  indiana_marion: "Marion County Public Health Department (hhcwebfood.hhcorp.org) — covers Indianapolis and Marion County. Uses FDA Food Code: Priority, Priority Foundation, Core violations. Results: 'In Compliance' (pass) or 'In Violation' (fail). Inspected every 4-6 months based on risk. Portal already provides real violation details; enrichment only needed for non-Marion Indiana counties.",
  iowa: "Iowa Department of Inspections and Appeals (DIA) — state-wide portal at iowa.safefoodinspection.com covering all 99 counties. Uses FDA Food Code with Priority/Priority Foundation/Core violation categories. Inspections 1-4 times per year based on risk. Portal is JavaScript-rendered (ASP.NET SPA) — AI web search required for inspection scores.",
  kansas: "Kansas Department of Agriculture (KDA) Food Safety and Lodging program — state-wide portal at foodsafety.kda.ks.gov covering all 105 counties. Uses FDA Food Code. Inspections 1-4 times per year. Portal is transitioning to a new platform — AI web search required for current inspection scores.",
  kentucky: "Kentucky food safety inspections are managed by local health departments (no state-wide portal). Lexington/Fayette County (lfchd.org), Lake Cumberland District (lcdhd.org), Lincoln Trail District (ltdhd.org) publish scores. 85+ with no critical violations = passing score. AI web search required for inspection scores.",
  louisiana: "Louisiana Department of Health (LDH) — retail food inspections for ~32,000 establishments. Baton Rouge/East Baton Rouge Parish data available via Socrata open data (data.brla.gov). Critical and non-critical violations. Other parishes use the 'Eat Safe Louisiana' dashboard (ldh.la.gov) — AI web search required.",
  brla: "Baton Rouge/East Baton Rouge Parish (data.brla.gov Socrata open data) — LDH retail food inspections. Critical and non-critical violations with detailed comments. Socrata API already provides real violation data; enrichment not needed for Baton Rouge area.",
  mississippi: "Mississippi State Department of Health (MSDH) — state-wide portal at apps.msdh.ms.gov/food covering ALL 82 counties. A/B/C grading: A=90+, B=80-89, C=70-79. Uses FDA Food Code inspection checklist. Inspections 1-4 times per year. Backend scraper already provides real grades; enrichment only needed if data is missing.",
  maine: "Maine Center for Disease Control & Prevention (Maine CDC) — Health Inspection Program at apps.web.maine.gov/online/hip_search. State-wide coverage for all 16 counties. Uses Maine Food Code (based on FDA Food Code). Critical and non-critical violations; failed if >3 critical or >10 non-critical. Biennial inspections. Portal is protected by reCAPTCHA — AI web search required for inspection scores.",
  michigan: "Michigan restaurant inspections are managed by 45 local health departments (no state-wide restaurant portal). MDARD covers grocery/convenience stores only (MiSafe portal). Detroit Open Data Portal has restaurant inspection data (ArcGIS Hub). Other counties use various local portals — AI web search required for inspection scores.",
  minnesota: "Minnesota Department of Health (MDH) — food inspections managed by MDH and local public health agencies. No state-wide restaurant inspection search portal available. Licensing system search exists but does not include inspection results. AI web search required for inspection scores.",
  missouri: "Missouri Department of Health and Senior Services (DHSS) — food inspections managed by local public health agencies statewide. No state-wide restaurant inspection search portal. DHSS links to local agency websites. AI web search required for inspection scores.",
  montana: "Montana Department of Public Health and Human Services (DPHHS) — Environmental Health and Food Safety Section. Uses 2013 Food Code. No state-wide restaurant inspection search portal available. Inspections managed by county health departments. AI web search required for inspection scores.",
  nebraska: "Nebraska DHHS — food inspections managed by local health departments. Lincoln-Lancaster County Health Department (LLCHD) has a JS-rendered inspection viewer. Douglas County (Omaha) has an ArcGIS restaurant ratings app. Hall County (Grand Island) uses inspectionsonline.us platform. No state-wide restaurant inspection search portal available — AI web search required for inspection scores.",
  nevada_reno: "Washoe County (Reno) — Northern Nevada Public Health (NNPH) food inspections at nnph.org. Pass/Conditional Pass/Fail/Closed grading: Pass=<3 critical violations, Conditional Pass=3-5 critical, Fail=6+ critical, Closed=uncorrectable critical violation. Portal is behind Cloudflare with SSL issues — AI web search required for inspection scores.",
  new_hampshire: "New Hampshire DHHS Food Protection — state-wide portal at nh-dhhs.my.site.com/fsre (Salesforce Experience Cloud). Licenses and inspects ~5,000 food service establishments. 15 self-inspecting communities handle their own inspections. Uses FDA Food Code with Priority, Priority Foundation, and Core violations. Color rating: Green=no priority violations→score 90-100, Yellow=priority violation not corrected→score 70-89, Red=imminent health hazard/closed→score 0-39. Portal is a JS-rendered Salesforce SPA — AI web search required for inspection scores.",
  new_jersey: "New Jersey restaurant inspections managed by local county/city health departments (no state-wide portal). NJ DOH Public Health and Food Protection Program (PHFPP) oversees rules but does not publish inspection results online. Counties with online portals: Camden County, Gloucester County, Ocean County, Middlesex County, Hunterdon County. Cities: Newark (newarknj.gov). Uses FDA Food Code with Priority/Priority Foundation/Core violations. AI web search required for inspection scores.",
  new_mexico: "New Mexico Environment Department (NMED) Food Safety Program — no state-wide public search portal. Albuquerque/BERNALILLO County has a Socrata Connect portal (albuquerquenm-cc.connect.socrata.com) with Health Inspections category — JS-rendered, not directly scrapeable. Uses FDA 2022 Food Code. Color sticker system: Green=Approved/Pass→score 90-100, Yellow=Conditional→score 70-89, Red=Unsatisfactory→score 40-69, Orange=Closed→score 0-39. Other counties managed by NMED district offices. AI web search required for inspection scores.",
  north_dakota: "North Dakota Health & Human Services Food and Lodging Unit — state-wide portal at fims.doh.nd.gov covering state-licensed facilities plus 5 local health units (Central Valley, Grand Forks, Lake Region, Southwestern, Upper Missouri). Uses FDA Food Code with Priority/Priority Foundation/Core violations. Inspection reports published as PDFs (not parseable text). ASP.NET WebForms postback portal. 4 remaining local health units (Fargo-Cass, Bismarck, Western Plains, Upper Missouri) have separate portals. AI web search required for inspection scores.",
  ohio: "Ohio restaurant inspections managed by local health departments (no state-wide portal). Ohio Department of Health (ODH) Food Safety Program oversees rules. Franklin County uses Accela (odh.ohio.gov). Cincinnati, Summit County (scph.org), Cleveland/Cuyahoga County have local portals. Uses FDA Food Code with Priority/Priority Foundation/Core violations. AI web search required for inspection scores.",
  oklahoma: "Oklahoma State Department of Health (OSDH) Consumer Protection Division — state-wide portal at phin.state.ok.us covering ALL 77 counties. No letter grades — violations listed per inspection date. Uses FDA Food Code violation categories. Inspections 1-4 times per year. Backend scraper already provides real violation data; enrichment only needed if data is missing.",
  south_carolina: "South Carolina Department of Agriculture (SCDA) — state-wide portal at apps.dhec.sc.gov/Environment/FoodGrades covering ALL 46 counties. A/B/C letter grades: A=90-100, B=80-89, C=70-79. Risk-based inspection scoring per Regulation 61-25. Inspections from last 3 years. Backend scraper already provides real grades; enrichment only needed if data is missing.",
  rhode_island: "Rhode Island Department of Health (RIDOH) — state-wide portal at health.ri.gov/food-safety. Uses EnvisionConnect platform (pressagent.envisionconnect.com). Inspections scored on 100-point scale with critical/non-critical violations. All 39 RI cities/towns covered. AI web search required for inspection scores.",
  tennessee: "Tennessee Department of Health (TDH) — state-wide portal at inspections.myhealthdepartment.com/tennessee (HealthSpace platform). Also accessible via MyTN app. Nashville uses 0-100 point scale. Shelby County (Memphis) has separate portal at shelbytnhealth.com. AI web search required for inspection scores.",
  vermont: "Vermont Department of Health — state-wide portal at vtdoh.safefoodinspection.com. Uses 44-item inspection checklist. All retail food service inspections since May 2016 available. IN/OUT/COS/NC/C compliance coding. AI web search required for inspection scores.",
  virginia: "Virginia Department of Health (VDH) — state-wide inspection reports at inspections.myhealthdepartment.com (HealthSpace platform, varies by district). Norfolk open data at data.norfolk.gov. Fairfax County has ArcGIS viewer. VDH uses 100-point scale with critical/risk factor violations. AI web search required for inspection scores.",
  west_virginia: "West Virginia Bureau for Public Health (WVDHHR) — no state-wide portal. Local county health departments (Kanawha-Charleston, Greenbrier, Wayne) maintain individual portals. WV uses FDA Food Code with risk-based inspections. AI web search required for inspection scores.",
  wisconsin: "Wisconsin DATCP — state-wide portal at datcp.wi.gov (inspection reports current as of April 2024). Also HealthSpace platform at frog.healthspace.com. DATCP licenses ~40,000 food establishments. Milwaukee has open data portal. WI uses FDA Food Code with priority/non-priority violations. AI web search required for inspection scores.",
  wyoming: "Wyoming Department of Agriculture (WDA) Consumer Health Services — state-wide portal at wda.safefoodinspection.com. Covers all establishments inspected by WDA (areas without local health departments). Routine inspections only. Uses IN/OUT/COS/NC/C compliance coding per FDA Food Code.",
  utah: "Utah — Salt Lake County Health Department portal at public.cdpehs.com/UTEnvPbl (CDP platform). Covers Salt Lake County establishments. Uses star ranking system with critical/non-critical violations. Backend scraper provides real inspection data for Salt Lake County; AI enrichment for other UT counties.",
};

function capStr(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function toList(body) {
  const arr = Array.isArray(body?.list) ? body.list : [];
  return arr
    .slice(0, 60)
    .map((r) => ({
      name: capStr(r?.name, 300),
      address: capStr(r?.address, 300),
      city: capStr(r?.city, 120),
      zip_code: capStr(r?.zip_code, 20),
    }))
    .filter((r) => r.name);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const task = capStr(body?.task, 40);
    const today = new Date().toISOString().slice(0, 10);

    let prompt = "";
    let internet = false;
    let model = "gpt_5_mini";
    let schema = LLM_SCHEMA;

    if (task === "fast_search") {
      const query = capStr(body?.query, 300);
      const location = capStr(body?.location, 300) || null;
      const dubai = body?.dubai === true;
      if (!query) return Response.json({ error: 'query required' }, { status: 400 });
      prompt = dubai
        ? `DUBAI ONLY. REJECT: Miami, Boston, New York, Chicago, LA, SF, Austin, London, Paris, Tokyo, Abu Dhabi, any US city.\nList ONLY restaurants in DUBAI, UAE. city="Dubai" ALWAYS. Address: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, Dubai.\nReturn max 8. If unsure = OMIT. ZERO non-Dubai results.`
        : location
          ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
          : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;
      internet = false; model = "gpt_5_mini"; schema = LLM_SCHEMA;

    } else if (task === "web_search") {
      const query = capStr(body?.query, 300);
      const location = capStr(body?.location, 300) || null;
      const dubai = body?.dubai === true;
      const ctx = capStr(body?.ctx, 5000);
      if (!query) return Response.json({ error: 'query required' }, { status: 400 });
      const basePrompt = dubai
        ? `Today is ${today}. Search the LIVE WEB for real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE ONLY.\nRULES:\n1. BLOCK all US cities, London, Paris, Tokyo, Abu Dhabi, Sharjah — ANY non-UAE location = REJECTED.\n2. city MUST be exactly "Dubai". Address MUST include: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, or "Dubai, UAE".\n3. ONLY return restaurants you can VERIFY exist via web search. If unsure = OMIT.\n4. latest_score: 0–100 from REAL inspection data. If not found, set null. Never fabricate.\n5. data_confidence: "high"=official record; "medium"=confirmed with reference; "low"=found no details; "none"=unverified.\n6. is_currently_operating: true ONLY if evidence it's open today.\n7. verification_source: URL/name where you confirmed it exists.\n8. Return max 8 verified Dubai restaurants only.`
        : location
          ? `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" in ${location} ONLY.\nRULES:\n1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.\n2. city MUST be "${location}" or start with the same word. NEVER return results from outside ${location}.\n3. latest_score: 0–100 from REAL inspection data. If not found, set null. latest_date/latest_result/violations: REAL only.\n4. data_confidence: "high"=official inspection record found; "medium"=restaurant confirmed with inspection reference; "low"=found but no inspection details; "none"=unverified.\n5. is_currently_operating: true ONLY if evidence it's open today.\n6. verification_source: URL/name where you confirmed it exists.\n7. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.\n8. Return max 8 verified results. ZERO fabricated data. Identify cuisine type.`
          : `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" anywhere in the world.\nRULES:\n1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.\n2. Return up to 8 real, verifiable businesses. No invented data or fabricated scores.\n3. latest_score: 0–100 from REAL inspection data. If not found, set null and data_confidence to "none".\n4. latest_date/latest_result/violations: REAL only.\n5. data_confidence: "high"=official record; "medium"=some reference; "low"=found but no details; "none"=unverified.\n6. is_currently_operating: true ONLY if evidence it's open today.\n7. verification_source: URL/name where you confirmed it exists.\n8. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.\n9. Identify cuisine type.`;
      prompt = ctx ? `${basePrompt}\n- ${ctx}` : basePrompt;
      internet = true; model = "gemini_3_flash"; schema = LLM_SCHEMA;

    } else if (task === "web_enrich") {
      const list = toList(body);
      const location = capStr(body?.location, 300);
      const ctx = capStr(body?.ctx, 5000);
      if (list.length === 0) return Response.json({ inspections: [] });
      prompt = `Today is ${today}. Below are VERIFIED, REAL restaurants${location ? ` in ${location}` : ""} (confirmed via Google Places — do NOT question their existence or alter their details).
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
      internet = true; model = "gemini_3_flash"; schema = INSPECTION_SCHEMA;

    } else if (task === "training_enrich") {
      const list = toList(body);
      const countyId = capStr(body?.countyId, 60);
      if (list.length === 0) return Response.json({ inspections: [] });
      const ctx = ENRICH_CONTEXT[countyId] || "";
      prompt = `For each restaurant below, return the most recent health inspection score if you know it from your training data. Only return restaurants you have real data for — do NOT guess or fabricate.
${ctx ? `SOURCE CONTEXT: ${ctx}\n` : ""}${list.map((r, i) => `${i}. ${r.name} — ${r.address}, ${r.city}${r.zip_code ? " " + r.zip_code : ""}`).join("\n")}
Return JSON with "inspections" array. Each entry has "idx" (the number above), "latest_score" (0-100), "latest_date", "latest_result", "total_inspections", "violations" (array of strings), "data_confidence" (high/medium/low), "verification_source".
If a restaurant had a CLEAN inspection (no violations), return latest_score: 100, latest_result: "No violations found", violations: [].
If you don't have data for a restaurant, OMIT it from the array.`;
      internet = false; model = "gemini_3_flash"; schema = INSPECTION_SCHEMA;

    } else if (task === "county_enrich") {
      const list = toList(body);
      const location = capStr(body?.location, 300);
      if (list.length === 0) return Response.json({ inspections: [] });
      prompt = `Today is ${today}. Below are VERIFIED, REAL restaurants in ${location} (confirmed via Google Places — do NOT question their existence or alter their details).
Search the LIVE WEB for OFFICIAL health inspection records for these EXACT establishments:
${list.map((r, i) => `${i}. ${r.name} — ${r.address}`).join("\n")}
RULES:
1. Return one entry per restaurant you find an official inspection record for, keyed by "idx" (the number above).
2. latest_score 0–100, latest_date, latest_result, violations: from REAL official inspection records ONLY.
3. If you cannot find an official record for a restaurant, OMIT that idx entirely. NEVER invent scores, dates, or results.`;
      internet = true; model = "gemini_3_flash"; schema = COUNTY_SCHEMA;

    } else {
      return Response.json({ error: 'Unknown task' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: internet,
      response_json_schema: schema,
      model,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}