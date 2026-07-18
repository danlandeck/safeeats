// Processor for safefoodinspection.com platform (SD, VT, WY)
// All three states share the same backend scraper and data format.

export function processSafefoodResults(data, stateCode) {
  if (!data || !data.facilities) return [];
  return data.facilities.map((f) => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address || '',
    city: f.city || '',
    zip_code: f.zip_code || '',
    phone: f.phone || '',
    county_id: (stateCode || '').toLowerCase(),
    source: f.source,
    safetyScore: f.safetyScore,
    grade: f.grade || 'U',
    totalInspections: f.totalInspections || f.inspections?.length || 0,
    latestDate: f.latestDate || null,
    latestResult: f.latestResult || '',
    isLLMData: false,
  }));
}

export function safefoodToDetailRows(facility) {
  if (!facility || !facility.inspections) return [];
  return facility.inspections.map((insp, idx) => ({
    id: `${facility.business_id}_insp_${idx}`,
    date: insp.date,
    type: insp.type || 'Routine',
    score: insp.score || '',
    violationCount: insp.violationCount || 0,
    violations: insp.violationCount > 0
      ? `${insp.violationCount} violation(s) noted`
      : 'No violations noted',
    result: insp.violationCount > 0 ? 'Violations Found' : 'Pass',
  }));
}