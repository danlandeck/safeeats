import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://ga.healthinspections.us/georgia';

// City → County mapping for Georgia counties on the healthinspections.us portal.
// Only counties verified to return data are included; others fall back to AI.
const CITY_TO_COUNTY: Record<string, string> = {
  // Fulton County
  atlanta: 'Fulton', 'sandy springs': 'Fulton', roswell: 'Fulton', alpharetta: 'Fulton',
  'east point': 'Fulton', 'college park': 'Fulton', 'union city': 'Fulton', fairburn: 'Fulton',
  hapeville: 'Fulton', palmetto: 'Fulton', milton: 'Fulton', 'mountain park': 'Fulton',
  'chattahoochee hills': 'Fulton', 'south fulton': 'Fulton', bearcreek: 'Fulton',
  // Cobb County
  marietta: 'Cobb', smyrna: 'Cobb', kennesaw: 'Cobb', acworth: 'Cobb',
  austell: 'Cobb', 'powder springs': 'Cobb', mableton: 'Cobb', vinings: 'Cobb',
  // Bibb County
  macon: 'Bibb', 'payne city': 'Bibb', lizella: 'Bibb', 'dry branch': 'Bibb',
  // Hall County
  gainesville: 'Hall', oakwood: 'Hall', 'flowery branch': 'Hall', lula: 'Hall',
  clermont: 'Hall', gillsville: 'Hall', 'chestnut mountain': 'Hall',
  // Houston County
  'warner robins': 'Houston', centerville: 'Houston', perry: 'Houston',
  kathleen: 'Houston', bonaire: 'Houston', elko: 'Houston',
  // Glynn County
  brunswick: 'Glynn', 'st. simons island': 'Glynn', 'st simons island': 'Glynn',
  'sea island': 'Glynn', 'jekyll island': 'Glynn',
};

interface GAFacility {
  business_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string;
  permit_id: string;
  safetyScore: number | null;
  latestDate: string;
  latestResult: string;
  latestGrade: string;
  totalInspections: number;
  inspections: GAInspection[];
  portal_url: string;
  source: string;
}

