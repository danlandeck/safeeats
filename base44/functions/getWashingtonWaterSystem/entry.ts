import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EPA_BASE = "https://data.epa.gov/dmapservice";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

// Case-insensitive field access — EPA dmapservice API returns lowercase column names
function gv(row, field) {
  return row?.[field] ?? row?.[field.toLowerCase()] ?? null;
}

const SOURCE_LABELS = {
  GW: "Groundwater (well)",
  SW: "Surface water (lake/river/reservoir)",
  GU: "Groundwater under surface water influence",
  GWP: "Groundwater (purchased)",
  SWP: "Surface water (purchased)",
};

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

async function queryEPAWaterSystem(zip, city) {
  try {
    // Query EPA SDWIS via dmapservice API for WA active CWS systems by zip
    const url = `${EPA_BASE}/sdwis.water_system/primacy_agency_code/equals/WA/and/pws_activity_code/equals/A/and/pws_type_code/equals/CWS/and/zip_code/equals/${encodeURIComponent(zip)}/json`;
    
    console.log("EPA Query URL:", url);
    
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0", Accept: "application/json" } });
    if (!res.ok) return { status: "api_error", error: `EPA HTTP ${res.status}` };
    const rows = await res.json();
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return { status: "no_systems_found" };
    }

    // Pick the largest public system (filter out private/small systems)
    const PRIVATE_REGEX = /(CONDO|MOBILE|TRAILER|APARTMENT|MHP|MHC|RV PARK|HOMES|ESTATES|VILLAGE|CAMP|MANOR|SUBDIVISION|HOA)/i;
    const filtered = rows
      .map(r => ({ ...r, _pop: Number(gv(r, "POPULATION_SERVED_COUNT")) || 0 }))
      .filter(r => r._pop >= 1000)
      .filter(r => !PRIVATE_REGEX.test(gv(r, "PWS_NAME") || ""))
      .sort((a, b) => b._pop - a._pop);

    // If private-system filter removed everything, fall back to largest by population
    const system = filtered[0] || rows
      .map(r => ({ ...r, _pop: Number(gv(r, "POPULATION_SERVED_COUNT")) || 0 }))
      .sort((a, b) => b._pop - a._pop)[0];
    if (!system) return { status: "no_systems_found" };

    const pwsid = gv(system, "PWSID");

    // Fetch violations for this system
    let monitoringViolations = 0;
    let waterQualityViolations = 0;
    let healthAdvisories = 0;

    try {
      const violUrl = `${EPA_BASE}/sdwis.VIOLATION/pwsid/equals/${pwsid}/json`;
      const violRes = await fetch(violUrl, { headers: { "User-Agent": "SafeEats/1.0", Accept: "application/json" } });
      if (violRes.ok) {
        const violations = await violRes.json();
        if (Array.isArray(violations)) {
          // Health-based violations (MCL, MRDL, TT) = water quality violations
          waterQualityViolations = violations.filter(v => 
            ["MCL","MRDL","TT"].includes(gv(v, "VIOLATION_CATEGORY_CODE"))
          ).length;
          // Monitoring/reporting violations
          monitoringViolations = violations.filter(v => 
            !["MCL","MRDL","TT"].includes(gv(v, "VIOLATION_CATEGORY_CODE"))
          ).length;
          // Unresolved health-based = health advisories
          healthAdvisories = violations.filter(v => 
            ["MCL","MRDL","TT"].includes(gv(v, "VIOLATION_CATEGORY_CODE")) &&
            ["Unaddressed","Addressed"].includes(gv(v, "VIOLATION_STATUS"))
          ).length;
        }
      }
    } catch (e) {
      console.warn("Violations lookup failed:", e.message);
    }

    const waterSystemData = {
      water_system_name: gv(system, "PWS_NAME") || "",
      water_system_id: pwsid || "",
      water_source_type: SOURCE_LABELS[gv(system, "PRIMARY_SOURCE_CODE")] || "unknown",
      sanitary_survey_score: null,
      monitoring_violations: monitoringViolations,
      water_quality_violations: waterQualityViolations,
      health_advisories: healthAdvisories,
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
      logs: { url, system_name: gv(system, "PWS_NAME") },
    };
  } catch (error) {
    console.error("EPA API error:", error);
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

    // Step 2: Query EPA SDWIS
    const result = await queryEPAWaterSystem(finalZip, finalCity);

    if (result.status !== "ok") {
      return Response.json({
        status: result.status,
        error: result.error || "Could not retrieve water system data",
        logs: result.logs,
      });
    }

    return Response.json({
      status: "ok",
      ...result.water_system_data,
      logs: result.logs,
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message, status: "error" }, { status: 500 });
  }
});