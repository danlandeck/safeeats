import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// placesRestaurantSearch — ground-truth restaurant lookup via Google Places Text Search (v1).
// Used by the AI-fallback search path (jurisdictions with no live inspection API).
// Places establishes WHAT exists and WHERE; inspection data is layered on separately.
// Uses the same GOOGLE_API_KEY as getPlacesADA.

function parseComponents(components) {
  const out = { city: "", state: "", zip: "" };
  for (const c of components || []) {
    const types = c.types || [];
    if (types.includes("postal_code")) out.zip = c.shortText || c.longText || "";
    if (types.includes("locality")) out.city = c.longText || c.shortText || "";
    if (!out.city && types.includes("postal_town")) out.city = c.longText || "";
    if (!out.city && types.includes("sublocality")) out.city = c.longText || "";
    if (types.includes("administrative_area_level_1")) out.state = c.shortText || "";
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, location } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ found: false, reason: "query is required" });
    }

    // Wrap multi-word brand names in quotes so Google Places returns exact brand
    // matches (e.g. "Taco Bell") instead of fuzzy matches (e.g. "Taco Time").
    // Single-word queries (e.g. "tacos", "pizza") are left unquoted so Places
    // can return a variety of restaurants matching that food type.
    const isBrandName = query.trim().split(/\s+/).length >= 2;
    const quotedQuery = isBrandName ? `"${query.trim()}"` : query.trim();
    const textQuery = location
      ? `${quotedQuery} restaurant in ${location}`
      : `${quotedQuery} restaurant`;

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": Deno.env.get("GOOGLE_API_KEY"),
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.businessStatus",
          "places.addressComponents",
          "places.location",
          "places.primaryTypeDisplayName",
        ].join(","),
      },
      body: JSON.stringify({ textQuery, maxResultCount: 8 }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ found: false, reason: `Places API ${res.status}`, detail: errText.slice(0, 300) }, { status: 502 });
    }

    const data = await res.json();
    const places = Array.isArray(data.places) ? data.places : [];

    const restaurants = places
      // Permanently closed places are not results; temporarily closed are kept and flagged.
      .filter(p => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map(p => {
        const comp = parseComponents(p.addressComponents);
        return {
          place_id: p.id || "",
          name: p.displayName?.text || "",
          address: p.formattedAddress || "",
          city: comp.city,
          state: comp.state,
          zip_code: comp.zip,
          business_status: p.businessStatus || "OPERATIONAL",
          latitude: p.location?.latitude ?? null,
          longitude: p.location?.longitude ?? null,
          cuisine: p.primaryTypeDisplayName?.text || "",
        };
      })
      .filter(r => r.name && r.address);

    return Response.json({ found: restaurants.length > 0, restaurants });
  } catch (error) {
    return Response.json({ found: false, reason: error.message }, { status: 500 });
  }
});