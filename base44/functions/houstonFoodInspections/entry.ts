import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Houston Health Department — Tyler Technologies "Digital Health Department" portal.
// Replaces the retired/frozen City of Houston CKAN dataset (7ee330a8-22ac-4300-b163-8a5ef72e3157).
// Flow: GET search.cfm (session cookie) → POST name search → parse facility/inspection
// rows → fetch each inspection's detail page (q=d&f=...&i=...) for violation counts.
const BASE = 'https://houston-tx.healthinspections.us/media';
const UA = 'Mozilla/5.0 (compatible; SafeEats/1.0)';

interface Violation { code: string; description: string; }
interface InspDetail {
  inspectionId: string;
  dateISO: string;
  activity: string;
  permitStatus: string;
  violationCount: number;
  violations: Violation[];
}
interface SearchRow { f: string; i: string; name: string; street: string; city: string; zip: string; dateISO: string; }

function decodeEntities(str: string): string {
  return str
    .replace(/\\'/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function todayMMDD(): string {
  const d = new Date();
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

function isoFromMMDD(s: string): string {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${pad(Number(m[1]))}-${pad(Number(m[2]))}` : s;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getSession(): Promise<string> {
  const res = await fetch(`${BASE}/search.cfm`, { headers: { 'User-Agent': UA } });
  const cookies = (res.headers as any).getSetCookie?.() ?? [];
  return (cookies as string[]).map((c: string) => c.split(';')[0]).join('; ');
}

async function postNameSearch(name: string, cookie: string): Promise<string> {
  const sd = '01/01/2023';
  const ed = todayMMDD();
  const params = new URLSearchParams();
  params.append('q', 's');
  params.append('e', name);
  params.append('k', '');
  params.append('r', '');
  params.append('sd', sd);
  params.append('ed', ed);
  params.append('tp', 'ALL');
  params.append('sd_month', '01'); params.append('sd_day', '01'); params.append('sd_year', '2023');
  const [em, edy, edyr] = ed.split('/');
  params.append('ed_month', em); params.append('ed_day', edy); params.append('ed_year', edyr);
  params.append('z', 'ALL');
  params.append('m', 'LIKE');
  params.append('maxrows', '50');
  params.append('Submit', 'Search');
  const res = await fetch(`${BASE}/search.cfm?q=s`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      'Cookie': cookie,
      'Referer': `${BASE}/search.cfm`,
    },
    body: params.toString(),
  });
  return res.text();
}

// Search results: one <tr> per inspection event. The facility cell holds the
// detail link (q=d&f=...&i=...), the establishment name and the full address.
function parseSearchRows(html: string): SearchRow[] {
  const rows: SearchRow[] = [];
  const rowRe = /<a href="search\.cfm\?q=d&(f=[^&"]+)&(i=[^&"]+)[^"]*">([^<]+)<\/a>\s*<br>\s*([^<]+?)\s*<\/td>\s*<td class="ge_tableData"[^>]*>\s*([^<]*?)\s*<\/td>\s*<td class="ge_tableData"[^>]*>\s*(\d{2}\/\d{2}\/\d{4})\s*<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const addr = decodeEntities(m[4].replace(/\s+/g, ' '));
    // "716 KINGWOOD DR HOUSTON TX, 77339"
    const am = addr.match(/^(.+?)\s+([A-Za-z][A-Za-z .]*?)\s+TX,\s*(\d{5})$/);
    const name = decodeEntities(m[3].replace(/\s+/g, ' '));
    if (!name || name.length < 2) continue;
    rows.push({
      f: decodeURIComponent(m[1].slice(2)),
      i: decodeURIComponent(m[2].slice(2)),
      name,
      street: am ? am[1].trim() : addr,
      city: am ? titleCase(am[2].trim()) : 'Houston',
      zip: am ? am[3] : '',
      dateISO: isoFromMMDD(m[6]),
    });
  }
  return rows;
}

// Detail page (q=d&f=...&i=...): the inspection's date/activity plus a
// checklist table where failed items have Status "Violation".
async function fetchInspectionDetail(cookie: string, f: string, i: string): Promise<InspDetail | null> {
  try {
    const url = `${BASE}/search.cfm?q=d&f=${encodeURIComponent(f)}&i=${encodeURIComponent(i)}&sd=01/01/2023&ed=${todayMMDD()}&z=ALL&m=LIKE&maxrows=500&e=&tp=ALL`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Cookie': cookie, 'Referer': `${BASE}/search.cfm` },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const rowMatch = html.match(/<td class="ge_tableData" align="center" width="120">(\d{2}\/\d{2}\/\d{4})<\/td>\s*<td class="ge_tableData" align="center" width="120">([^<]*)<\/td>\s*<td class="ge_tableData" align="center" width="90">([^<]*)<\/td>\s*<td class="ge_tableData" align="center">([^<]*)<\/td>/i);
    if (!rowMatch) return null;
    const violations: Violation[] = [];
    const vioRe = /<a href="#" onMouseover="ddrivetip\('((?:[^'\\]|\\.)*)'[^>]*>([^<]*)<\/a>\s*<\/td>\s*<td class="ge_tableData" align="center" width="130">\s*(Violation)\s*<\/td>/gi;
    let v: RegExpExecArray | null;
    while ((v = vioRe.exec(html)) !== null) {
      const code = decodeEntities(v[2].replace(/\s+/g, ' '));
      const description = decodeEntities(v[1].replace(/\s+/g, ' '));
      violations.push({ code, description });
    }
    return {
      inspectionId: i,
      dateISO: isoFromMMDD(rowMatch[1]),
      activity: rowMatch[4].trim(),
      permitStatus: rowMatch[3].trim(),
      violationCount: violations.length,
      violations,
    };
  } catch {
    return null;
  }
}

function resultLabel(count: number): string {
  return count === 0 ? 'Pass' : `${count} violation${count > 1 ? 's' : ''}`;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action, name, facilityAccountNumber, inspections } = body;

    if (action === 'search') {
      const searchName = (name || '').trim();
      if (!searchName) return Response.json({ records: [] });
      const cookie = await getSession();
      const html = await postNameSearch(searchName, cookie);
      if (/No records found/i.test(html)) return Response.json({ records: [] });
      const rows = parseSearchRows(html);
      if (rows.length === 0) return Response.json({ records: [] });

      // Group inspection rows by facility (dedupe by inspection GUID).
      const facilities: { f: string; name: string; street: string; city: string; zip: string; insps: SearchRow[] }[] = [];
      for (const row of rows) {
        let fac = facilities.find((x) => x.f === row.f);
        if (!fac) {
          fac = { f: row.f, name: row.name, street: row.street, city: row.city, zip: row.zip, insps: [] };
          facilities.push(fac);
        }
        if (!fac.insps.some((x) => x.i === row.i)) fac.insps.push(row);
      }
      const topFacilities = facilities.slice(0, 10);

      // Enrich inspections with violation counts (latest first, cap total fetches).
      type Task = { fac: (typeof topFacilities)[number]; row: SearchRow };
      const tasks: Task[] = [];
      for (const fac of topFacilities) {
        const sorted = [...fac.insps].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
        for (const row of sorted) {
          if (tasks.length >= 12) break;
          tasks.push({ fac, row });
        }
      }
      const details = new Map<string, InspDetail>();
      await Promise.all(tasks.map(async (t) => {
        const d = await fetchInspectionDetail(cookie, t.fac.f, t.row.i);
        if (d) details.set(t.row.i, d);
      }));

      const records: Record<string, string>[] = [];
      for (const fac of topFacilities) {
        for (const insp of fac.insps) {
          const d = details.get(insp.i);
          records.push({
            FacilityAccountNumber: fac.f,
            FacilityName: fac.name,
            FacilityFullStreetAddress: fac.street,
            FacilityCity: fac.city,
            FacilityZip: fac.zip,
            FacilityPhone: '',
            EstablishmentType: '',
            Cuisine: '',
            InspectionDate: d ? d.dateISO : insp.dateISO,
            InspectionUID: insp.i,
            InspectionScore: d ? String(d.violationCount) : '',
            InspectionStatus: d ? resultLabel(d.violationCount) : '',
            InspectionType: d ? d.activity : '',
            InspectionComments: d ? d.violations.map((v) => (v.description ? `${v.code} — ${v.description}` : v.code)).join('; ').slice(0, 1000) : '',
          });
        }
      }
      return Response.json({ records });
    }

    if (action === 'detail') {
      const f = String(facilityAccountNumber || '');
      const serials: string[] = (Array.isArray(inspections) ? inspections : [])
        .map((s: any) => (typeof s === 'string' ? s : s?.serial))
        .filter(Boolean)
        .slice(0, 12);
      if (!f || serials.length === 0) return Response.json({ records: [] });
      const cookie = await getSession();
      const details = await Promise.all(serials.map((s) => fetchInspectionDetail(cookie, f, s)));
      const records = details.filter((d): d is InspDetail => d !== null).map((d) => ({
        InspectionDate: d.dateISO,
        InspectionUID: d.inspectionId,
        InspectionScore: String(d.violationCount),
        InspectionStatus: resultLabel(d.violationCount),
        InspectionType: d.activity,
        InspectionComments: d.violations.map((v) => (v.description ? `${v.code} — ${v.description}` : v.code)).join('; ').slice(0, 1000),
      }));
      return Response.json({ records });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}