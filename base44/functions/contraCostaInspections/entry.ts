import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sanitizeForLike as sanitizeTerm, searchTerms } from '../../shared/portalQuery.ts';

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

const stripTags = (s: string): string => decodeEntities(s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]*>/g, ' '));

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
      address: decodeEntities(address).replace(/,\s*$/, ''),
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
  const gridIdx = html.indexOf('CCCHSDFacilityInspectionsCtl_InspectionsGridView"');
  if (gridIdx > -1) {
    // Each inspection row is: <td valign="top" style="font-weight:bold;">MM/DD/YYYY</td>
    // followed by a details cell that embeds a nested violations table — so
    // split on the date cells rather than slicing to the first </table>.
    const grid = html.slice(gridIdx, gridIdx + 60000);
    const parts = grid.split(/<td valign="top" style="font-weight:bold;">(\d{2}\/\d{2}\/\d{4})<\/td>/);
    for (let i = 1; i < parts.length - 1; i += 2) {
      const date = decodeEntities(parts[i]);
      const chunk = parts[i + 1] || '';
      const type = decodeEntities(chunk.match(/Label1_\d+"[^>]*>([^<]*)</)?.[1] || '').trim();
      // The final chunk runs to the end of the slice and picks up the page
      // footer — cut at the "Search Again" button that follows the grid.
      let text = stripTags(chunk);
      const cutIdx = text.indexOf('Search Again');
      if (cutIdx > -1) text = text.slice(0, cutIdx);
      inspections.push({ date, type, description: text });
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
      const facilityName = sanitizeTerm(name || '').toUpperCase();
      if (!facilityName) return Response.json({ placardTitle: '', phone: '', inspections: [] });
      // The portal's stored names can differ from its displayed names (e.g.
      // "8 MOOSE PIZZA" vs "8MOOSE PIZZA"), so a whole-name search may miss.
      // Walk the search terms until one yields a grid containing this facility,
      // then locate its row and post back to open the detail page.
      for (const term of searchTerms(facilityName)) {
        const { cookie, facilities, html } = await runSearch(term.toUpperCase());
        const match = facilities.find((f) => String(f.name).toUpperCase() === facilityName)
          || facilities.find((f) => String(f.name).toUpperCase().includes(facilityName))
          || facilities.find((f) => facilityName.includes(String(f.name).toUpperCase()));
        if (!match) continue;
        const target = `ctl00$MainContent$CCCHSDSearchCtl$ResultsGridView$ctl${String(Number(match.rowIndex) + 2).padStart(2, '0')}$FacilityNameLBTN`;
        const detailHtml = await postForm({
          ...grabHidden(html),
          __EVENTTARGET: target,
          __EVENTARGUMENT: '',
        }, cookie);
        const detail = parseDetail(detailHtml);
        if (detail.inspections.length > 0 || detail.placardTitle) return Response.json(detail);
      }
      return Response.json({ placardTitle: '', phone: '', inspections: [] });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}