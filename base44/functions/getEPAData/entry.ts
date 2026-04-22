import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EPA_ECHO_API = "https://echodata.epa.gov/api/echo/facilities/search";
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function fetchEPAData(address) {
  if (!address) return null;
  try {
    const params = new URLSearchParams({
      address: address,
      output: "json",
    });

    const response = await fetch(`${EPA_ECHO_API}?${params}`, {
      headers: { "User-Agent": "SafeEats/1.0" },
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (!data.Results || data.Results.length === 0) return null;

    const facility = data.Results[0];
    
    return {
      air_quality_index: facility.AQI !== undefined ? parseInt(facility.AQI) : null,
      water_quality_violations: facility.RCRACompliance ? parseInt(facility.RCRACompliance) : null,
      hazardous_waste_score: facility.HazardousSiteScore ? parseFloat(facility.HazardousSiteScore) : null,
      epa_facility_id: facility.RegistryID || null,
      fetched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("EPA API error:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { address, business_id } = await req.json();

    if (!address) {
      return Response.json({ epa_data: null });
    }

    // Check cache using business_id as key
    const cacheKey = `epa_${business_id || address.replace(/\s+/g, "_")}`;
    
    // Try to get from cache
    let cached = null;
    try {
      const user = await base44.auth.me();
      if (user) {
        const cacheData = await base44.auth.updateMe({ [cacheKey]: null }).catch(() => null);
        // Cache via metadata is complex, so we'll just fetch fresh each time
        // In production, use a proper cache layer like Redis
      }
    } catch {}

    // Fetch EPA data
    const epaData = await fetchEPAData(address);

    return Response.json({ epa_data: epaData });
  } catch (error) {
    return Response.json({ error: error.message, epa_data: null }, { status: 500 });
  }
});