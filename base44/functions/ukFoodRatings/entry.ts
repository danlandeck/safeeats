import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FSA_BASE = "https://api.ratings.food.gov.uk";
const FSA_HEADERS = {
  "x-api-version": "2",
  "Accept": "application/json",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, fhrsId } = body;

    if (action === "search") {
      if (!name) return Response.json({ error: "name required" }, { status: 400 });

      // Search establishments by name, pageSize=50
      const url = `${FSA_BASE}/Establishments?name=${encodeURIComponent(name)}&pageSize=50&pageNumber=1&sortOptionKey=rating`;
      const res = await fetch(url, { headers: FSA_HEADERS });
      if (!res.ok) {
        const text = await res.text();
        return Response.json({ error: `FSA API error: ${res.status}`, detail: text }, { status: 502 });
      }
      const data = await res.json();
      return Response.json({ establishments: data.establishments || [] });
    }

    if (action === "detail") {
      if (!fhrsId) return Response.json({ error: "fhrsId required" }, { status: 400 });

      // Get score descriptors (the individual inspection component scores)
      const url = `${FSA_BASE}/ScoreDescriptors?establishmentId=${fhrsId}`;
      const res = await fetch(url, { headers: FSA_HEADERS });
      if (!res.ok) return Response.json({ scoreDescriptors: [] });
      const data = await res.json();
      return Response.json({ scoreDescriptors: data.scoreDescriptors || [] });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});