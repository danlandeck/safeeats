import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://hhcwebfood.hhcorp.org';

// Marion County (Indianapolis) — cities served by MCPHD portal
const MARION_CITIES = new Set([
  'indianapolis', 'speedway', 'lawrence', 'beech grove', 'southport',
  'plainfield', 'avon', 'brownsburg', 'greenwood', 'franklin',
  'carmel', 'fishers', 'noblesville', 'westfield', 'zionsville',
  'lebanon', 'danville', 'mccordsville', 'fortville', 'new palestine',
]);

interface INFacility {
  business_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  license_id: string;
  facility_type: string;
  risk: string;
  safetyScore: number | null;
  latestDate: string;
  latestResult: string;
  totalInspections: number;
  allInspections: INInspection[];
  portal_url: string;
  source: string;
}

interface INInspection {
  inspection_id: string;
  date: string;
  type: string;
  result: string;
  comment: string;
  score: number | null;
  violations: INViolation[];
}

interface INViolation {
  code: string;
  description: string;
  severity: string;
  detail: string;
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

function stripHtml(str: string): string {
  return decodeEntities(str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function isMarionCity(city: string): boolean {
  return MARION_CITIES.has((city || '').toLowerCase().trim());
}

// Calculate safety score from violations
function calcScore(violations: INViolation[]): number {
  let priority = 0, foundation = 0, core = 0;
  for (const v of violations) {
    const sev = (v.severity || '').toLowerCase();
    if (sev.includes('priority') && !sev.includes('foundation')) priority++;
    else if (sev.includes('foundation')) foundation++;
    else core++;
  }
  const penalty = priority * 7 + foundation * 4 + Math.round(core * 1.5);
  return Math.max(0, Math.min(100, 100 - penalty));
}

// Step 1: Search for establishments via AJAX API
async function searchEstablishments(searchName: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/Accela/GetEstablishment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/JSON',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${BASE_URL}/`,
      'Origin': BASE_URL,
    },
    body: JSON.stringify({ criteria: searchName }),
  });

  if (!res.ok) return [];
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Step 2: Get inspection history from the detail page (server-rendered HTML)
async function getInspectionHistory(licenseId: string, name: string): Promise<INInspection[]> {
  const url = `${BASE_URL}/Inspection/Index?id=${encodeURIComponent(licenseId)}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Referer': `${BASE_URL}/`,
    },
  });

  if (!res.ok) return [];
  const html = await res.text();

  const inspections: INInspection[] = [];

  // Parse the DataTable rows — each inspection row has cells:
  // Type | Date | Result | Comment | Actions (with Violations link)
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (!/Violations/i.test(rowHtml)) continue;

    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }

    if (cells.length < 4) continue;

    // cells[0] = type, cells[1] = date, cells[2] = result, cells[3] = comment
    const type = cells[0] || '';
    const date = cells[1] || '';
    const result = cells[2] || '';
    const comment = cells[3] || '';

    // Extract inspection ID from the Violations link
    const violMatch = rowHtml.match(/\/Violations\/Index\?id=(\d+)/i);
    const inspectionId = violMatch ? violMatch[1] : '';

    inspections.push({
      inspection_id: inspectionId,
      date,
      type,
      result,
      comment,
      score: null,
      violations: [],
    });
  }

  return inspections;
}

// Step 3: Get violation details for a specific inspection
async function getViolations(inspectionId: string, name: string, licenseId: string): Promise<INViolation[]> {
  if (!inspectionId) return [];
  const url = `${BASE_URL}/Violations/Index?id=${inspectionId}&name=${encodeURIComponent(name)}&licenseId=${encodeURIComponent(licenseId)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Referer': `${BASE_URL}/`,
    },
  });

  if (!res.ok) return [];
  const html = await res.text();

  const violations: INViolation[] = [];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (!/Priority|Core/i.test(rowHtml)) continue;

    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }

    if (cells.length < 4) continue;

    // cells[0] = code, cells[1] = description, cells[2] = severity, cells[3] = violation description
    violations.push({
      code: cells[0] || '',
      description: cells[1] || '',
      severity: cells[2] || '',
      detail: cells[3] || '',
    });
  }

  return violations;
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

      // Marion County portal only serves Indianapolis/Marion County area
      if (city && !isMarionCity(city)) {
        return Response.json({ facilities: [], error: 'county_not_found' });
      }

      // Step 1: Search for establishments
      const results = await searchEstablishments(searchName);
      if (results.length === 0) return Response.json({ facilities: [] });

      // Limit to first 15 results to avoid too many detail fetches
      const limited = results.slice(0, 15);

      // Step 2: Get inspection history for each establishment
      const facilities: INFacility[] = [];
      for (const est of limited) {
        const licenseId = est.ID || '';
        const estName = est.Name || '';

        const inspections = await getInspectionHistory(licenseId, estName);
        if (inspections.length === 0) continue;

        // Step 3: Get violations for the latest 2 inspections (for scoring)
        for (let i = 0; i < Math.min(2, inspections.length); i++) {
          const violations = await getViolations(
            inspections[i].inspection_id, estName, licenseId
          );
          inspections[i].violations = violations;
          inspections[i].score = violations.length > 0 ? calcScore(violations) : 95;
        }

        // For remaining inspections without violation fetches, estimate score from result
        for (let i = 2; i < inspections.length; i++) {
          const isInCompliance = /in compliance/i.test(inspections[i].result);
          inspections[i].score = isInCompliance ? 95 : 55;
        }

        const latest = inspections[0];
        const safetyScore = latest.score ?? null;

        facilities.push({
          business_id: `in-marion-${licenseId}`,
          name: estName,
          address: est.Address || '',
          city: est.City || 'Indianapolis',
          state: 'IN',
          zip_code: est.Zip_Code || '',
          license_id: licenseId,
          facility_type: est.Type || '',
          risk: est.Risk || '',
          safetyScore,
          latestDate: latest.date,
          latestResult: latest.result,
          totalInspections: inspections.length,
          allInspections: inspections,
          portal_url: `${BASE_URL}/Inspection/Index?id=${encodeURIComponent(licenseId)}&name=${encodeURIComponent(estName)}`,
          source: 'indiana_marion',
        });
      }

      return Response.json({ facilities });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});