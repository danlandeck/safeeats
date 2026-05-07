import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function boolToYesNo(val) {
  if (val === true) return "yes";
  if (val === false) return "no";
  return "unknown";
}

function deriveCompliance(parking, entrance, restroom, seating) {
  const vals = [parking, entrance, restroom, seating];
  const known = vals.filter(v => v !== "unknown");
  if (known.length === 0) return "unknown";
  const allYes = known.every(v => v === "yes");
  const allNo = known.every(v => v === "no");
  if (allYes && known.length === vals.length) return "accessible";
  if (allNo && known.length === vals.length) return "not_accessible";
  if (known.some(v => v === "yes")) return "partially_accessible";
  return "not_accessible";
}

async function findPlaceId(name, address, city) {
  const query = [name, address, city].filter(Boolean).join(" ");
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({ textQuery: query }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.places?.[0]?.id || null;
}

async function fetchAccessibility(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "accessibilityOptions",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.accessibilityOptions || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { restaurantId } = await req.json();

    if (!restaurantId) {
      return Response.json({ error: "restaurantId required" }, { status: 400 });
    }

    if (!GOOGLE_API_KEY) {
      return Response.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
    }

    // Load restaurant record
    const restaurants = await base44.asServiceRole.entities.Restaurant.filter({ id: restaurantId });
    const restaurant = restaurants?.[0];
    if (!restaurant) {
      return Response.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Check 30-day cache
    if (restaurant.ada_last_updated) {
      const age = Date.now() - new Date(restaurant.ada_last_updated).getTime();
      if (age < THIRTY_DAYS_MS) {
        return Response.json({ cached: true, ada_compliance: restaurant.ada_compliance });
      }
    }

    // Step 1: Get or find place_id
    let placeId = restaurant.google_place_id;
    if (!placeId) {
      placeId = await findPlaceId(restaurant.name, restaurant.address, restaurant.city);
      if (!placeId) {
        return Response.json({ found: false });
      }
    }

    // Step 2: Fetch accessibility options
    const opts = await fetchAccessibility(placeId);

    const ada_parking          = boolToYesNo(opts?.wheelchairAccessibleParking);
    const ada_entrance_ramp    = boolToYesNo(opts?.wheelchairAccessibleEntrance);
    const ada_restroom         = boolToYesNo(opts?.wheelchairAccessibleRestroom);
    const ada_accessible_seating = boolToYesNo(opts?.wheelchairAccessibleSeating);
    const ada_compliance       = deriveCompliance(ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating);
    const ada_last_updated     = new Date().toISOString();

    // Step 3: Save back to restaurant
    await base44.asServiceRole.entities.Restaurant.update(restaurantId, {
      google_place_id: placeId,
      ada_parking,
      ada_entrance_ramp,
      ada_restroom,
      ada_accessible_seating,
      ada_compliance,
      ada_last_updated,
    });

    return Response.json({
      found: true,
      ada_parking,
      ada_entrance_ramp,
      ada_restroom,
      ada_accessible_seating,
      ada_compliance,
      ada_last_updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});