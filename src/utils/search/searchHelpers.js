// Pure utility functions for search query parsing, filtering, and ranking.
// No external dependencies — all functions are self-contained.

export const US_STATE_ABBRS = /^(al|ak|az|ar|ca|co|ct|de|dc|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)$/i;

export const CA_PROVINCES = new Set(["ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yt"]);

export const COUNTRY_ALIASES = {
  "uk": "GB", "united kingdom": "GB", "britain": "GB", "england": "GB", "scotland": "GB", "wales": "GB", "gb": "GB",
  "france": "FR", "fr": "FR",
  "germany": "DE", "de": "DE", "deutschland": "DE",
  "australia": "AU", "au": "AU",
  "canada": "CA",
  "japan": "JP", "jp": "JP",
  "south korea": "KR", "korea": "KR", "kr": "KR",
  "netherlands": "NL", "nl": "NL", "holland": "NL",
  "denmark": "DK", "dk": "DK",
  "new zealand": "NZ", "nz": "NZ",
  "india": "IN", "in": "IN",
  "china": "CN", "cn": "CN",
  "hong kong": "HK", "hk": "HK",
  "brazil": "BR", "br": "BR",
  "uae": "AE", "united arab emirates": "AE", "ae": "AE",
  "singapore": "SG", "sg": "SG",
  "ireland": "IE", "ie": "IE",
  "united states": "US", "usa": "US", "us": "US", "america": "US",
  "spain": "ES", "es": "ES",
  "italy": "IT", "it": "IT",
  "mexico": "MX", "mx": "MX",
  "thailand": "TH", "th": "TH",
  "turkey": "TR", "tr": "TR",
  "greece": "GR", "gr": "GR",
  "portugal": "PT", "pt": "PT",
  "sweden": "SE", "se": "SE",
  "switzerland": "CH", "ch": "CH",
  "austria": "AT", "at": "AT",
  "belgium": "BE", "be": "BE",
  "norway": "NO", "no": "NO",
  "finland": "FI", "fi": "FI",
  "poland": "PL", "pl": "PL",
  "russia": "RU", "ru": "RU",
  "south africa": "ZA", "za": "ZA",
  "argentina": "AR", "ar": "AR",
  "chile": "CL", "cl": "CL",
  "israel": "IL", "il": "IL",
  "egypt": "EG", "eg": "EG",
  "indonesia": "ID", "id": "ID",
  "malaysia": "MY", "my": "MY",
  "philippines": "PH", "ph": "PH",
  "vietnam": "VN", "vn": "VN",
};

/**
 * Resolve the expected country (and optionally state) from a location label.
 */
export function resolveExpectedGeo(location) {
  if (!location) return null;
  const parts = location.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const suffix = parts[parts.length - 1].toLowerCase();
  if (US_STATE_ABBRS.test(suffix)) return { country: "US", state: suffix.toUpperCase() };
  if (CA_PROVINCES.has(suffix)) return { country: "CA", state: suffix.toUpperCase() };
  const country = COUNTRY_ALIASES[suffix];
  if (country) return { country };
  return null;
}

export function parseSearchQuery(raw) {
  let name = (raw || "").trim();
  let hint = "";
  const commaIdx = name.indexOf(",");
  if (commaIdx > 0) {
    hint = name.slice(commaIdx + 1);
    name = name.slice(0, commaIdx);
  } else {
    const m = name.match(/^(.+?)\s+(?:in|on|at|near)\s+(.+)$/i);
    if (m && m[1].trim().length >= 3) { name = m[1]; hint = m[2]; }
  }
  if (!hint) {
    const st = name.match(/^(.+?)\s+([A-Za-z]{2})$/);
    if (st && US_STATE_ABBRS.test(st[2])) { name = st[1]; hint = st[2]; }
  }
  return {
    nameQuery: name.trim(),
    locationHint: hint.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(),
  };
}

export function filterByNameRelevance(results, query) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const normalize = (str) => (str || "")
    .toLowerCase()
    .replace(/['\-]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cleanQuery = normalize(query);
  if (cleanQuery.length <= 1) return results;
  const queryWords = cleanQuery.split(" ").filter(w => w.length >= 2);
  if (queryWords.length === 0) return results;
  const STOP_WORDS = new Set(["in", "the", "on", "at", "of", "and", "or", "an", "to", "for", "up"]);
  const brandWords = queryWords.filter(w => !STOP_WORDS.has(w));
  if (brandWords.length === 0) return results;
  if (brandWords.length === 1) return results;
  const filtered = results.filter(r => {
    const cleanName = normalize(r.name);
    if (!cleanName) return false;
    return brandWords.every(w => cleanName.includes(w));
  });
  return filtered;
}

export function rankByQueryRelevance(results, nameQuery, locationHint) {
  if (!Array.isArray(results) || results.length < 2) return results;
  const norm = (s) => (s || "").toLowerCase().replace(/['\-]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const nameWords = norm(nameQuery).split(" ").filter(w => w.length >= 2);
  const hintWords = (locationHint || "").split(" ").filter(w => w.length >= 2);
  const scoreOf = (r) => {
    const n = norm(r.name);
    const loc = norm(`${r.city || ""} ${r.address || ""} ${r.zip_code || ""}`);
    let s = 0;
    for (const w of nameWords) if (n.includes(w)) s += 2;
    if (nameWords.length > 0 && n === nameWords.join(" ")) s += 2;
    for (const w of hintWords) if (loc.includes(w)) s += 3;
    return s;
  };
  return results
    .map((r, i) => ({ r, i, s: scoreOf(r) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.r);
}

export function deduplicateResults(results) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const seen = new Set();
  return results.filter(r => {
    const normalize = (str) => (str || "")
      .toLowerCase()
      .replace(/['\-]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const name = normalize(r.name);
    const addr = normalize(r.address).split(" ").slice(0, 3).join(" ");
    const key = `${name}|${addr}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterUnverified(results) {
  if (!Array.isArray(results) || results.length === 0) return results;
  const filtered = results.filter(r => {
    const confidence = (r.data_confidence || "").toLowerCase();
    if (confidence === "none") return false;
    if (r.is_currently_operating === false) return false;
    return true;
  });
  const base = filtered.length > 0 ? filtered : results;
  return base.filter(r => (r.address || "").trim().length >= 5);
}