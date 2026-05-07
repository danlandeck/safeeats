import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
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
  const textQuery = [name, address, city].filter(Boolean).join(" ");
  console.log("[ADA] Searching for:", textQuery);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({ textQuery }),
  });

  const data = await res.json();
  console.log("[ADA] Text Search response:", JSON.stringify(data));
  return data?.places?.[0]?.id || null;
}

async function fetchAccessibility(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "accessibilityOptions",
    },
  });

  const data = await res.json();
  console.log("[ADA] Details response:", JSON.stringify(data));
  return data?.accessibilityOptions || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { business_id, name, address, city } = await req.json();

    console.log("[ADA] API key present:", !!GOOGLE_API_KEY);
    console.log("[ADA] Request for business_id:", business_id, "name:", name);

    if (!business_id || !name) {
      return Response.json({ error: "business_id and name are required" }, { status: 400 });
    }

    if (!GOOGLE_API_KEY) {
      console.error("[ADA] GOOGLE_API_KEY is not set. Returning all Unknown.");
      return Response.json({
        ada_parking: "unknown",
        ada_entrance_ramp: "unknown",
        ada_restroom: "unknown",
        ada_accessible_seating: "unknown",
        ada_compliance: "unknown",
        ada_last_updated: null,
      });
    }

    // Step 1: Check DB for existing record
    console.log("[ADA] Checking DB cache...");
    const existing = await base44.asServiceRole.entities.Restaurant.filter({ business_id });
    const record = existing?.[0] || null;
    console.log("[ADA] DB record found:", !!record, record ? `ada_last_updated: ${record.ada_last_updated}` : "");

    // Step 2: Use cache if fresh
    if (record?.ada_last_updated) {
      const age = Date.now() - new Date(record.ada_last_updated).getTime();
      if (age < THIRTY_DAYS_MS) {
        console.log("[ADA] Returning cached data (age:", Math.round(age / 86400000), "days)");
        return Response.json({
          cached: true,
          ada_parking:            record.ada_parking            || "unknown",
          ada_entrance_ramp:      record.ada_entrance_ramp      || "unknown",
          ada_restroom:           record.ada_restroom           || "unknown",
          ada_accessible_seating: record.ada_accessible_seating || "unknown",
          ada_compliance:         record.ada_compliance         || "unknown",
          ada_last_updated:       record.ada_last_updated,
        });
      }
      console.log("[ADA] Cache expired, fetching from Google...");
    }

    // Step 3: Get place_id (reuse from DB if available)
    let placeId = record?.google_place_id || null;
    if (!placeId) {
      placeId = await findPlaceId(name, address, city);
    } else {
      console.log("[ADA] Reusing cached place_id:", placeId);
    }
    console.log("[ADA] Found place_id:", placeId);

    // Step 4: Fetch accessibility options
    const opts = placeId ? await fetchAccessibility(placeId) : null;

    // Step 5: Map fields
    const ada_parking            = boolToYesNo(opts?.wheelchairAccessibleParking);
    const ada_entrance_ramp      = boolToYesNo(opts?.wheelchairAccessibleEntrance);
    const ada_restroom           = boolToYesNo(opts?.wheelchairAccessibleRestroom);
    const ada_accessible_seating = boolToYesNo(opts?.wheelchairAccessibleSeating);
    const ada_compliance         = deriveCompliance(ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating);
    const ada_last_updated       = new Date().toISOString();

    const adaFields = { ada_parking, ada_entrance_ramp, ada_restroom, ada_accessible_seating, ada_compliance, ada_last_updated };
    console.log("[ADA] Mapped fields:", JSON.stringify(adaFields));

    // Step 6: Save to DB
    const dbPayload = { ...adaFields, ...(placeId ? { google_place_id: placeId } : {}) };
    console.log("[ADA] Saving to DB:", JSON.stringify(dbPayload));

    if (record) {
      await base44.asServiceRole.entities.Restaurant.update(record.id, dbPayload);
    } else {
      await base44.asServiceRole.entities.Restaurant.create({
        business_id,
        name,
        source: "ada_cache",
        ...dbPayload,
      });
    }
    console.log("[ADA] DB save successful");

    return Response.json(adaFields);
  } catch (error) {
    console.error("[ADA] Fatal error:", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});