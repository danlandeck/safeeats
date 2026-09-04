import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// LA County Public Health — Environmental Health "Restaurant and Market Inspections"
// Live hosted ArcGIS FeatureService (inspection window 07/01/2023–06/30/2026, countywide).
// Note: excludes Pasadena, Long Beach and Vernon, which operate their own health departments.
const LAYER_URL = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Environmental_Health_Restaurant_and_Market_Inspections_33/FeatureServer/0';
const UA = 'Mozilla/5.0 (compatible; SafeEats/1.0)';

// Strip SQL-injection / LIKE wildcard characters from user input.
function sanitizeForLike(raw: string): string {
  return String(raw || '').replace(/['%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

// The frontend may pass the full search phrase; try it whole, then fall back to
// its longest words so "Philippe in Los Angeles" still finds "PHILIPPE".
function searchTerms(name: string): string[] {
  const clean = sanitizeForLike(name);
  if (!clean) return [];
  const words = clean.split(' ').filter((w) => w.length >= 3);
  const byLength = [...words].sort((a, b) => b.length - a.length);
  return [clean, ...byLength.slice(0, 2)];
}

// The service stores SCORE as a string field; emit a number (or null) so the
// frontend processors can grade/sort consistently.
function normalizeScore(attrs: Record<string, unknown>): Record<string, unknown> {
  const raw = attrs.SCORE as string | number | null | undefined;
  const score = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  return { ...attrs, SCORE: score !== null && Number.isFinite(score) ? score : null };
}

async function query(where: string, count: number): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    where,
    outFields: '*',
    orderByFields: 'ACTIVITY_DATE DESC',
    resultRecordCount: String(count),
    returnGeometry: 'false',
    f: 'json',
  });
  const res = await fetch(`${LAYER_URL}/query?${params.toString()}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const data = await res.json() as { features?: { attributes?: Record<string, unknown> }[] };
  return (data.features || []).map((f) => normalizeScore(f.attributes || {}));
}

async function searchByName(name: string): Promise<Record<string, unknown>[]> {
  for (const term of searchTerms(name)) {
    const rows = await query(`UPPER(FACILITY_NAME) LIKE '%${term.toUpperCase()}%'`, 400);
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
      const records = await query(`FACILITY_ID = '${id}'`, 300);
      return Response.json({ records });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}