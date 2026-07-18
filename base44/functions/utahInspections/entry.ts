import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://public.cdpehs.com/UTEnvPbl/VW_EST_PUBLIC/ShowVW_EST_PUBLICTablePage.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripHtml(str) {
  return decodeEntities(str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function formatDate(dateStr) {
  const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return dateStr;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function extractHiddenFields(html) {
  const fields = {};
  const patterns = [
    /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi,
    /<input[^>]*name="([^"]+)"[^>]*type="hidden"[^>]*value="([^"]*)"[^>]*>/gi,
    /<input[^>]*name="([^"]+)"[^>]*id="[^"]*"[^>]*value="([^"]*)"[^>]*type="hidden"[^>]*>/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (!fields[match[1]]) fields[match[1]] = match[2];
    }
  }
  return fields;
}

// Parse the establishment list from the table page.
// The CDP portal uses nested tables, so <tr> parsing is unreliable.
// We extract all ttc cells flat and group them in sets of 4:
// [button_cell, name, address, city] per establishment.
// The button cell is empty when stripped but contains the button HTML.
// The row index is derived from position (0, 1, 2, ...) and used to
// construct the InspButton postback target.
function parseEstablishments(html) {
  const allCells = [...html.matchAll(/<td[^>]*class="ttc"[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);

  const establishments = [];
  for (let i = 0; i + 3 < allCells.length; i += 4) {
    const buttonCell = allCells[i];
    const name = stripHtml(allCells[i + 1]);
    const address = stripHtml(allCells[i + 2]);
    const city = stripHtml(allCells[i + 3]);

    // Skip if the name is empty or too short
    if (!name || name.length < 2) continue;

    // The button cell should contain button HTML (non-empty raw, empty stripped)
    if (buttonCell.length < 50) continue;

    // Row index is position in the groups of 4
    const rowIndex = String(Math.floor(i / 4)).padStart(2, '0');

    establishments.push({ rowIndex, name, address, city });
  }

  return establishments;
}

// Parse inspection details from the detail page
function parseInspectionDetails(html) {
  const inspections = [];

  // Look for the inspection table - CDP portals typically show inspections
  // in a table with date, type, and violation counts
  const ttcCells = [...html.matchAll(/<td[^>]*class="ttc"[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
    stripHtml(m[1])
  );

  // CDP inspection detail pages show rows of: date, type, result, violations
  // Group cells into rows of ~6-8 cells
  const cellsPerRow = 6;
  for (let i = 0; i < ttcCells.length; i += cellsPerRow) {
    const row = ttcCells.slice(i, i + cellsPerRow);
    if (row.length < 3) continue;

    // Check if first cell looks like a date
    const dateMatch = row[0].match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (!dateMatch) continue;

    const date = formatDate(row[0]);
    const type = row[1] || 'Routine';
    const result = row[2] || '';

    // Try to extract violation counts
    const criticalMatch = row.find(c => c.match(/critical/i) || c.match(/^\d+$/));
    const nonCriticalMatch = row.find((c, idx) => idx > 2 && c.match(/^\d+$/));

    const critical = parseInt(row[3]) || 0;
    const nonCritical = parseInt(row[4]) || 0;

    // Score: start at 100, subtract 7 per critical, 1.5 per non-critical
    const penalty = critical * 7 + Math.round(nonCritical * 1.5);
    const score = Math.max(0, Math.min(100, 100 - penalty));

    inspections.push({
      date,
      type: type.substring(0, 50),
      result: critical === 0 && nonCritical === 0
        ? 'Pass — No violations'
        : `${critical} critical, ${nonCritical} non-critical violation(s)`,
      score,
      critical,
      nonCritical,
    });
  }

  return inspections;
}

function calculateSafetyScore(inspections) {
  if (!inspections || inspections.length === 0) return null;
  return inspections[0].score;
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
    const { action, name, city } = body;

    if (action === 'search') {
      const searchName = (name || '').trim();
      if (!searchName || searchName.length < 2) {
        return Response.json({ facilities: [], total: 0 });
      }

      // Step 1: GET the table page to get form state
      const getRes = await fetch(BASE_URL, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!getRes.ok) {
        return Response.json({ facilities: [], error: `Fetch failed: ${getRes.status}` });
      }

      const html = await getRes.text();
      const hidden = extractHiddenFields(html);
      const cookieStr = (getRes.headers.get('set-cookie') || '').split(',').map(c => c.split(';')[0]).join('; ');

      // Step 2: POST with name search to filter results server-side
      // The search button uses __doPostBack, so __EVENTTARGET must be set
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(hidden)) {
        formData.append(key, value);
      }
      formData.set('__EVENTTARGET', 'ctl00$PageContent$VW_EST_PUBLICSearchButton$_Button');
      formData.set('__EVENTARGUMENT', '');
      formData.append('ctl00$PageContent$VW_EST_PUBLICSearch', searchName);
      // Also set city filter if provided
      if (city) {
        const cityMatch = [...html.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi)]
          .find(m => m[2].trim().toUpperCase() === city.toUpperCase());
        if (cityMatch) {
          formData.append('ctl00$PageContent$PREMISE_CITYFilter', cityMatch[1]);
        }
      }

      const postRes = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Referer': BASE_URL,
          'Origin': 'https://public.cdpehs.com',
        },
        body: formData.toString(),
      });

      let searchHtml = html;
      if (postRes.ok) {
        searchHtml = await postRes.text();
      }

      // Step 3: Parse establishments from the (filtered) results
      let establishments = parseEstablishments(searchHtml);

      // Also filter client-side as a safety net
      const searchLower = searchName.toLowerCase();
      establishments = establishments.filter(e =>
        e.name.toLowerCase().includes(searchLower)
      );

      // If no results from POST search, try parsing the initial GET page
      if (establishments.length === 0) {
        establishments = parseEstablishments(html).filter(e =>
          e.name.toLowerCase().includes(searchLower)
        );
      }

      if (establishments.length === 0) {
        return Response.json({ facilities: [], total: 0 });
      }

      // Step 4: Return establishments with portal link for inspection details
      // (Detail postback requires complex ASP.NET session handling — link to portal instead)
      const results = establishments.slice(0, 15).map(e => ({
        business_id: `ut_cdp_${e.name}_${e.address}`.replace(/\s+/g, '_').toLowerCase(),
        name: e.name,
        address: e.address,
        city: e.city,
        state: 'UT',
        county: 'Salt Lake',
        source: 'utah_cdp',
        safetyScore: null,
        grade: 'U',
        totalInspections: 0,
        latestDate: null,
        latestResult: 'Inspection reports available on Salt Lake County portal',
        inspections: [],
        portal_url: BASE_URL,
      }));

      return Response.json({ facilities: results, total: results.length });
    }

    return Response.json({ error: 'Unknown action. Use action=search.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});