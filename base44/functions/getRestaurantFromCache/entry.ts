import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Retrieves a restaurant from cache by business_id and source.
 * Returns cached ada_compliance and epa_data if available.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { business_id, source } = await req.json();

    if (!business_id || !source) {
      return Response.json({ error: 'Missing business_id or source' }, { status: 400 });
    }

    const cached = await base44.entities.Restaurant.filter({
      business_id,
      source,
    }).catch(() => []);

    if (!cached || cached.length === 0) {
      return Response.json({ cached_restaurant: null });
    }

    const restaurant = cached[0];

    // Build EPA data object from cached fields
    const epa_data = restaurant.epa_facility_id ? {
      air_quality_index: restaurant.epa_air_quality_index,
      water_quality_violations: restaurant.epa_water_violations,
      hazardous_waste_score: restaurant.epa_hazardous_waste_score,
      epa_facility_id: restaurant.epa_facility_id,
      fetched_at: restaurant.epa_fetched_at,
    } : null;

    return Response.json({
      cached_restaurant: {
        ...restaurant,
        epa_data,
      },
    });
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});