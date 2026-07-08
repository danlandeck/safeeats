import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONTROLLER_URL = "https://secure.stancounty.com/FoodFacilities/HealthInspectionsController";

const stripTags = (s) => (s || "")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&#039;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function parseHtmlTable(html, nameFilter) {
  const facilities = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  const normalize = (s) => (s || "").toLowerCase().replace(/[''\-]/g, "").replace(/\s+/g, " ").trim();
  const filterNorm = nameFilter ? normalize(nameFilter) : null;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    // Skip header rows
    if (/<th/i.test(rowHtml)) continue;

    const cells = [];
    let cellMatch;
    const re = new RegExp(cellRegex.source, "gi");
    let m;
    while ((m = re.exec(rowHtml)) !== null) {
      cells.push(stripTags(m[1]));
    }

    if (cells.length < 2) continue;

    const name = cells[0];
    if (!name || name.length < 2) continue;

    // Filter by name if provided (normalize apostrophes/dashes before comparing)
    if (filterNorm && !normalize(name).includes(filterNorm)) continue;

    // Actual column layout from live response:
    // 0: Facility Name
    // 1: Address (format: "NUMBER STREET NAME, CITY" - city embedded at end)
    // 2: Last Inspection Date
    // 3: Inspection Type
    // 4: Permit Status

    const rawAddress = cells[1] || "";
    // Split address: "3119 ATCHISON ST, RIVERBANK" → address + city
    const lastComma = rawAddress.lastIndexOf(",");
    const address = lastComma > 0 ? rawAddress.substring(0, lastComma).trim() : rawAddress;
    const city = lastComma > 0 ? rawAddress.substring(lastComma + 1).trim() : "";

    facilities.push({
      name,
      address,
      city: city || "Stanislaus County",
      latest_date: cells[2] || "",
      inspection_type: cells[3] || "",
      permit_status: cells[4] || "",
    });
  }

  return facilities;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, city } = body;

    if (action === "search") {
      // GET returns all facilities — POST is ignored by the server, so use GET + client-side filter
      const res = await fetch(CONTROLLER_URL, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SafeEats/1.0)",
          "Referer": "https://secure.stancounty.com/FoodFacilities/home.jsp",
        },
      });

      if (!res.ok) {
        return Response.json({ facilities: [], error: `HTTP ${res.status}` });
      }

      const html = await res.text();
      const facilities = parseHtmlTable(html, name);

      return Response.json({ facilities });
    }

    return Response.json({ facilities: [], error: "Unknown action" });
  } catch (error) {
    return Response.json({ facilities: [], error: error.message }, { status: 500 });
  }
});