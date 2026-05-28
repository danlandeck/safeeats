import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Singapore food hygiene data via data.gov.sg CKAN API
// We first discover available food-related resources, then search within them.
const CKAN_BASE = "https://data.gov.sg/api/action";

async function discoverFoodResourceIds() {
  // Search for food-related packages on data.gov.sg
  const res = await fetch(
    `${CKAN_BASE}/package_search?q=food+hygiene+grade+establishment&rows=10`,
    { headers: { "User-Agent": "SafeEats/1.0" }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.success) return [];
  const ids = [];
  for (const pkg of (data.result?.results || [])) {
    for (const resource of (pkg.resources || [])) {
      if (resource.id && /food|hygiene|establish|grade|restaurant|hawker/i.test(
        (pkg.title || "") + " " + (resource.name || "") + " " + (pkg.notes || "")
      )) {
        ids.push({ id: resource.id, name: resource.name || pkg.title });
      }
    }
  }
  return ids;
}

async function searchResource(resourceId, name) {
  try {
    const url = `${CKAN_BASE}/datastore_search?resource_id=${resourceId}&q=${encodeURIComponent(name)}&limit=30`;
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.result?.records?.length) return null;
    return { records: data.result.records, resourceId };
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
    const { action, name } = body;

    if (action === "search") {
      if (!name?.trim()) return Response.json({ records: [], resourceId: null });

      // Discover food datasets and search each
      const resources = await discoverFoodResourceIds();
      for (const { id } of resources) {
        const result = await searchResource(id, name);
        if (result && result.records.length > 0) {
          return Response.json(result);
        }
      }

      return Response.json({ records: [], resourceId: null, discovered: resources.length });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});