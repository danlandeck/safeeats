import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EPA_BASE = "https://data.epa.gov/dmapservice";

// Verified PWSIDs for major US cities — bypasses unreliable EPA broad searches
const CITY_PWSID = {
  "MANCHESTER|CT": "CT0770021",       // Manchester Water Department
  "HARTFORD|CT": "CT0770181",         // Metropolitan District Commission
  "WEST HARTFORD|CT": "CT0770181",
  "EAST HARTFORD|CT": "CT0770181",
  "GLASTONBURY|CT": "CT0770181",
  "WETHERSFIELD|CT": "CT0770181",
  "WINDSOR|CT": "CT0770181",
  "BLOOMFIELD|CT": "CT0770181",
  "NEWINGTON|CT": "CT0770181",
  "ROCKY HILL|CT": "CT0770181",
  "SEATTLE|WA": "WA53090K",           // Seattle Public Utilities
  "BELLEVUE|WA": "WA53005R",
  "NEW YORK|NY": "NY7003493",         // NYC DEP
  "BROOKLYN|NY": "NY7003493",
  "QUEENS|NY": "NY7003493",
  "BRONX|NY": "NY7003493",
  "MANHATTAN|NY": "NY7003493",
  "STATEN ISLAND|NY": "NY7003493",
  "CHICAGO|IL": "IL0316000",          // Chicago Dept of Water Mgmt
  "AUSTIN|TX": "TX2270001",           // Austin Water
  "SAN FRANCISCO|CA": "CA3810011",    // SFPUC
  "LOS ANGELES|CA": "CA1910067",      // LADWP
  "ROCKVILLE|MD": "MD0150004",
  "BETHESDA|MD": "MD0150006",         // WSSC Water
  "SILVER SPRING|MD": "MD0150006",
  "GAITHERSBURG|MD": "MD0150003",
  "WILMINGTON|DE": "DE0000543",
};

const SOURCE_TO_STATE = {
  king:"WA", nyc:"NY", ny_state:"NY", cook:"IL",
  travis:"TX", sf:"CA", la:"CA", montgomery_md:"MD",
  delaware:"DE", toronto:null, dubai:null, uk_fsa:null
};

const SOURCE_LABELS = {
  GW: "Groundwater (well)",
  SW: "Surface water (lake/river/reservoir)",
  GU: "Groundwater under surface water influence",
  GWP: "Groundwater (purchased)",
  SWP: "Surface water (purchased)",
};

function titleCase(str) {
  return (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim();
}

// Case-insensitive field access — new EPA dmapservice API returns lowercase column names
function gv(row, field) {
  return row?.[field] ?? row?.[field.toLowerCase()] ?? null;
}

async function fetchEPA(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`EPA HTTP ${res.status}`);
  return await res.json();
}

async function getViolations(pwsid) {
  try {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 10);
    const sinceStr = since.toISOString().slice(0, 10);
    const rows = await fetchEPA(`${EPA_BASE}/sdwis.VIOLATION/pwsid/equals/${pwsid}/json`);
    if (!Array.isArray(rows)) return { total: 0, healthBased: 0, unresolved: 0 };
    // Filter by date client-side (new API doesn't support date comparison operators)
    const recent = rows.filter(v => {
      const d = gv(v, "COMPL_PER_BEGIN_DATE");
      return d && d.slice(0, 10) >= sinceStr;
    });
    return {
      total: recent.length,
      healthBased: recent.filter(v => ["MCL","MRDL","TT"].includes(gv(v, "VIOLATION_CATEGORY_CODE"))).length,
      unresolved: recent.filter(v => ["Unaddressed","Addressed"].includes(gv(v, "VIOLATION_STATUS"))).length,
    };
  } catch {
    return { total: 0, healthBased: 0, unresolved: 0 };
  }
}

