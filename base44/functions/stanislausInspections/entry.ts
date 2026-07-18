import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Stanislaus County food facility inspections
//
// The county migrated from server-rendered HTML to a React SPA in 2025.
// The new JSON API is at:
//   Search:  /foodinspections/api/facilities?name=...&pageSize=30
//   Config:  /foodinspections/api/facilities/config
//   PDF:     /foodinspections/api/inspections/{inspectionId}/pdf
//
// Each search result includes the latest inspection (date, type, closed status).
// There is no JSON inspection-history endpoint — full reports are PDF only.

const API_BASE = "https://secure.stancounty.com/foodinspections";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, name, inspectionId } = body;

    if (action === "search") {
      if (!name?.trim()) return Response.json({ facilities: [] });

      const params = new URLSearchParams();
      params.set("name", name.trim());
      params.set("pageSize", "30");

      const res = await fetch(`${API_BASE}/api/facilities?${params}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; SafeEats/1.0)",
          "Accept": "application/json",
          "Referer": `${API_BASE}/`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return Response.json({ facilities: [], error: `HTTP ${res.status}` });
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      // Map API fields to the shape the frontend processor expects
      const facilities = items.map((item) => ({
        name: item.sName || "",
        address: `${item.lStrNum || ""} ${item.sAddress || ""}`.trim(),
        city: item.sCity || "",
        latest_date: item.dtInspection || "",
        inspection_type: item.inspectionType || "",
        permit_status: item.bFacClosed ? "Closed" : "Open",
        inspection_id: item.lInspectionID || null,
        business_id: item.lBusinessID || null,
        portal_url: item.lInspectionID
          ? `${API_BASE}/api/inspections/${item.lInspectionID}/pdf`
          : null,
      }));

      return Response.json({ facilities });
    }

    if (action === "detail") {
      // No JSON history endpoint — full inspection reports are PDF only.
      // Return a portal link so the UI can direct users to the PDF.
      if (inspectionId) {
        return Response.json({
          portal_url: `${API_BASE}/api/inspections/${inspectionId}/pdf`,
        });
      }
      return Response.json({ portal_url: null });
    }

    return Response.json({ facilities: [], error: "Unknown action" });
  } catch (error) {
    return Response.json({ facilities: [], error: error.message }, { status: 500 });
  }
});