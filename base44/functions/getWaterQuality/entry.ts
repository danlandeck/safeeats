import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENVIROFACTS_BASE = "https://data.epa.gov/efservice";

// Filter out private/small systems that don't represent city water
const PRIVATE_SYSTEM_REGEX = /(CONDO|MOBILE|TRAILER|APARTMENT|MHP|MHC|RV PARK|HOMES|ESTATES|VILLAGE|CAMP|MANOR|SUBDIVISION|HOA)/i;

// Map county_id → county name for EPA lookup
const COUNTY_ID_TO_NAME = {
  king: "King",
  nyc: null,
  cook: "Cook",
  montgomery_md: "Montgomery",
  travis: "Travis",
  sf: "San Francisco",
  la: "Los Angeles",
  delaware: null,
};

// Many neighborhoods/suburbs are served by their parent city's water utility.
// Map any known alias → the city name the EPA uses for that water system.
const CITY_ALIAS_MAP = {
  // Seattle metro — all served by Seattle Public Utilities or their own system
  "capitol hill": "seattle",
  "ballard": "seattle",
  "fremont": "seattle",
  "queen anne": "seattle",
  "south lake union": "seattle",
  "pioneer square": "seattle",
  "chinatown": "seattle",
  "international district": "seattle",
  "belltown": "seattle",
  "west seattle": "seattle",
  "columbia city": "seattle",
  "rainier valley": "seattle",
  "u district": "seattle",
  "university district": "seattle",
  "greenwood": "seattle",
  "phinney ridge": "seattle",
  "wallingford": "seattle",
  "eastlake": "seattle",
  "madison park": "seattle",
  "montlake": "seattle",
  "madrona": "seattle",
  "beacon hill": "seattle",
  "georgetown": "seattle",
  "sodo": "seattle",
  "interbay": "seattle",
  "magnolia": "seattle",
  "crown hill": "seattle",
  "bitter lake": "seattle",
  "northgate": "seattle",
  "lake city": "seattle",
  "wedgwood": "seattle",
  "ravenna": "seattle",
  "green lake": "seattle",
  "laurelhurst": "seattle",
  "leschi": "seattle",
  "mt baker": "seattle",
  "mount baker": "seattle",
  "seward park": "seattle",
  "delridge": "seattle",
  "highland park": "seattle",
  "south park": "seattle",
  "alki": "seattle",
  "admiral": "seattle",
  "white center": "seattle",
  "seatac": "seatac",
  "sea-tac": "seatac",
  "tukwila": "tukwila",
  "renton": "renton",
  "burien": "burien",
  "kent": "kent",
  "auburn": "auburn",
  "federal way": "federal way",
  "des moines": "des moines",
  "normandy park": "normandy park",
  "shoreline": "shoreline",
  "lake forest park": "lake forest park",
  "kenmore": "kenmore",
  "bothell": "bothell",
  "woodinville": "woodinville",
  "kirkland": "kirkland",
  "redmond": "redmond",
  "bellevue": "bellevue",
  "newcastle": "newcastle",
  "issaquah": "issaquah",
  "sammamish": "sammamish",
  "mercer island": "mercer island",
  "covington": "covington",
  "maple valley": "maple valley",
  "black diamond": "black diamond",
  "enumclaw": "enumclaw",
  "snoqualmie": "snoqualmie",
  "north bend": "north bend",
  "medina": "medina",
  "clyde hill": "clyde hill",
  "beaux arts": "beaux arts",
  // NYC — boroughs all served by NYC DEP, EPA stores as "NEW YORK"
  "manhattan": "new york",
  "brooklyn": "new york",
  "queens": "new york",
  "bronx": "new york",
  "the bronx": "new york",
  "staten island": "new york",
  "new york city": "new york",
  "harlem": "new york",
  "upper east side": "new york",
  "upper west side": "new york",
  "midtown": "new york",
  "chelsea": "new york",
  "lower east side": "new york",
  "east village": "new york",
  "west village": "new york",
  "greenwich village": "new york",
  "soho": "new york",
  "tribeca": "new york",
  "financial district": "new york",
  "little italy": "new york",
  "williamsburg": "new york",
  "bushwick": "new york",
  "bed stuy": "new york",
  "bedford stuyvesant": "new york",
  "park slope": "new york",
  "crown heights": "new york",
  "flatbush": "new york",
  "astoria": "new york",
  "flushing": "new york",
  "jackson heights": "new york",
  "jamaica": "new york",
  "long island city": "new york",
  "forest hills": "new york",
  "ridgewood": "new york",
  "bayside": "new york",
  // Chicago — all neighborhoods served by City of Chicago Water
  "wicker park": "chicago",
  "logan square": "chicago",
  "bucktown": "chicago",
  "pilsen": "chicago",
  "wrigleyville": "chicago",
  "lincoln park": "chicago",
  "lakeview": "chicago",
  "andersonville": "chicago",
  "rogers park": "chicago",
  "hyde park": "chicago",
  "bronzeville": "chicago",
  "bridgeport": "chicago",
  "river north": "chicago",
  "gold coast": "chicago",
  "streeterville": "chicago",
  "south loop": "chicago",
  "west loop": "chicago",
  "greektown": "chicago",
  "avondale": "chicago",
  "edgewater": "chicago",
  "uptown": "chicago",
  "ravenswood": "chicago",
  "lincoln square": "chicago",
  // SF — all neighborhoods served by SFPUC
  "mission district": "san francisco",
  "the mission": "san francisco",
  "castro": "san francisco",
  "haight ashbury": "san francisco",
  "haight-ashbury": "san francisco",
  "tenderloin": "san francisco",
  "soma": "san francisco",
  "south of market": "san francisco",
  "north beach": "san francisco",
  "nob hill": "san francisco",
  "russian hill": "san francisco",
  "pacific heights": "san francisco",
  "marina district": "san francisco",
  "richmond district": "san francisco",
  "sunset district": "san francisco",
  "excelsior": "san francisco",
  "bernal heights": "san francisco",
  "potrero hill": "san francisco",
  "dogpatch": "san francisco",
  "bayview": "san francisco",
  "glen park": "san francisco",
  "noe valley": "san francisco",
  "hayes valley": "san francisco",
  "western addition": "san francisco",
  "fillmore": "san francisco",
  "japantown": "san francisco",
  "lower haight": "san francisco",
  "upper haight": "san francisco",
  "alamo square": "san francisco",
  "twin peaks": "san francisco",
  "west portal": "san francisco",
  "duboce triangle": "san francisco",
  "fishermans wharf": "san francisco",
  // LA neighborhoods → Los Angeles
  "hollywood": "los angeles",
  "koreatown": "los angeles",
  "silver lake": "los angeles",
  "echo park": "los angeles",
  "los feliz": "los angeles",
  "atwater village": "los angeles",
  "glassell park": "los angeles",
  "eagle rock": "los angeles",
  "boyle heights": "los angeles",
  "downtown la": "los angeles",
  "dtla": "los angeles",
  "little tokyo": "los angeles",
  "arts district": "los angeles",
  "venice": "los angeles",
  "mar vista": "los angeles",
  "westwood": "los angeles",
  "brentwood": "los angeles",
  "pacific palisades": "los angeles",
  "playa del rey": "los angeles",
  "westchester": "los angeles",
  "ladera heights": "los angeles",
  "leimert park": "los angeles",
  "crenshaw": "los angeles",
  "mid city": "los angeles",
  "palms": "los angeles",
  "sawtelle": "los angeles",
  "century city": "los angeles",
  "north hollywood": "los angeles",
  "studio city": "los angeles",
  "sherman oaks": "los angeles",
  "van nuys": "los angeles",
  "reseda": "los angeles",
  "canoga park": "los angeles",
  "chatsworth": "los angeles",
  "northridge": "los angeles",
  "granada hills": "los angeles",
  "encino": "los angeles",
  "tarzana": "los angeles",
  "woodland hills": "los angeles",
  "west hills": "los angeles",
  "winnetka": "los angeles",
  "east los angeles": "los angeles",
  "east la": "los angeles",
  "sylmar": "los angeles",
  "pacoima": "los angeles",
  "sun valley": "los angeles",
  "porter ranch": "los angeles",
  // Austin neighborhoods
  "south congress": "austin",
  "east austin": "austin",
  "zilker": "austin",
  "bouldin creek": "austin",
  "travis heights": "austin",
  "clarksville": "austin",
  "mueller": "austin",
  "cherrywood": "austin",
  "crestview": "austin",
  "allandale": "austin",
  "rosedale": "austin",
  "tarrytown": "austin",
  // Montgomery County MD cities
  "rockville": "rockville",
  "bethesda": "bethesda",
  "silver spring": "silver spring",
  "gaithersburg": "gaithersburg",
  "germantown": "germantown",
  "chevy chase": "chevy chase",
  "potomac": "potomac",
};

