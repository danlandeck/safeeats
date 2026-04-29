import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CITY_TO_COUNTY = {
  // Connecticut
  "MANCHESTER|CT": "HARTFORD",
  "HARTFORD|CT": "HARTFORD",
  "NEW HAVEN|CT": "NEW HAVEN",
  "BRIDGEPORT|CT": "FAIRFIELD",
  "STAMFORD|CT": "FAIRFIELD",
  "WATERBURY|CT": "NEW HAVEN",
  "NORWALK|CT": "FAIRFIELD",
  "DANBURY|CT": "FAIRFIELD",
  "NEW BRITAIN|CT": "HARTFORD",
  "WEST HARTFORD|CT": "HARTFORD",
  "EAST HARTFORD|CT": "HARTFORD",
  "GLASTONBURY|CT": "HARTFORD",
  "ENFIELD|CT": "HARTFORD",
  "SOUTHINGTON|CT": "HARTFORD",
  "MERIDEN|CT": "NEW HAVEN",
  "MILFORD|CT": "NEW HAVEN",
  "WEST HAVEN|CT": "NEW HAVEN",
  "STRATFORD|CT": "FAIRFIELD",
  "SHELTON|CT": "FAIRFIELD",
  "TORRINGTON|CT": "LITCHFIELD",
  // Washington (King County)
  "SEATTLE|WA": "KING",
  "BELLEVUE|WA": "KING",
  "KIRKLAND|WA": "KING",
  "REDMOND|WA": "KING",
  "RENTON|WA": "KING",
  "KENT|WA": "KING",
  "FEDERAL WAY|WA": "KING",
  "SHORELINE|WA": "KING",
  "BURIEN|WA": "KING",
  "TUKWILA|WA": "KING",
  "AUBURN|WA": "KING",
  "SAMMAMISH|WA": "KING",
  "BOTHELL|WA": "KING",
  "ISSAQUAH|WA": "KING",
  "MERCER ISLAND|WA": "KING",
  // New York City
  "NEW YORK|NY": "NEW YORK",
  "MANHATTAN|NY": "NEW YORK",
  "BROOKLYN|NY": "KINGS",
  "QUEENS|NY": "QUEENS",
  "BRONX|NY": "BRONX",
  "STATEN ISLAND|NY": "RICHMOND",
  "ASTORIA|NY": "QUEENS",
  "FLUSHING|NY": "QUEENS",
  "JAMAICA|NY": "QUEENS",
  "LONG ISLAND CITY|NY": "QUEENS",
  // Illinois (Cook County)
  "CHICAGO|IL": "COOK",
  "EVANSTON|IL": "COOK",
  "SKOKIE|IL": "COOK",
  "OAK PARK|IL": "COOK",
  "CICERO|IL": "COOK",
  "BERWYN|IL": "COOK",
  "SCHAUMBURG|IL": "COOK",
  "NAPERVILLE|IL": "DUPAGE",
  "AURORA|IL": "KANE",
  // Texas (Travis County / Austin)
  "AUSTIN|TX": "TRAVIS",
  "ROUND ROCK|TX": "WILLIAMSON",
  "PFLUGERVILLE|TX": "TRAVIS",
  "CEDAR PARK|TX": "WILLIAMSON",
  "GEORGETOWN|TX": "WILLIAMSON",
  // California (SF)
  "SAN FRANCISCO|CA": "SAN FRANCISCO",
  "DALY CITY|CA": "SAN MATEO",
  "SOUTH SAN FRANCISCO|CA": "SAN MATEO",
  "SAN BRUNO|CA": "SAN MATEO",
  "PACIFICA|CA": "SAN MATEO",
  // California (LA)
  "LOS ANGELES|CA": "LOS ANGELES",
  "LONG BEACH|CA": "LOS ANGELES",
  "GLENDALE|CA": "LOS ANGELES",
  "SANTA MONICA|CA": "LOS ANGELES",
  "PASADENA|CA": "LOS ANGELES",
  "TORRANCE|CA": "LOS ANGELES",
  "COMPTON|CA": "LOS ANGELES",
  "INGLEWOOD|CA": "LOS ANGELES",
  "BURBANK|CA": "LOS ANGELES",
  "EL MONTE|CA": "LOS ANGELES",
  // Maryland (Montgomery County)
  "ROCKVILLE|MD": "MONTGOMERY",
  "BETHESDA|MD": "MONTGOMERY",
  "SILVER SPRING|MD": "MONTGOMERY",
  "GAITHERSBURG|MD": "MONTGOMERY",
  "GERMANTOWN|MD": "MONTGOMERY",
  "WHEATON|MD": "MONTGOMERY",
  "POTOMAC|MD": "MONTGOMERY",
  "CHEVY CHASE|MD": "MONTGOMERY",
  "TAKOMA PARK|MD": "MONTGOMERY",
  // Delaware
  "WILMINGTON|DE": "NEW CASTLE",
  "DOVER|DE": "KENT",
  "NEWARK|DE": "NEW CASTLE",
  "MIDDLETOWN|DE": "NEW CASTLE",
  "BEAR|DE": "NEW CASTLE",
};

