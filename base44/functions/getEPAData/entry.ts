import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// EPA ECHO API (echodata.epa.gov) deprecated — returns 403 Forbidden as of 2026.
// No replacement REST endpoint found. This function is not called from the frontend.
// Returns null gracefully so any indirect callers don't waste time on a dead endpoint.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ epa_data: null, note: "EPA ECHO API deprecated (403)" });
  } catch (error) {
    return Response.json({ error: error.message, epa_data: null }, { status: 500 });
  }
}