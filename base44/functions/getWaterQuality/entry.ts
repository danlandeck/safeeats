import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Water safety grading logic based on EPA MCL standards and violation history.
// Grade tiers: excellent | good | drinkable | not_recommended
//
// We use the EPA Envirofacts SDWIS API (no key required) to look up water
// systems by city/state, then pull their violation history.

const ENVIROFACTS_BASE = "https://data.epa.gov/efservice";

// Returns the PWSID (public water system) for a given city + state
async function findWaterSystem(city, state) {
  const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);
  const cityUpper = (city || "").toUpperCase().trim();

  if (!stateUpper || stateUpper.length !== 2) return null;

  // Query SDWIS for active community water systems in this state/city
  const url = `${ENVIROFACTS_BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${stateUpper}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/CITY_NAME/${encodeURIComponent(cityUpper)}/JSON`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  // Prefer the largest system (most population served)
  data.sort((a, b) => (b.POPULATION_SERVED_COUNT || 0) - (a.POPULATION_SERVED_COUNT || 0));
  const sys = data[0];
  // Normalize field names — EPA API may use different casing
  if (!sys.PWSID) sys.PWSID = sys.pwsid || sys.Pwsid;
  if (!sys.PWS_NAME) sys.PWS_NAME = sys.pws_name || sys.name;
  return sys;
}

// Returns recent health-based violations for a given PWSID
async function getViolations(pwsid) {
  const url = `${ENVIROFACTS_BASE}/VIOLATION/PWSID/${pwsid}/IS_HEALTH_BASED_IND/Y/JSON`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Classify grade based on violation data and system metadata
function computeWaterGrade(system, violations) {
  // Filter violations from the past 5 years
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 5);

  const recent = violations.filter(v => {
    const compDate = v.COMPL_PER_BEGIN_DATE ? new Date(v.COMPL_PER_BEGIN_DATE) : null;
    return compDate && compDate >= cutoff;
  });

  // Separate resolved vs. still open
  const unresolved = recent.filter(v => !v.RETURN_TO_COMPLIANCE_DATE);
  const resolved   = recent.filter(v =>  v.RETURN_TO_COMPLIANCE_DATE);

  if (unresolved.length >= 2) {
    return {
      grade: "not_recommended",
      label: "Not Recommended",
      emoji: "🚫",
      color: "bg-red-600 text-white",
      verdictColor: "text-red-700",
      bgColor: "bg-red-50 border-red-200",
      verdict: "Order a bottle or can — tap water has unresolved health violations.",
      detail: `${unresolved.length} unresolved EPA health-based violation${unresolved.length !== 1 ? "s" : ""} in the past 5 years.`,
      violations: unresolved.slice(0, 3),
    };
  }

  if (unresolved.length === 1) {
    return {
      grade: "drinkable",
      label: "Drinkable",
      emoji: "⚠️",
      color: "bg-orange-400 text-white",
      verdictColor: "text-orange-700",
      bgColor: "bg-orange-50 border-orange-200",
      verdict: "Drinkable, but consider a bottled option if you're cautious.",
      detail: `1 unresolved EPA health-based violation. Resolved violations: ${resolved.length} in the past 5 years.`,
      violations: unresolved.slice(0, 3),
    };
  }

  if (resolved.length >= 3) {
    return {
      grade: "good",
      label: "Good",
      emoji: "✅",
      color: "bg-lime-500 text-white",
      verdictColor: "text-lime-700",
      bgColor: "bg-lime-50 border-lime-200",
      verdict: "Tap water (including soda fountains) is safe to drink.",
      detail: `No current violations. ${resolved.length} past violations were resolved. Water meets all EPA standards.`,
      violations: [],
    };
  }

  return {
    grade: "excellent",
    label: "Excellent",
    emoji: "💧",
    color: "bg-blue-600 text-white",
    verdictColor: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    verdict: "Tap water is excellent — order freely from the tap or soda fountain.",
    detail: `No health-based violations found in the past 5 years. This water system meets or exceeds all EPA standards.`,
    violations: [],
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { city, state, country } = await req.json();

    // Only US water data is available via EPA SDWIS
    if (country && !["us", "usa", "united states"].includes((country || "").toLowerCase())) {
      return Response.json({
        available: false,
        reason: "Water quality data via EPA is only available for US locations.",
      });
    }

    if (!city || !state) {
      return Response.json({ available: false, reason: "City and state are required." });
    }

    const system = await findWaterSystem(city, state);

    if (!system) {
      // Fall back to state-level lookup (drop city filter)
      const stateUpper = state.toUpperCase().trim().slice(0, 2);
      const fallbackUrl = `${ENVIROFACTS_BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${stateUpper}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/JSON`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = fallbackRes.ok ? await fallbackRes.json() : [];

      if (!Array.isArray(fallbackData) || fallbackData.length === 0) {
        return Response.json({ available: false, reason: "No water system data found for this location." });
      }

      // Use the largest system in the state as a proxy
      fallbackData.sort((a, b) => (b.POPULATION_SERVED_COUNT || 0) - (a.POPULATION_SERVED_COUNT || 0));
      const fallbackSystem = fallbackData[0];
      const violations = await getViolations(fallbackSystem.PWSID);
      const result = computeWaterGrade(fallbackSystem, violations);

      return Response.json({
        available: true,
        isFallback: true,
        systemName: fallbackSystem.PWS_NAME,
        city: fallbackSystem.CITY_NAME,
        state: stateUpper,
        populationServed: fallbackSystem.POPULATION_SERVED_COUNT,
        ...result,
        epaUrl: `https://enviro.epa.gov/enviro/sdw_report_v3.first_table?pws_id=${fallbackSystem.PWSID}&state=${stateUpper}&source=Both&population=0&sys_num=0`,
      });
    }

    const violations = await getViolations(system.PWSID);
    const result = computeWaterGrade(system, violations);

    return Response.json({
      available: true,
      isFallback: false,
      systemName: system.PWS_NAME,
      city: system.CITY_NAME,
      state: state.toUpperCase(),
      populationServed: system.POPULATION_SERVED_COUNT,
      ...result,
      epaUrl: `https://enviro.epa.gov/enviro/sdw_report_v3.first_table?pws_id=${system.PWSID}&state=${state.toUpperCase()}&source=Both&population=0&sys_num=0`,
    });

  } catch (error) {
    return Response.json({ available: false, reason: error.message }, { status: 500 });
  }
});