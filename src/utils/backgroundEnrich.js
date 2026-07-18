import { base44 } from "@/api/base44Client";
import { getGrade, resolveGrade } from "./grading";

// ── Reusable background LLM enrichment ─────────────────────────────────────────
// Same pattern as Pierce County: government data verifies the facility exists,
// then gemini_3_flash (no web search, ~5s) fills in inspection scores from
// training data. Results update live via onAccurateResults callback.

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
};

function getContext(countyId) {
  return ENRICH_CONTEXT[countyId] || "";
}

/**
 * Check if inspection data is stale (more than 2 years old).
 * Used to decide whether to run LLM enrichment on top of live API data.
 */
export function isStale(latestDate) {
  if (!latestDate) return true;
  const date = new Date(latestDate);
  if (isNaN(date.getTime())) return true;
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  return date < twoYearsAgo;
}

/**
 * Run background LLM enrichment for a list of restaurants.
 * Uses gemini_3_flash (no web search) for fast ~5s results.
 * Calls onAccurateResults with the enriched list when done.
 *
 * @param {Array} results - Current restaurant results
 * @param {string} countyId - Locale identifier for context
 * @param {Function|null} onAccurateResults - Callback for live updates
 */
export function enrichResults(results, countyId, onAccurateResults) {
  if (!results || results.length === 0 || !onAccurateResults) return;

  const enrichList = results.map(r => ({
    name: r.name,
    address: r.address,
    city: r.city,
    zip_code: r.zip_code,
  }));

  const ctx = getContext(countyId);
  const prompt = `For each restaurant below, return the most recent health inspection score if you know it from your training data. Only return restaurants you have real data for — do NOT guess or fabricate.
${ctx ? `SOURCE CONTEXT: ${ctx}\n` : ""}${enrichList.map((r, i) => `${i}. ${r.name} — ${r.address}, ${r.city}${r.zip_code ? " " + r.zip_code : ""}`).join("\n")}
Return JSON with "inspections" array. Each entry has "idx" (the number above), "latest_score" (0-100), "latest_date", "latest_result", "total_inspections", "violations" (array of strings), "data_confidence" (high/medium/low), "verification_source".
If a restaurant had a CLEAN inspection (no violations), return latest_score: 100, latest_result: "No violations found", violations: [].
If you don't have data for a restaurant, OMIT it from the array.`;

  base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: false,
    response_json_schema: INSPECTION_SCHEMA,
    model: "gemini_3_flash",
  }).then((res) => {
    const found = Array.isArray(res?.inspections) ? res.inspections : [];
    const byIdx = new Map(found.filter(f => Number.isInteger(f.idx)).map(f => [f.idx, f]));
    const enriched = results.map((r, i) => {
      const insp = byIdx.get(i);
      if (!insp) return r;
      let score = insp.latest_score ?? null;
      const resultText = (insp.latest_result || "").toLowerCase();
      const violations = insp.violations || [];
      // Infer score from result text if LLM returned null
      if (score === null) {
        if (resultText.includes("great") || resultText.includes("excellent") || resultText.includes("a grade") || resultText.includes("no violations") || resultText.includes("clean") || resultText.includes("pass")) {
          score = 95;
        } else if (resultText.includes("okay") || resultText.includes("satisfactory") || resultText.includes("b grade") || resultText.includes("minor") || resultText.includes("conditional")) {
          score = 80;
        } else if (resultText.includes("needs to improve") || resultText.includes("poor") || resultText.includes("c grade") || resultText.includes("critical")) {
          score = 55;
        } else if (resultText.includes("closed") || resultText.includes("f grade") || resultText.includes("shut down") || resultText.includes("fail")) {
          score = 25;
        } else if (violations.length === 0) {
          score = 95;
        }
      }
      return {
        ...r,
        safetyScore: score,
        grade: score !== null ? resolveGrade(score, insp.latest_result || "") : "U",
        latestDate: insp.latest_date || r.latestDate || "",
        latestResult: insp.latest_result || r.latestResult || "",
        totalInspections: insp.total_inspections || r.totalInspections || (score !== null ? 1 : 0),
        violations,
        isLLMData: true,
        allInspections: insp.latest_date ? [{
          date: insp.latest_date,
          score: score,
          result: insp.latest_result || "",
          type: "Routine",
          violation_points: score !== null ? Math.max(0, 100 - score) : 0,
          violations: (insp.violations || []).map(v => ({ description: v, severity: "minor", points: 0 })),
        }] : (r.allInspections || []),
      };
    });
    onAccurateResults(enriched);
  }).catch(() => {});
}