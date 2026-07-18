import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Wake County, NC — ArcGIS REST API (Restaurant Inspections Open Data)
// Layer 0: Restaurants  |  Layer 1: Inspections
const RESTAURANTS_URL = "https://maps.wake.gov/arcgis/rest/services/Inspections/RestaurantInspectionsOpenData/MapServer/0/query";
const INSPECTIONS_URL = "https://maps.wake.gov/arcgis/rest/services/Inspections/RestaurantInspectionsOpenData/MapServer/1/query";
const RESTAURANT_FIELDS = "HSISID,NAME,ADDRESS1,CITY,STATE,POSTALCODE,PHONENUMBER,FACILITYTYPE,X,Y";
const INSPECTION_FIELDS = "HSISID,SCORE,DATE_,DESCRIPTION,TYPE,INSPECTOR";

function escapeSql(value) {
  return String(value || "").replace(/'/g, "''");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, hsisid } = body;

    if (action === "search") {
      if (!name || name.trim().length === 0) {
        return Response.json({ restaurants: [], inspections: [] });
      }
      const safeName = escapeSql(name).toUpperCase();
      const where = `upper(NAME) LIKE '%${safeName}%'`;
      const restaurantUrl = `${RESTAURANTS_URL}?where=${encodeURIComponent(where)}&outFields=${RESTAURANT_FIELDS}&f=json&resultRecordCount=50&returnGeometry=false`;
      const restaurantRes = await fetch(restaurantUrl);
      const restaurantData = await restaurantRes.json();
      if (restaurantData.error) {
        return Response.json({ restaurants: [], inspections: [], error: restaurantData.error.message });
      }
      const restaurants = (restaurantData.features || []).map(f => f.attributes);
      if (restaurants.length === 0) {
        return Response.json({ restaurants: [], inspections: [] });
      }

      // Collect HSISIDs and batch-query inspections
      const hsisids = restaurants.map(r => r.HSISID).filter(Boolean);
      if (hsisids.length === 0) {
        return Response.json({ restaurants, inspections: [] });
      }
      const inClause = hsisids.map(id => `'${escapeSql(id)}'`).join(",");
      const inspWhere = `HSISID IN (${inClause})`;
      const inspUrl = `${INSPECTIONS_URL}?where=${encodeURIComponent(inspWhere)}&outFields=${INSPECTION_FIELDS}&f=json&resultRecordCount=1000&orderByFields=DATE_+DESC`;
      const inspRes = await fetch(inspUrl);
      const inspData = await inspRes.json();
      const inspections = inspData.error ? [] : (inspData.features || []).map(f => f.attributes);

      return Response.json({ restaurants, inspections });
    }

    if (action === "detail") {
      if (!hsisid) return Response.json({ inspections: [] });
      const safeId = escapeSql(hsisid);
      const where = `HSISID='${safeId}'`;
      const inspUrl = `${INSPECTIONS_URL}?where=${encodeURIComponent(where)}&outFields=${INSPECTION_FIELDS}&f=json&resultRecordCount=500&orderByFields=DATE_+DESC`;
      const inspRes = await fetch(inspUrl);
      const inspData = await inspRes.json();
      if (inspData.error) {
        return Response.json({ inspections: [], error: inspData.error.message });
      }
      const inspections = (inspData.features || []).map(f => f.attributes);
      return Response.json({ inspections });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});