import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SNHD_BASE = "https://www.southernnevadahealthdistrict.org/wp-json/snhd-eh-restaurants/v1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, city_name, permit_number } = body;

    // ── Detail mode: fetch full inspection history by permit number ──
    if (action === "detail") {
      const res = await fetch(`${SNHD_BASE}/restaurants/${encodeURIComponent(permit_number)}`);
      if (!res.ok) return Response.json({ error: `SNHD API ${res.status}` }, { status: 502 });
      const data = await res.json();
      return Response.json(data);
    }

    // ── Search mode: Google Places → SNHD address matching ──
    // The SNHD REST API does NOT support restaurant_name search server-side.
    // Strategy: use Google Places to find restaurants by name, then match each
    // one to SNHD's database by searching on a unique address fragment.
    if (action === "search") {
      const apiKey = Deno.env.get("GOOGLE_API_KEY");
      if (!apiKey) return Response.json({ error: "GOOGLE_API_KEY not set" }, { status: 500 });

      const locationStr = city_name || "Las Vegas, NV";
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${name} restaurant in ${locationStr}`)}&key=${apiKey}`;
      const placesRes = await fetch(placesUrl);
      if (!placesRes.ok) return Response.json({ error: `Places API ${placesRes.status}` }, { status: 502 });
      const placesData = await placesRes.json();
      const places = (placesData.results || []).slice(0, 12);

      // For each Place, extract a unique address fragment and search SNHD by it
      const matchPromises = places.map(async (place) => {
        const formattedAddr = place.formatted_address || "";
        // Extract the street address portion (everything before first comma)
        const streetAddr = formattedAddr.split(",")[0].trim();
        if (streetAddr.length < 5) return [];

        // Try searching with the full street address first
        const snhdUrl = `${SNHD_BASE}/restaurants?address=${encodeURIComponent(streetAddr)}&per_page=10`;
        const snhdRes = await fetch(snhdUrl);
        if (!snhdRes.ok) return [];
        const snhdData = await snhdRes.json();
        let candidates = snhdData.results || [];

        // If no results with full street address, try just the street number + first word
        if (candidates.length === 0) {
          const numMatch = streetAddr.match(/^(\d+\s+\w+)/);
          if (numMatch) {
            const fragment = numMatch[1];
            const fallbackUrl = `${SNHD_BASE}/restaurants?address=${encodeURIComponent(fragment)}&per_page=10`;
            const fallbackRes = await fetch(fallbackUrl);
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              candidates = fallbackData.results || [];
            }
          }
        }

        // Match by name similarity between Place and SNHD results
        const placeName = (place.name || "").toLowerCase();
        const queryLower = (name || "").toLowerCase();
        return candidates.filter(r => {
          const snhdName = (r.restaurant_name || "").toLowerCase();
          // Match if names share significant overlap
          return snhdName.includes(queryLower) ||
                 queryLower.includes(snhdName) ||
                 snhdName.includes(placeName) ||
                 placeName.includes(snhdName);
        });
      });

      const matchArrays = await Promise.all(matchPromises);
      const allMatches = matchArrays.flat();

      // Deduplicate by permit_number
      const seen = new Set();
      const deduped = allMatches.filter(r => {
        const key = r.permit_number;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return Response.json({ restaurants: deduped });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});