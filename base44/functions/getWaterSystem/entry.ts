import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOURCE_LABELS = {
  GW:  "Groundwater (well)",
  SW:  "Surface water (lake/river/reservoir)",
  GU:  "Groundwater under surface water influence",
  GWP: "Groundwater purchased",
  SWP: "Surface water purchased",
};

function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

const TEN_YEARS_AGO = new Date();
TEN_YEARS_AGO.setFullYear(TEN_YEARS_AGO.getFullYear() - 10);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: true, message: 'Unauthorized' }, { status: 401 });

    const { city, state } = await req.json();
    if (!city || !state) return Response.json({ error: true, message: 'city and state are required' }, { status: 400 });

    const cityUpper  = city.toUpperCase().trim();
    const stateUpper = state.toUpperCase().trim();

    // 1. Look up Community Water Systems for this city+state
    const systemsUrl = `https://data.epa.gov/efservice/SDW_PUB_WATER_SYSTEMS/CITY_SERVED/=/${encodeURIComponent(cityUpper)}/PRIMACY_AGENCY_CODE/=/${stateUpper}/PWS_ACTIVITY_CODE/=/A/PWS_TYPE_CODE/=/CWS/JSON`;

    const systemsRes = await fetch(systemsUrl, { headers: { 'Accept': 'application/json' } });
    if (!systemsRes.ok) return Response.json({ notFound: true });

    const systems = await systemsRes.json();
    if (!Array.isArray(systems) || systems.length === 0) return Response.json({ notFound: true });

    // Pick system with highest population served
    const best = systems.reduce((a, b) =>
      Number(b.POPULATION_SERVED_COUNT || 0) > Number(a.POPULATION_SERVED_COUNT || 0) ? b : a
    );

    const pwsid = best.PWSID;
    if (!pwsid) return Response.json({ notFound: true });

    // 2. Fetch violations for this PWSID
    const violUrl = `https://data.epa.gov/efservice/VIOLATION/PWSID/=/${pwsid}/JSON`;
    const violRes = await fetch(violUrl, { headers: { 'Accept': 'application/json' } });

    let violationsTotal = 0;
    let violationsHealthBased = 0;
    let violationsUnresolved = 0;

    if (violRes.ok) {
      const violations = await violRes.json();
      if (Array.isArray(violations)) {
        const HEALTH_CATEGORIES = new Set(["MCL", "MRDL", "TT"]);

        for (const v of violations) {
          // Filter to last 10 years
          const beginDate = v.COMPL_PER_BEGIN_DATE ? new Date(v.COMPL_PER_BEGIN_DATE) : null;
          if (beginDate && beginDate < TEN_YEARS_AGO) continue;

          violationsTotal++;
          if (HEALTH_CATEGORIES.has(v.VIOLATION_CATEGORY_CODE)) violationsHealthBased++;

          const status = (v.VIOLATION_STATUS || "").toLowerCase();
          if (status === "unaddressed" || status === "addressed") violationsUnresolved++;
        }
      }
    }

    return Response.json({
      pwsid,
      name: toTitleCase(best.PWS_NAME),
      sourceType: SOURCE_LABELS[best.PRIMARY_SOURCE_CODE] || best.PRIMARY_SOURCE_CODE || "Unknown",
      populationServed: Number(best.POPULATION_SERVED_COUNT || 0),
      violationsTotal,
      violationsHealthBased,
      violationsUnresolved,
      sourceUrl: `https://enviro.epa.gov/enviro/sdw_form_v3.create_page?pwsid=${pwsid}`,
    });

  } catch (err) {
    console.error('getWaterSystem error:', err);
    return Response.json({ error: true });
  }
});