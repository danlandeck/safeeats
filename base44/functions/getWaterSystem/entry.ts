import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SOURCE_LABELS = {
  GW:  "Groundwater (well)",
  SW:  "Surface water (lake/river/reservoir)",
  GU:  "Groundwater under surface water influence",
  GWP: "Groundwater purchased",
  SWP: "Surface water purchased",
};

const SOURCE_TO_STATE = {
  king:          "WA",
  nyc:           "NY",
  ny_state:      "NY",
  cook:          "IL",
  travis:        "TX",
  sf:            "CA",
  la:            "CA",
  montgomery_md: "MD",
  delaware:      "DE",
  toronto:       null,
  dubai:         null,
  uk_fsa:        null,
};

function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Parse state abbreviation from address string.
 * Matches patterns like "Manchester, CT 06040"
 */
function parseStateFromAddress(address) {
  if (!address) return null;
  const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  return match ? match[1] : null;
}

/**
 * Parse city from address string — the token just before "ST 00000"
 * e.g. "840 East Middle Turnpike, Manchester, CT 06040" → "Manchester"
 */
function parseCityFromAddress(address) {
  if (!address) return null;
  const match = address.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/);
  return match ? match[1].trim() : null;
}

const TEN_YEARS_AGO = new Date();
TEN_YEARS_AGO.setFullYear(TEN_YEARS_AGO.getFullYear() - 10);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: true, message: 'Unauthorized' }, { status: 401 });

    const { city, address, source } = await req.json();

    // Layer 1: parse state from address string
    let state = parseStateFromAddress(address);

    // Layer 2: fall back to source mapping
    if (!state && source) {
      state = SOURCE_TO_STATE[source] ?? null;
    }

    // International or unknown — skip EPA
    if (!state) {
      console.log(`getWaterSystem: no US state found (source=${source}, address=${address}), returning notFound`);
      return Response.json({ notFound: true, reason: "international" });
    }

    // Layer 3: derive city — use provided city, fall back to parsing address
    const resolvedCity = (city && city.trim()) ? city.trim() : parseCityFromAddress(address);

    if (!resolvedCity) {
      console.log(`getWaterSystem: could not determine city (city=${city}, address=${address})`);
      return Response.json({ notFound: true, reason: "no_city" });
    }

    const cityUpper  = resolvedCity.toUpperCase();
    const stateUpper = state.toUpperCase();

    console.log(`getWaterSystem: querying EPA for city="${cityUpper}" state="${stateUpper}" (source=${source})`);

    // 1. Look up Community Water Systems for this city+state
    const systemsUrl = `https://data.epa.gov/efservice/SDW_PUB_WATER_SYSTEMS/CITY_SERVED/=/${encodeURIComponent(cityUpper)}/PRIMACY_AGENCY_CODE/=/${stateUpper}/PWS_ACTIVITY_CODE/=/A/PWS_TYPE_CODE/=/CWS/JSON`;

    const systemsRes = await fetch(systemsUrl, { headers: { 'Accept': 'application/json' } });
    if (!systemsRes.ok) {
      console.log(`getWaterSystem: EPA systems request failed with ${systemsRes.status}`);
      return Response.json({ notFound: true });
    }

    const systems = await systemsRes.json();
    if (!Array.isArray(systems) || systems.length === 0) {
      console.log(`getWaterSystem: no systems found for ${cityUpper}, ${stateUpper}`);
      return Response.json({ notFound: true });
    }

    // Pick system with highest population served
    const best = systems.reduce((a, b) =>
      Number(b.POPULATION_SERVED_COUNT || 0) > Number(a.POPULATION_SERVED_COUNT || 0) ? b : a
    );

    const pwsid = best.PWSID;
    if (!pwsid) return Response.json({ notFound: true });

    console.log(`getWaterSystem: selected PWSID=${pwsid} name="${best.PWS_NAME}" pop=${best.POPULATION_SERVED_COUNT}`);

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