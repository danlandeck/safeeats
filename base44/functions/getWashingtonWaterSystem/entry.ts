import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DOH_API_BASE = "https://doh.wa.gov/data-and-stats/drinking-water";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

async function geocodeAddress(address, city, zip) {
  try {
    const query = [address, city, "Washington", zip].filter(Boolean).join(", ");
    const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
    const data = await res.json();
    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function queryWashingtonDOH(zip, city) {
  try {
    // Washington State DOH Drinking Water System lookup
    // Using EPA Safe Drinking Water Information System (SDWIS) for WA data
    // This endpoint returns water systems by ZIP code
    const url = `https://echodata.epa.gov/api/echo/drinking-water/search?zip=${encodeURIComponent(zip)}&state=WA&output=json`;
    
    console.log("DOH Query URL:", url);
    
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
    const data = await res.json();
    
    console.log("DOH Response:", JSON.stringify(data, null, 2));
    
    if (!data.Results || data.Results.length === 0) {
      return { status: "no_systems_found", logs: { url, response: data } };
    }

    // Get the first matching system (typically most relevant)
    const system = data.Results[0];
    
    // Extract required fields from EPA SDWIS data
    const waterSystemData = {
      water_system_name: system.PublicWaterSupplyName || system.WaterSupplyName || "",
      water_system_id: system.PWS_ID || system.WaterSupplyID || "",
      water_source_type: system.SourceWaterType || "unknown",
      sanitary_survey_score: system.SanitarySurveyScore ? parseFloat(system.SanitarySurveyScore) : null,
      monitoring_violations: parseInt(system.MonitoringViolations) || 0,
      water_quality_violations: parseInt(system.WaterQualityViolations) || 0,
      health_advisories: parseInt(system.HealthAdvisories) || 0,
    };

    // Compute water safety grade (A/B/C/D)
    let water_safety_grade = "A";
    
    if (waterSystemData.health_advisories > 0 || waterSystemData.water_quality_violations > 2) {
      water_safety_grade = "D"; // Unsafe
    } else if (waterSystemData.water_quality_violations > 0) {
      water_safety_grade = "C"; // Caution
    } else if (waterSystemData.monitoring_violations > 0) {
      water_safety_grade = "B"; // Generally Safe
    } else {
      water_safety_grade = "A"; // Safe
    }

    return {
      status: "ok",
      water_system_data: { ...waterSystemData, water_safety_grade },
      logs: { url, system_name: system.PublicWaterSupplyName },
    };
  } catch (error) {
    console.error("DOH API error:", error);
    return { status: "api_error", error: error.message, logs: {} };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, city, zip, state } = await req.json();

    // Only handle Washington State
    if (state && state.toUpperCase() !== "WA" && state.toUpperCase() !== "WASHINGTON") {
      return Response.json({
        status: "non_washington",
        message: "Washington State DOH lookup only available for WA addresses",
      });
    }

    // Step 1: Geocode if needed
    let geocodeData = null;
    if (!zip || !city) {
      geocodeData = await geocodeAddress(address, city, zip);
      if (!geocodeData) {
        return Response.json({
          status: "geocoding_failed",
          error: "Could not geocode address",
          logs: { address, city, zip },
        });
      }
    }

    const finalZip = zip || geocodeData?.zip || "";
    const finalCity = city || geocodeData?.city || "";

    // Step 2: Query Washington DOH
    const dohResult = await queryWashingtonDOH(finalZip, finalCity);

    if (dohResult.status !== "ok") {
      return Response.json({
        status: dohResult.status,
        error: dohResult.error || "Could not retrieve water system data",
        logs: dohResult.logs,
      });
    }

    return Response.json({
      status: "ok",
      ...dohResult.water_system_data,
      logs: dohResult.logs,
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message, status: "error" }, { status: 500 });
  }
});