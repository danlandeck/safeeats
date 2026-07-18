import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// LA County Public Health — ArcGIS Feature Service
// The FeatureServer was unpublished in 2025; the dataset (item 19b6607ac82c4512b10811870975dbdc)
// is now a CSV-only item on ArcGIS Online with no REST query endpoint.
// Short-circuit: return empty immediately so the search engine falls back to AI enrichment
// without wasting a network round-trip to a dead ArcGIS endpoint.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // FeatureServer is dead — return empty for all actions so the search engine
    // falls back to AI enrichment (Gemini web search) for LA County restaurants.
    if (action === "search" || action === "detail") {
      return Response.json({ records: [], note: "LA County FeatureServer unpublished 2025 — AI enrichment fallback" });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});