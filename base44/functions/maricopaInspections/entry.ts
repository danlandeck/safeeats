import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const FEATURE_SERVER = "https://services.arcgis.com/ykpntM6e3tHvzKRJ/arcgis/rest/services/Restaurant_%28External%29/FeatureServer/0";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { query, city, action, permitId } = body;

    // ── Detail mode: fetch permit inspection page ──
    // envapp.maricopa.gov is behind Cloudflare (HTTP 526 from Deno), so we
    // can't scrape inspection grades. Return a direct link instead.
    if (action === 'detail' && permitId) {
      const permitUrl = `https://envapp.maricopa.gov/Permit/${permitId}/Restaurant`;
      return Response.json({
        source: "maricopa",
        permit_url: permitUrl,
        note: "Inspection grades are available on the county portal. Click the link to view full inspection history.",
        isLLMData: false,
      });
    }

    // ── Search mode: query ArcGIS FeatureServer ──
    if (!query) return Response.json({ results: [], source: "maricopa" });

    // Build WHERE clause — case-insensitive LIKE on CompanyName
    const safeQuery = query.replace(/'/g, "''");
    const safeCity = city ? city.replace(/'/g, "''") : null;

    let where = `CompanyName LIKE '%${safeQuery}%'`;
    if (safeCity) {
      where += ` AND City LIKE '%${safeCity}%'`;
    }

    const params = new URLSearchParams({
      where,
      outFields: 'OBJECTID,CompanyName,BusinessAddress,LicenseNumber,Status,City,Zip',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'json',
      resultRecordCount: '50',
    });

    const res = await fetch(`${FEATURE_SERVER}/query?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!res.ok) {
      return Response.json({ error: `ArcGIS returned ${res.status}`, results: [] }, { status: 502 });
    }

    const data = await res.json();

    if (data.error) {
      return Response.json({ error: data.error.message, results: [] }, { status: 502 });
    }

    const features = data.features || [];

    // Map ArcGIS features → SafeEats restaurant format
    const results = features.map((f, idx) => {
      const attrs = f.attributes || {};
      const geom = f.geometry || {};
      const licenseNum = attrs.LicenseNumber || "";

      return {
        business_id: `maricopa_${licenseNum || attrs.OBJECTID}`,
        name: attrs.CompanyName || "Unknown",
        address: attrs.BusinessAddress || "",
        city: attrs.City || "",
        zip_code: attrs.Zip || "",
        county_id: "maricopa",
        source: "maricopa",
        license_number: licenseNum,
        status: attrs.Status || "Issued",
        latitude: geom.y || null,
        longitude: geom.x || null,
        safetyScore: null,
        grade: "U",
        totalInspections: 0,
        latestDate: null,
        latestResult: null,
        isLLMData: false,
        permit_url: licenseNum ? `https://envapp.maricopa.gov/Permit/${licenseNum}/Restaurant` : null,
        inspection_url: licenseNum ? `https://envapp.maricopa.gov/Permit/${licenseNum}/Restaurant` : null,
      };
    });

    return Response.json({
      results,
      source: "maricopa",
      total: results.length,
    });
  } catch (error) {
    return Response.json({ error: error.message, results: [] }, { status: 500 });
  }
});