import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sanitizeForLike, searchTerms, arcgisFeatureQuery } from '../../shared/portalQuery.ts';

// LA County Public Health — Environmental Health "Restaurant and Market Inspections"
// Live hosted ArcGIS FeatureService (inspection window 07/01/2023–06/30/2026, countywide).
// Note: excludes Pasadena, Long Beach and Vernon, which operate their own health departments.
const LAYER_URL = 'https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Environmental_Health_Restaurant_and_Market_Inspections_33/FeatureServer/0';

// The service stores SCORE as a string field; emit a number (or null) so the
// frontend processors can grade/sort consistently.
function normalizeScore(attrs: Record<string, unknown>): Record<string, unknown> {
  const raw = attrs.SCORE as string | number | null | undefined;
  const score = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  return { ...attrs, SCORE: score !== null && Number.isFinite(score) ? score : null };
}

async function query(where: string, count: number): Promise<Record<string, unknown>[]> {
  const rows = await arcgisFeatureQuery(LAYER_URL, where, count);
  return rows.map(normalizeScore);
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