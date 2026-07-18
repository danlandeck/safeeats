import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://public.cdpehs.com/ILENVPBL/ESTABLISHMENT/ShowESTABLISHMENTTablePage.aspx';

// City → County code mapping for Illinois CDP portal.
// Each county has an encrypted ESTTST_CTY parameter value.
const CITY_TO_COUNTY: Record<string, { code: string; county: string }> = {
  // Sangamon County (Springfield)
  springfield: { code: 'sJRNEgWYzzs=', county: 'Sangamon' },
  // Madison County (Granite City, Alton, Edwardsville, Collinsville, Highland, Troy, Glen Carbon)
  'granite city': { code: '+/DlrHDHYEY=', county: 'Madison' },
  alton: { code: '+/DlrHDHYEY=', county: 'Madison' },
  edwardsville: { code: '+/DlrHDHYEY=', county: 'Madison' },
  collinsville: { code: '+/DlrHDHYEY=', county: 'Madison' },
  highland: { code: '+/DlrHDHYEY=', county: 'Madison' },
  troy: { code: '+/DlrHDHYEY=', county: 'Madison' },
  'glen carbon': { code: '+/DlrHDHYEY=', county: 'Madison' },
  madison: { code: '+/DlrHDHYEY=', county: 'Madison' },
  // Peoria County
  peoria: { code: 'asgGk3ztR6c=', county: 'Peoria' },
  bartonville: { code: 'asgGk3ztR6c=', county: 'Peoria' },
  bellevue: { code: 'asgGk3ztR6c=', county: 'Peoria' },
  chillicothe: { code: 'asgGk3ztR6c=', county: 'Peoria' },
  elmwood: { code: 'asgGk3ztR6c=', county: 'Peoria' },
  // Whiteside County (Sterling, Rock Falls)
  sterling: { code: 'CgZaukZQ3Fo=', county: 'Whiteside' },
  'rock falls': { code: 'CgZaukZQ3Fo=', county: 'Whiteside' },
  rockfalls: { code: 'CgZaukZQ3Fo=', county: 'Whiteside' },
  morrison: { code: 'CgZaukZQ3Fo=', county: 'Whiteside' },
  fulton: { code: 'CgZaukZQ3Fo=', county: 'Whiteside' },
  // McLean County (Bloomington, Normal)
  bloomington: { code: 'a0ov9k8JLuw=', county: 'McLean' },
  normal: { code: 'a0ov9k8JLuw=', county: 'McLean' },
  lexington: { code: 'a0ov9k8JLuw=', county: 'McLean' },
  leroy: { code: 'a0ov9k8JLuw=', county: 'McLean' },
  // Christian County (Taylorville)
  taylorville: { code: 'tMFw8hgrsgs=', county: 'Christian' },
  pana: { code: 'tMFw8hgrsgs=', county: 'Christian' },
  rosamond: { code: 'tMFw8hgrsgs=', county: 'Christian' },
  assumption: { code: 'tMFw8hgrsgs=', county: 'Christian' },
  moweaqua: { code: 'tMFw8hgrsgs=', county: 'Christian' },
};

interface ILFacility {
  business_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string;
  safetyScore: number | null;
  latestDate: string;
  latestResult: string;
  totalInspections: number;
  allInspections: ILInspection[];
  portal_url: string;
  source: string;
}

