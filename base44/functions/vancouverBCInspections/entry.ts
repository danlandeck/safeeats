import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// vancouverBCInspections — live restaurant inspection data from Vancouver
// Coastal Health's public disclosure portal (inspections.vch.ca).
// Covers Vancouver, Richmond, North Shore, Squamish, Whistler, Sunshine Coast.
//
// API notes (reverse-engineered from the public Angular portal, verified live):
// - Base: https://inspections.vch.ca/api/v0/portal
// - Food Premises disclosure program ID: bfecaebb-8c76-43aa-be0d-6a00092ac5f1
// - POST disclosure/program/facilities {pageNumber,pageSize,criteria,sort,
//   disclosureProgramId,fields} → paged facility list
// - POST disclosure/facilityDetails/{programId} [facilityIds] → detail merge
//   (fills outstandingCriticalInfractions / outstandingNonCriticalInfractions)
// - GET  disclosure/program/{programId}/facility/{facilityId}/inspectionDetails/
//   → inspection history with critical/non-critical counts and actions taken

const BASE = "https://inspections.vch.ca/api/v0/portal";
const FOOD_PROGRAM_ID = "bfecaebb-8c76-43aa-be0d-6a00092ac5f1";
const SEARCH_FIELDS = [
  "facilityName", "siteAddress", "community", "facilityType",
  "phoneNumber", "latitude", "longitude",
];
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; SafeEats/1.0; +https://safeeats.site)",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, name, facilityId } = await req.json();

    if (action === "search") {
      const searchRes = await fetch(`${BASE}/disclosure/program/facilities`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          pageNumber: 0,
          pageSize: 10,
          criteria: (name || "").trim(),
          sort: [{ field: "facilityName", order: "asc" }],
          disclosureProgramId: FOOD_PROGRAM_ID,
          fields: SEARCH_FIELDS,
        }),
      });
      if (!searchRes.ok) {
        return Response.json({ facilities: [], error: `VCH search HTTP ${searchRes.status}` }, { status: 502 });
      }
      const data = await searchRes.json();
      const facilities = Array.isArray(data?.result) ? data.result : [];
      if (facilities.length === 0) return Response.json({ facilities: [] });

      // Batch detail fetch: one call for all IDs, fills infraction counts
      let details = [];
      try {
        const detRes = await fetch(`${BASE}/disclosure/facilityDetails/${FOOD_PROGRAM_ID}`, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify(facilities.map((f) => f.id)),
        });
        if (detRes.ok) {
          const d = await detRes.json();
          if (Array.isArray(d)) details = d;
        }
      } catch { /* detail merge unavailable — counts stay null */ }

      const byId = new Map(details.map((d) => [d.id, d]));
      const merged = facilities.map((f) => {
        const det = byId.get(f.id) || {};
        // Detail response is authoritative for infraction counts; keep search
        // fields (address/coords) when detail returns null for them.
        return {
          ...f,
          outstandingCriticalInfractions: det.outstandingCriticalInfractions ?? null,
          outstandingNonCriticalInfractions: det.outstandingNonCriticalInfractions ?? null,
          closure: det.closure ?? f.closure ?? null,
          numberOfInspections: det.numberOfInspections ?? f.numberOfInspections ?? null,
          lastInspectionDate: det.lastInspectionDate ?? f.lastInspectionDate ?? null,
        };
      });
      return Response.json({ facilities: merged, total: data?.totalNumberOfRecords ?? merged.length });
    }

    if (action === "detail") {
      if (!facilityId) return Response.json({ inspections: [] });
      const res = await fetch(
        `${BASE}/disclosure/program/${FOOD_PROGRAM_ID}/facility/${encodeURIComponent(facilityId)}/inspectionDetails/`,
        { headers: HEADERS },
      );
      if (!res.ok) {
        return Response.json({ inspections: [], error: `VCH detail HTTP ${res.status}` }, { status: 502 });
      }
      const inspections = await res.json();
      return Response.json({ inspections: Array.isArray(inspections) ? inspections : [] });
    }

    return Response.json({ error: "unknown action; use 'search' or 'detail'" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});