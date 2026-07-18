// ── Reverse Geocoding ─────────────────────────────────────────────────────────
// Given lat/lng, returns { city, county, state, country } using Nominatim
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
    const data = await res.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.suburb || "",
      county: addr.county || "",
      state: addr.state || "",
      country: addr.country || "",
      countryCode: (addr.country_code || "").toUpperCase(),
      displayName: data.display_name || "",
    };
  } catch {
    return null;
  }
}

// ── Geocoding ─────────────────────────────────────────────────────────────────
// Works globally — stateOrCountry can be a US state abbr, country name, or city
export async function geocodeAddress(address, city, stateOrCountry) {
  const parts = [address, city, stateOrCountry].filter(Boolean);
  const q = parts.join(", ");
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "SafeEats/1.0" } });
  const data = await res.json();
  if (data.length > 0) return { latitude: data[0].lat, longitude: data[0].lon };
  if (city && stateOrCountry) {
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${city}, ${stateOrCountry}`)}&format=json&limit=1`;
    const fallbackRes = await fetch(fallbackUrl, { headers: { "User-Agent": "SafeEats/1.0" } });
    const fallbackData = await fallbackRes.json();
    if (fallbackData.length > 0) return { latitude: fallbackData[0].lat, longitude: fallbackData[0].lon };
  }
  return null;
}