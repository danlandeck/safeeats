import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const STATE_CONFIG = {
  sd: {
    baseUrl: 'https://sddoh.safefoodinspection.com/Inspection/PublicInspectionSearch.aspx',
    source: 'sd_safefood',
    stateCode: 'SD',
    stateName: 'South Dakota',
  },
  vt: {
    baseUrl: 'https://vtdoh.safefoodinspection.com/Inspection/PublicInspectionSearch.aspx',
    source: 'vt_safefood',
    stateCode: 'VT',
    stateName: 'Vermont',
  },
  wy: {
    baseUrl: 'https://wda.safefoodinspection.com/Inspection/PublicInspectionSearch.aspx',
    source: 'wy_safefood',
    stateCode: 'WY',
    stateName: 'Wyoming',
  },
};

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .trim();
}

function stripTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
}

function extractHiddenFields(html) {
  const fields = {};
  const patterns = [
    /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/gi,
    /<input[^>]*name="([^"]+)"[^>]*type="hidden"[^>]*value="([^"]*)"[^>]*>/gi,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(html)) !== null) {
      if (!fields[m[1]]) fields[m[1]] = m[2];
    }
  }
  return fields;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return dateStr;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

function parseScore(rawScore) {
  if (!rawScore) return { score: null, grade: 'U' };
  const trimmed = rawScore.trim();
  // WY uses "In" / "Out" compliance
  if (/^in$/i.test(trimmed)) return { score: 100, grade: 'P' };
  if (/^out$/i.test(trimmed)) return { score: 50, grade: 'C' };
  const num = parseInt(trimmed, 10);
  if (isNaN(num)) return { score: null, grade: 'U' };
  let grade = 'U';
  if (num >= 90) grade = 'A';
  else if (num >= 80) grade = 'B';
  else if (num >= 70) grade = 'C';
  else if (num >= 60) grade = 'D';
  else grade = 'F';
  return { score: num, grade };
}

