import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Riverside County Department of Environmental Health
// Facility Records Portal: https://weblink.rivcoeh.org/
//
// The portal is an ASP.NET MVC app that returns server-rendered HTML.
// Search: GET /?s1={name}&s3={city}&s9=Food
// Each result row includes: name, address, city, zip, inspection count,
// and a facility detail link (/LFAPI/ViewDetails/{facilityId}).
//
// The detail endpoint is designed for JS modal loading and returns an error
// on direct access, so we only scrape the search-level data. Inspection
// scores are filled in by background LLM enrichment on the frontend.

const PORTAL_BASE = "https://weblink.rivcoeh.org";

function stripTags(s) {
  return (s || "").replace(/<[^>]*>/g, "").trim();
}

function parseSearchResults(html) {
  const facilities = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return facilities;
  const tbody = tbodyMatch[1];

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(tbody)) !== null) {
    const trContent = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      tds.push(tdMatch[1].trim());
    }
    if (tds.length < 6) continue;

    const hrefMatch = tds[5].match(/href="([^"]*ViewDetails\/([^"\/]+))"/i);
    const portalUrl = hrefMatch ? hrefMatch[1] : null;
    const facilityId = hrefMatch ? hrefMatch[2] : null;

    const name = stripTags(tds[0]);
    if (!name) continue;

    facilities.push({
      name,
      address: stripTags(tds[1]),
      city: stripTags(tds[2]),
      zip_code: stripTags(tds[3]),
      inspection_count: parseInt(stripTags(tds[4])) || 0,
      facility_id: facilityId,
      portal_url: portalUrl,
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
      if (!name?.trim()) return Response.json({ facilities: [] });

      const params = new URLSearchParams();
      params.set("s1", name.trim());
      if (city?.trim()) params.set("s3", city.trim());
      params.set("s9", "Food");

      // The portal blocks requests without full browser headers (403).
      // Use a realistic browser fingerprint + session cookie from homepage.
      const browserHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": `${PORTAL_BASE}/`,
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      };

      // Step 1: fetch homepage to establish a session (ASP.NET may set cookies)
      let cookieHeader = "";
      try {
        const homeRes = await fetch(PORTAL_BASE, {
          headers: browserHeaders,
          signal: AbortSignal.timeout(8000),
          redirect: "manual",
        });
        const setCookie = homeRes.headers.get("set-cookie");
        if (setCookie) {
          cookieHeader = setCookie.split(/,(?=\s*[A-Za-z]+=)/).map(c => c.split(";")[0]).join("; ");
        }
      } catch { /* homepage fetch optional — proceed with search */ }

      const res = await fetch(`${PORTAL_BASE}/?${params}`, {
        headers: {
          ...browserHeaders,
          ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });

      if (!res.ok) {
        return Response.json({ facilities: [], error: `HTTP ${res.status}` });
      }

      const html = await res.text();
      const facilities = parseSearchResults(html);
      return Response.json({ facilities });
    }

    return Response.json({ facilities: [], error: "Unknown action" });
  } catch (error) {
    return Response.json({ facilities: [], error: error.message }, { status: 500 });
  }
});