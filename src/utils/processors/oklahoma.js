// Oklahoma State Department of Health (OSDH) — phin.state.ok.us
// State-wide portal covering all 77 counties.
// No letter grades — violations listed per inspection. Score derived from violation count.

export function processOklahomaResults(data, originalQuery) {
  if (!data || !data.facilities) return [];
  return data.facilities.map(f => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address,
    city: f.city,
    zip_code: f.zip_code || '',
    county_id: 'oklahoma',
    source: 'oklahoma',
    safetyScore: f.safetyScore,
    grade: f.grade,
    totalInspections: f.totalInspections,
    latestDate: f.latestDate,
    latestResult: f.latestResult,
    isLLMData: false,
    inspections: f.inspections || [],
  }));
}

export function oklahomaToDetailRows(facility) {
  if (!facility || !facility.inspections) return [];
  return facility.inspections.flatMap((insp, idx) => {
    const baseRow = {
      id: `${facility.business_id}_${idx}`,
      date: insp.date,
      type: 'Routine',
      result: insp.result,
      score: facility.safetyScore,
      grade: facility.grade,
      violations: [],
    };

    if (insp.violations && insp.violations.length > 0) {
      return insp.violations.map((v, vIdx) => ({
        ...baseRow,
        id: `${facility.business_id}_${idx}_${vIdx}`,
        violation: v,
        severity: 'minor',
      }));
    }

    return [baseRow];
  });
}