function parseGridView(html) {
  const facilities = [];

  // Find the main GridView
  const gvStart = html.indexOf('id="MainContent_gvInspections"');
  if (gvStart === -1) return facilities;

  // Find all data rows - rows that contain establishment names
  // Each data row starts with a <tr> containing the establishment name in the first cell
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let currentFacility = null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Check if this is a main establishment row (has the name + address pattern)
    const nameMatch = rowHtml.match(/^[\s\S]*?<td[^>]*>\s*([\s\S]*?)<BR>\s*<div[^>]*>([\s\S]*?)<\/div>\s*(?:<div[^>]*>([\s\S]*?)<\/div>)?\s*<\/td>/i);

    if (nameMatch) {
      // Save previous facility
      if (currentFacility) facilities.push(currentFacility);

      const name = stripTags(nameMatch[1]);
      // Preserve original spacing for address — don't use stripTags (collapses spaces)
      const addressLine = decodeHtmlEntities(nameMatch[2].replace(/<[^>]*>/g, '').trim());
      const phoneLine = nameMatch[3] ? stripTags(nameMatch[3]) : '';

      // Parse address: "410 E Hwy 38   Hartford, SD 57033"
      // Strategy: find "STATE ZIP" at end via comma, split street/city on multi-space gap
      let address = '', city = '', stateCode = '', zip = '';
      const commaIdx = addressLine.lastIndexOf(',');
      if (commaIdx > -1) {
        const afterComma = addressLine.substring(commaIdx + 1).trim();
        const stateZip = afterComma.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)?$/);
        if (stateZip) {
          stateCode = stateZip[1];
          zip = stateZip[2] || '';
          const beforeComma = addressLine.substring(0, commaIdx).trim();
          // Split on 2+ spaces — street is before, city is after
          const multiSpace = beforeComma.split(/\s{2,}/);
          if (multiSpace.length >= 2) {
            address = multiSpace[0].trim();
            city = multiSpace.slice(1).join(' ').trim();
          } else {
            address = beforeComma;
          }
        } else {
          address = addressLine;
        }
      } else {
        address = addressLine;
      }

      // Extract the other cells
      const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
      // Cells: 0=name, 1=date, 2=type, 3=score, 4=jurisdiction, 5=violations, 6=past inspections
      const latestDate = cells[1] ? formatDate(stripTags(cells[1])) : null;
      const inspectionType = cells[2] ? stripTags(cells[2]) : '';
      const rawScore = cells[3] ? stripTags(cells[3]) : '';
      const { score, grade } = parseScore(rawScore);
      const violationText = cells[5] ? stripTags(cells[5]) : '';
      const violationCount = parseInt((violationText.match(/(\d+)/) || [])[1] || '0', 10);

      currentFacility = {
        name,
        address,
        city,
        state: stateCode,
        zip_code: zip,
        phone: phoneLine,
        latestDate,
        latestType: inspectionType,
        safetyScore: score,
        grade,
        violationCount,
        inspections: [{
          date: latestDate,
          type: inspectionType,
          score: rawScore,
          violationCount,
        }],
      };
    } else if (currentFacility) {
      // Check if this is a past inspection row (has date + type + violations)
      const pastMatch = rowHtml.match(/<td[^>]*>\s*(\d{2}\/\d{2}\/\d{4})[\s\S]*?<\/td>/i);
      if (pastMatch) {
        const pastCells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
        if (pastCells.length >= 2) {
          const pastDate = formatDate(stripTags(pastCells[0]));
          const pastType = stripTags(pastCells[1] || '');
          const pastViolations = pastCells[2] ? stripTags(pastCells[2]) : '';
          const pastViolationCount = parseInt((pastViolations.match(/(\d+)/) || [])[1] || '0', 10);

          if (pastDate && pastDate !== currentFacility.latestDate) {
            currentFacility.inspections.push({
              date: pastDate,
              type: pastType,
              violationCount: pastViolationCount,
            });
          }
        }
      }
    }
  }

  // Save last facility
  if (currentFacility) facilities.push(currentFacility);

  // Deduplicate by name + address
  const seen = new Set();
  return facilities.filter(f => {
    const key = `${f.name}|${f.address}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePageLinks(html) {
  // Find pagination links like Page$2, Page$3, etc.
  const links = [...html.matchAll(/__doPostBack\(&#39;ctl00\$MainContent\$gvInspections&#39;,&#39;Page\$(\d+)&#39;\)/gi)];
  const pageNumbers = links.map(m => parseInt(m[1], 10)).filter(n => n > 1);
  return [...new Set(pageNumbers)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { state, action, name, facilityId } = body;

    const config = STATE_CONFIG[(state || 'sd').toLowerCase()];
    if (!config) return Response.json({ error: 'Invalid state' }, { status: 400 });

    if (action === 'search') {
      if (!name || name.trim().length < 2) {
        return Response.json({ facilities: [], total: 0 });
      }

      // Step 1: GET search page
      const getRes = await fetch(config.baseUrl, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      });
      const searchHtml = await getRes.text();
      const cookieStr = (getRes.headers.get('set-cookie') || '')
        .split(',')
        .map(c => c.split(';')[0])
        .join('; ');

      const fields = extractHiddenFields(searchHtml);

      // Step 2: POST search
      const formData = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) formData.append(k, v);
      formData.append('ctl00$MainContent$txtEstablistmentName', name.trim());
      formData.append('ctl00$MainContent$btnSearch', 'Search');

      const postRes = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Referer': config.baseUrl,
        },
        body: formData.toString(),
      });
      const resultHtml = await postRes.text();

      let facilities = parseGridView(resultHtml);

      // Step 3: Handle pagination (get pages 2, 3, etc.)
      const pageNumbers = parsePageLinks(resultHtml);
      const currentFields = extractHiddenFields(resultHtml);

      for (const pageNum of pageNumbers.slice(0, 3)) { // Limit to 3 additional pages
        const pageFormData = new URLSearchParams();
        for (const [k, v] of Object.entries(currentFields)) pageFormData.append(k, v);
        pageFormData.set('__EVENTTARGET', 'ctl00$MainContent$gvInspections');
        pageFormData.set('__EVENTARGUMENT', `Page$${pageNum}`);

        try {
          const pageRes = await fetch(config.baseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': UA,
              'Cookie': cookieStr,
              'Referer': config.baseUrl,
            },
            body: pageFormData.toString(),
          });
          const pageHtml = await pageRes.text();
          const pageFacilities = parseGridView(pageHtml);
          facilities.push(...pageFacilities);
        } catch (e) {
          // Continue on page error
        }
      }

      // Assign business_id and source
      facilities = facilities.map((f, i) => ({
        ...f,
        business_id: `${config.source}_${i}_${Date.now()}`,
        source: config.source,
        county_id: config.stateCode.toLowerCase(),
        totalInspections: f.inspections.length,
        latestResult: f.grade === 'P' ? 'Pass' : (f.safetyScore !== null ? `${f.safetyScore}/100` : 'Unknown'),
      }));

      return Response.json({
        facilities,
        total: facilities.length,
      });
    }

    if (action === 'detail') {
      // For detail, we re-search and find the matching facility
      if (!name) return Response.json({ error: 'Facility name required for detail' }, { status: 400 });

      // Re-run search to get inspection history
      const getRes = await fetch(config.baseUrl, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      });
      const searchHtml = await getRes.text();
      const cookieStr = (getRes.headers.get('set-cookie') || '')
        .split(',')
        .map(c => c.split(';')[0])
        .join('; ');

      const fields = extractHiddenFields(searchHtml);
      const formData = new URLSearchParams();
      for (const [k, v] of Object.entries(fields)) formData.append(k, v);
      formData.append('ctl00$MainContent$txtEstablistmentName', name.trim());
      formData.append('ctl00$MainContent$btnSearch', 'Search');

      const postRes = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Referer': config.baseUrl,
        },
        body: formData.toString(),
      });
      const resultHtml = await postRes.text();
      const facilities = parseGridView(resultHtml);

      // Find matching facility by name
      const match = facilities.find(f =>
        f.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(f.name.toLowerCase())
      );

      if (!match) return Response.json({ error: 'Facility not found' }, { status: 404 });

      return Response.json({
        facility: {
          ...match,
          business_id: facilityId || `${config.source}_detail_${Date.now()}`,
          source: config.source,
          county_id: config.stateCode.toLowerCase(),
          totalInspections: match.inspections.length,
        },
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});