function normalizeCity(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return CITY_ALIAS_MAP[key] || key;
}

async function fetchSystemByPwsid(pwsid) {
  // Try both URL formats — EPA API is inconsistent between tables
  for (const url of [
    `${ENVIROFACTS_BASE}/WATER_SYSTEM/PWSID/=${encodeURIComponent(pwsid)}/JSON`,
    `${ENVIROFACTS_BASE}/WATER_SYSTEM/PWSID/${encodeURIComponent(pwsid)}/JSON`,
  ]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data[0];
    } catch {}
  }
  return null;
}

function pickLargestPublic(rows) {
  return rows
    .map(r => ({ ...r, _pop: Number(r.POPULATION_SERVED_COUNT || r.population_served_count) || 0 }))
    .filter(r => r._pop >= 1000)
    .filter(r => !PRIVATE_SYSTEM_REGEX.test(r.PWS_NAME || r.pws_name || ""))
    .sort((a, b) => b._pop - a._pop)[0] || null;
}

async function findWaterSystemByCity(city, state) {
  const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);
  const normalized = normalizeCity(city);
  if (!stateUpper || !normalized) return null;

  const cityUpper = normalized.toUpperCase();

  // City-based lookup with private system filtering (returns largest public utility)
  const url = `${ENVIROFACTS_BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${stateUpper}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/CITY_NAME/${encodeURIComponent(cityUpper)}/JSON`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const publicChoice = pickLargestPublic(data);
  if (publicChoice) return publicChoice;

  // 3️⃣ If all were filtered as private/small, fall back to largest major system (pop ≥ 10k)
  const majorFallback = data
    .map(r => ({ ...r, _pop: Number(r.POPULATION_SERVED_COUNT || r.population_served_count) || 0 }))
    .filter(r => r._pop >= 10000)
    .sort((a, b) => b._pop - a._pop)[0];
  return majorFallback || null;
}

