import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Australia food safety data via state open data portals (CKAN-based)
const STATE_CONFIGS = {
  nsw: { base: "https://data.nsw.gov.au/data/api/3/action", label: "NSW", city: "Sydney" },
  qld: { base: "https://data.qld.gov.au/api/3/action", label: "QLD", city: "Brisbane" },
  vic: { base: "https://discover.data.vic.gov.au/api/3/action", label: "VIC", city: "Melbourne" },
};

async function discoverFoodResources(base) {
  try {
    const res = await fetch(
      `${base}/package_search?q=food+premises+inspection+restaurant&rows=10`,
      { headers: { "User-Agent": "SafeEats/1.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success) return [];
    const ids = [];
    for (const pkg of (data.result?.results || [])) {
      for (const resource of (pkg.resources || [])) {
        if (resource.id && resource.datastore_active && /food|restaurant|premises|inspect/i.test(
          (pkg.title || "") + " " + (resource.name || "")
        )) {
          ids.push(resource.id);
        }
      }
    }
    return ids;
  } catch {
    return [];
  }
}

async function searchCKAN(base, resourceId, name) {
  try {
    const url = `${base}/datastore_search?resource_id=${resourceId}&q=${encodeURIComponent(name)}&limit=30`;
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" }, signal: AbortSignal.timeout(6000) });
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
      const cfg = STATE_CONFIGS[state] || STATE_CONFIGS.nsw;
      const resourceIds = await discoverFoodResources(cfg.base);
      for (const rid of resourceIds) {
        const records = await searchCKAN(cfg.base, rid, name);
        if (records && records.length > 0) {
          return Response.json({ records, state: cfg.label, resourceId: rid });
        }
      }
      return Response.json({ records: [], state: cfg.label, discovered: resourceIds.length });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});