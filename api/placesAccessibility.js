/**
 * placesAccessibility — Vercel Serverless Function
 * Ported from the Base44 backend function getPlacesAccessibility (plan-gated:
 * invoking backend functions returns 402 on the Starter plan, which broke the
 * "Tap to verify ADA" flow). Same response shape as the old function.
 *
 * Single-place mode: POST { name, address, city, zip_code }
 *   → { found, hasAnyData, wheelchairAccessibleEntrance, ... }
 * Batch mode (up to 12): POST { places: [...] }
 *   → { batch: true, results: [...] }
 */

async function lookupPlace(place) {
  const query = [place?.name, place?.address, place?.city, place?.zip_code]
    .filter(Boolean)
    .join(", ");
  if (!query) return { found: false };

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) return { found: false, reason: "GOOGLE_PLACES_KEY not configured" };

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.accessibilityOptions,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Places API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const p = data.places?.[0];
  if (!p) return { found: false };

  const ao = p.accessibilityOptions || {};
  return {
    found: true,
    hasAnyData: Object.keys(ao).length > 0,
    placeName: p.displayName?.text || "",
    formattedAddress: p.formattedAddress || "",
    wheelchairAccessibleEntrance: ao.wheelchairAccessibleEntrance ?? null,
    wheelchairAccessibleParking: ao.wheelchairAccessibleParking ?? null,
    wheelchairAccessibleRestroom: ao.wheelchairAccessibleRestroom ?? null,
    wheelchairAccessibleSeating: ao.wheelchairAccessibleSeating ?? null,
  };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = req.body || {};

    // Batch mode — used by the search results list to fill ADA status on cards.
    if (Array.isArray(body.places) && body.places.length > 0) {
      const places = body.places.slice(0, 12);
      const results = await Promise.all(
        places.map((p) => lookupPlace(p).catch(() => null))
      );
      return res.status(200).json({ batch: true, results });
    }

    // Single-place mode — used by the card badge and the detail page.
    return res.status(200).json(await lookupPlace(body));
  } catch (error) {
    return res.status(502).json({ found: false, reason: error.message });
  }
}