async function findWaterSystemByCounty(countyName, state) {
  const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);
  const countyUpper = (countyName || "").toUpperCase().trim().replace(/\s+COUNTY$/i, "");
  if (!stateUpper || !countyUpper) return null;

  // NOTE: COUNTY_SERVED on the WATER_SYSTEM table is silently ignored by the
  // EPA API (verified: it returns all systems in the state). County data lives
  // in the GEOGRAPHIC_AREA table; join it to WATER_SYSTEM for name/population.
  const url = `${ENVIROFACTS_BASE}/GEOGRAPHIC_AREA/AREA_TYPE_CODE/CN/COUNTY_SERVED/${encodeURIComponent(countyUpper)}/PRIMACY_AGENCY_CODE/${stateUpper}/WATER_SYSTEM/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/JSON`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  return pickLargestPublic(data);
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

async function geocodeFullAddress(fullAddress) {
  if (!fullAddress) return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&addressdetails=1&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const addr = data[0].address || {};
  return {
    city: addr.city || addr.town || addr.village || addr.hamlet || null,
    state: addr.state_code || null,
    zip: addr.postcode || null,
    county: addr.county ? addr.county.replace(/\s+County$/i, "") : null,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { city: rawCity, state: rawState, country, county_id, full_address } = await req.json();

    // If a full address is provided, geocode it to get precise city/state/county
    let city = rawCity;
    let state = rawState;
    let geoCounty = null;
    if (full_address) {
      const geo = await geocodeFullAddress(full_address);
      if (geo) {
        if (geo.city) city = geo.city;
        if (geo.state) state = geo.state;
        if (geo.county) geoCounty = geo.county;
      }
    }

    if (country && !["us", "usa", "united states"].includes((country || "").toLowerCase())) {
      return Response.json({ available: false, reason: "Water quality data via EPA is only available for US locations." });
    }

    if (!state) {
      return Response.json({ available: false, reason: "State is required." });
    }

    const stateUpper = (state || "").toUpperCase().trim().slice(0, 2);

    // 1️⃣ City-level (with neighborhood → city normalization)
    let system = city ? await findWaterSystemByCity(city, state) : null;
    let fallbackLevel = system ? "city" : null;

    // 2️⃣ County-level: prefer the geocoded county, fall back to the county_id map
    if (!system) {
      const countyName = geoCounty || (county_id ? COUNTY_ID_TO_NAME[county_id] : null);
      if (countyName) {
        system = await findWaterSystemByCounty(countyName, state);
        if (system) fallbackLevel = "county";
      }
    }

    // 3️⃣ No state-level fallback: grading a rural restaurant on the largest
    // system in the state is wrong data. Say EPA data is unavailable instead;
    // the client falls back to the zip-accurate EWG link.
    if (!system) {
      return Response.json({ available: false, reason: "EPA data unavailable for this area — the city and county aren't in the EPA SDWIS database." });
    }

    const pwsid = system.PWSID || system.pwsid;
    const violations = await getViolations(pwsid);
    const result = computeWaterGrade(violations);

    return Response.json({
      available: true,
      isFallback: fallbackLevel !== "city",
      fallbackLevel,
      systemName: system.PWS_NAME || system.pws_name,
      city: system.CITY_NAME || system.CITY_SERVED || system.city_name,
      state: stateUpper,
      populationServed: system.POPULATION_SERVED_COUNT || system.population_served_count,
      ...result,
      epaUrl: `https://enviro.epa.gov/enviro/sdw_report_v3.first_table?pws_id=${pwsid}&state=${stateUpper}&source=Both&population=0&sys_num=0`,
    });

  } catch (error) {
    return Response.json({ available: false, reason: error.message }, { status: 500 });
  }
});