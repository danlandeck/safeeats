#!/usr/bin/env node
/**
 * SafeEats Market Health Check
 *
 * Verifies every inspection data source is (1) reachable and (2) actually
 * current. A source that returns HTTP 200 with data frozen in 2024 is not
 * "working" for a user in 2026, so freshness is measured from the newest
 * inspection record where the source exposes one.
 *
 * Run:        node scripts/market-health.mjs
 * JSON only:  node scripts/market-health.mjs --json > market-health.json
 * CI:         exits 1 if any source is DEAD or UNREACHABLE
 *
 * Status bands (days since newest inspection record):
 *   FRESH  <= 60      STALE  61-365      DEAD  > 365
 *   ALIVE  host responds, freshness not exposed (scraper tier)
 *   UNREACHABLE  no response, auth wall, or HTTP error
 */
import chalk from 'chalk';

const TIMEOUT_MS = 20000;
const FRESH_DAYS = 60;
const DEAD_DAYS = 365;
const UA = 'Mozilla/5.0 (compatible; SafeEats-HealthCheck/1.0)';
const JSON_ONLY = process.argv.includes('--json');
const NOW = Date.now();
const DAY = 86400000;

const daysAgo = (ms) => (Number.isFinite(ms) ? Math.round((NOW - ms) / DAY) : null);

