/**
 * SafeEats search state management.
 * Centralizes all localStorage keys used by the search subsystem.
 */

export const SEARCH_KEYS = [
  "safeeats_recent",          // recent search queries
  "safeeats_recent_locations", // recent location searches
  "safeeats_ada_cache",        // ADA accessibility lookup cache
];

/**
 * Clears all stored search state from localStorage.
 * Returns the confirmation object per spec.
 */
export function clearSearchState() {
  SEARCH_KEYS.forEach((key) => {
    try { localStorage.removeItem(key); } catch {}
  });
  return { search_state: "cleared", history_count: 0 };
}