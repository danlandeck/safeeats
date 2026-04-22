import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backfill ada_compliance for all existing restaurants.
 * Sets to "unknown" if no data available.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all restaurants
    const allRestaurants = await base44.asServiceRole.entities.Restaurant.list().catch(() => []);

    let scanned = 0;
    let updated = 0;
    let unknownCount = 0;

    // Process each restaurant
    for (const restaurant of allRestaurants) {
      scanned++;

      // If already has ada_compliance, skip
      if (restaurant.ada_compliance && restaurant.ada_compliance !== "unknown") {
        continue;
      }

      // Set to unknown (default fallback)
      await base44.asServiceRole.entities.Restaurant.update(restaurant.id, {
        ada_compliance: "unknown",
      }).catch(() => null);

      updated++;
      unknownCount++;
    }

    return Response.json({
      success: true,
      counts: {
        scanned,
        updated,
        unknown: unknownCount,
      },
      message: `ADA migration complete: scanned ${scanned}, updated ${updated}, set to unknown: ${unknownCount}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});