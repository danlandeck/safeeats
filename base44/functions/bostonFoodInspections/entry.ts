import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE = "https://data.boston.gov/api/3/action/datastore_search";
const RESOURCE = "4582bec6-2b4f-4f9e-bc55-cbaa73117f4c";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { action, name, licenseno } = body;

  if (action === "search") {
    const url = `${BASE}?resource_id=${RESOURCE}&q=${encodeURIComponent(name)}&limit=1000`;
    const res = await fetch(url);
    const data = await res.json();
    return Response.json({ records: data.result?.records || [] });
  }

  if (action === "detail") {
    const filters = encodeURIComponent(JSON.stringify({ licenseno: String(licenseno) }));
    const url = `${BASE}?resource_id=${RESOURCE}&filters=${filters}&limit=500`;
    const res = await fetch(url);
    const data = await res.json();
    return Response.json({ records: data.result?.records || [] });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
});