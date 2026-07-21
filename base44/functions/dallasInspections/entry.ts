import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SOCRATA_BASE = "https://www.dallasopendata.com/resource/dri5-wcct.json";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, establishmentId } = body;

    if (action === "search") {
      if (!name) return Response.json({ error: "name required" }, { status: 400 });

      const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
      const url = `${SOCRATA_BASE}?$where=upper(program_identifier) like '%25${encodeURIComponent(clean)}%25'&$limit=200&$order=insp_date DESC`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ error: `Socrata error: ${res.status}` }, { status: 502 });
      const data = await res.json();
      return Response.json({ records: data || [] });
    }

    if (action === "detail") {
      if (!establishmentId) return Response.json({ error: "establishmentId required" }, { status: 400 });

      const [bizName, addr] = establishmentId.split("||");
      let where = `upper(program_identifier)='${encodeURIComponent(bizName)}'`;
      if (addr) where += ` AND upper(site_address)='${encodeURIComponent(addr)}'`;
      const url = `${SOCRATA_BASE}?$where=${where}&$limit=500&$order=insp_date DESC`;
      const res = await fetch(url);
      if (!res.ok) return Response.json({ records: [] });
      const data = await res.json();
      return Response.json({ records: data || [] });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});