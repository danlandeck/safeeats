// Shared query helpers for government open-data portals
// (ArcGIS FeatureServer + Socrata). Used by laCountyInspections,
// sacramentoInspections and marinInspections.

export const PORTAL_UA = 'Mozilla/5.0 (compatible; SafeEats/1.0)';

// Strip SQL-injection / LIKE wildcard characters from user input.
export function sanitizeForLike(raw: string): string {
  return String(raw || '').replace(/['%_\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

// The frontend may pass the full search phrase; try it whole, then fall back to
// its longest words so "Philippe in Los Angeles" still finds "PHILIPPE".
export function searchTerms(name: string): string[] {
  const clean = sanitizeForLike(name);
  if (!clean) return [];
  const words = clean.split(' ').filter((w) => w.length >= 3);
  const byLength = [...words].sort((a, b) => b.length - a.length);
  return [clean, ...byLength.slice(0, 2)];
}

export async function arcgisFeatureQuery(
  layerUrl: string,
  where: string,
  count: number,
  orderBy = 'ACTIVITY_DATE DESC',
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    where,
    outFields: '*',
    orderByFields: orderBy,
    resultRecordCount: String(count),
    returnGeometry: 'false',
    f: 'json',
  });
  const res = await fetch(`${layerUrl}/query?${params.toString()}`, { headers: { 'User-Agent': PORTAL_UA } });
  if (!res.ok) return [];
  const data = await res.json() as { features?: { attributes?: Record<string, unknown> }[] };
  return (data.features || []).map((f) => f.attributes || {});
}

export async function socrataQuery(
  datasetUrl: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${datasetUrl}?${new URLSearchParams(params).toString()}`, { headers: { 'User-Agent': PORTAL_UA } });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}