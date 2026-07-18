import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://www.phin.state.ok.us/inspections/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractHiddenFields(html) {
  return {
    viewstate: html.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/)?.[1] || '',
    viewstateGenerator: html.match(/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/)?.[1] || '',
    eventValidation: html.match(/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/)?.[1] || '',
  };
}

function extractCookies(res) {
  const cookies = res.headers.get('set-cookie') || '';
  return cookies.split(',').map(c => c.split(';')[0]).join('; ');
}

// Map major Oklahoma cities to their county names (as they appear in the portal dropdown)
const CITY_TO_COUNTY = {
  'oklahoma city': 'Oklahoma', 'okc': 'Oklahoma', 'edel': 'Oklahoma', 'del city': 'Oklahoma',
  'midwest city': 'Oklahoma', 'mustang': 'Oklahoma', 'yukon': 'Canadian', 'norman': 'Cleveland',
  'moore': 'Cleveland', 'tulsa': 'Tulsa', 'broken arrow': 'Tulsa', 'owasso': 'Tulsa',
  'jenks': 'Tulsa', 'sapulpa': 'Creek', 'bartlesville': 'Washington', 'muskogee': 'Muskogee',
  'enid': 'Garfield', 'stillwater': 'Payne', 'ponca city': 'Kay', 'shawnee': 'Pottawatomie',
  'ardmore': 'Carter', 'lawton': 'Comanche', 'altus': 'Jackson', 'weatherford': 'Custer',
  'guymon': 'Texas', 'mcalester': 'Pittsburg', 'durant': 'Bryan', 'ada': 'Pontotoc',
  'chickasha': 'Grady', 'elk city': 'Beckham', ' Woodward': 'Woodward', 'alva': 'Woods',
  'claremore': 'Rogers', 'miami': 'Ottawa', 'vinita': 'Craig', 'pryor': 'Mayes',
  'sallisaw': 'Sequoyah', 'tahlequah': 'Cherokee', 'stigler': 'Haskell', 'poteau': 'Le Flore',
  'miami': 'Ottawa', 'grove': 'Delaware', 'wagoner': 'Wagoner', 'bixby': 'Tulsa',
  'glenpool': 'Tulsa', 'sand springs': 'Tulsa', 'collinsville': 'Tulsa',
  'edmond': 'Oklahoma', 'bethany': 'Oklahoma', 'warr acres': 'Oklahoma',
  'nichols hills': 'Oklahoma', 'the village': 'Oklahoma', 'arcadia': 'Oklahoma',
  'choctaw': 'Oklahoma', 'harrah': 'Oklahoma', 'jones': 'Oklahoma',
  'spencer': 'Oklahoma', 'valley brook': 'Oklahoma', 'forest park': 'Oklahoma',
  'lake aluma': 'Oklahoma', 'smith village': 'Oklahoma', 'carol springs': 'Oklahoma',
  'nichols hills': 'Oklahoma', 'wheatland': 'Canadian', 'piedmont': 'Canadian',
  'richmond': 'Canadian', 'union city': 'Canadian', 'calumet': 'Canadian',
  'geary': 'Canadian', 'hinton': 'Caddo', 'binger': 'Caddo', 'hydro': 'Caddo',
  'anadarko': 'Caddo', 'fort cobb': 'Caddo', 'cyril': 'Caddo', 'apache': 'Caddo',
  'cache': 'Comanche', 'elgin': 'Comanche', 'snyder': 'Kiowa', 'chattanooga': 'Comanche',
  'fletcher': 'Comanche', 'sterling': 'Comanche', 'gotebo': 'Kiowa',
};

function resolveCounty(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  return CITY_TO_COUNTY[key] || null;
}

// Fallback: search the 5 most populous counties if no city/county match
const FALLBACK_COUNTIES = ['Oklahoma', 'Tulsa', 'Cleveland', 'Canadian', 'Comanche'];

