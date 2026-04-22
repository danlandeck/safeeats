/**
 * Geocoding utility for address → lat/lng conversion
 */

export async function geocodeAddress(address, city, state) {
  const query = [address, city, state].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  
  const logData = { query, url };
  
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
    const data = await res.json();
    
    if (data.length > 0) {
      const result = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      logData.result = result;
      return { success: true, ...result, log: logData };
    }
    
    logData.error = "No results found";
    return { success: false, log: logData };
  } catch (error) {
    logData.error = error.message;
    return { success: false, log: logData };
  }
}

/**
 * Haversine formula: calculates great-circle distance between two points
 * Returns distance in miles
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}