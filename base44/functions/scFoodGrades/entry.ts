import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://apps.dhec.sc.gov/Environment/FoodGrades/';
const RATE_URL = BASE_URL + 'rate.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseGradeToScore(grade) {
  if (!grade) return null;
  const g = grade.toUpperCase().trim();
  if (g === 'A') return 95;
  if (g === 'B') return 82;
  if (g === 'C') return 72;
  return null;
}

function gradeFromScore(score) {
  if (score === null) return 'U';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function parseRateHtml(html) {
  // The HTML table rows often lack closing </tr> tags, so split on <tr
  // Each data row starts with <tr valign='top'>
  const rowSplit = html.split(/<tr\s+valign='top'>/i);
  const records = [];

  for (let i = 1; i < rowSplit.length; i++) {
    const rowContent = rowSplit[i].split(/<tr/i)[0]; // stop at next row
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const cellText = cellMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .trim();
      cells.push(cellText);
    }

    if (cells.length >= 6 && cells[0]) {
      const pdfMatch = rowContent.match(/href='([^']*\.pdf[^']*)'/i);
      records.push({
        name: cells[0],
        address: cells[1],
        city: cells[2],
        grade: cells[3],
        date: cells[4],
        type: cells[5],
        pdfUrl: pdfMatch ? pdfMatch[1] : null,
      });
    }
  }
  return records;
}

function groupByFacility(records) {
  const map = new Map();
  for (const r of records) {
    const key = `${r.name}|${r.address}|${r.city}`.toUpperCase();
    if (!map.has(key)) {
      map.set(key, {
        name: r.name,
        address: r.address,
        city: r.city,
        inspections: [],
      });
    }
    map.get(key).inspections.push({
      date: r.date,
      grade: r.grade,
      type: r.type,
      pdfUrl: r.pdfUrl,
    });
  }

  const facilities = [];
  for (const f of map.values()) {
    // Sort inspections by date descending
    f.inspections.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      return db - da;
    });

    const latestGrade = f.inspections[0]?.grade || '';
    const safetyScore = parseGradeToScore(latestGrade);

    facilities.push({
      business_id: `sc_${f.name}_${f.address}`.replace(/\s+/g, '_').toLowerCase(),
      name: f.name,
      address: f.address,
      city: f.city,
      state: 'SC',
      source: 'sc_food_grades',
      safetyScore,
      grade: latestGrade || gradeFromScore(safetyScore),
      totalInspections: f.inspections.length,
      latestDate: f.inspections[0]?.date || null,
      latestResult: latestGrade ? `Grade ${latestGrade}` : 'Unknown',
      inspections: f.inspections.map(i => ({
        date: i.date,
        grade: i.grade,
        type: i.type,
        result: `Grade ${i.grade}`,
      })),
    });
  }
  return facilities;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, establishmentName, county, city } = body;

    if (action === 'search') {
      // Step 1: GET main page for cookies
      const initRes = await fetch(BASE_URL, {
        headers: { 'User-Agent': UA },
      });
      const cookies = initRes.headers.get('set-cookie') || '';
      const cookieStr = cookies.split(',').map(c => c.split(';')[0]).join('; ');

      // Step 2: Call AJAX endpoint
      const params = new URLSearchParams();
      params.set('fn', establishmentName || '');
      if (county) params.set('cy', county);
      if (city) params.set('ct', city);

      const rateRes = await fetch(`${RATE_URL}?${params.toString()}`, {
        headers: {
          'User-Agent': UA,
          'Cookie': cookieStr,
          'Referer': BASE_URL,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const rateHtml = await rateRes.text();
      const records = parseRateHtml(rateHtml);

      // Filter by city if provided
      const filtered = city
        ? records.filter(r => r.city.toUpperCase().includes(city.toUpperCase()))
        : records;

      const facilities = groupByFacility(filtered);

      return Response.json({ facilities, total: facilities.length });
    }

    return Response.json({ error: 'Unknown action. Use action=search.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});