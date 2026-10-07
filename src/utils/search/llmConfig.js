// LLM search & enrichment and the Google Places lookup run server-side on the
// Vercel proxy (safeeats-proxy). Base44 backend functions are not available on
// the Starter plan, so these calls must not go through base44.functions.invoke.
// These thin wrappers pass only validated, semantic parameters: prompts,
// schemas, model choices, and API keys never leave the server.

const PROXY_BASE = "https://safeeats-proxy.vercel.app/api";

async function postProxy(path, payload) {
  const res = await fetch(`${PROXY_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${path} failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  return res.json();
}

/** Run one LLM task (fast_search, web_search, web_enrich, training_enrich, county_enrich). */
export function runTask(payload) {
  return postProxy("llmRestaurantSearch", payload);
}

/** Ground-truth restaurant lookup via Google Places. Resolves to { found, restaurants }. */
export function placesLookup(query, location) {
  return postProxy("placesRestaurantSearch", { query, location });
}

/** Training-data-only quick results (gpt_5_mini, no web search). */
export function llmFastSearch(query, location = null, dubai = false) {
  return runTask({ task: "fast_search", query, location, dubai });
}

/** Live-web search for verified restaurants with inspection records (Gemini). */
export function llmWebSearch(query, location = null, ctx = "", dubai = false) {
  return runTask({ task: "web_search", query, location, ctx, dubai });
}

/** Live-web lookup of official inspection records for a verified list. */
export function llmWebEnrich(list, location = "", ctx = "") {
  return runTask({
    task: "web_enrich",
    location,
    ctx,
    list: (list || []).slice(0, 60).map((r) => ({ name: r.name, address: r.address })),
  });
}

/** Training-data inspection scores for live-API results that lack them. */
export function llmTrainingEnrich(list, countyId) {
  return runTask({
    task: "training_enrich",
    countyId,
    list: (list || []).slice(0, 60).map((r) => ({
      name: r.name, address: r.address, city: r.city, zip_code: r.zip_code,
    })),
  });
}