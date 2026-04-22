import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENVIROFACTS_BASE = "https://data.epa.gov/efservice";

// Map county_id → county name for EPA lookup
const COUNTY_ID_TO_NAME = {
  king: "King",
  nyc: "New York",
  ny_state: null,
  cook: "Cook",
  montgomery_md: "Montgomery",
  travis: "Travis",
  sf: "San Francisco",
  la: "Los Angeles",
  delaware: null,
};

async function findWaterSystemByCity(city, state) {
  const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);
  const cityUpper = (city || "").toUpperCase().trim();
  if (!stateUpper || !cityUpper) return null;

  const url = `${ENVIROFACTS_BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${stateUpper}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/CITY_NAME/${encodeURIComponent(cityUpper)}/JSON`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  data.sort((a, b) => (b.POPULATION_SERVED_COUNT || 0) - (a.POPULATION_SERVED_COUNT || 0));
  return data[0];
}

async function findWaterSystemByCounty(countyName, state) {
  const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);
  const countyUpper = (countyName || "").toUpperCase().trim();
  if (!stateUpper || !countyUpper) return null;

  const url = `${ENVIROFACTS_BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${stateUpper}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/COUNTY_SERVED/${encodeURIComponent(countyUpper)}/JSON`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  data.sort((a, b) => (b.POPULATION_SERVED_COUNT || 0) - (a.POPULATION_SERVED_COUNT || 0));
  return data[0];
}

async function findWaterSystemByState(state) {
  const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);
  if (!stateUpper) return null;

  const url = `${ENVIROFACTS_BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${stateUpper}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/JSON`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  data.sort((a, b) => (b.POPULATION_SERVED_COUNT || 0) - (a.POPULATION_SERVED_COUNT || 0));
  return data[0];
}

async function getViolations(pwsid) {
  const url = `${ENVIROFACTS_BASE}/VIOLATION/PWSID/${pwsid}/IS_HEALTH_BASED_IND/Y/JSON`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function computeWaterGrade(violations) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 5);

  const recent = violations.filter(v => {
    const d = v.COMPL_PER_BEGIN_DATE ? new Date(v.COMPL_PER_BEGIN_DATE) : null;
    return d && d >= cutoff;
  });

  const unresolved = recent.filter(v => !v.RETURN_TO_COMPLIANCE_DATE);
  const resolved   = recent.filter(v =>  v.RETURN_TO_COMPLIANCE_DATE);

  if (unresolved.length >= 2) return {
    grade: "not_recommended", label: "Not Recommended", emoji: "🚫",
    verdict: "Order a bottle or can — tap water has unresolved health violations.",
    detail: `${unresolved.length} unresolved EPA health-based violations in the past 5 years.`,
    violations: unresolved.slice(0, 3),
  };

  if (unresolved.length === 1) return {
    grade: "drinkable", label: "Drinkable", emoji: "⚠️",
    verdict: "Drinkable, but consider a bottled option if you're cautious.",
    detail: `1 unresolved EPA health-based violation. Resolved violations: ${resolved.length} in the past 5 years.`,
    violations: unresolved.slice(0, 3),
  };

  if (resolved.length >= 3) return {
    grade: "good", label: "Good", emoji: "✅",
    verdict: "Tap water (including soda fountains) is safe to drink.",
    detail: `No current violations. ${resolved.length} past violations were resolved. Water meets all EPA standards.`,
    violations: [],
  };

  return {
    grade: "excellent", label: "Excellent", emoji: "💧",
    verdict: "Tap water is excellent — order freely from the tap or soda fountain.",
    detail: "No health-based violations found in the past 5 years. This water system meets or exceeds all EPA standards.",
    violations: [],
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { city, state, country, county_id } = await req.json();

    if (country && !["us", "usa", "united states"].includes((country || "").toLowerCase())) {
      return Response.json({ available: false, reason: "Water quality data via EPA is only available for US locations." });
    }

    if (!state) {
      return Response.json({ available: false, reason: "State is required." });
    }

    const stateUpper = state.toUpperCase().trim().slice(0, 2);

    // 1️⃣ Try city-level lookup
    let system = city ? await findWaterSystemByCity(city, state) : null;
    let fallbackLevel = system ? "city" : null;

    // 2️⃣ Try county-level lookup
    if (!system && county_id) {
      const countyName = COUNTY_ID_TO_NAME[county_id];
      if (countyName) {
        system = await findWaterSystemByCounty(countyName, state);
        if (system) fallbackLevel = "county";
      }
    }

    // 3️⃣ Fall back to state-level lookup
    if (!system) {
      system = await findWaterSystemByState(state);
      if (system) fallbackLevel = "state";
    }

    if (!system) {
      return Response.json({ available: false, reason: "No water system data found for this location." });
    }

    const pwsid = system.PWSID || system.pwsid;
    const violations = await getViolations(pwsid);
    const result = computeWaterGrade(violations);

    return Response.json({
      available: true,
      isFallback: fallbackLevel !== "city",
      fallbackLevel,
      systemName: system.PWS_NAME || system.pws_name,
      city: system.CITY_NAME || system.city_name,
      state: stateUpper,
      populationServed: system.POPULATION_SERVED_COUNT,
      ...result,
      epaUrl: `https://enviro.epa.gov/enviro/sdw_report_v3.first_table?pws_id=${pwsid}&state=${stateUpper}&source=Both&population=0&sys_num=0`,
    });

  } catch (error) {
    return Response.json({ available: false, reason: error.message }, { status: 500 });
  }
});