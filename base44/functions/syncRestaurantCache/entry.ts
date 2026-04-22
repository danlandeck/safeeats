import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Syncs a restaurant to the persistent cache.
 * Merges search results with cached ADA/EPA data.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { restaurant } = await req.json();

    if (!restaurant || !restaurant.business_id || !restaurant.name) {
      return Response.json({ error: 'Invalid restaurant data' }, { status: 400 });
    }

    // Check if restaurant already cached
    const existing = await base44.entities.Restaurant.filter({
      business_id: restaurant.business_id,
      source: restaurant.source,
    }).catch(() => []);

    const restaurantData = {
      business_id: restaurant.business_id,
      name: restaurant.name,
      address: restaurant.address || '',
      city: restaurant.city || '',
      zip_code: restaurant.zip_code || '',
      phone: restaurant.phone || '',
      website: restaurant.website || '',
      description: restaurant.description || '',
      county_id: restaurant.county_id,
      source: restaurant.source,
      safetyScore: restaurant.safetyScore,
      grade: restaurant.grade,
      totalInspections: restaurant.totalInspections,
      latestDate: restaurant.latestDate,
      latestResult: restaurant.latestResult,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      isLLMData: restaurant.isLLMData || false,
      ada_compliance: restaurant.ada_compliance || 'unknown',
      cuisine: restaurant.cuisine,
      is_vegan_friendly: restaurant.is_vegan_friendly || false,
      is_vegetarian_friendly: restaurant.is_vegetarian_friendly || false,
      is_kosher: restaurant.is_kosher || false,
      is_halal: restaurant.is_halal || false,
      is_gluten_free_options: restaurant.is_gluten_free_options || false,
      dietary_tags: restaurant.dietary_tags || [],
      cached_at: new Date().toISOString(),
      last_api_check: new Date().toISOString(),
    };

    // Add water system data if provided (Washington only)
    if (restaurant.water_system_name) {
      restaurantData.water_system_name = restaurant.water_system_name;
      restaurantData.water_system_id = restaurant.water_system_id;
      restaurantData.water_source_type = restaurant.water_source_type;
      restaurantData.sanitary_survey_score = restaurant.sanitary_survey_score;
      restaurantData.monitoring_violations = restaurant.monitoring_violations;
      restaurantData.water_quality_violations = restaurant.water_quality_violations;
      restaurantData.health_advisories = restaurant.health_advisories;
      restaurantData.water_safety_grade = restaurant.water_safety_grade;
    }

    let result;
    if (existing && existing.length > 0) {
      // Update existing cache record
      result = await base44.entities.Restaurant.update(existing[0].id, restaurantData);
    } else {
      // Create new cache record
      result = await base44.entities.Restaurant.create(restaurantData);
    }

    return Response.json({
      success: true,
      cached_restaurant: result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});