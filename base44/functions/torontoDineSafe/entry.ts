import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search";
const CKAN_SQL = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search_sql";
const RESOURCE_ID = "29d83dfa-f8b6-4aa2-8e57-12046c1d83e8";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { action, name, establishmentId } = body;

    if (action === "search") {
      if (!name) return Response.json({ error: "name required" }, { status: 400 });

      // Use SQL ILIKE for reliable substring matching (full-text search drops short/common words)
      const sql = `SELECT * FROM "${RESOURCE_ID}" WHERE "Establishment Name" ILIKE '%${name.replace(/'/g, "''")}%' ORDER BY "Inspection Date" DESC LIMIT 200`;
      const url = `${CKAN_SQL}?sql=${encodeURIComponent(sql)}`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ error: `CKAN error: ${res.status}` }, { status: 502 });
      const data = await res.json();
      return Response.json({ records: data.result?.records || [] });
    }

    if (action === "detail") {
      if (!establishmentId) return Response.json({ error: "establishmentId required" }, { status: 400 });

      // Filter by establishment ID to get all inspection rows
      const filters = encodeURIComponent(JSON.stringify({ "Establishment ID": establishmentId }));
      const url = `${CKAN_BASE}?resource_id=${RESOURCE_ID}&filters=${filters}&limit=500`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ records: [] });
      const data = await res.json();
      return Response.json({ records: data.result?.records || [] });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});