interface GAInspection {
  inspection_id: string;
  date: string;
  score: number | null;
  grade: string;
  report_url: string;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function formatDate(dateStr: string): string {
  // Input: "July 17, 2026" → "2026-07-17"
  const m = dateStr.match(/(\w+)\s+(\d+),?\s+(\d{4})/);
  if (!m) return dateStr;
  const months: Record<string, string> = {
    January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
    July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
  };
  const month = months[m[1]];
  if (!month) return dateStr;
  return `${m[3]}-${month}-${m[2].padStart(2, '0')}`;
}

function resolveCounty(city: string): string | null {
  const key = (city || '').toLowerCase().trim();
  return CITY_TO_COUNTY[key] || null;
}

// Parse search results HTML — extract facilities with inspection histories
function parseSearchResults(html: string, county: string): GAFacility[] {
  const facilities: GAFacility[] = [];

  // Find the search results section
  const resultsIdx = html.indexOf('Search Results');
  if (resultsIdx < 0) return facilities;
  const resultsHtml = html.slice(resultsIdx);

  // Split by <strong> tags — each facility block starts with <strong>NAME (Food Service Inspections)</strong>
  const blocks = resultsHtml.split(/(?=<strong>[^<]+\(Food Service Inspections\))/i);

  for (const block of blocks) {
    // Extract facility name from <strong>NAME (Food Service Inspections)</strong>
    const nameMatch = block.match(/<strong>(.+?)\s*\(Food Service Inspections\)<\/strong>/i);
    if (!nameMatch) continue;
    const name = decodeEntities(nameMatch[1]);
    if (!name || name.length < 2) continue;

    // Extract address: street on one line, "CITY, GA ZIP" on the next
    // Format: <br>\n\t\tSTREET ADDRESS \r\nCITY, GA ZIPCODE<br>
    const addrMatch = block.match(/<\/strong><br>\s*([\s\S]*?)<br>/i);
    let address = '';
    let city = '';
    let zipCode = '';
    if (addrMatch) {
      // Split on newlines — first line is street, second is "CITY, GA ZIP"
      const lines = addrMatch[1].replace(/\t/g, '').split(/\r?\n/).map(l => decodeEntities(l).trim()).filter(Boolean);
      if (lines.length >= 2) {
        address = lines[0];
        const cityLine = lines[1];
        const cityMatch = cityLine.match(/^(.+?),?\s+GA\s+(\d{5})/);
        if (cityMatch) {
          city = cityMatch[1].trim();
          zipCode = cityMatch[2];
        } else {
          city = cityLine;
        }
      } else if (lines.length === 1) {
        address = lines[0];
        const zip = address.match(/(\d{5})/);
        zipCode = zip ? zip[1] : '';
      }
    }

    // Extract facility ID from the first inspection link
    const idMatch = block.match(/history\.cfm\?id=(\d+)/i);
    const permitId = idMatch ? idMatch[1] : '';

    // Extract inspection links
    // Format: <a href="history.cfm?id=ID&inspID=INSPID&county=COUNTY">DATE Score: SCORE, Grade: GRADE</a>
    const inspRegex = /history\.cfm\?id=(\d+)&inspID=(\d+)&county=(\w+)">([^<]+)<\/a>/gi;
    const inspections: GAInspection[] = [];
    let inspMatch;
    while ((inspMatch = inspRegex.exec(block)) !== null) {
      const text = inspMatch[4].trim();
      // Parse "July 17, 2026 Score: 92, Grade: A"
      const dateMatch = text.match(/^([\w\s,]+?)\s+Score:\s*(\d+),?\s*Grade:\s*([A-U])/i);
      if (dateMatch) {
        inspections.push({
          inspection_id: inspMatch[2],
          date: formatDate(dateMatch[1].trim()),
          score: parseInt(dateMatch[2]) || 0,
          grade: dateMatch[3].toUpperCase(),
          report_url: `${BASE_URL}/history.cfm?id=${inspMatch[1]}&inspID=${inspMatch[2]}&county=${inspMatch[3]}`,
        });
      }
    }

    // Sort inspections by date descending (most recent first)
    inspections.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (inspections.length === 0) continue;

    const latest = inspections[0];
    const latestResult = latest.score !== null
      ? `Score: ${latest.score}, Grade: ${latest.grade}`
      : 'Inspection completed';

    facilities.push({
      business_id: `ga-${permitId}`,
      name,
      address,
      city,
      state: 'GA',
      zip_code: zipCode,
      county,
      permit_id: permitId,
      safetyScore: latest.score,
      latestDate: latest.date,
      latestResult,
      latestGrade: latest.grade,
      totalInspections: inspections.length,
      inspections,
      portal_url: `${BASE_URL}/history.cfm?id=${permitId}&county=${county}`,
      source: 'georgia',
    });
  }

  return facilities;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name, city } = body;

    if (action === 'search') {
      const searchName = (name || '').trim();
      if (!searchName) return Response.json({ facilities: [] });

      // Resolve county from city
      const county = resolveCounty(city || '');
      if (!county) {
        return Response.json({ facilities: [], error: 'county_not_found' });
      }

      const searchUrl = `${BASE_URL}/search.cfm?1=1&f=s&r=name&s=${encodeURIComponent(searchName)}&inspectionType=Food&useDate=NO&county=${encodeURIComponent(county)}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SafeEats/1.0)',
          'Accept': 'text/html',
        },
      });

      if (!res.ok) {
        return Response.json({ facilities: [], error: `Search failed: ${res.status}` });
      }

      const html = await res.text();
      const facilities = parseSearchResults(html, county);

      // Filter to Food Service only and limit results
      const result = facilities.slice(0, 20).map(f => ({
        business_id: f.business_id,
        name: f.name,
        address: f.address,
        city: f.city,
        state: f.state,
        zip_code: f.zip_code,
        county: f.county,
        permit_id: f.permit_id,
        safetyScore: f.safetyScore,
        latestDate: f.latestDate,
        latestResult: f.latestResult,
        latestGrade: f.latestGrade,
        totalInspections: f.totalInspections,
        allInspections: f.inspections.map(insp => ({
          inspection_id: insp.inspection_id,
          date: insp.date,
          score: insp.score,
          grade: insp.grade,
          result: insp.score !== null ? `Score: ${insp.score}, Grade: ${insp.grade}` : '',
          report_url: insp.report_url,
        })),
        portal_url: f.portal_url,
        source: 'georgia',
      }));

      return Response.json({ facilities: result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});