import { SEARCH_KEYS } from "./searchState";

// ── ADA accessibility lookups for search result cards and the detail page ──────
// Google Places accessibilityOptions run through the Vercel proxy — Base44
// backend functions are plan-gated (invoking them returns 402 on the Starter
// plan, which silently broke "Tap to verify ADA"). When Google is unavailable,
// a keyless OpenStreetMap lookup (Nominatim wheelchair tags) answers the tap
// honestly. Both sources are cached in localStorage and shared with the
// detail page.

const ADA_PROXY_URL = "https://safeeats-proxy.vercel.app/api/placesAccessibility";

const ADA_CACHE_KEY = SEARCH_KEYS[2];
const BATCH_SIZE = 12;

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

// Map an OpenStreetMap wheelchair-tag record to our compliance status.
// Community-mapped data: yes / limited / no. Returns null when unmapped.
function statusFromOSM(d) {
  const w = d?.osmWheelchair;
  if (w === "yes") return "accessible";
  if (w === "limited") return "partially_accessible";
  if (w === "no") return "not_accessible";
  return null;
}

function statusFromLookup(d) {
  return d?.source === "osm" ? statusFromOSM(d) : statusFromPlace(d);
}

// Google Places lookup via the Vercel proxy. Throws on any failure so callers
// can fall back to OpenStreetMap.
async function googleAccessibility(place) {
  const res = await fetch(ADA_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(place),
  });
  if (!res.ok) throw new Error(`placesAccessibility ${res.status}`);
  return res.json();
}

// Keyless OpenStreetMap fallback: Nominatim returns the matched place with
// extratags, including the wheelchair tag when the community has mapped it.
// Sparser than Google's data — the UI labels results as OpenStreetMap.
async function osmAccessibility(place) {
  const q = [place.name, place.address, place.city, place.zip_code]
    .filter(Boolean)
    .join(", ");
  if (!q) return { found: false, source: "osm" };
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&extratags=1&limit=1&countrycodes=us`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const hits = await res.json();
  const tags = hits?.[0]?.extratags || null;
  if (!tags || !tags.wheelchair) {
    return { found: true, hasAnyData: false, source: "osm", osmWheelchair: null };
  }
  const w = String(tags.wheelchair).toLowerCase();
  return {
    found: true,
    hasAnyData: true,
    source: "osm",
    osmWheelchair: w,
    wheelchairAccessibleEntrance: w === "yes" ? true : w === "no" ? false : null,
    wheelchairAccessibleParking: null,
    wheelchairAccessibleRestroom: tags["toilets:wheelchair"] === "yes" ? true : null,
    wheelchairAccessibleSeating: null,
  };
}

/**
 * Look up accessibility for one place. Google Places first (via the proxy),
 * OpenStreetMap as fallback when Google is unavailable or finds no match.
 * Returns the data record with a "source" marker, or throws when both fail.
 */
export async function lookupAccessibility(place) {
  let d = null;
  try {
    d = await googleAccessibility(place);
  } catch {
    d = null;
  }
  if (!d || !d.found) {
    d = await osmAccessibility(place);
  }
  d.source = d.source || "google";
  return d;
}

/**
 * Fill in ADA compliance for a list of restaurants (batch Google Places lookup
 * via the proxy, cache-backed). Calls onUpdate with the full updated list when
 * anything changed. OpenStreetMap is NOT used in batch mode — it has no batch
 * endpoint and per-place queries would be abusive. Cards that miss out keep
 * the honest "Tap to verify ADA" badge, which does fall back to OSM on tap.
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
    const status = cached ? statusFromLookup(cached) : null;
    if (!status) return r;
    changed = true;
    return { ...r, ada_compliance: status, ada_source: cached.source || "google" };
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
    const res = await fetch(ADA_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        places: batch.map(({ r }) => ({
          name: r.name,
          address: r.address || "",
          city: r.city || "",
          zip_code: r.zip_code || "",
        })),
      }),
    });
    if (!res.ok) throw new Error(`placesAccessibility batch ${res.status}`);
    const data = await res.json();
    return data?.results || [];
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
          if (!d || !d.found) return;
          d.source = d.source || "google";
          cache[`places-ada-${r.business_id}`] = d;
          const status = statusFromLookup(d);
          if (status) {
            batchChanged = true;
            final = final.map((row, rowIdx) =>
              (rowIdx === idx ? { ...row, ada_compliance: status, ada_source: d.source } : row));
          }
        });
        if (batchChanged) onUpdate(final);
      }
      saveCache(cache);
    } catch { /* lookup unavailable — cards keep "Tap to verify ADA" */ }
  })();
}

/**
 * Single-restaurant live lookup for the card badge's "Tap to verify ADA".
 * Google Places first, OpenStreetMap fallback. Stores the result in the
 * shared cache (reused on the detail page) and returns
 * { status, source }, or null when no source has usable data.
 * Throws when both lookups fail — the badge shows "tap to retry".
 */
export async function verifyADASingle(restaurant) {
  const place = {
    name: restaurant.name,
    address: restaurant.address || "",
    city: restaurant.city || "",
    zip_code: restaurant.zip_code || "",
  };
  const d = await lookupAccessibility(place);
  const cache = loadCache();
  cache[`places-ada-${restaurant.business_id}`] = d;
  saveCache(cache);
  const status = statusFromLookup(d);
  return status ? { status, source: d.source } : null;
}