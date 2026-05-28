import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// LA County Public Health — ArcGIS Feature Service (2023-present, updated quarterly)
// Item ID: 19b6607ac82c4512b10811870975dbdc
const BASE_URL = "https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Environmental_Health_Restaurant_and_Market_Inspections_04012023_to_033120026/FeatureServer/0/query";
const FIELDS = "FACILITY_ID,FACILITY_NAME,FACILITY_ADDRESS,FACILITY_CITY,FACILITY_ZIP,SCORE,GRADE,ACTIVITY_DATE,SERVICE_DESCRIPTION";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, name, facilityId } = body;

    if (action === "search") {
      if (!name || name.trim().length === 0) return Response.json({ records: [] });
      const safeName = name.replace(/'/g, "''");
      const where = `FACILITY_NAME LIKE '%${safeName}%'`;
      const url = `${BASE_URL}?where=${encodeURIComponent(where)}&outFields=${FIELDS}&f=json&resultRecordCount=100&orderByFields=ACTIVITY_DATE+DESC`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) return Response.json({ records: [], error: data.error.message });
      const records = (data.features || []).map(f => f.attributes);
      return Response.json({ records });
    }

    if (action === "detail") {
      if (!facilityId) return Response.json({ records: [] });
      const safeFacId = facilityId.replace(/'/g, "''");
      const where = `FACILITY_ID='${safeFacId}'`;
      const url = `${BASE_URL}?where=${encodeURIComponent(where)}&outFields=${FIELDS}&f=json&resultRecordCount=500&orderByFields=ACTIVITY_DATE+DESC`;
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