const SOURCE_LABELS = {
  GW:  "Groundwater (well)",
  SW:  "Surface water (lake/river/reservoir)",
  GU:  "Groundwater under surface water influence",
  GWP: "Groundwater purchased",
  SWP: "Surface water purchased",
  GUP: "Purchased groundwater under surface water influence",
};

const SOURCE_TO_STATE = {
  king: "WA", nyc: "NY", ny_state: "NY", cook: "IL",
  travis: "TX", sf: "CA", la: "CA", montgomery_md: "MD",
  delaware: "DE", toronto: null, dubai: null, uk_fsa: null,
};

function parseStateFromAddress(address) {
  if (!address) return null;
  const m = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  return m ? m[1] : null;
}

function titleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim();
}

async function fetchEPA(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`EPA HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function pickBestSystem(rows) {
  return rows
    .map(r => ({ ...r, _pop: Number(r.POPULATION_SERVED_COUNT) || 0 }))
    .sort((a, b) => b._pop - a._pop)[0];
}

async function getViolationSummary(pwsid) {
  try {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 10);
    const sinceStr = since.toISOString().slice(0, 10).replace(/-/g, "");
    const rows = await fetchEPA(
      `https://data.epa.gov/efservice/VIOLATION/PWSID/=/${pwsid}/COMPL_PER_BEGIN_DATE/>=/${sinceStr}/JSON`
    );
    const healthBased = rows.filter(v => ["MCL", "MRDL", "TT"].includes(v.VIOLATION_CATEGORY_CODE)).length;
    const unresolved = rows.filter(v => ["Unaddressed", "Addressed"].includes(v.VIOLATION_STATUS)).length;
    return { total: rows.length, healthBased, unresolved };
  } catch {
    return { total: 0, healthBased: 0, unresolved: 0 };
  }
}

