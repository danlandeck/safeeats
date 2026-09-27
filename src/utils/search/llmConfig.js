import { base44 } from "@/api/base44Client";

// LLM search & enrichment runs server-side in the `llmRestaurantSearch`
// backend function. These thin wrappers pass only validated, semantic
// parameters — prompts, schemas, and model choices never leave the server,
// so integration credits can't be burned with arbitrary prompts.

async function runTask(payload) {
  const res = await base44.functions.invoke("llmRestaurantSearch", payload);
  return res.data;
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