function findCountyValue(initHtml, countyName) {
  const countyOptions = [...initHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
  const match = countyOptions.find(m => m[2].trim().toUpperCase() === countyName.toUpperCase());
  return match ? match[1] : null;
}

function parseSearchResults(html) {
  const dgMatch = html.match(/<table[^>]*id="dgRestaurants"[^>]*>([\s\S]*?)<\/table>/i);
  if (!dgMatch) return [];
  const rows = [...dgMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const facilities = [];
  for (const row of rows.slice(1)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c =>
      c[1].replace(/<[^>]*>/g, '').trim()
    );
    if (cells.length >= 5 && cells[0]) {
      const detailMatch = row[1].match(/__doPostBack\(&#39;([^&]*)&#39;/);
      facilities.push({
        name: cells[0],
        address: cells[1],
        city: cells[2],
        zip: cells[3],
        county: cells[4],
        detailTarget: detailMatch ? detailMatch[1] : '',
      });
    }
  }
  return facilities;
}

function parseInspectionDetails(html) {
  // Extract facility name from the details page
  const nameMatch = html.match(/id="lblEstablishment"[^>]*>([^<]*)</i);
  const facilityName = nameMatch ? nameMatch[1].trim() : '';

  // Parse dgViolations table
  const dgMatch = html.match(/<table[^>]*id="dgViolations"[^>]*>([\s\S]*?)<\/table>/i);
  if (!dgMatch) return { facilityName, inspections: [] };

  const rows = [...dgMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const inspections = [];
  let currentDate = null;
  let violations = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c =>
      c[1].replace(/<[^>]*>/g, '').trim()
    );

    if (cells.length === 0) continue;

    // Check if this row has an inspection date
    const dateMatch = cells.find(c => c.match(/Inspection Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i));
    if (dateMatch) {
      // Save previous inspection if exists
      if (currentDate) {
        inspections.push({ date: currentDate, violations: [...violations] });
      }
      const m = dateMatch.match(/Inspection Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
      currentDate = m[1];
      violations = [];
      // Check if same row has "No violations reported"
      if (dateMatch.includes('No violations reported') || (cells.length > 1 && cells[1].includes('No violations'))) {
        // No violations for this inspection
      }
    }

    // Check for violation descriptions
    const violationCell = cells.find(c => c.length > 5 && !c.includes('Inspection Date') && !c.includes('Violations') && !c.includes('Notes'));
    if (violationCell && currentDate) {
      if (violationCell !== 'No violations reported' && violationCell !== '&nbsp;') {
        violations.push(violationCell);
      }
    }
  }

  // Don't forget the last inspection
  if (currentDate) {
    inspections.push({ date: currentDate, violations: [...violations] });
  }

  return { facilityName, inspections };
}

function calculateSafetyScore(inspections) {
  if (!inspections || inspections.length === 0) return null;
  const latest = inspections[0];
  const violationCount = latest.violations.length;
  // Score based on violation count in most recent inspection
  if (violationCount === 0) return 95;
  if (violationCount <= 2) return 85;
  if (violationCount <= 5) return 72;
  if (violationCount <= 10) return 55;
  return 35;
}

function gradeFromScore(score) {
  if (score === null) return 'U';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, county, city } = body;
    const establishmentName = body.name || body.establishmentName || '';

    if (action === 'search') {
      // Resolve which counties to search
      const resolvedCounty = county || resolveCounty(city);
      const countiesToSearch = resolvedCounty ? [resolvedCounty] : FALLBACK_COUNTIES;

      const allFacilities = [];

      for (const countyName of countiesToSearch) {
        // Step 1: GET initial page (fresh session per county for reliability)
        const initRes = await fetch(BASE_URL, {
          headers: { 'User-Agent': UA },
        });
        const initHtml = await initRes.text();
        const hidden = extractHiddenFields(initHtml);
        const cookieStr = extractCookies(initRes);
        const countyValue = findCountyValue(initHtml, countyName);

        // Step 2: POST search with county selected
        const formData = new URLSearchParams();
        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');
        formData.append('__VIEWSTATE', hidden.viewstate);
        if (hidden.viewstateGenerator) formData.append('__VIEWSTATEGENERATOR', hidden.viewstateGenerator);
        if (hidden.eventValidation) formData.append('__EVENTVALIDATION', hidden.eventValidation);
        formData.append('txtSearch', establishmentName || '');
        if (countyValue) formData.append('cmbCounties', countyValue);
        formData.append('cmdSearch', 'Find');

        const searchRes = await fetch(BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Cookie': cookieStr,
            'Referer': BASE_URL,
          },
          body: formData.toString(),
        });
        const searchHtml = await searchRes.text();
        const facilities = parseSearchResults(searchHtml);

        // Filter by city if provided (and we're searching a resolved county, not fallback)
        const filtered = (city && resolvedCounty)
          ? facilities.filter(f => f.city.toUpperCase().includes(city.toUpperCase()))
          : facilities;

        // Step 3: For each facility, get inspection details
        const searchHidden = extractHiddenFields(searchHtml);

        for (const facility of filtered.slice(0, 10)) {
          if (!facility.detailTarget) continue;
          const detailsFormData = new URLSearchParams();
          detailsFormData.append('__EVENTTARGET', facility.detailTarget);
          detailsFormData.append('__EVENTARGUMENT', '');
          detailsFormData.append('__VIEWSTATE', searchHidden.viewstate);
          if (searchHidden.viewstateGenerator) detailsFormData.append('__VIEWSTATEGENERATOR', searchHidden.viewstateGenerator);
          if (searchHidden.eventValidation) detailsFormData.append('__EVENTVALIDATION', searchHidden.eventValidation);
          detailsFormData.append('txtSearch', establishmentName || '');
          if (countyValue) detailsFormData.append('cmbCounties', countyValue);

          const detailsRes = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': UA,
              'Cookie': cookieStr,
              'Referer': BASE_URL,
            },
            body: detailsFormData.toString(),
          });
          const detailsHtml = await detailsRes.text();
          const { inspections } = parseInspectionDetails(detailsHtml);
          const safetyScore = calculateSafetyScore(inspections);

          allFacilities.push({
            business_id: `ok_${facility.name}_${facility.address}`.replace(/\s+/g, '_').toLowerCase(),
            name: facility.name,
            address: facility.address,
            city: facility.city,
            zip_code: facility.zip,
            county: facility.county,
            state: 'OK',
            source: 'oklahoma',
            safetyScore,
            grade: gradeFromScore(safetyScore),
            totalInspections: inspections.length,
            latestDate: inspections[0]?.date || null,
            latestResult: inspections[0]?.violations.length === 0 ? 'No violations' : `${inspections[0]?.violations.length || 0} violations`,
            inspections: inspections.map(i => ({
              date: i.date,
              violations: i.violations,
              result: i.violations.length === 0 ? 'No violations reported' : `${i.violations.length} violation(s)`,
            })),
          });

          // Update hidden fields for next request
          const newHidden = extractHiddenFields(detailsHtml);
          if (newHidden.viewstate) {
            searchHidden.viewstate = newHidden.viewstate;
            searchHidden.viewstateGenerator = newHidden.viewstateGenerator;
            searchHidden.eventValidation = newHidden.eventValidation;
          }
        }

        // If we found results in the resolved county, no need to search fallback counties
        if (allFacilities.length > 0 && resolvedCounty) break;
      }

      // Deduplicate by business_id
      const seen = new Set();
      const results = allFacilities.filter(f => {
        if (seen.has(f.business_id)) return false;
        seen.add(f.business_id);
        return true;
      });

      return Response.json({ facilities: results, total: results.length });
    }

    return Response.json({ error: 'Unknown action. Use action=search.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});