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

  console.log("[ADA] Text Search query:", query);
  console.log("[ADA] Text Search URL:", url);
  console.log("[ADA] Text Search headers (key truncated):", {
    ...headers,
    "X-Goog-Api-Key": GOOGLE_API_KEY ? `${GOOGLE_API_KEY.slice(0, 6)}...` : "MISSING",
  });

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const responseText = await res.text();
  console.log("[ADA] Text Search response status:", res.status);
  console.log("[ADA] Text Search raw response:", responseText);

  if (!res.ok) return null;
  let data;
  try { data = JSON.parse(responseText); } catch { return null; }
  const placeId = data?.places?.[0]?.id || null;
  console.log("[ADA] place_id found:", placeId);
  return placeId;
}

async function fetchAccessibility(placeId) {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const headers = {
    "X-Goog-Api-Key": GOOGLE_API_KEY,
    "X-Goog-FieldMask": "accessibilityOptions",
  };

  console.log("[ADA] Place Details URL:", url);
  console.log("[ADA] Place Details headers (key truncated):", {
    ...headers,
    "X-Goog-Api-Key": GOOGLE_API_KEY ? `${GOOGLE_API_KEY.slice(0, 6)}...` : "MISSING",
  });

  const res = await fetch(url, { headers });
  const responseText = await res.text();
  console.log("[ADA] Place Details response status:", res.status);
  console.log("[ADA] Place Details raw response:", responseText);

  if (!res.ok) return null;
  let data;
  try { data = JSON.parse(responseText); } catch { return null; }
  return data?.accessibilityOptions || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { business_id, name, address, city } = await req.json();

    console.log("[ADA] Request received — business_id:", business_id, "name:", name, "address:", address, "city:", city);
    console.log("[ADA] API key present:", !!GOOGLE_API_KEY);

    if (!business_id || !name) {
      return Response.json({ error: "business_id and name are required" }, { status: 400 });
    }

    if (!GOOGLE_API_KEY) {
      console.log("[ADA] ERROR: GOOGLE_MAPS_API_KEY env var is not set");
      return Response.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
    }

    // Step 1: Check DB for existing record by business_id
    const existing = await base44.asServiceRole.entities.Restaurant.filter({ business_id });
    const record = existing?.[0] || null;
    console.log("[ADA] DB record found:", !!record, record ? `id=${record.id}` : "");

    // Step 2: Check 30-day cache
    if (record?.ada_last_updated) {
      const age = Date.now() - new Date(record.ada_last_updated).getTime();
      console.log("[ADA] Cache age (days):", Math.round(age / 86400000));
      if (age < THIRTY_DAYS_MS) {
        console.log("[ADA] Returning cached data");
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

    // Step 3: Find Google place_id
    let placeId = record?.google_place_id || null;
    console.log("[ADA] Existing place_id from DB:", placeId);
    if (!placeId) {
      placeId = await findPlaceId(name, address, city);
    }

    // Step 4: Fetch accessibility
    const opts = placeId ? await fetchAccessibility(placeId) : null;
    console.log("[ADA] accessibilityOptions:", JSON.stringify(opts));

    const ada_parking            = boolToYesNo(opts?.wheelchairAccessibleParking);
    const ada_entrance_ramp      = boolToYesNo(opts?.wheelchairAccessibleEntrance);
    const ada_restroom           = boolToYesNo(opts?.wheelchairAccessibleRestroom);
    const ada_accessible_seating = boolToYesNo(opts?.wheelchairAccessibleSeating);
    const ada_compliance         = deriveCompliance(ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating);
    const ada_last_updated       = new Date().toISOString();

    console.log("[ADA] Mapped values:", { ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating, ada_compliance });

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
      console.log("[ADA] Updating existing DB record:", record.id);
      await base44.asServiceRole.entities.Restaurant.update(record.id, adaFields);
    } else {
      console.log("[ADA] Creating new DB record for business_id:", business_id);
      await base44.asServiceRole.entities.Restaurant.create({
        business_id,
        name,
        source: "ada_cache",
        ...adaFields,
      });
    }

    return Response.json({ ...adaFields });
  } catch (error) {
    console.log("[ADA] Unhandled error:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});