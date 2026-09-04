import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Marin County Community Development Agency — Food Facility Inspections
// Official Socrata open data feed (data.marincounty.gov), updated daily.
const DATASET = 'https://data.marincounty.gov/resource/73zb-z5me.json';
const UA = 'Mozilla/5.0 (compatible; SafeEats/1.0)';

// Strip SQL-injection / SoQL wildcard characters from user input.
function sanitizeForLike(raw: string): string {
  return String(raw || '').replace(/['%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchTerms(name: string): string[] {
  const clean = sanitizeForLike(name);
  if (!clean) return [];
  const words = clean.split(' ').filter((w) => w.length >= 3);
  const byLength = [...words].sort((a, b) => b.length - a.length);
  return [clean, ...byLength.slice(0, 2)];
}

// The Marin dataset stores text fields wrapped in literal double quotes
// (Socrata CSV-import artifact) — strip them before returning rows.
function stripQuotes(v: unknown): string {
  return String(v ?? '').replace(/^"+|"+$/g, '').trim();
}

function shape(row: Record<string, unknown>): Record<string, unknown> {
  const addr = (row.businessaddress || {}) as Record<string, unknown>;
  return {
    business_id: String(row.business_id ?? ''),
    business_name: stripQuotes(row.business_name),
    address: stripQuotes(row.formatted_address),
    city: stripQuotes(row.business_city),
    zip: String(row.business_postal_code ?? ''),
    latitude: addr.latitude ? Number(addr.latitude) : null,
    longitude: addr.longitude ? Number(addr.longitude) : null,
    inspection_id: String(row.inspection_id ?? ''),
    inspection_date: String(row.inspection_date ?? '').slice(0, 10),
    inspection_type: stripQuotes(row.inspection_type),
    inspection_result: String(row.inspection_result ?? ''),
    placard: String(row.placard ?? ''),
    violation_description: stripQuotes(row.violation_description),
    is_major_violation: String(row.is_major_violation ?? ''),
    inspector_comments: stripQuotes(row.inspector_comments),
  };
}

async function query(where: string, limit: number): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    $where: where,
    $order: 'inspection_date DESC',
    $limit: String(limit),
  });
  const res = await fetch(`${DATASET}?${params.toString()}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(shape) : [];
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name, facilityId } = body;

    if (action === 'search') {
      for (const term of searchTerms(name || '')) {
        const records = await query(`upper(business_name) like '%${term.toUpperCase()}%'`, 400);
        if (records.length > 0) return Response.json({ records });
      }
      return Response.json({ records: [] });
    }

    if (action === 'detail') {
      const id = sanitizeForLike(facilityId || '').replace(/\D/g, '');
      if (!id) return Response.json({ records: [] });
      const records = await query(`business_id = '${id}'`, 400);
      return Response.json({ records });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}