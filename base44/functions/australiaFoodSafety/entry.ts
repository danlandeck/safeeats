import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Australia food safety data via state open data portals (CKAN-based)
//
// REALITY: NSW "Scores on Doors" is a real program run by individual councils,
// but there is no centralized, per-establishment API-searchable dataset.
// data.nsw.gov.au only publishes aggregate offence counts and penalty notice
// registers — not per-restaurant inspection scores.
//
// This function searches known CKAN resources if they become available.
// Currently returns empty gracefully; the search engine falls back to
// AI-estimated results via Gemini 3 Flash web search.

const STATE_CONFIGS = {
  nsw: { base: "https://data.nsw.gov.au/data/api/3/action", label: "NSW", city: "Sydney" },
  qld: { base: "https://data.qld.gov.au/api/3/action", label: "QLD", city: "Brisbane" },
  vic: { base: "https://discover.data.vic.gov.au/api/3/action", label: "VIC", city: "Melbourne" },
};

// Per-establishment inspection dataset resource IDs — add when available.
const PER_ESTABLISHMENT_IDS: Record<string, string[]> = {
  nsw: [],
  qld: [],
  vic: [],
};

async function searchCKAN(base: string, resourceId: string, name: string) {
  try {
    const url = `${base}/datastore_search?resource_id=${resourceId}&q=${encodeURIComponent(name)}&limit=30`;
    const res = await fetch(url, {
      headers: { "User-Agent": "SafeEats/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.result?.records?.length) return null;
    return data.result.records;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name, state = "nsw" } = body;

    if (action === "search") {
      if (!name?.trim()) return Response.json({ records: [], state });
      const cfg = STATE_CONFIGS[state as keyof typeof STATE_CONFIGS] || STATE_CONFIGS.nsw;
      const resourceIds = PER_ESTABLISHMENT_IDS[state] || PER_ESTABLISHMENT_IDS.nsw;

      for (const rid of resourceIds) {
        const records = await searchCKAN(cfg.base, rid, name);
        if (records && records.length > 0) {
          return Response.json({ records, state: cfg.label, resourceId: rid });
        }
      }

      // No per-establishment dataset available — return empty for AI fallback.
      return Response.json({ records: [], state: cfg.label });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});