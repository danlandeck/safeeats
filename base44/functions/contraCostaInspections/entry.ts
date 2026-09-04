import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Contra Costa Health — Environmental Health Division
// Food Facility Inspection Search (ASP.NET WebForms portal).
// Search and facility-detail are driven by postback flows:
//   GET  InspectionSearch.aspx        → session cookie + __VIEWSTATE
//   POST FacilityNameTB + SearchBTN   → results grid (name/address/city/placard)
//   POST __EVENTTARGET=<row link>     → facility detail + inspection history
const BASE = 'https://hsdmobile.cchealth.org/ffinspectionsearch/InspectionSearch.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const decodeEntities = (s: string): string => s
  .replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

const stripTags = (s: string): string => decodeEntities(s.replace(/<[^>]*>/g, ' '));

function sanitizeTerm(raw: string): string {
  return String(raw || '').replace(/['%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchTerms(name: string): string[] {
  const clean = sanitizeTerm(name);
  if (!clean) return [];
  const words = clean.split(' ').filter((w) => w.length >= 3);
  const byLength = [...words].sort((a, b) => b.length - a.length);
  return [clean, ...byLength.slice(0, 2)];
}

function grabHidden(html: string): Record<string, string> {
  const hidden: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/)?.[1];
    const value = m[0].match(/value="([^"]*)"/)?.[1] ?? '';
    if (name) hidden[name] = value;
  }
  return hidden;
}

async function postForm(body: Record<string, string>, cookie: string): Promise<string> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Cookie: cookie,
      Referer: BASE,
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.text();
}

function parseSearchRows(html: string): Record<string, unknown>[] {
  const facilities: Record<string, unknown>[] = [];
  for (let i = 0; i < 30; i++) {
    const name = html.match(new RegExp(`ResultsGridView_FacilityNameLBTN_${i}[^>]*>([^<]+)<`))?.[1];
    if (!name) continue;
    const address = html.match(new RegExp(`ResultsGridView_AddressLBL_${i}">([^<]*)<`))?.[1] || '';
    const city = html.match(new RegExp(`ResultsGridView_Label5a_${i}">([^<]*)<`))?.[1] || '';
    const placardTitle = html.match(new RegExp(`ResultsGridView_GradeIMG_${i}"[^>]*title="([^"]*)"`))?.[1] || '';
    facilities.push({
      rowIndex: i,
      name: decodeEntities(name),
      address: decodeEntities(address),
      city: decodeEntities(city),
      placardTitle: decodeEntities(placardTitle),
    });
  }
  return facilities;
}

function parseDetail(html: string): Record<string, unknown> {
  const placardTitle = decodeEntities(html.match(/CCCHSDFacilityCtl_GradeIMG"[^>]*title="([^"]*)"/)?.[1] || '');
  const phone = decodeEntities(html.match(/CCCHSDFacilityCtl_PhoneLBL">([^<]*)</)?.[1] || '');
  const inspections: Record<string, unknown>[] = [];
  const tblIdx = html.indexOf('InspectionsGridView');
  if (tblIdx > -1) {
    const table = html.slice(tblIdx, html.indexOf('</table>', tblIdx));
    const rowRe = /<tr[^>]*>\s*<td[^>]*>\s*<font[^>]*>\s*<b>([^<]+)<\/b>\s*<\/font>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(table))) {
      inspections.push({ date: decodeEntities(m[1]), description: stripTags(m[2]) });
    }
  }
  return { placardTitle, phone, inspections };
}

async function runSearch(term: string): Promise<{ cookie: string; facilities: Record<string, unknown>[]; html: string }> {
  const get = await fetch(BASE, { headers: { 'User-Agent': UA } });
  const getHtml = await get.text();
  const cookie = (get.headers.get('set-cookie') || '').split(';')[0];
  const html = await postForm({
    ...grabHidden(getHtml),
    'ctl00$MainContent$CCCHSDSearchCtl$FacilityNameTB': term,
    'ctl00$MainContent$CCCHSDSearchCtl$SearchBTN': 'Search',
  }, cookie);
  return { cookie, facilities: parseSearchRows(html), html };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name, rowIndex } = body;

    if (action === 'search') {
      for (const term of searchTerms(name || '')) {
        const { facilities } = await runSearch(term.toUpperCase());
        if (facilities.length > 0) return Response.json({ facilities });
      }
      return Response.json({ facilities: [] });
    }

    if (action === 'detail') {
      const term = sanitizeTerm(name || '').toUpperCase();
      if (!term) return Response.json({ inspections: [] });
      const { cookie, facilities, html } = await runSearch(term);
      // Re-running the search by the facility's own name changes the grid
      // order — locate the exact row by name before posting back.
      const matchIdx = facilities.findIndex((f) => String(f.name).toUpperCase().includes(term));
      const useRow = matchIdx > -1 ? Number(facilities[matchIdx].rowIndex) : Number(rowIndex) || 0;
      const target = `ctl00$MainContent$CCCHSDSearchCtl$ResultsGridView$ctl${String(useRow + 2).padStart(2, '0')}$FacilityNameLBTN`;
      const detailHtml = await postForm({
        ...grabHidden(html),
        __EVENTTARGET: target,
        __EVENTARGUMENT: '',
      }, cookie);
      return Response.json(parseDetail(detailHtml));
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}