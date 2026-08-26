import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ── Source registry: every municipality SafeEats™ covers ──────────────────────
const AUDIT_SOURCES = [
  // ── US: Live government API sources ──
  { id: 'king', name: 'King County, WA (Seattle)', type: 'live_api', portal: 'https://kingcounty.gov/depts/health/environmental-health/food-safety.aspx' },
  { id: 'nyc', name: 'New York City, NY', type: 'live_api', portal: 'https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j' },
  { id: 'ny_state', name: 'New York State (statewide)', type: 'live_api', portal: 'https://health.data.ny.gov/Restaurant-Inspections-Statewide/cnih-y5dw' },
  { id: 'sf', name: 'San Francisco, CA', type: 'live_api', portal: 'https://data.sfgov.org/Health-and-Social-Services/Restaurant-Scores/tvy3-wexg' },
  { id: 'cook', name: 'Chicago / Cook County, IL', type: 'live_api', portal: 'https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4ijn-s7e5' },
  { id: 'travis', name: 'Austin / Travis County, TX', type: 'live_api', portal: 'https://data.austintexas.gov/Health-and-Community-Services/Food-Establishment-Inspection-Scores/ecmv-9xxi' },
  { id: 'montgomery_md', name: 'Montgomery County, MD', type: 'live_api', portal: 'https://data.montgomerycountymd.gov/Health-and-Human-Services/Food-Inspections/9tm3-jscp' },
  { id: 'delaware', name: 'Delaware (statewide)', type: 'live_api', portal: 'https://data.delaware.gov/Health-and-Social-Services/Restaurant-Inspections/384s-wygj' },
  { id: 'boston', name: 'Boston, MA', type: 'live_api', portal: 'https://data.boston.gov/' },
  { id: 'houston', name: 'Houston, TX', type: 'live_api', portal: 'https://www.houstontx.gov/health/' },
  { id: 'la', name: 'Los Angeles County, CA', type: 'live_api', portal: 'https://ehservices.publichealth.lacounty.gov/' },
  { id: 'stanislaus', name: 'Stanislaus County, CA', type: 'live_api', portal: 'https://schsa.info/' },
  { id: 'snhd', name: 'Las Vegas / Clark County, NV', type: 'live_api', portal: 'https://www.southernnevadahealthdistrict.org/permits-and-regulations/restaurant-inspections/' },
  { id: 'dallas', name: 'Dallas County, TX', type: 'live_api', portal: 'https://www.dallasopendata.com/Services/Restaurant-and-Food-Establishment-Inspections-Octo/dri5-wcct' },
  { id: 'wake', name: 'Wake County, NC (Raleigh)', type: 'live_api', portal: 'https://maps.wake.gov/arcgis/rest/services/Inspections/RestaurantInspectionsOpenData/MapServer' },
  { id: 'louisville', name: 'Louisville / Jefferson County, KY', type: 'live_api', portal: 'https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/FoodServiceData/FeatureServer' },
  { id: 'maricopa', name: 'Maricopa County, AZ (Phoenix)', type: 'live_api', portal: 'https://www.maricopa.gov/EnvSvc/Food/' },
  { id: 'tri_county_co', name: 'Tri-County, CO', type: 'live_api', portal: 'https://www.tchd.org/' },
  { id: 'dc', name: 'Washington, DC', type: 'live_api', portal: 'https://dc.healthinspections.us/' },
  { id: 'florida', name: 'Florida (statewide)', type: 'live_api', portal: 'https://www.myfloridalicense.com/wl11.asp' },
  { id: 'georgia', name: 'Georgia (statewide)', type: 'live_api', portal: 'https://dph.georgia.gov/environmental-health' },
  { id: 'alabama', name: 'Alabama (statewide)', type: 'live_api', portal: 'https://www.alabamapublichealth.gov/environmental/food.html' },
  { id: 'arkansas', name: 'Arkansas (statewide)', type: 'live_api', portal: 'https://www.healthy.arkansas.gov/programs-services/topics/food-safety' },
  { id: 'mississippi', name: 'Mississippi (statewide)', type: 'live_api', portal: 'https://msdh.ms.gov/msdhsite/_static/30,0,76.html' },
  { id: 'oklahoma', name: 'Oklahoma (statewide)', type: 'live_api', portal: 'https://www.ok.gov/health/' },
  { id: 'utah', name: 'Utah (statewide)', type: 'live_api', portal: 'https://dches.utah.gov/' },
  { id: 'sc_food_grades', name: 'South Carolina (statewide)', type: 'live_api', portal: 'https://www.scdhec.gov/food-safety' },
  { id: 'portland_oregonlive', name: 'Portland, OR', type: 'live_api', portal: 'https://www.multco.us/health/stories/restaurant-inspections' },
  { id: 'illinois_cdp', name: 'Illinois (statewide)', type: 'live_api', portal: 'https://dph.illinois.gov/topics-services/food-safety.html' },
  { id: 'indiana_marion', name: 'Indianapolis / Marion County, IN', type: 'live_api', portal: 'https://www.marionhealth.org/food-safety' },
  { id: 'brla', name: 'Baton Rouge, LA', type: 'live_api', portal: 'https://www.brla.gov/health' },
  { id: 'fvhd', name: 'Farmington Valley, CT', type: 'live_api', portal: 'https://www.fvhd.org/' },
  { id: 'manchester_ct', name: 'Manchester, CT', type: 'live_api', portal: 'https://www.manchesterct.gov/Government/Departments/Health-Department/Recent-Inspections' },
  { id: 'tacoma_pierce', name: 'Tacoma-Pierce County, WA', type: 'live_api', portal: 'https://www.tpchd.org/healthy-communities/food-safety' },
  // ── International: Live API ──
  { id: 'toronto', name: 'Toronto, ON, Canada', type: 'live_api', portal: 'https://open.toronto.ca/dataset/dinesafe/' },
  { id: 'vancouver', name: 'Vancouver, BC, Canada', type: 'live_api', portal: 'https://inspections.vch.ca/' },
  { id: 'uk_fsa', name: 'United Kingdom (FSA)', type: 'live_api', portal: 'https://ratings.food.gov.uk/open-data' },
  { id: 'france', name: 'France (Alim\'confiance)', type: 'live_api', portal: 'https://dgal.opendatasoft.com/explore/dataset/export_alimconfiance/' },
  { id: 'netherlands', name: 'Netherlands (NVWA)', type: 'live_api', portal: 'https://www.openbare-inspectieresultaten.nvwa.nl/' },
  // ── International: AI-enhanced ──
  { id: 'singapore', name: 'Singapore', type: 'ai_enhanced', portal: 'https://www.sfa.gov.sg/food-information/rating-of-food-establishments' },
  { id: 'dubai', name: 'Dubai, UAE', type: 'ai_enhanced', portal: 'https://www.dm.gov.ae/' },
  { id: 'australia', name: 'Australia (NSW)', type: 'ai_enhanced', portal: 'https://www.foodauthority.nsw.gov.au/ratings' },
  // ── LLM fallback ──
  { id: 'llm', name: 'AI-Generated (fallback)', type: 'llm_fallback', portal: null },
];

