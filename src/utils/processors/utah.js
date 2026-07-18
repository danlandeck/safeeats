// Utah — Salt Lake County Health Department (CDP Portal)
// public.cdpehs.com/UTEnvPbl — same CDP platform as Illinois.
// Covers Salt Lake County establishments. Uses star ranking system.

export function processUtahResults(data, originalQuery) {
  if (!data || !data.facilities) return [];
  return data.facilities.map(f => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address,
    city: f.city,
    zip_code: f.zip_code || '',
    county_id: 'utah_cdp',
    source: 'utah_cdp',
    safetyScore: f.safetyScore,
    grade: f.grade,
    totalInspections: f.totalInspections,
    latestDate: f.latestDate,
    latestResult: f.latestResult,
    isLLMData: false,
    inspections: f.inspections || [],
  }));
}

export function utahToDetailRows(facility) {
  if (!facility || !facility.inspections || facility.inspections.length === 0) return [];
  return facility.inspections.map((insp, idx) => ({
    id: `${facility.business_id}_${idx}`,
    date: insp.date,
    type: insp.type || 'Routine',
    result: insp.result,
    score: facility.safetyScore,
    grade: facility.grade,
    violations: [],
  }));
}