async function buildResult(system, violations) {
  return {
    pwsid: system.PWSID,
    name: titleCase(system.PWS_NAME || ""),
    sourceType: SOURCE_LABELS[system.PRIMARY_SOURCE_CODE] || "Unknown",
    populationServed: system._pop || 0,
    violationsTotal: violations.total,
    violationsHealthBased: violations.healthBased,
    violationsUnresolved: violations.unresolved,
    sourceUrl: `https://enviro.epa.gov/enviro/sdw_form_v3.create_page?pwsid=${system.PWSID}`,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: true, message: 'Unauthorized' }, { status: 401 });

    const { city, address, source, zip_code } = await req.json();

    // Step 1: Derive state
    const fullAddr = [address, city, zip_code].filter(Boolean).join(", ");
    const state = parseStateFromAddress(fullAddr) ?? SOURCE_TO_STATE[source] ?? null;
    const cityClean = (city || "").trim().toUpperCase();
    const stateClean = (state || "").toUpperCase();

    console.log(`getWaterSystem: city="${cityClean}" state="${stateClean}" source="${source}" zip="${zip_code}"`);

    // Bail immediately for international or unresolvable
    if (!stateClean || !cityClean) {
      return Response.json({ notFound: true, reason: "international" });
    }

    // Hardcoded city→PWSID map for verified municipal water utilities.
    // Bypasses EPA query problems where private community wells outrank city utilities.
    const CITY_PWSID = {
      "MANCHESTER|CT": "CT0770011",  // Town of Manchester Water and Sewer Dept
    };

    const cityKey = `${cityClean}|${stateClean}`;
    const hardcodedPwsid = CITY_PWSID[cityKey];

    if (hardcodedPwsid) {
      try {
        const res = await fetch(`https://data.epa.gov/efservice/SDW_PUB_WATER_SYSTEMS/PWSID/=/${hardcodedPwsid}/JSON`);
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const system = rows[0];
          let violations = { total: 0, healthBased: 0, unresolved: 0 };
          try {
            const since = new Date();
            since.setFullYear(since.getFullYear() - 10);
            const sinceStr = since.toISOString().slice(0, 10).replace(/-/g, "");
            const vRes = await fetch(`https://data.epa.gov/efservice/VIOLATION/PWSID/=/${hardcodedPwsid}/COMPL_PER_BEGIN_DATE/>=/${sinceStr}/JSON`);
            const vRows = await vRes.json();
            if (Array.isArray(vRows)) {
              violations.total = vRows.length;
              violations.healthBased = vRows.filter(v => ["MCL","MRDL","TT"].includes(v.VIOLATION_CATEGORY_CODE)).length;
              violations.unresolved = vRows.filter(v => ["Unaddressed","Addressed"].includes(v.VIOLATION_STATUS)).length;
            }
          } catch {}

          const hardcodedSourceLabels = {
            GW: "Groundwater (well)", SW: "Surface water (lake/river/reservoir)",
            GU: "Groundwater under surface water influence",
            GWP: "Groundwater (purchased)", SWP: "Surface water (purchased)",
          };

          console.log(`getWaterSystem: hardcoded PWSID match for ${cityKey} → ${hardcodedPwsid}`);
          return Response.json({
            pwsid: hardcodedPwsid,
            name: (system.PWS_NAME || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim(),
            sourceType: hardcodedSourceLabels[system.PRIMARY_SOURCE_CODE] || "Unknown",
            populationServed: Number(system.POPULATION_SERVED_COUNT) || 0,
            violationsTotal: violations.total,
            violationsHealthBased: violations.healthBased,
            violationsUnresolved: violations.unresolved,
            sourceUrl: `https://enviro.epa.gov/enviro/sdw_form_v3.create_page?pwsid=${hardcodedPwsid}`,
          });
        }
      } catch(e) {
        console.warn("Hardcoded PWSID lookup failed:", hardcodedPwsid, e.message);
        // Fall through to existing logic
      }
    }

    const BASE = "https://data.epa.gov/efservice";
    const activeFilter = `/PWS_ACTIVITY_CODE/=/A/PWS_TYPE_CODE/=/CWS/JSON`;

    // Step 2: County lookup (most reliable)
    const countyKey = `${cityClean}|${stateClean}`;
    const county = CITY_TO_COUNTY[countyKey];
    if (county) {
      try {
        const rows = await fetchEPA(
          `${BASE}/SDW_PUB_WATER_SYSTEMS/COUNTIES_SERVED/CONTAINING/${encodeURIComponent(county)}/PRIMACY_AGENCY_CODE/=/${stateClean}${activeFilter}`
        );
        if (rows.length > 0) {
          console.log(`getWaterSystem: county lookup succeeded (${county}) — ${rows.length} systems`);
          const best = pickBestSystem(rows);
          const violations = await getViolationSummary(best.PWSID);
          return Response.json(await buildResult(best, violations));
        }
      } catch (e) {
        console.warn("County lookup failed:", e.message);
      }
    }

    // Step 3: City-served lookup
    try {
      const cityEncoded = encodeURIComponent(cityClean);
      const rows = await fetchEPA(
        `${BASE}/SDW_PUB_WATER_SYSTEMS/CITY_SERVED/=/${cityEncoded}/PRIMACY_AGENCY_CODE/=/${stateClean}${activeFilter}`
      );
      if (rows.length > 0) {
        console.log(`getWaterSystem: city lookup succeeded — ${rows.length} systems`);
        const best = pickBestSystem(rows);
        const violations = await getViolationSummary(best.PWSID);
        return Response.json(await buildResult(best, violations));
      }
    } catch (e) {
      console.warn("City lookup failed:", e.message);
    }

    // Step 4: ZIP code lookup
    const zip = zip_code || (fullAddr.match(/\b(\d{5})\b/) || [])[1];
    if (zip) {
      try {
        const rows = await fetchEPA(
          `${BASE}/SDW_PUB_WATER_SYSTEMS/ZIP_CODE/=/${zip}/PRIMACY_AGENCY_CODE/=/${stateClean}${activeFilter}`
        );
        if (rows.length > 0) {
          console.log(`getWaterSystem: ZIP lookup succeeded (${zip}) — ${rows.length} systems`);
          const best = pickBestSystem(rows);
          const violations = await getViolationSummary(best.PWSID);
          return Response.json(await buildResult(best, violations));
        }
      } catch (e) {
        console.warn("ZIP lookup failed:", e.message);
      }
    }

    console.log(`getWaterSystem: all lookups exhausted — notFound`);
    return Response.json({ notFound: true });

  } catch (err) {
    console.error('getWaterSystem error:', err);
    return Response.json({ error: true });
  }
});