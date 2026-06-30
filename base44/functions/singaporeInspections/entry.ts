import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Singapore food safety data via data.gov.sg
//
// data.gov.sg migrated to a new v2 API in late 2025. The old CKAN package_search
// endpoint is deprecated and returns empty. The new API uses:
//   Listing: https://api-production.data.gov.sg/v2/public/api/datasets?page=N
//   Search:  https://data.gov.sg/api/action/datastore_search?resource_id=d_xxx
//
// REALITY: SFA's SAFE (Safety Assurance for Food Establishments) grading system
// launched January 2026, but no per-establishment inspection dataset is published
// on data.gov.sg as a searchable datastore resource. The only food-related
// dataset is "Licensed Food Establishments by Category, Annual" — aggregate counts,
// not per-restaurant.
//
// This function returns empty gracefully; the search engine falls back to
// AI-estimated results via Gemini 3 Flash web search.

// Known per-establishment food dataset IDs — add here when SFA publishes one.
const FOOD_DATASET_IDS: string[] = [];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name } = body;

    if (action === "search") {
      if (!name?.trim()) return Response.json({ records: [], resourceId: null });

      for (const resourceId of FOOD_DATASET_IDS) {
        try {
          const url = `https://data.gov.sg/api/action/datastore_search?resource_id=${resourceId}&q=${encodeURIComponent(name)}&limit=30`;
          const res = await fetch(url, {
            headers: { "User-Agent": "SafeEats/1.0" },
            signal: AbortSignal.timeout(6000),
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data.success && data.result?.records?.length) {
            return Response.json({ records: data.result.records, resourceId });
          }
        } catch { continue; }
      }

      // No per-establishment dataset available — return empty for AI fallback.
      return Response.json({ records: [], resourceId: null });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});