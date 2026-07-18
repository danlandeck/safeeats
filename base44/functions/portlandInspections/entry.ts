import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Portland (Multnomah & Clackamas County) restaurant inspection scraper.
// Source: restaurants.oregonlive.com/inspections — a news-aggregator database
// of ~5,500 Portland-area restaurant inspections with numeric 0-100 scores.
//
// IMPORTANT: This data is FROZEN at 2019-2020. The OregonLive database has not
// been updated since. We are transparent about this in every response and
// always include a link to the official live portal at
// inspections.myhealthdepartment.com/multco-eh for current data.

const BASE_URL = "https://restaurants.oregonlive.com/inspections";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function stripHtml(text) {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

function scoreToGrade(score) {
  if (score === null || score === undefined) return "U";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// Parse the search results HTML table.
// Each row has: Name (link), Facility type, Date, Score, Address, City
function parseSearchResults(html, queryName) {
  const facilities = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
    }
    if (cells.length < 6) continue;

    const nameHtml = cells[0];
    const name = stripHtml(nameHtml);
    if (!name || name === "Name") continue;

    // Extract detail page link
    const linkMatch = nameHtml.match(/href="([^"]*?)"/i);
    const detailPath = linkMatch ? linkMatch[1] : "";
    const detailUrl = detailPath.startsWith("http") ? detailPath : `https://restaurants.oregonlive.com${detailPath}`;

    const facilityType = stripHtml(cells[1]);
    const dateStr = stripHtml(cells[2]);
    const scoreRaw = stripHtml(cells[3]);
    const address = stripHtml(cells[4]);
    const city = stripHtml(cells[5]);

    // Parse score — "Not scored" means null (reinspections are not scored)
    const scoreNum = parseInt(scoreRaw, 10);
    const score = isNaN(scoreNum) ? null : scoreNum;

    // Extract business_id from the detail URL slug
    let businessId = `portland_or_${slugify(name)}_${slugify(address)}`;
    if (detailPath) {
      const slugMatch = detailPath.match(/\/inspections\/([^?]+)/);
      if (slugMatch) businessId = `portland_or_${slugMatch[1]}`;
    }

    facilities.push({
      business_id: businessId,
      name,
      address,
      city,
      state: "OR",
      zip_code: "",
      county: city.toLowerCase() === "portland" || city.toLowerCase() === "gresham" ? "Multnomah" : "Clackamas",
      facility_type: facilityType,
      detail_url: detailUrl,
      latestDate: parseDate(dateStr),
      latestDateRaw: dateStr,
      safetyScore: score,
      grade: scoreToGrade(score),
      latestResult: score !== null ? (score >= 70 ? "Pass" : "Fail") : "Not scored (reinspection)",
      source: "portland_oregonlive",
      data_warning: "Historical data from OregonLive (2019-2020). May not reflect current conditions.",
      portal_url: "https://inspections.myhealthdepartment.com/multco-eh",
      portal_name: "Multnomah County Official Inspection Portal",
    });
  }
  return facilities;
}

// Parse a detail page for full inspection history.
function parseDetailPage(html) {
  const inspections = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1]);
    }
    if (cells.length < 4) continue;

    const inspType = stripHtml(cells[0]);
    const dateStr = stripHtml(cells[1]);
    const scoreRaw = stripHtml(cells[2]);
    const outcome = stripHtml(cells[3]);

    if (!inspType || inspType === "Inspection type") continue;

    const scoreNum = parseInt(scoreRaw, 10);
    const score = isNaN(scoreNum) ? null : scoreNum;

    inspections.push({
      date: parseDate(dateStr),
      dateRaw: dateStr,
      type: inspType,
      score,
      result: outcome,
    });
  }
  return inspections;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, name, facilityId, detail_url } = body;

    if (action === "search") {
      const query = (name || "").trim();
      if (!query) return Response.json({ facilities: [], source: "portland_oregonlive" });

      // Determine which county to search — default to Multnomah (Portland)
      const county = body.county || "Multnomah";

      const searchUrl = `${BASE_URL}?name=${encodeURIComponent(query)}&county=${encodeURIComponent(county)}&sort=-most_recent_inspection&page=1`;

      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        return Response.json({
          facilities: [],
          source: "portland_oregonlive",
          error: `Search failed: HTTP ${res.status}`,
        });
      }

      const html = await res.text();
      const facilities = parseSearchResults(html, query);

      return Response.json({
        facilities,
        source: "portland_oregonlive",
        data_warning: "Historical data from OregonLive (2019-2020). May not reflect current conditions.",
        portal_url: "https://inspections.myhealthdepartment.com/multco-eh",
        portal_name: "Multnomah County Official Inspection Portal",
      });
    }

    if (action === "detail") {
      const detailUrl = detail_url || facilityId;
      if (!detailUrl) return Response.json({ inspections: [], source: "portland_oregonlive" });

      const url = detailUrl.startsWith("http") ? detailUrl : `https://restaurants.oregonlive.com${detailUrl}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        return Response.json({ inspections: [], source: "portland_oregonlive", error: `Detail fetch failed: HTTP ${res.status}` });
      }

      const html = await res.text();
      const inspections = parseDetailPage(html);

      return Response.json({
        inspections,
        source: "portland_oregonlive",
        data_warning: "Historical data from OregonLive (2019-2020). May not reflect current conditions.",
        portal_url: "https://inspections.myhealthdepartment.com/multco-eh",
        portal_name: "Multnomah County Official Inspection Portal",
      });
    }

    return Response.json({ error: "Invalid action. Use 'search' or 'detail'." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});