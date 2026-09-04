import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sacramento County Environmental Management — Food Inspections
// Live hosted ArcGIS FeatureServer (open data, CC-BY-4.0).
// Layer 0: Facilities (denormalized with latest inspection + violations)
// Table 1: Inspection & Violation History
const SERVICE = 'https://services1.arcgis.com/5NARefyPVtAeuJPU/arcgis/rest/services/Food_Inspections/FeatureServer';
const UA = 'Mozilla/5.0 (compatible; SafeEats/1.0)';

// Strip SQL-injection / LIKE wildcard characters from user input.
function sanitizeForLike(raw: string): string {
  return String(raw || '').replace(/['%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Try the full search phrase, then fall back to its longest words so
// "Zelda's pizza in Sacramento" still finds "ZELDA'S PIZZA ORIGINAL".
function searchTerms(name: string): string[] {
  const clean = sanitizeForLike(name);
  if (!clean) return [];
  const words = clean.split(' ').filter((w) => w.length >= 3);
  const byLength = [...words].sort((a, b) => b.length - a.length);
  return [clean, ...byLength.slice(0, 2)];
}

// ArcGIS stores dates as epoch milliseconds; emit ISO dates (YYYY-MM-DD).
function shape(attrs: Record<string, unknown>): Record<string, unknown> {
  const ms = Number(attrs.Inspection_Date);
  const date = Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : null;
  return { ...attrs, Inspection_Date: date };
}

async function query(layer: number, where: string, count: number): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    where,
    outFields: '*',
    orderByFields: 'Inspection_Date DESC',
    resultRecordCount: String(count),
    returnGeometry: 'false',
    f: 'json',
  });
  const res = await fetch(`${SERVICE}/${layer}/query?${params.toString()}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json() as { features?: { attributes?: Record<string, unknown> }[] };
  return (data.features || []).map((f) => shape(f.attributes || {}));
}

async function searchByName(name: string): Promise<Record<string, unknown>[]> {
  for (const term of searchTerms(name)) {
    const rows = await query(0, `UPPER(Facility_Name) LIKE '%${term.toUpperCase()}%'`, 400);
    if (rows.length > 0) return rows;
  }
  return [];
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name, facilityId } = body;

    if (action === 'search') {
      const records = await searchByName(name || '');
      return Response.json({ records });
    }

    if (action === 'detail') {
      const id = sanitizeForLike(facilityId || '');
      if (!id) return Response.json({ records: [] });
      const records = await query(1, `Facility_ID = '${id}'`, 300);
      return Response.json({ records });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}