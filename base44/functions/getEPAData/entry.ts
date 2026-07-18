import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// EPA ECHO API (echodata.epa.gov) deprecated — returns 403 Forbidden as of 2026.
// No replacement REST endpoint found. This function is not called from the frontend.
// Returns null gracefully so any indirect callers don't waste time on a dead endpoint.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    return Response.json({ epa_data: null, note: "EPA ECHO API deprecated (403)" });
  } catch (error) {
    return Response.json({ error: error.message, epa_data: null }, { status: 500 });
  }
});