const BATCH_SIZE = 5;

function computeFreshness(latestDateStr) {
  if (!latestDateStr) return { status: 'no_data', days_since: null };
  const d = new Date(latestDateStr);
  if (isNaN(d.getTime())) return { status: 'no_data', days_since: null };
  const daysSince = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  let status;
  if (daysSince <= 90) status = 'fresh';
  else if (daysSince <= 365) status = 'stale';
  else status = 'very_stale';
  return { status, days_since: daysSince };
}

function analyzeSource(src, records) {
  const count = records.length;
  const llmCount = records.filter(r => r.isLLMData === true).length;

  const datedRecords = records.filter(r => r.latestDate);
  const dates = datedRecords.map(r => new Date(r.latestDate).getTime()).filter(t => !isNaN(t));
  const latestDateMs = dates.length > 0 ? Math.max(...dates) : null;
  const latestDateStr = latestDateMs ? new Date(latestDateMs).toISOString().split('T')[0] : null;
  const freshness = computeFreshness(latestDateStr);

  const scores = records
    .filter(r => r.safetyScore !== null && r.safetyScore !== undefined && !isNaN(r.safetyScore))
    .map(r => r.safetyScore);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const cachedDates = records.filter(r => r.cached_at).map(r => new Date(r.cached_at).getTime()).filter(t => !isNaN(t));
  const lastCachedMs = cachedDates.length > 0 ? Math.max(...cachedDates) : null;
  const lastCachedStr = lastCachedMs ? new Date(lastCachedMs).toISOString() : null;

  const adaKnown = records.filter(r => r.ada_compliance && r.ada_compliance !== 'unknown');
  const adaAccessible = records.filter(r => r.ada_compliance === 'accessible');
  const adaPartial = records.filter(r => r.ada_compliance === 'partially_accessible');
  const adaNotAccessible = records.filter(r => r.ada_compliance === 'not_accessible');

  return {
    source_id: src.id,
    source_name: src.name,
    data_type: src.type,
    portal_url: src.portal,
    record_count: count,
    llm_record_count: llmCount,
    llm_percentage: count > 0 ? Math.round((llmCount / count) * 100) : 0,
    latest_inspection_date: latestDateStr,
    freshness_status: freshness.status,
    days_since_latest: freshness.days_since,
    avg_safety_score: avgScore,
    last_cached: lastCachedStr,
    ada_known_count: adaKnown.length,
    ada_accessible_count: adaAccessible.length,
    ada_partial_count: adaPartial.length,
    ada_not_accessible_count: adaNotAccessible.length,
    ada_coverage_percentage: count > 0 ? Math.round((adaKnown.length / count) * 100) : 0,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Authentication required to run the audit' }, { status: 401 });
    }

    // ── Query each known source in parallel batches ────────────────────────
    const sourceReports = [];
    for (let i = 0; i < AUDIT_SOURCES.length; i += BATCH_SIZE) {
      const batch = AUDIT_SOURCES.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (src) => {
          const records = await base44.entities.Restaurant
            .filter({ source: src.id }, '-created_date', 500)
            .catch(() => []);
          return analyzeSource(src, records);
        })
      );
      sourceReports.push(...results);
    }

    // ── Aggregate stats ────────────────────────────────────────────────────
    const activeSources = sourceReports.filter(s => s.record_count > 0);
    const totalRestaurants = sourceReports.reduce((sum, s) => sum + s.record_count, 0);
    const totalLLM = sourceReports.reduce((sum, s) => sum + s.llm_record_count, 0);
    const llmPct = totalRestaurants > 0 ? Math.round((totalLLM / totalRestaurants) * 100) : 0;
    const staleCount = sourceReports.reduce((sum, s) => sum + (s.freshness_status === 'very_stale' ? s.record_count : 0), 0);
    const liveApiSources = activeSources.filter(s => s.data_type === 'live_api').length;
    const aiSources = activeSources.filter(s => s.data_type !== 'live_api').length;
    const totalAdaKnown = sourceReports.reduce((sum, s) => sum + s.ada_known_count, 0);
    const adaCoveragePct = totalRestaurants > 0 ? Math.round((totalAdaKnown / totalRestaurants) * 100) : 0;

    // ── Water quality coverage ──────────────────────────────────────────────
    const waterSystems = await base44.entities.WaterSystem
      .list('-created_date', 500)
      .catch(() => []);

    const waterStates = [...new Set(waterSystems.filter(w => w.state).map(w => w.state))];
    const waterViolations = waterSystems.reduce((sum, w) => sum + (w.violations_total || 0), 0);
    const waterUnresolved = waterSystems.reduce((sum, w) => sum + (w.violations_unresolved || 0), 0);
    const waterAboveGuideline = waterSystems.filter(w => (w.contaminants_above_guideline || 0) > 0).length;

    // ── Compare against last audit snapshot ─────────────────────────────────
    let lastAudit = null;
    let newRecordsVsLast = 0;
    try {
      const lastAudits = await base44.entities.DataAuditLog.list('-audit_timestamp', 1);
      if (lastAudits && lastAudits.length > 0) {
        lastAudit = lastAudits[0];
        newRecordsVsLast = Math.max(0, totalRestaurants - (lastAudit.total_restaurants || 0));
      }
    } catch {}

    // ── Store audit snapshot (admin only) ───────────────────────────────────
    let auditRecord = null;
    if (user.role === 'admin') {
      try {
        auditRecord = await base44.entities.DataAuditLog.create({
          audit_timestamp: new Date().toISOString(),
          total_restaurants: totalRestaurants,
          total_water_systems: waterSystems.length,
          source_count: activeSources.length,
          live_api_sources: liveApiSources,
          ai_fallback_sources: aiSources,
          total_llm_records: totalLLM,
          llm_percentage: llmPct,
          stale_record_count: staleCount,
          ada_coverage_percentage: adaCoveragePct,
          new_records_vs_last: newRecordsVsLast,
          triggered_by: user.email || 'admin',
        });
      } catch (e) {
        console.error('Failed to store audit snapshot:', e.message);
      }
    }

    // ── Build the full report ───────────────────────────────────────────────
    return Response.json({
      audit_timestamp: new Date().toISOString(),
      triggered_by: user.email || 'authenticated user',
      summary: {
        total_restaurants: totalRestaurants,
        total_water_systems: waterSystems.length,
        active_sources: activeSources.length,
        total_sources_registered: AUDIT_SOURCES.length,
        live_api_sources: liveApiSources,
        ai_fallback_sources: aiSources,
        total_llm_records: totalLLM,
        llm_percentage: llmPct,
        stale_record_count: staleCount,
        ada_coverage_percentage: adaCoveragePct,
        new_records_vs_last: newRecordsVsLast,
        last_audit_timestamp: lastAudit ? lastAudit.audit_timestamp : null,
      },
      source_reports: activeSources.sort((a, b) => b.record_count - a.record_count),
      inactive_sources: sourceReports.filter(s => s.record_count === 0).map(s => ({
        source_id: s.source_id,
        source_name: s.source_name,
        data_type: s.data_type,
        portal_url: s.portal_url,
      })),
      water_quality: {
        total_systems: waterSystems.length,
        states_covered: waterStates,
        total_violations: waterViolations,
        unresolved_violations: waterUnresolved,
        systems_above_guideline: waterAboveGuideline,
      },
      transparency_notes: [
        'This audit runs live against the SafeEats database — not a cached snapshot.',
        'Record counts reflect cached restaurants, not every establishment in a jurisdiction.',
        'AI-generated records (isLLMData) are always disclosed and never counted as verified data.',
        'Freshness is measured from the latest inspection date on record per source.',
        'An "inactive" source has zero cached records — it may still have a live API that simply hasn\'t been queried recently.',
      ],
      audit_snapshot_stored: auditRecord !== null,
    });
  } catch (error) {
    console.error('Data integrity audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}