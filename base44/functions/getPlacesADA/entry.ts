import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { name, address, city, zip_code } = body;

  const query = [name, address, city, zip_code].filter(Boolean).join(", ");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": Deno.env.get("GOOGLE_API_KEY"),
      "X-Goog-FieldMask": "places.id,places.displayName,places.accessibilityOptions,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  const data = await res.json();
  const place = data.places?.[0];

  if (!place) {
    return Response.json({ found: false });
  }

  const ao = place.accessibilityOptions || {};
  const hasAnyData = Object.keys(ao).length > 0;

  return Response.json({
    found: true,
    hasAnyData,
    placeName: place.displayName?.text || "",
    formattedAddress: place.formattedAddress || "",
    wheelchairAccessibleEntrance: ao.wheelchairAccessibleEntrance ?? null,
    wheelchairAccessibleParking: ao.wheelchairAccessibleParking ?? null,
    wheelchairAccessibleRestroom: ao.wheelchairAccessibleRestroom ?? null,
    wheelchairAccessibleSeating: ao.wheelchairAccessibleSeating ?? null,
  });
});