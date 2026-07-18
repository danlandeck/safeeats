// South Carolina Department of Agriculture (SCDA) / formerly DHEC
// State-wide portal at apps.dhec.sc.gov/Environment/FoodGrades/
// Uses A/B/C letter grades. Covers all 46 counties.

export function processSCResults(data, originalQuery) {
  if (!data || !data.facilities) return [];
  return data.facilities.map(f => ({
    business_id: f.business_id,
    name: f.name,
    address: f.address,
    city: f.city,
    county_id: 'sc_food_grades',
    source: 'sc_food_grades',
    safetyScore: f.safetyScore,
    grade: f.grade,
    totalInspections: f.totalInspections,
    latestDate: f.latestDate,
    latestResult: f.latestResult,
    isLLMData: false,
    inspections: f.inspections || [],
  }));
}

export function scToDetailRows(facility) {
  if (!facility || !facility.inspections) return [];
  return facility.inspections.map((insp, idx) => ({
    id: `${facility.business_id}_${idx}`,
    date: insp.date,
    type: insp.type || 'Routine',
    result: insp.result,
    score: facility.safetyScore,
    grade: insp.grade || facility.grade,
    violations: [],
  }));
}