async function get(url, opts = {}) {
  const t0 = Date.now();
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, ...(opts.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  return { res, ms: Date.now() - t0 };
}

// ── Probe builders ───────────────────────────────────────────────────────────

/** Socrata: newest inspection by a known date column; falls back to metadata. */
const socrata = (market, host, id, dateField, where = 'live') => ({
  market, tier: 'Socrata API', where, url: `https://${host}/resource/${id}.json`,
  async run() {
    const q = `https://${host}/resource/${id}.json?$select=${dateField}` +
      `&$where=${encodeURIComponent(`${dateField} IS NOT NULL`)}` +
      `&$order=${encodeURIComponent(`${dateField} DESC`)}&$limit=1`;
    const { res, ms } = await get(q);
    if (res.status === 403) return { http: 403, ms, note: 'dataset restricted or removed (403)' };
    if (!res.ok) {
      // column name may have changed; fall back to dataset metadata
      const meta = await get(`https://${host}/api/views/${id}.json`);
      if (!meta.res.ok) return { http: res.status, ms };
      const m = await meta.res.json();
      return { http: res.status, ms, newestMs: (m.rowsUpdatedAt || 0) * 1000, basis: 'metadata', note: `date column "${dateField}" not queryable` };
    }
    const rows = await res.json();
    const v = rows?.[0]?.[dateField];
    return { http: res.status, ms, newestMs: Date.parse(v), newest: v?.slice(0, 10), basis: 'newest record' };
  },
});

/** ArcGIS Feature/Map layer: newest record by date field, else layer edit date. */
const arcgis = (market, layer, dateField, where = 'live') => ({
  market, tier: 'ArcGIS API', where, url: layer,
  async run() {
    const { res, ms } = await get(`${layer}?f=json`);
    if (!res.ok) return { http: res.status, ms };
    const meta = await res.json();
    if (meta.error) return { http: 'arcgis-error', ms, note: String(meta.error.message || '').slice(0, 80) };
    if (dateField) {
      const p = new URLSearchParams({
        where: '1=1', outFields: dateField, orderByFields: `${dateField} DESC`,
        resultRecordCount: '1', returnGeometry: 'false', f: 'json',
      });
      const q = await get(`${layer}/query?${p}`);
      if (q.res.ok) {
        const j = await q.res.json();
        const v = j.features?.[0]?.attributes?.[dateField];
        if (v) return { http: 200, ms, newestMs: Number(v), newest: new Date(Number(v)).toISOString().slice(0, 10), basis: 'newest record' };
      }
    }
    const edit = meta.editingInfo?.lastEditDate || meta.editingInfo?.dataLastEditDate;
    return edit
      ? { http: 200, ms, newestMs: edit, basis: 'layer edit date' }
      : { http: 200, ms, basis: 'none', note: 'layer exposes no date; freshness unknown' };
  },
});

/** Generic JSON API with a custom newest-date extractor. */
const api = (market, tier, url, pick, opts = {}, where = 'live') => ({
  market, tier, where, url,
  async run() {
    const { res, ms } = await get(url, opts);
    if (!res.ok) return { http: res.status, ms };
    const j = await res.json().catch(() => null);
    const r = pick ? pick(j) : {};
    return { http: res.status, ms, ...r };
  },
});

/** Scraper tier: host responds AND still looks like a search page. */
const scraper = (market, url, where = 'live') => ({
  market, tier: 'Portal scraper', where, url,
  async run() {
    const { res, ms } = await get(url);
    if (!res.ok) return { http: res.status, ms };
    const html = await res.text();
    const looksLikeSearch = /<form|<input|__VIEWSTATE|search/i.test(html);
    return {
      http: res.status, ms, basis: 'liveness',
      note: looksLikeSearch ? 'search page present' : 'page loads but no search form found; scraper may be broken',
      warn: !looksLikeSearch,
    };
  },
});

// ── Source inventory (mirrors src/utils/apiRegistry.js + base44/functions) ──

const SOURCES = [
  // Live client registry
  arcgis('King County / Seattle, WA', 'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/RESTAURANT_INSPECTIONS_POINT_857/FeatureServer/0', 'DATE_INSPECTION'),
  socrata('King County / Seattle (candidate replacement)', 'data.kingcounty.gov', 'vbyt-shxd', 'inspection_date', 'candidate'),
  socrata('New York City, NY', 'data.cityofnewyork.us', '43nn-pn8j', 'inspection_date'),
  socrata('Chicago, IL', 'data.cityofchicago.org', '4ijn-s7e5', 'inspection_date'),
  socrata('Austin, TX', 'data.austintexas.gov', 'ecmv-9xxi', 'inspection_date'),
  socrata('San Francisco, CA', 'data.sf.gov', 'tvy3-wexg', 'inspection_date'),
  socrata('Delaware', 'data.delaware.gov', '384s-wygj', 'insp_date'),
  socrata('New York State', 'health.data.ny.gov', 'cnih-y5dw', 'date'),
  socrata('Montgomery County, MD', 'data.montgomerycountymd.gov', '5pue-gfbe', 'inspectiondate'),
  socrata('Tri-County Colorado', 'data.colorado.gov', '869n-zj3f', 'activity_date'),
  socrata('Baton Rouge, LA', 'data.brla.gov', 'ux2t-b9wr', 'inspectiondate'),

  // Backend functions: API tier
  socrata('Dallas, TX', 'www.dallasopendata.com', 'dri5-wcct', 'insp_date'),
  socrata('Marin County, CA', 'data.marincounty.gov', '73zb-z5me', 'inspection_date'),
  arcgis('Los Angeles County, CA', 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Environmental_Health_Restaurant_and_Market_Inspections_33/FeatureServer/0', 'ACTIVITY_DATE'),
  arcgis('Louisville, KY', 'https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/FoodServiceData/FeatureServer/0', null),
  arcgis('Sacramento County, CA', 'https://services1.arcgis.com/5NARefyPVtAeuJPU/arcgis/rest/services/Food_Inspections/FeatureServer/0', null),
  arcgis('Maricopa County / Phoenix, AZ', 'https://services.arcgis.com/ykpntM6e3tHvzKRJ/arcgis/rest/services/Restaurant_%28External%29/FeatureServer/0', null),
  arcgis('Wake County / Raleigh, NC', 'https://maps.wake.gov/arcgis/rest/services/Inspections/RestaurantInspectionsOpenData/MapServer/1', null),
  api('Boston, MA', 'CKAN API',
    'https://data.boston.gov/api/3/action/datastore_search?resource_id=4582bec6-2b4f-4f9e-bc55-cbaa73117f4c&limit=1&sort=resultdttm%20desc',
    (j) => { const v = j?.result?.records?.[0]?.resultdttm; return v ? { newestMs: Date.parse(v), newest: String(v).slice(0, 10), basis: 'newest record' } : { basis: 'none', note: 'no dated record returned' }; }),
  api('Toronto (DineSafe), ON', 'CKAN API',
    'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show?id=dinesafe',
    (j) => ({ newestMs: Date.parse(j?.result?.last_refreshed || j?.result?.metadata_modified), basis: 'dataset refresh' })),
  api('United Kingdom (FSA)', 'FSA API',
    'https://api.ratings.food.gov.uk/Establishments?pageSize=1',
    (j) => ({ basis: 'liveness', note: j?.meta?.totalCount ? `${j.meta.totalCount.toLocaleString()} establishments` : 'responded' }),
    { headers: { 'x-api-version': '2', Accept: 'application/json' } }),
  api('France (Alim’Confiance)', 'OpenDataSoft API',
    'https://dgal.opendatasoft.com/api/records/1.0/search/?dataset=export_alimconfiance&rows=1&sort=date_inspection',
    (j) => { const v = j?.records?.[0]?.fields?.date_inspection; return v ? { newestMs: Date.parse(v), newest: v.slice(0, 10), basis: 'newest record' } : {}; }),
  api('Singapore (SFA)', 'data.gov.sg API', 'https://api-production.data.gov.sg/v2/public/api/datasets?page=1', () => ({ basis: 'liveness' })),
  api('Vancouver (VCH), BC', 'VCH API', 'https://inspections.vch.ca/api/v0/portal', () => ({ basis: 'liveness' })),
  api('Las Vegas (SNHD), NV', 'SNHD API', 'https://www.southernnevadahealthdistrict.org/wp-json/snhd-eh-restaurants/v1', () => ({ basis: 'liveness' })),
  api('Australia (NSW)', 'CKAN API', 'https://data.nsw.gov.au/data/api/3/action/status_show', () => ({ basis: 'liveness' })),
  api('Australia (QLD)', 'CKAN API', 'https://data.qld.gov.au/api/3/action/status_show', () => ({ basis: 'liveness' })),
  api('Australia (VIC)', 'CKAN API', 'https://discover.data.vic.gov.au/api/3/action/status_show', () => ({ basis: 'liveness' })),

  // Backend functions: scraper tier
  scraper('Alabama', 'https://foodscores.state.al.us'),
  scraper('Arkansas', 'https://foodserviceprod.adh.arkansas.gov/Web/inspection/publicinspectionsearch.aspx'),
  scraper('Contra Costa County, CA', 'https://hsdmobile.cchealth.org/ffinspectionsearch/InspectionSearch.aspx'),
  scraper('Washington, DC', 'https://dc.healthinspections.us'),
  scraper('Florida', 'https://www.myfloridalicense.com/wl11.asp'),
  scraper('Georgia', 'https://ga.healthinspections.us/georgia'),
  scraper('Houston, TX', 'https://houston-tx.healthinspections.us'),
  scraper('Illinois (CDP)', 'https://public.cdpehs.com/ILENVPBL/ESTABLISHMENT/ShowESTABLISHMENTTablePage.aspx'),
  scraper('Utah (CDP)', 'https://public.cdpehs.com/UTEnvPbl/VW_EST_PUBLIC/ShowVW_EST_PUBLICTablePage.aspx'),
  scraper('Indianapolis (Marion Co.), IN', 'https://hhcwebfood.hhcorp.org'),
  scraper('Mississippi', 'https://apps.msdh.ms.gov/food'),
  scraper('Oklahoma', 'https://www.phin.state.ok.us/inspections/'),
  scraper('Portland (Multnomah Co.), OR', 'https://inspections.myhealthdepartment.com/multco-eh'),
  scraper('Riverside County, CA', 'https://weblink.rivcoeh.org'),
  scraper('San Diego County, CA', 'https://www.sdfoodinfo.org'),
  scraper('South Carolina', 'https://apps.dhec.sc.gov/Environment/FoodGrades/'),
  scraper('Stanislaus County, CA', 'https://secure.stancounty.com/foodinspections'),
  scraper('Tacoma-Pierce County, WA', 'https://aca-prod.accela.com/TPCHD/GeneralProperty/PropertyLookUp.aspx?isFoodFacility=Y&TabName=APO'),
  scraper('South Dakota (SafeFood)', 'https://sddoh.safefoodinspection.com/Inspection/PublicInspectionSearch.aspx'),
  scraper('Vermont (SafeFood)', 'https://vtdoh.safefoodinspection.com/Inspection/PublicInspectionSearch.aspx'),
  scraper('Farmington Valley, CT', 'https://www.fvhd.org/'),
  scraper('Netherlands (NVWA)', 'https://www.openbare-inspectieresultaten.nvwa.nl'),
];

// ── Classify ────────────────────────────────────────────────────────────────

function classify(r) {
  if (r.error || (typeof r.http === 'number' && r.http >= 400) || r.http === 'arcgis-error') return 'UNREACHABLE';
  const d = daysAgo(r.newestMs);
  if (d !== null && d < -1) return 'FUTURE-DATED';
  if (d === null) return r.warn ? 'CHECK' : 'ALIVE';
  if (d <= FRESH_DAYS) return 'FRESH';
  if (d <= DEAD_DAYS) return 'STALE';
  return 'DEAD';
}

const color = {
  FRESH: chalk.green.bold, ALIVE: chalk.green, STALE: chalk.yellow.bold, CHECK: chalk.yellow,
  'FUTURE-DATED': chalk.magenta.bold, DEAD: chalk.red.bold, UNREACHABLE: chalk.red.bold,
};

const results = await Promise.all(SOURCES.map(async (s) => {
  let r;
  try { r = await s.run(); } catch (e) { r = { error: String(e.cause?.code || e.message).slice(0, 80) }; }
  const status = classify(r);
  return { market: s.market, tier: s.tier, where: s.where, status, days: daysAgo(r.newestMs), newest: r.newest || (Number.isFinite(r.newestMs) ? new Date(r.newestMs).toISOString().slice(0, 10) : null), basis: r.basis || null, http: r.http ?? null, ms: r.ms ?? null, note: r.note || r.error || null, url: s.url };
}));

const rank = { UNREACHABLE: 0, DEAD: 1, 'FUTURE-DATED': 2, STALE: 3, CHECK: 4, ALIVE: 5, FRESH: 6 };
results.sort((a, b) => rank[a.status] - rank[b.status] || (b.days ?? -1) - (a.days ?? -1));

if (JSON_ONLY) {
  console.log(JSON.stringify({ generated: new Date().toISOString(), results }, null, 2));
} else {
  console.log(chalk.bold.underline('\nSafeEats Market Health') + chalk.dim(`  ${new Date().toISOString()}\n`));
  for (const r of results) {
    const tag = (color[r.status] || chalk.white)(r.status.padEnd(12));
    const age = r.days !== null ? `${r.days}d`.padStart(6) : '     -';
    const cand = r.where === 'candidate' ? chalk.cyan(' [candidate]') : '';
    console.log(`  ${tag} ${chalk.dim(age)}  ${r.market}${cand}  ${chalk.dim(r.tier)}${r.newest ? chalk.dim(`  newest ${r.newest}`) : ''}${r.note ? chalk.dim(`  ${r.note}`) : ''}`);
  }
  const count = (s) => results.filter((r) => r.status === s && r.where === 'live').length;
  console.log('\n' + chalk.bold('Summary (live sources): ') +
    [['FRESH', count('FRESH')], ['ALIVE', count('ALIVE')], ['STALE', count('STALE')], ['CHECK', count('CHECK')], ['FUTURE-DATED', count('FUTURE-DATED')], ['DEAD', count('DEAD')], ['UNREACHABLE', count('UNREACHABLE')]]
      .map(([k, n]) => (color[k] || chalk.white)(`${k} ${n}`)).join(chalk.dim('  |  ')) + '\n');
}

const bad = results.filter((r) => r.where === 'live' && (r.status === 'DEAD' || r.status === 'UNREACHABLE'));
process.exit(bad.length ? 1 : 0);