interface ILInspection {
  date: string;
  type: string;
  result: string;
  score: number | null;
  riskFactor: number;
  goodRetail: number;
  repeatViolations: number;
  detail_url: string;
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

function formatDate(dateStr: string): string {
  const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return dateStr;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function resolveCounty(city: string): { code: string; county: string } | null {
  const key = (city || '').toLowerCase().trim();
  return CITY_TO_COUNTY[key] || null;
}

function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi;
  const fieldRegex2 = /<input[^>]*name="([^"]+)"[^>]*type="hidden"[^>]*value="([^"]*)"[^>]*>/gi;
  let match;
  while ((match = fieldRegex.exec(html)) !== null) {
    fields[match[1]] = match[2];
  }
  while ((match = fieldRegex2.exec(html)) !== null) {
    if (!fields[match[1]]) fields[match[1]] = match[2];
  }
  return fields;
}

function parseResultsTable(html: string, county: string): ILFacility[] {
  const facilities: Record<string, ILFacility> = {};
  const allInspections: Record<string, ILInspection[]> = {};

  // The CDP portal renders each inspection row with a "Details" link inside a
  // nested table, followed by 8 <td class="ttc"> cells:
  // date, estNumber+name, address+city/state/zip, inspType+estType, inspector,
  // #repeat, #riskFactor, #goodRetail
  // We split on the Details link pattern and parse the cells that follow.
  const blockRegex = /ViewDetailsButton[\s\S]*?<\/table><\/td>([\s\S]*?)<\/tr>/gi;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const blockHtml = blockMatch[1];

    // Extract all <td class="ttc"> cells from this block
    const cells: string[] = [];
    const cellRegex = /<td[^>]*class="ttc"[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(blockHtml)) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }

    if (cells.length < 5) continue;

    // cells[0] = date, cells[1] = estNumber+name, cells[2] = address+city/state/zip,
    // cells[3] = inspType+estType, cells[4] = inspector,
    // cells[5] = #repeat, cells[6] = #riskFactor, cells[7] = #goodRetail
    const date = formatDate(cells[0]);
    if (!date || date === cells[0]) continue;

    const estRaw = cells[1];
    const estMatch = estRaw.match(/^([\d\-]+)\s+(.+)$/);
    const estNumber = estMatch ? estMatch[1] : '';
    const name = estMatch ? estMatch[2].trim() : estRaw.trim();
    if (!name) continue;

    const addrRaw = cells[2];
    const addrMatch = addrRaw.match(/^(.+)\s+([A-Za-z][A-Za-z\s]*?)\s+IL\s+(\d{5}(?:-\d{4})?)/);
    let address = '';
    let city = '';
    let zipCode = '';
    if (addrMatch) {
      address = addrMatch[1].trim();
      city = addrMatch[2].trim();
      zipCode = addrMatch[3];
    } else {
      address = addrRaw;
    }

    const typeRaw = cells[3] || '';
    const inspectionType = typeRaw.split(/\n/)[0].trim() || typeRaw;

    const repeatViolations = parseInt(cells[5]) || 0;
    const riskFactor = parseInt(cells[6]) || 0;
    const goodRetail = parseInt(cells[7]) || 0;

    const penalty = riskFactor * 7 + Math.round(goodRetail * 1.5) + repeatViolations * 3;
    const score = Math.max(0, Math.min(100, 100 - penalty));

    const result = riskFactor === 0 && goodRetail === 0
      ? 'Pass — No violations'
      : riskFactor > 0
        ? `${riskFactor} risk factor, ${goodRetail} good retail practice violation(s)`
        : `${goodRetail} good retail practice violation(s)`;

    const businessId = `il-cdp-${estNumber || name}`;

    if (!facilities[businessId]) {
      facilities[businessId] = {
        business_id: businessId,
        name,
        address,
        city,
        state: 'IL',
        zip_code: zipCode,
        county,
        safetyScore: null,
        latestDate: '',
        latestResult: '',
        totalInspections: 0,
        allInspections: [],
        portal_url: `${BASE_URL}?ESTTST_CTY=${county}`,
        source: 'illinois_cdp',
      };
      allInspections[businessId] = [];
    }

    allInspections[businessId].push({
      date,
      type: inspectionType,
      result,
      score,
      riskFactor,
      goodRetail,
      repeatViolations,
      detail_url: '',
    });
  }

  for (const [id, inspections] of Object.entries(allInspections)) {
    inspections.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latest = inspections[0];
    facilities[id].allInspections = inspections;
    facilities[id].safetyScore = latest?.score ?? null;
    facilities[id].latestDate = latest?.date || '';
    facilities[id].latestResult = latest?.result || '';
    facilities[id].totalInspections = inspections.length;
  }

  return Object.values(facilities);
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

      const countyInfo = resolveCounty(city || '');
      if (!countyInfo) {
        return Response.json({ facilities: [], error: 'county_not_found' });
      }

      const initialUrl = `${BASE_URL}?ESTTST_CTY=${encodeURIComponent(countyInfo.code)}`;

      const getRes = await fetch(initialUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!getRes.ok) {
        return Response.json({ facilities: [], error: `Initial fetch failed: ${getRes.status}` });
      }

      const html = await getRes.text();

      // Try POST with search parameters
      const hiddenFields = extractHiddenFields(html);
      const nameInputMatch = html.match(/Establishment Name Containing[\s\S]*?<input[^>]*name="([^"]+)"/i) ||
        html.match(/<input[^>]*name="([^"]*[Ee]st[A-Za-z]*[Nn]ame[^"]*)"/i);
      const nameField = nameInputMatch ? nameInputMatch[1] : '';

      if (nameField) {
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(hiddenFields)) {
          formData.append(key, value);
        }
        formData.append(nameField, searchName);
        formData.append('__EVENTTARGET', '');
        formData.append('__EVENTARGUMENT', '');

        const postRes = await fetch(initialUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': initialUrl,
            'Origin': 'https://public.cdpehs.com',
          },
          body: formData.toString(),
        });

        if (postRes.ok) {
          const postHtml = await postRes.text();
          const facilities = parseResultsTable(postHtml, countyInfo.county);
          if (facilities.length > 0) {
            const filtered = facilities.filter(f =>
              f.name.toLowerCase().includes(searchName.toLowerCase())
            );
            return Response.json({ facilities: (filtered.length > 0 ? filtered : facilities).slice(0, 20) });
          }
        }
      }

      // Fallback: parse the initial GET results and filter by name
      const facilities = parseResultsTable(html, countyInfo.county);
      const filtered = facilities.filter(f =>
        f.name.toLowerCase().includes(searchName.toLowerCase())
      );

      return Response.json({ facilities: (filtered.length > 0 ? filtered : facilities).slice(0, 20) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});