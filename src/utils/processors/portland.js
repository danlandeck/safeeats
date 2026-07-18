// Processor for Portland (Multnomah & Clackamas County) restaurant inspections.
// Source: restaurants.oregonlive.com/inspections — historical data frozen at 2019-2020.
// Real numeric 0-100 scores, not AI-generated.
// Every result includes a link to the official live portal for current data.

export function processPortlandResults(data) {
  if (!data || !data.facilities) return [];
  return data.facilities.map((f) => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address || '',
    city: f.city || '',
    state: f.state || 'OR',
    zip_code: f.zip_code || '',
    county_id: 'portland_oregonlive',
    source: 'portland_oregonlive',
    safetyScore: f.safetyScore,
    grade: f.grade || 'U',
    totalInspections: f.totalInspections || 0,
    latestDate: f.latestDate || null,
    latestResult: f.latestResult || '',
    isLLMData: false,
    detail_url: f.detail_url || '',
    data_warning: f.data_warning || 'Historical data from OregonLive (2019-2020). May not reflect current conditions.',
    portal_url: f.portal_url || 'https://inspections.myhealthdepartment.com/multco-eh',
    portal_name: f.portal_name || 'Multnomah County Official Inspection Portal',
  }));
}

export function portlandToDetailRows(facility) {
  if (!facility || !facility.inspections) return [];
  return facility.inspections.map((insp, idx) => ({
    id: `${facility.business_id}_insp_${idx}`,
    date: insp.date,
    type: insp.type || 'Routine',
    score: insp.score !== null && insp.score !== undefined ? String(insp.score) : 'Not scored',
    violationCount: 0,
    violations: insp.score !== null && insp.score !== undefined
      ? `Score: ${insp.score}/100 — ${insp.result || 'Inspection completed'}`
      : `${insp.type || 'Inspection'} — ${insp.result || 'Not scored (reinspection)'}`,
    result: insp.result || '',
  }));
}