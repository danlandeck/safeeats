import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Louisville / Jefferson County, KY — ArcGIS Hub FeatureServer
// Single layer with both establishment and inspection data per row.
const BASE_URL = "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/FoodServiceData/FeatureServer/0/query";
const FIELDS = "EstablishmentID,InspectionID,Ins_TypeDesc,EstablishmentName,Address,City,State,Zip,TypeDescription,InspectionDate,score,Grade,NameSearch";

function escapeSql(value) {
  return String(value || "").replace(/'/g, "''");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, establishmentId } = body;

    if (action === "search") {
      if (!name || name.trim().length === 0) return Response.json({ records: [] });
      const safeName = escapeSql(name).toUpperCase();
      const where = `upper(EstablishmentName) LIKE '%${safeName}%'`;
      const url = `${BASE_URL}?where=${encodeURIComponent(where)}&outFields=${FIELDS}&f=json&resultRecordCount=1000&orderByFields=InspectionDate+DESC`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return Response.json({ records: [], error: data.error.message });
      const records = (data.features || []).map(f => f.attributes);
      return Response.json({ records });
    }

    if (action === "detail") {
      if (!establishmentId) return Response.json({ records: [] });
      const safeId = escapeSql(establishmentId);
      const where = `EstablishmentID=${safeId}`;
      const url = `${BASE_URL}?where=${encodeURIComponent(where)}&outFields=${FIELDS}&f=json&resultRecordCount=500&orderByFields=InspectionDate+DESC`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return Response.json({ records: [], error: data.error.message });
      const records = (data.features || []).map(f => f.attributes);
      return Response.json({ records });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});