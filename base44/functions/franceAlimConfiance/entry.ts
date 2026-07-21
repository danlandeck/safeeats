import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ODS_BASE = "https://dgal.opendatasoft.com/api/records/1.0/search/";
const DATASET = "export_alimconfiance";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, siret, commune } = body;

    if (action === "search") {
      if (!name) return Response.json({ error: "name required" }, { status: 400 });

      const url = `${ODS_BASE}?dataset=${DATASET}&q=${encodeURIComponent(name)}&rows=100&sort=date_inspection`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ error: `ODS error: ${res.status}` }, { status: 502 });
      const data = await res.json();
      return Response.json({ records: data.records || [] });
    }

    if (action === "detail") {
      if (!siret) return Response.json({ error: "siret required" }, { status: 400 });

      const url = `${ODS_BASE}?dataset=${DATASET}&q=&refine.siret=${encodeURIComponent(siret)}&rows=500&sort=date_inspection`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ records: [] });
      const data = await res.json();
      return Response.json({ records: data.records || [] });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});