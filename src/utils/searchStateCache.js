/**
 * Module-level cache for preserving search state across route navigations.
 * When a user navigates from Home to /restaurant/:id and back, this cache
 * allows Home to restore its search results without re-fetching.
 */
let cachedSearchState = null;

export function saveSearchContext(state) {
  cachedSearchState = state;
}

export function getSearchContext() {
  return cachedSearchState;
}

export function clearSearchContext() {
  cachedSearchState = null;
}