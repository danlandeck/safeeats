import { getJurisdictionPortal } from "./jurisdictionResolver";

/**
 * Resolve the best available official inspection portal URL for a restaurant.
 *
 * Resolution order:
 *   1. Explicit portal_url on the restaurant object (set by backend processors)
 *   2. getJurisdictionPortal(state, city, country) — hierarchical registry lookup
 *   3. Google search fallback ("[name] [city] [state] health inspection")
 *
 * Returns { url, name, isFallback } — always returns a URL so every restaurant
 * gets a verify link.
 */
export function resolveOfficialPortal(restaurant) {
  if (!restaurant) return null;

  // 1. Explicit portal fields from backend processors
  if (restaurant.portal_url) {
    return {
      url: restaurant.portal_url,
      name: restaurant.portal_name || "Official inspection records",
      isFallback: false,
    };
  }

  // 2. Jurisdiction registry lookup
  const state = restaurant.state || "";
  const city = restaurant.city || "";
  const country = restaurant.country || "US";
  try {
    const portal = getJurisdictionPortal(state, city, country);
    if (portal?.url) {
      return { url: portal.url, name: portal.name || "Official inspection portal", isFallback: false };
    }
  } catch { /* registry miss — continue to fallback */ }

  // 3. Google search fallback — ensures every restaurant gets a verify link
  const parts = [restaurant.name, city, state].filter(Boolean).join(" ");
  const query = encodeURIComponent(`${parts} restaurant health inspection score`);
  return {
    url: `https://www.google.com/search?q=${query}`,
    name: "Search for inspection records",
    isFallback: true,
  };
}