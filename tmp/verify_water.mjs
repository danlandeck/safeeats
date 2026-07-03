// Temp verification script — mirrors getWaterQuality logic paths. Delete after test.
const BASE = "https://data.epa.gov/efservice";
const PRIV = /(CONDO|MOBILE|TRAILER|APARTMENT|MHP|MHC|RV PARK|HOMES|ESTATES|VILLAGE|CAMP|MANOR|SUBDIVISION|HOA)/i;

function pick(rows) {
  return rows
    .map(r => ({ ...r, _pop: Number(r.POPULATION_SERVED_COUNT || r.population_served_count) || 0 }))
    .filter(r => r._pop >= 1000)
    .filter(r => !PRIV.test(r.PWS_NAME || r.pws_name || ""))
    .sort((a, b) => b._pop - a._pop)[0] || null;
}

async function byCity(city, st) {
  const url = `${BASE}/WATER_SYSTEM/PRIMACY_AGENCY_CODE/${st}/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/CITY_NAME/${encodeURIComponent(city.toUpperCase())}/JSON`;
  const r = await fetch(url); if (!r.ok) return null;
  const d = await r.json(); return Array.isArray(d) && d.length ? pick(d) : null;
}

async function byCounty(county, st) {
  const c = county.toUpperCase().replace(/\s+COUNTY$/i, "");
  const url = `${BASE}/GEOGRAPHIC_AREA/AREA_TYPE_CODE/CN/COUNTY_SERVED/${encodeURIComponent(c)}/PRIMACY_AGENCY_CODE/${st}/WATER_SYSTEM/PWS_ACTIVITY_CODE/A/PWS_TYPE_CODE/CWS/JSON`;
  const r = await fetch(url); if (!r.ok) return null;
  const d = await r.json(); return Array.isArray(d) && d.length ? pick(d) : null;
}

async function geocode(addr) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&addressdetails=1&limit=1`, { headers: { "User-Agent": "SafeEats/1.0" } });
  const d = await r.json(); if (!d.length) return null;
  const a = d[0].address || {};
  return { city: a.city || a.town || a.village || a.hamlet || null, county: a.county ? a.county.replace(/\s+County$/i, "") : null };
}

const show = (label, s) => console.log(label, s ? `${s.PWSID || s.pwsid} | ${s.PWS_NAME || s.pws_name} | pop ${s.POPULATION_SERVED_COUNT || s.population_served_count}` : "NULL → unavailable");

// Path 1: city hit
show("1. CITY  Seattle,WA        →", await byCity("SEATTLE", "WA"));
// Path 2: rural town, city miss expected → county fallback via geocode
const g = await geocode("Roslyn, WA");
console.log("2. GEO   Roslyn,WA         → city:", g?.city, "| county:", g?.county);
show("   CITY  Roslyn,WA         →", await byCity("ROSLYN", "WA"));
show("   CNTY  " + (g?.county || "?") + ",WA      →", g?.county ? await byCounty(g.county, "WA") : null);
// Path 3: total miss → unavailable
show("3. CNTY  Nonexistent,WA    →", await byCounty("ZZZNOPE", "WA"));
