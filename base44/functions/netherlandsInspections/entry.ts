import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const NVWA_BASE = "https://www.openbare-inspectieresultaten.nvwa.nl";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name } = body;

    if (action === "search") {
      if (!name) return Response.json({ error: "name required" }, { status: 400 });

      const url = `${NVWA_BASE}/zoekresultaten?q=${encodeURIComponent(name)}`;
      const res = await fetch(url, {
        headers: { "Accept": "text/html", "User-Agent": "SafeEats/1.0" },
      });
      if (!res.ok) return Response.json({ error: `NVWA error: ${res.status}` }, { status: 502 });
      const html = await res.text();

      // Parse server-rendered HTML: each result is an <h2> with a link,
      // followed by a status div ("Voldoet" / "Geen recente gegevens" / "Niet voldoet")
      const records = [];
      const blockRegex = /<h2[^>]*>\s*<a[^>]*href="([^"]*\/bedrijfsinspecties\/[^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>([\s\S]*?)(?=<h2|$)/gi;
      let match;
      while ((match = blockRegex.exec(html)) !== null) {
        const slug = match[1];
        const nameHtml = match[2].replace(/<[^>]*>/g, "").trim();
        const afterHtml = match[3].replace(/<[^>]*>/g, "").trim();
        let status = "Onbekend";
        if (/voldoet/i.test(afterHtml) && !/niet\s*voldoet/i.test(afterHtml)) status = "Voldoet";
        else if (/niet\s*voldoet/i.test(afterHtml)) status = "Niet voldoet";
        else if (/geen recente/i.test(afterHtml)) status = "Geen recente gegevens";
        if (nameHtml) {
          records.push({
            slug,
            name: nameHtml,
            status,
            detailUrl: `${NVWA_BASE}${slug}`,
          });
        }
      }
      return Response.json({ records });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});