import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EPA_ECHO_API = "https://echodata.epa.gov/api/echo/facilities/search";

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWaterFacility(facility) {
  const type = (facility.FacilityTypeName || "").toLowerCase();
  const program = (facility.ProgramDescription || "").toLowerCase();
  const facilityType = (facility.SICDescription || "").toLowerCase();
  
  const keywords = ["water system", "public water", "drinking water", "sdwa", "water"];
  return keywords.some(k => type.includes(k) || program.includes(k) || facilityType.includes(k));
}

function validateFacility(facility, restaurantState, restaurantZip, restaurantLat, restaurantLon) {
  const checks = {
    state_check: facility.StateCode === restaurantState,
    state_reason: facility.StateCode !== restaurantState ? "state_mismatch" : null,
  };

  // State is mandatory
  if (!checks.state_check) {
    return { valid: false, reason: "state_mismatch", checks };
  }

  // ZIP check with fallback
  const zipMatch = facility.Zip === restaurantZip;
  checks.zip_check = zipMatch;
  
  if (!zipMatch) {
    // Try fallback: if within 1 mile, allow
    const distance = haversineDistance(
      restaurantLat, restaurantLon,
      parseFloat(facility.Latitude) || 0,
      parseFloat(facility.Longitude) || 0
    );
    checks.computed_distance = parseFloat(distance.toFixed(3));
    
    if (distance < 1) {
      checks.zip_reason = "zip_fallback (within 1 mile)";
    } else {
      return { valid: false, reason: "zip_mismatch", checks };
    }
  }

  // Distance check (3 miles)
  const distance = haversineDistance(
    restaurantLat, restaurantLon,
    parseFloat(facility.Latitude) || 0,
    parseFloat(facility.Longitude) || 0
  );
  checks.computed_distance = parseFloat(distance.toFixed(3));
  checks.distance_check = distance <= 3;

  if (distance > 3) {
    return { valid: false, reason: "distance_exceeded", checks };
  }

  // Facility type check
  checks.facility_type = facility.FacilityTypeName;
  checks.is_water_facility = isWaterFacility(facility);

  if (!isWaterFacility(facility)) {
    return { valid: false, reason: "invalid_facility_type", checks };
  }

  checks.final_reason = "ok";
  return { valid: true, reason: "ok", checks };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, city, state, zip, business_id, latitude, longitude } = await req.json();

    const logs = {
      business_id,
      geocoding: null,
      epa_request: null,
      epa_response: null,
      facilities_evaluated: [],
      final_status: null,
      selected_facility: null,
    };

    // Validate inputs
    if (!address || !city || !state) {
      logs.final_status = "missing_address_data";
      return Response.json({ epa_data: null, epa_status: "missing_address_data", logs });
    }

    // Use provided lat/lng or geocode
    let lat = latitude;
    let lon = longitude;

    if (!lat || !lon) {
      logs.geocoding = {
        request: { address, city, state },
        service: "nominatim",
      };

      try {
        const query = `${address}, ${city}, ${state}`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        logs.geocoding.url = url;

        const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
        const data = await res.json();

        if (!data || data.length === 0) {
          logs.geocoding.error = "No geocoding results";
          logs.final_status = "geocoding_failed";
          return Response.json({ epa_data: null, epa_status: "geocoding_failed", logs });
        }

        lat = parseFloat(data[0].lat);
        lon = parseFloat(data[0].lon);
        logs.geocoding.result = { latitude: lat, longitude: lon };
      } catch (err) {
        logs.geocoding.error = err.message;
        logs.final_status = "geocoding_failed";
        return Response.json({ epa_data: null, epa_status: "geocoding_failed", logs });
      }
    }

    if (!lat || !lon) {
      logs.final_status = "geocoding_failed";
      return Response.json({ epa_data: null, epa_status: "geocoding_failed", logs });
    }

    // EPA ECHO API request
    const epaUrl = `${EPA_ECHO_API}?qaddress=${encodeURIComponent(`${address}, ${city}, ${state} ${zip || ""}`)}` +
      `&p_st=${encodeURIComponent(state)}` +
      `&distance=3` +
      `&output=json`;

    logs.epa_request = { url: epaUrl };

    try {
      const res = await fetch(epaUrl, { headers: { "User-Agent": "SafeEats/1.0" } });
      const epaJson = await res.json();
      logs.epa_response = epaJson;

      const facilities = epaJson.Results || [];

      // Evaluate each facility
      facilities.forEach((facility) => {
        const validation = validateFacility(facility, state, zip, lat, lon);
        logs.facilities_evaluated.push({
          name: facility.FacilityName,
          address: facility.RegistryAddress,
          city: facility.City,
          state: facility.StateCode,
          zip: facility.Zip,
          epa_distance: facility.Distance,
          computed_distance: validation.checks.computed_distance,
          validation: validation.checks,
          final_reason: validation.reason,
        });

        // Select first valid facility
        if (validation.valid && !logs.selected_facility) {
          logs.selected_facility = {
            facility_id: facility.RegistryID,
            name: facility.FacilityName,
            water_violations: facility.RCRACompliance ? parseInt(facility.RCRACompliance) : 0,
            hazard_score: facility.HazardousSiteScore ? parseFloat(facility.HazardousSiteScore) : null,
          };
        }
      });

      if (!logs.selected_facility) {
        logs.final_status = facilities.length === 0 ? "no_results" : "no_valid_facilities";
        return Response.json({
          epa_data: null,
          epa_status: logs.final_status,
          logs,
        });
      }

      logs.final_status = "ok";
      const epaData = {
        water_quality_violations: logs.selected_facility.water_violations,
        hazardous_waste_score: logs.selected_facility.hazard_score,
        epa_facility_id: logs.selected_facility.facility_id,
        fetched_at: new Date().toISOString(),
      };

      return Response.json({
        epa_data: epaData,
        epa_status: "ok",
        logs,
      });
    } catch (err) {
      logs.epa_error = err.message;
      logs.final_status = "epa_request_failed";
      return Response.json({
        epa_data: null,
        epa_status: "epa_request_failed",
        logs,
      });
    }
  } catch (error) {
    return Response.json({ error: error.message, epa_data: null, epa_status: "error" }, { status: 500 });
  }
});