const KEY = "safeeats_favorites";

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function isFavorite(businessId) {
  return getFavorites().some((f) => f.business_id === businessId);
}

export function toggleFavorite(restaurant) {
  const favs = getFavorites();
  const exists = favs.some((f) => f.business_id === restaurant.business_id);
  const next = exists
    ? favs.filter((f) => f.business_id !== restaurant.business_id)
    : [...favs, { business_id: restaurant.business_id, name: restaurant.name, safetyScore: restaurant.safetyScore, address: restaurant.address, city: restaurant.city, savedAt: Date.now() }];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return !exists; // returns new state
}