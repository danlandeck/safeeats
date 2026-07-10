/**
 * Jurisdiction routing utility.
 * Replaces the hardcoded GEO_ROUTE object that was inlined in searchEngine.js.
 *
 * Given a verified address (state + city from Google Places), resolves which
 * inspection source (countyId) serves that location.
 *
 * Returns:
 *   { type: "registry", countyId } — live API serves this jurisdiction
 *   { type: "none" }               — jurisdiction publishes no machine-readable data
 *   { type: "unknown" }            — try AI enrichment
 */
import dataSources from "@/config/dataSources.json";

export function resolveJurisdiction(state, city) {
  if (!state) return { type: "unknown" };

  const stateData = dataSources[state.toUpperCase().trim()];
  if (!stateData) return { type: "unknown" };

  if (stateData.none) return { type: "none" };

  const cityKey = (city || "").toLowerCase().trim();
  if (stateData.cities && stateData.cities[cityKey]) {
    return { type: "registry", countyId: stateData.cities[cityKey] };
  }

  if (stateData.default) {
    if (stateData.default === "none") return { type: "none" };
    return { type: "registry", countyId: stateData.default };
  }

  return { type: "unknown" };
}