import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";

// Look up accessibility options for one place via Google Places text search.
async function lookupPlace(place) {
  const query = [place?.name, place?.address, place?.city, place?.zip_code].filter(Boolean).join(", ");
  if (!query) return { found: false };

  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": Deno.env.get("GOOGLE_API_KEY"),
      "X-Goog-FieldMask": "places.id,places.displayName,places.accessibilityOptions,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  const data = await res.json();
  const place_ = data.places?.[0];
  if (!place_) return { found: false };

  const ao = place_.accessibilityOptions || {};
  return {
    found: true,
    hasAnyData: Object.keys(ao).length > 0,
    placeName: place_.displayName?.text || "",
    formattedAddress: place_.formattedAddress || "",
    wheelchairAccessibleEntrance: ao.wheelchairAccessibleEntrance ?? null,
    wheelchairAccessibleParking: ao.wheelchairAccessibleParking ?? null,
    wheelchairAccessibleRestroom: ao.wheelchairAccessibleRestroom ?? null,
    wheelchairAccessibleSeating: ao.wheelchairAccessibleSeating ?? null,
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();

  // Batch mode — used by the search results list to fill ADA status on cards.
  // One function call, up to 12 place lookups server-side.
  if (Array.isArray(body.places) && body.places.length > 0) {
    const places = body.places.slice(0, 12);
    const results = await Promise.all(places.map(lookupPlace));
    return Response.json({ batch: true, results });
  }

  // Single-place mode — used by the restaurant detail page.
  const d = await lookupPlace(body);
  return Response.json(d);
});