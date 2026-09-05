import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchTerms } from '../../shared/portalQuery.ts';

// San Diego County DEH — SDFoodInfo portal (www.sdfoodinfo.org)
// POST /restaurants/search.htm (form-encoded) returns JSON:
//   { total_count, result: [ { business_id, name, business_type, address, city,
//     zip, phone, status, lat, long, opened_date, inspections: [ { inspection_id,
//     type, score, grade, completed_date, status, violations: [...] } ] } ] }
// Quirk: names containing apostrophes always return zero hits — strip them.
// A session cookie is bootstrapped from the listing page to mirror browser traffic.
const SEARCH_URL = 'https://www.sdfoodinfo.org/restaurants/search.htm';
const LIST_URL = 'https://www.sdfoodinfo.org/restaurants/list_restaurants.html';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const sanitize = (s: string): string =>
  String(s || '').replace(/['’`]/g, '').replace(/[\r\n]/g, ' ').trim().slice(0, 80);

async function portalSearch(name: string, community: string): Promise<any[]> {
  let cookie = '';
  try {
    const page = await fetch(LIST_URL, { headers: { 'User-Agent': UA } });
    cookie = (page.headers.get('set-cookie') || '').split(';')[0];
  } catch { /* search also works sessionless in the worst case */ }

  const body = new URLSearchParams({
    name,
    page_number: '1',
    page_count: '30',
    lat: '32.7157',
    lng: '-117.1611',
    ...(community ? { community } : {}),
  }).toString();

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'application/json',
      'Referer': LIST_URL,
      'Origin': 'https://www.sdfoodinfo.org',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });
  if (!res.ok) throw new Error(`SDFoodInfo search failed: HTTP ${res.status}`);
  const data: any = await res.json();
  return Array.isArray(data?.result) ? data.result : [];
}

// Trimmed facility for the search payload — inspection history kept compact
// (violation counts only); the detail action returns full violations.
function trimFacility(f: any) {
  return {
    business_id: f.business_id || '',
    name: f.name || '',
    business_type: f.business_type || '',
    address: f.address || '',
    city: f.city || '',
    zip: f.zip || '',
    phone: f.phone || '',
    status: f.status || '',
    lat: f.lat || '',
    long: f.long || '',
    opened_date: f.opened_date || '',
    inspections: (Array.isArray(f.inspections) ? f.inspections : []).map((ins: any) => {
      const violations = Array.isArray(ins.violations) ? ins.violations : [];
      return {
        inspection_id: ins.inspection_id || '',
        type: ins.type || '',
        score: ins.score || '0',
        grade: ins.grade || '',
        completed_date: ins.completed_date || '',
        status: ins.status || '',
        violation_count: violations.length,
        major_count: violations.filter((v: any) => v.major_violation === 'Y').length,
      };
    }),
  };
}

function variants(name: string): string[] {
  const out: string[] = [];
  for (const term of [name, ...searchTerms(name || '')]) {
    const t = String(term || '').trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 4);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'search') {
      const name = sanitize(body.name || '');
      const community = sanitize(body.community || '').toUpperCase();
      const terms = name ? variants(name) : [''];
      for (const term of terms) {
        // If a community filter yields nothing (wrong/misspelled city), retry county-wide.
        for (const comm of community ? [community, ''] : ['']) {
          const facilities = await portalSearch(term, comm);
          if (facilities.length > 0) {
            return Response.json({ restaurants: facilities.map(trimFacility) });
          }
        }
      }
      return Response.json({ restaurants: [] });
    }

    if (action === 'detail') {
      const name = sanitize(body.name || '');
      const businessId = String(body.businessId || '');
      for (const term of variants(name)) {
        const facilities = await portalSearch(term, '');
        const match = facilities.find((f) => String(f.business_id) === businessId);
        if (match) {
          return Response.json({ inspections: Array.isArray(match.inspections) ? match.inspections : [] });
        }
      }
      return Response.json({ inspections: [] });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}