function buildResult(system, violations) {
  return {
    pwsid: gv(system, "PWSID"),
    name: titleCase(gv(system, "PWS_NAME") || ""),
    sourceType: SOURCE_LABELS[gv(system, "PRIMARY_SOURCE_CODE")] || "Unknown",
    populationServed: Number(gv(system, "POPULATION_SERVED_COUNT")) || 0,
    violationsTotal: violations.total,
    violationsHealthBased: violations.healthBased,
    violationsUnresolved: violations.unresolved,
    sourceUrl: `https://enviro.epa.gov/enviro/sdw_form_v3.create_page?pwsid=${gv(system, "PWSID")}`,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: true, message: 'Unauthorized' }, { status: 401 });

    const { city, address, source, zip_code } = await req.json();

    // Derive state
    const fullAddr = [address, city, zip_code].filter(Boolean).join(", ");
    const stateMatch = fullAddr.match(/,\s*([A-Z]{2})\s+\d{5}/);
    const state = stateMatch ? stateMatch[1] : (SOURCE_TO_STATE[source] ?? null);
    const cityClean = (city || "").trim().toUpperCase();

    if (!state || !cityClean) {
      return Response.json({ notFound: true });
    }

    // STEP 1: Hardcoded PWSID lookup (most reliable for known cities)
    const cityKey = `${cityClean}|${state}`;
    const pwsid = CITY_PWSID[cityKey];

    if (pwsid) {
      try {
        const rows = await fetchEPA(`${EPA_BASE}/sdwis.water_system/pwsid/equals/${pwsid}/json`);
        if (Array.isArray(rows) && rows.length > 0) {
          const violations = await getViolations(pwsid);
          return Response.json(buildResult(rows[0], violations));
        }
      } catch (e) {
        console.warn("Hardcoded PWSID lookup failed:", pwsid, e.message);
      }
    }

    // STEP 2: City-based fallback with strict filtering against private wells
    try {
      const cityEncoded = cityClean.replace(/\s+/g, "%20");
      const rows = await fetchEPA(`${EPA_BASE}/sdwis.water_system/primacy_agency_code/equals/${state}/and/pws_activity_code/equals/A/and/pws_type_code/equals/CWS/and/city_name/equals/${cityEncoded}/json`);
      if (Array.isArray(rows)) {
        const filtered = rows
          .map(r => ({ ...r, _pop: Number(gv(r, "POPULATION_SERVED_COUNT")) || 0 }))
          .filter(r => r._pop >= 1000)
          .filter(r => !/(CONDO|MOBILE|TRAILER|APARTMENT|MHP|MHC|RV PARK|HOMES|ESTATES|VILLAGE|CAMP)/i.test(gv(r, "PWS_NAME") || ""))
          .sort((a, b) => b._pop - a._pop);
        if (filtered.length > 0) {
          const violations = await getViolations(gv(filtered[0], "PWSID"));
          return Response.json(buildResult(filtered[0], violations));
        }
      }
    } catch (e) {
      console.warn("City fallback failed:", e.message);
    }

    // STEP 3: ZIP code last resort
    if (zip_code) {
      try {
        const rows = await fetchEPA(`${EPA_BASE}/sdwis.water_system/primacy_agency_code/equals/${state}/and/pws_activity_code/equals/A/and/pws_type_code/equals/CWS/and/zip_code/equals/${zip_code}/json`);
        if (Array.isArray(rows)) {
          const filtered = rows
            .map(r => ({ ...r, _pop: Number(gv(r, "POPULATION_SERVED_COUNT")) || 0 }))
            .filter(r => r._pop >= 1000)
            .filter(r => !/(CONDO|MOBILE|TRAILER|APARTMENT|MHP|MHC|RV PARK|HOMES|ESTATES|VILLAGE|CAMP)/i.test(gv(r, "PWS_NAME") || ""))
            .sort((a, b) => b._pop - a._pop);
          if (filtered.length > 0) {
            const violations = await getViolations(gv(filtered[0], "PWSID"));
            return Response.json(buildResult(filtered[0], violations));
          }
        }
      } catch (e) {
        console.warn("ZIP fallback failed:", e.message);
      }
    }

    return Response.json({ notFound: true });

  } catch (err) {
    console.error('getWaterSystem error:', err);
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
});