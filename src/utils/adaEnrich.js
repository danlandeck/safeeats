import { base44 } from "@/api/base44Client";
import { SEARCH_KEYS } from "./searchState";

// ── Background ADA enrichment for search result cards ──────────────────────────
// The detail page (ADAAccessibilityBadge) already looks up Google Places
// accessibility options per restaurant. This module does the same in batch for
// the results list, so cards show real accessibility status instead of
// "Tap to verify ADA". Shares the same localStorage cache as the detail page,
// so a place looked up on a card is instantly reused on the detail page.

const ADA_CACHE_KEY = SEARCH_KEYS[2];

function loadCache() {
  try { return JSON.parse(localStorage.getItem(ADA_CACHE_KEY) || "{}"); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(ADA_CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
}

// ADA is a US law — never attach status to international restaurants.
const INTERNATIONAL_SOURCES = ["toronto", "dubai", "uk_fsa", "singapore", "australia_nsw", "australia_qld", "vancouver_bc"];
function isUSRestaurant(r) {
  if (r.country) return r.country.toUpperCase().trim() === "US";
  return !INTERNATIONAL_SOURCES.includes(r.source);
}

// Map Google Places accessibility options to our compliance status.
// Returns null when Google has no usable data — status stays "unknown".
function statusFromPlace(d) {
  if (!d?.found || !d?.hasAnyData) return null;
  const ent = d.wheelchairAccessibleEntrance;
  const parking = d.wheelchairAccessibleParking;
  const restroom = d.wheelchairAccessibleRestroom;
  const seating = d.wheelchairAccessibleSeating;
  const flags = [ent, parking, restroom, seating].filter(v => v === true || v === false);
  if (flags.length === 0) return null;
  if (ent === false) return "not_accessible";
  if (flags.every(Boolean)) return "accessible";
  return "partially_accessible";
}

const BATCH_SIZE = 12;

/**
 * Fill in ADA compliance for a list of restaurants (batch Google Places lookup,
 * cache-backed). Calls onUpdate with the full updated list when anything changed.
 *
 * @param {Array} results - current restaurant results
 * @param {Function|null} onUpdate - callback receiving the updated list
 */
export function enrichADA(results, onUpdate) {
  if (!results || results.length === 0 || !onUpdate) return;

  const cache = loadCache();
  let changed = false;
  const merged = results.map((r) => {
    if (!isUSRestaurant(r) || (r.ada_compliance && r.ada_compliance !== "unknown")) return r;
    const cached = cache[`places-ada-${r.business_id}`];
    const status = cached ? statusFromPlace(cached) : null;
    if (!status) return r;
    changed = true;
    return { ...r, ada_compliance: status };
  });
  if (changed) onUpdate(merged);

  // Collect US restaurants that still need a live lookup (not in cache)
  const needLookup = [];
  merged.forEach((r, idx) => {
    if (!isUSRestaurant(r) || (r.ada_compliance && r.ada_compliance !== "unknown")) return;
    if (cache[`places-ada-${r.business_id}`]) return;
    needLookup.push({ idx, r });
  });
  if (needLookup.length === 0) return;

  // Cap live lookups per search — protect the Places API quota. Results are
  // ranked by relevance, so the top cards are what users see; the rest keep the
  // honest "Tap to verify ADA" badge, and the detail page still looks them up.
  const LOOKUP_CAP = 24;
  needLookup.splice(LOOKUP_CAP);

  const runBatch = async (batch) => {
    const res = await base44.functions.invoke("getPlacesADA", {
      places: batch.map(({ r }) => ({
        name: r.name,
        address: r.address || "",
        city: r.city || "",
        zip_code: r.zip_code || "",
      })),
    });
    return res.data?.results || [];
  };

  (async () => {
    try {
      let final = merged;
      for (let i = 0; i < needLookup.length; i += BATCH_SIZE) {
        const batch = needLookup.slice(i, i + BATCH_SIZE);
        const responses = await runBatch(batch);
        let batchChanged = false;
        batch.forEach(({ idx, r }, k) => {
          const d = responses[k];
          if (!d) return;
          cache[`places-ada-${r.business_id}`] = d;
          const status = statusFromPlace(d);
          if (status) {
            batchChanged = true;
            final = final.map((row, rowIdx) => (rowIdx === idx ? { ...row, ada_compliance: status } : row));
          }
        });
        if (batchChanged) onUpdate(final);
      }
      saveCache(cache);
    } catch { /* lookup unavailable — cards keep "Tap to verify ADA" */ }
  })();
}