/**
 * Hierarchical Jurisdiction Resolver
 *
 * Replaces the flat US-only lookup chain (usHealthContext.json + dataSources.json)
 * with a unified, deep-merge resolver that supports global jurisdictions.
 *
 * Resolution priority (most specific wins, least specific provides defaults):
 *   City → County/Admin2 → State/Admin1 → Country
 *
 * For US locations, delegates to existing usHealthContext.json + dataSources.json
 * to preserve all current behavior. For non-US locations, uses the new
 * globalJurisdictions.json hierarchical registry with inheritance.
 *
 * Exports:
 *   resolveJurisdiction(state, city, country) — routing: which API/backend to use
 *   getJurisdictionPortal(state, city, country) — portal metadata for display
 *   getJurisdictionContext(countyId, locationLabel, country) — LLM enrichment context
 */
import globalJurisdictions from "@/config/globalJurisdictions.json";
import usHealthContext from "@/config/usHealthContext.json";
import dataSources from "@/config/dataSources.json";

// ── Deep Merge ──
// Merges override values on top of base. Objects are merged recursively;
// arrays and primitives are replaced. Keys prefixed with "_" are internal
// (metadata like _cityIndex) and are never merged into results.
function deepMerge(base, override) {
  if (!base) return override ? { ...override } : {};
  if (!override) return { ...base };
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (key.startsWith("_")) continue;
    const val = override[key];
    if (typeof val === "object" && !Array.isArray(val) && val !== null) {
      result[key] = deepMerge(base[key] || {}, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// ── Node Resolution ──
// Walks the hierarchy from country down to city, collecting nodes.
// Returns a deep-merged object where more specific levels override less specific ones.
function resolveNode(country, admin1, admin2, city) {
  const countryCode = (country || "").toUpperCase().trim();
  const countryNode = globalJurisdictions[countryCode];
  if (!countryNode) return null;

  // Collect nodes from least specific (country) to most specific (city).
  const nodes = [countryNode];

  if (admin1 && countryNode.sub_divisions) {
    const a1 = admin1.toUpperCase().trim();
    const stateNode =
      countryNode.sub_divisions[admin1] ||
      countryNode.sub_divisions[a1] ||
      findByName(countryNode.sub_divisions, admin1);
    if (stateNode) {
      nodes.push(stateNode);

      if (admin2 && stateNode.sub_divisions) {
        const countyNode =
          stateNode.sub_divisions[admin2] ||
          stateNode.sub_divisions[admin2.toUpperCase()] ||
          findByName(stateNode.sub_divisions, admin2);
        if (countyNode) {
          nodes.push(countyNode);

          if (city && countyNode.sub_divisions) {
            const cityNode =
              countyNode.sub_divisions[city] ||
              countyNode.sub_divisions[city.toLowerCase()];
            if (cityNode) nodes.push(cityNode);
          }
        }
      }
    }
  }

  // Deep merge from least to most specific — later nodes override earlier.
  return nodes.reduce((acc, node) => deepMerge(acc, node), {});
}

// Helper: find a sub_division by its "name" field (case-insensitive).
function findNameMatch(divisions, name) {
  if (!divisions || !name) return null;
  const lower = name.toLowerCase().trim();
  for (const key of Object.keys(divisions)) {
    if (key.startsWith("_")) continue;
    const node = divisions[key];
    if (node && typeof node === "object" && node.name &&
        node.name.toLowerCase() === lower) {
      return node;
    }
  }
  return null;
}

// Helper: try exact key, uppercase key, and name match.
function findByName(divisions, name) {
  if (!divisions || !name) return null;
  return divisions[name] ||
         divisions[name.toUpperCase()] ||
         findNameMatch(divisions, name);
}

// Look up by city slug (countyId) using the _cityIndex.
// Returns the resolved node with inherited fields, or null.
function resolveByCitySlug(countyId) {
  if (!countyId) return null;
  const indexEntry = globalJurisdictions._cityIndex?.[countyId];
  if (!indexEntry) return null;
  return resolveNode(indexEntry.country, indexEntry.admin1, null, null);
}

// ── US Delegation ──
// Existing logic from routing.js — preserved unchanged for backward compat.

function resolveUSJurisdiction(state, city) {
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

// Existing logic from getStatePortalInfo in searchEngine.js — preserved unchanged.
function getUSPortalInfo(state, city) {
  if (!state) return { url: null, name: null, note: "" };
  const code = state.toUpperCase().trim();
  const stateEntry = usHealthContext[code];
  if (!stateEntry) return { url: null, name: null, note: "Contact the local health department for inspection records. " };

  if (typeof stateEntry === "object" && stateEntry.counties) {
    const cityKey = (city || "").toLowerCase().trim();
    if (cityKey) {
      for (const [countyName, countyData] of Object.entries(stateEntry.counties)) {
        if (countyData.cities && countyData.cities.includes(cityKey)) {
          return {
            url: countyData.portal_url,
            name: countyData.portal_name,
            note: `${countyName} County publishes inspection results at ${countyData.portal_url}. `,
          };
        }
      }
    }
    const desc = stateEntry.description || "";
    const urlMatch = desc.match(/\(([^)]+)\)/);
    const stateName = desc.split(":")[0];
    if (urlMatch) {
      const rawUrl = urlMatch[1];
      const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      return { url, name: `${stateName} inspection portal`, note: `${stateName} inspection records: ${rawUrl}. ` };
    }
    return { url: null, name: null, note: desc + " " };
  }

  const urlMatch = stateEntry.match(/\(([^)]+)\)/);
  const stateName = stateEntry.split(":")[0];
  if (urlMatch) {
    const rawUrl = urlMatch[1];
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return { url, name: `${stateName} inspection portal`, note: `${stateName} inspection records: ${rawUrl}. ` };
  }
  return { url: null, name: null, note: stateEntry + " " };
}

// ── Public API ──

/**
 * Resolve routing jurisdiction for a verified address.
 * Returns:
 *   { type: "registry", countyId } — live API serves this jurisdiction
 *   { type: "none" }               — jurisdiction publishes no machine-readable data
 *   { type: "unknown" }            — try AI enrichment
 */
export function resolveJurisdiction(state, city, country) {
  const isUS = !country || country.toUpperCase().trim() === "US";
  if (isUS) {
    return resolveUSJurisdiction(state, city);
  }

  // Non-US: check global registry
  const node = resolveNode(country, state, null, city);
  if (!node) {
    // Try city slug lookup if direct resolution failed
    const slugNode = resolveByCitySlug(city);
    if (slugNode) {
      if (slugNode.source_id) return { type: "registry", countyId: slugNode.source_id };
      if (slugNode.no_machine_data) return { type: "none" };
    }
    return { type: "unknown" };
  }

  if (node.source_id) {
    return { type: "registry", countyId: node.source_id };
  }
  if (node.no_machine_data) {
    return { type: "none" };
  }
  // Country exists in registry but has no source_id and no no_machine_data flag.
  // This means we haven't built a backend function yet — try AI enrichment.
  return { type: "unknown" };
}

/**
 * Get portal metadata (URL, name, note) for display in the UI.
 * For US, delegates to existing usHealthContext.json logic.
 * For non-US, uses the hierarchical registry with inheritance.
 */
export function getJurisdictionPortal(state, city, country) {
  const isUS = !country || country.toUpperCase().trim() === "US";
  if (isUS) {
    return getUSPortalInfo(state, city);
  }

  // Non-US: try hierarchical lookup by verified address
  let node = resolveNode(country, state, null, city);

  // Fall back to city slug lookup
  if (!node) {
    node = resolveByCitySlug(city);
  }

  if (!node) return { url: null, name: null, note: "" };

  const url = node.portal?.url || null;
  const name = node.portal?.name || null;
  const methodology = node.methodology || "";
  const noteParts = [];
  if (name && url) {
    noteParts.push(`${name} publishes inspection results at ${url}.`);
  }
  if (methodology) {
    noteParts.push(methodology);
  }

  return {
    url,
    name,
    note: noteParts.length > 0 ? noteParts.join(" ") + " " : "",
  };
}

/**
 * Get LLM enrichment context (methodology guidance) for a location.
 * Called with the countyId (dropdown selection) and/or verified country.
 *
 * Returns a methodology string for the LLM prompt, or null if not found
 * (caller should fall back to COUNTRY_CONTEXT or usHealthContext).
 */
export function getJurisdictionContext(countyId, locationLabel, country) {
  const isUS = !country || country.toUpperCase().trim() === "US";

  // Non-US: use the new global registry
  if (!isUS) {
    // 1. Try city slug lookup (most specific)
    if (countyId) {
      const node = resolveByCitySlug(countyId);
      if (node?.methodology) return node.methodology;
    }

    // 2. Try country-level lookup
    if (country) {
      const node = resolveNode(country, null, null, null);
      if (node?.methodology) return node.methodology;
    }

    // 3. Try extracting city from location label
    if (locationLabel) {
      const citySlug = locationLabel
        .split(",")[0]
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, "_")
        .trim();
      if (citySlug) {
        const node = resolveByCitySlug(citySlug);
        if (node?.methodology) return node.methodology;
      }
    }
  }

  // Return null for US or if nothing found — caller handles US fallback
  return null;
}