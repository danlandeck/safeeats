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
  if (known.every(v => v === "yes")) return "accessible";
  if (known.every(v => v === "no")) return "not_accessible";
  if (known.some(v => v === "yes")) return "partially_accessible";
  return "unknown";
}

async function findPlaceId(name, address, city) {
  const query = [name, address, city].filter(Boolean).join(" ");
  const url = "https://places.googleapis.com/v1/places:searchText";
  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": GOOGLE_API_KEY,
    "X-Goog-FieldMask": "places.id",
  };
  const body = { textQuery: query };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) return null;
  let data;
  try { data = await res.json(); } catch { return null; }
  return data?.places?.[0]?.id || null;
}

async function fetchAccessibility(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const headers = {
    "X-Goog-Api-Key": GOOGLE_API_KEY,
    "X-Goog-FieldMask": "accessibilityOptions",
  };

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  let data;
  try { data = await res.json(); } catch { return null; }
  return data?.accessibilityOptions || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { business_id, name, address, city } = await req.json();

    if (!business_id || !name) {
      return Response.json({ error: "business_id and name are required" }, { status: 400 });
    }

    if (!GOOGLE_API_KEY) {
      return Response.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
    }

    // Step 1: Check DB for existing record by business_id
    const existing = await base44.asServiceRole.entities.Restaurant.filter({ business_id });
    const record = existing?.[0] || null;

    // Step 2: Check 30-day cache before any Google API call
    if (record?.ada_last_updated) {
      const age = Date.now() - new Date(record.ada_last_updated).getTime();
      if (age < THIRTY_DAYS_MS) {
        return Response.json({
          cached: true,
          ada_parking: record.ada_parking || "unknown",
          ada_entrance_ramp: record.ada_entrance_ramp || "unknown",
          ada_restroom: record.ada_restroom || "unknown",
          ada_accessible_seating: record.ada_accessible_seating || "unknown",
          ada_compliance: record.ada_compliance || "unknown",
          ada_last_updated: record.ada_last_updated,
        });
      }
    }

    // Step 3: Find Google place_id (reuse from DB if available)
    let placeId = record?.google_place_id || null;
    if (!placeId) {
      placeId = await findPlaceId(name, address, city);
    }

    // Step 4: Fetch accessibility
    const opts = placeId ? await fetchAccessibility(placeId) : null;

    const ada_parking            = boolToYesNo(opts?.wheelchairAccessibleParking);
    const ada_entrance_ramp      = boolToYesNo(opts?.wheelchairAccessibleEntrance);
    const ada_restroom           = boolToYesNo(opts?.wheelchairAccessibleRestroom);
    const ada_accessible_seating = boolToYesNo(opts?.wheelchairAccessibleSeating);
    const ada_compliance         = deriveCompliance(ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating);
    const ada_last_updated       = new Date().toISOString();

    const adaFields = {
      ada_parking,
      ada_entrance_ramp,
      ada_restroom,
      ada_accessible_seating,
      ada_compliance,
      ada_last_updated,
      ...(placeId ? { google_place_id: placeId } : {}),
    };

    // Step 5: Create or update DB record
    if (record) {
      await base44.asServiceRole.entities.Restaurant.update(record.id, adaFields);
    } else {
      await base44.asServiceRole.entities.Restaurant.create({
        business_id,
        name,
        source: "ada_cache",
        ...adaFields,
      });
    }

    return Response.json({ ...adaFields });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});