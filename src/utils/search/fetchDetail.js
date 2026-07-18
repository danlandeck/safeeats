import { base44 } from "@/api/base44Client";
import { API_REGISTRY, buildDetailUrl } from "../apiRegistry";
import {
  llmToDetailRows, torontoToDetailRows, vancouverBCToDetailRows,
  bostonToDetailRows, singaporeToDetailRows, nswToDetailRows,
  laToDetailRows, stanislausToDetailRows, riversideToDetailRows,
  alabamaToDetailRows, arkansasToDetailRows, fvhdToDetailRows,
  dcToDetailRows, georgiaToDetailRows, floridaToDetailRows,
  maricopaToDetailRows, tacomaPierceToDetailRows, snhdToDetailRows,
  houstonToDetailRows, wakeCountyToDetailRows, louisvilleToDetailRows,
  ukFSAToDetailRows, delawareToDetailRows,
  mississippiToDetailRows,
  oklahomaToDetailRows,
  scToDetailRows,
  utahToDetailRows,
  safefoodToDetailRows,
  portlandToDetailRows,
} from "../inspectionProcessors";
import { PROCESSORS, SOURCE_TO_COUNTY } from "./registry";

export async function fetchDetail(restaurant) {
  const { source, business_id, isLLMData } = restaurant;
  if (isLLMData || source === "dubai" || source === "llm") return llmToDetailRows(restaurant);

  if (source === "toronto") {
    try {
      const res = await base44.functions.invoke("torontoDineSafe", { action: "detail", establishmentId: business_id });
      return torontoToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  if (source === "vancouver_bc") {
    try {
      const res = await base44.functions.invoke("vancouverBCInspections", { action: "detail", facilityId: business_id });
      return vancouverBCToDetailRows(res.data?.inspections || []);
    } catch { return []; }
  }

  if (source === "boston") {
    try {
      const res = await base44.functions.invoke("bostonFoodInspections", { action: "detail", licenseno: business_id });
      return bostonToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  if (source === "singapore") return singaporeToDetailRows(restaurant);
  if (source === "australia_nsw" || source === "australia_qld") return nswToDetailRows(restaurant);

  if (source === "la") {
    try {
      const res = await base44.functions.invoke("laCountyInspections", { action: "detail", facilityId: business_id });
      return laToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  if (source === "stanislaus") return stanislausToDetailRows(restaurant);
  if (source === "riverside") return riversideToDetailRows(restaurant);
  if (source === "alabama") return alabamaToDetailRows(restaurant);
  if (source === "arkansas") return arkansasToDetailRows(restaurant);
  if (source === "fvhd") return fvhdToDetailRows(restaurant);
  if (source === "dc") return dcToDetailRows(restaurant);
  if (source === "georgia") return georgiaToDetailRows(restaurant);
  if (source === "oklahoma") return oklahomaToDetailRows(restaurant);
  if (source === "sc_food_grades") return scToDetailRows(restaurant);
  if (source === "utah_cdp") return utahToDetailRows(restaurant);
  if (source === "portland_oregonlive") {
    try {
      const res = await base44.functions.invoke("portlandInspections", {
        action: "detail", detail_url: restaurant.detail_url || restaurant.business_id,
      });
      const inspections = res.data?.inspections || [];
      if (inspections.length > 0) {
        return portlandToDetailRows({ ...restaurant, inspections });
      }
    } catch { /* fall through to static rows */ }
    return portlandToDetailRows(restaurant);
  }

  if (source === "mississippi") {
    try {
      const res = await base44.functions.invoke("mississippiInspections", { action: "detail", pimsId: business_id });
      return mississippiToDetailRows(res.data?.detail || []);
    } catch { return []; }
  }

  if (source === "florida") {
    try {
      const res = await base44.functions.invoke("floridaInspections", { action: "detail", license_id: restaurant._license_id || restaurant.business_id });
      const inspections = res.data?.inspections || [];
      const enriched = { ...restaurant, _inspections: inspections };
      if (inspections.length > 0) {
        const latest = inspections[0];
        enriched.safetyScore = latest.safetyScore;
        enriched.latestDate = latest.date;
        enriched.latestResult = latest.result;
        enriched.totalInspections = inspections.length;
        enriched.grade = latest.safetyScore >= 90 ? "A" : latest.safetyScore >= 80 ? "B" : latest.safetyScore >= 70 ? "C" : latest.safetyScore >= 50 ? "D" : "F";
      }
      return floridaToDetailRows(enriched);
    } catch { return floridaToDetailRows(restaurant); }
  }

  if (source === "maricopa") return maricopaToDetailRows(restaurant);
  if (source === "tacoma_pierce") return tacomaPierceToDetailRows(restaurant);

  if (source === "snhd") {
    try {
      const res = await base44.functions.invoke("snhdInspections", { action: "detail", permit_number: restaurant.business_id });
      return snhdToDetailRows(res.data);
    } catch { return []; }
  }

  if (source === "houston") {
    try {
      const res = await base44.functions.invoke("houstonFoodInspections", { action: "detail", facilityAccountNumber: business_id });
      return houstonToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  if (source === "wake") {
    try {
      const res = await base44.functions.invoke("wakeCountyInspections", { action: "detail", hsisid: business_id });
      return wakeCountyToDetailRows(res.data);
    } catch { return []; }
  }

  if (source === "louisville") {
    try {
      const res = await base44.functions.invoke("louisvilleInspections", { action: "detail", establishmentId: business_id });
      return louisvilleToDetailRows(res.data?.records || []);
    } catch { return []; }
  }

  if (source === "sd_safefood" || source === "vt_safefood" || source === "wy_safefood") {
    const stateMap = { sd_safefood: "sd", vt_safefood: "vt", wy_safefood: "wy" };
    const stateCode = stateMap[source] || "sd";
    try {
      const res = await base44.functions.invoke("safefoodInspections", {
        action: "detail", name: restaurant.name, facilityId: business_id, state: stateCode,
      });
      const facility = res.data?.facility;
      if (facility) return safefoodToDetailRows(facility);
    } catch { return []; }
  }

  if (source === "uk_fsa") {
    try {
      const res = await base44.functions.invoke("ukFoodRatings", { action: "detail", fhrsId: restaurant.fhrsId });
      const descriptors = res.data?.scoreDescriptors || [];
      if (descriptors.length > 0) {
        return descriptors.map((d, i) => ({
          inspection_serial_num: `uk-${restaurant.fhrsId}-${i}`,
          inspection_date: restaurant.latestDate,
          inspection_score: String(d.Score || 0),
          inspection_result: restaurant.latestResult || "",
          inspection_type: "Food Hygiene Rating (FSA)",
          violation_description: d.Score > 0 ? `${d.ScoreCategory}: ${d.Description || "Improvement required"}` : `${d.ScoreCategory}: ${d.Description || "Very good"}`,
          violation_type: d.Score > 15 ? "RED" : "BLUE",
          violation_points: String(d.Score || 0),
        }));
      }
    } catch {}
    return ukFSAToDetailRows(restaurant);
  }

  const countyId = SOURCE_TO_COUNTY[source] || source;
  const entry = API_REGISTRY[countyId];
  if (!entry) return [];

  if (countyId === "delaware") {
    try {
      const [restname, ...addrParts] = business_id.split("-");
      const restaddress = addrParts.join("-");
      const url = `${entry.endpoint}?$where=upper(restname)='${encodeURIComponent((restname || "").toUpperCase())}' AND upper(restaddress)='${encodeURIComponent((restaddress || "").toUpperCase())}'&$limit=500&$order=${entry.dateField} DESC`;
      const data = await fetch(url).then(r => r.json());
      return delawareToDetailRows(Array.isArray(data) ? data : []);
    } catch { return []; }
  }

  try {
    const data = await fetch(buildDetailUrl(entry, business_id)).then(r => r.json());
    const rows = Array.isArray(data) ? data : (data?.features?.map(f => f.attributes) || []);
    return PROCESSORS[countyId].toDetailRows(rows);
  } catch { return []; }
}