import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Florida DBPR Division of Hotels and Restaurants ──────────────────────────
// State-wide portal at myfloridalicense.com covering all 67 counties.
// Classic ASP form flow: mode=0 (select search type) → mode=1 (criteria form)
// → mode=2 (results list) → inspectionDetail.asp (per-inspection violations).
//
// Florida uses a violation-based system (no numeric score):
//   - High Priority violations (foodborne illness risk) — 7 pts each
//   - Intermediate violations — 4 pts each
//   - Basic violations (good retail practices) — 1.5 pts each
// safetyScore = 100 - total_pts (clamped 0-100).
// Inspection result: "Satisfactory" or "Follow-up Inspection Required" or "Closed".

const BASE_URL = "https://www.myfloridalicense.com";

function decodeEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripHtml(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  // Florida dates come as "M/D/YYYY" — normalize to YYYY-MM-DD
  const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "";
  const [, mo, dy, yr] = m;
  return `${yr}-${mo.padStart(2, "0")}-${dy.padStart(2, "0")}`;
}

/**
 * Extract all form input/select/textarea fields from an HTML form section.
 */
function extractFormFields(html) {
  const fields = {};
  // Hidden inputs
  const inputRe = /<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["'][^>]*>/gi;
  let m;
  while ((m = inputRe.exec(html)) !== null) {
    if (!fields[m[1]]) fields[m[1]] = decodeEntities(m[2]);
  }
  // Also catch inputs where value comes before name
  const inputRe2 = /<input[^>]*value=["']([^"']*)["'][^>]*name=["']([^"']+)["'][^>]*>/gi;
  while ((m = inputRe2.exec(html)) !== null) {
    if (!fields[m[2]]) fields[m[2]] = decodeEntities(m[1]);
  }
  // Select fields — get selected option or first option
  const selectRe = /<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
  while ((m = selectRe.exec(html)) !== null) {
    const name = m[1];
    const optionsHtml = m[2];
    const selectedRe = /<option[^>]*value=["']([^"']*)["'][^>]*selected[^>]*>|<option[^>]*selected[^>]*value=["']([^"']*)["']/i;
    const selM = optionsHtml.match(selectedRe);
    if (selM) {
      fields[name] = selM[1] || selM[2] || "";
    }
  }
  return fields;
}

/**
 * Parse the results table from mode=2 response.
 * Each result row has: License Type, Name (link), Name Type, License Number/Rank, Status/Expires.
 * The Name link contains the license ID and visit ID for the detail page.
 */
function parseResultsTable(html) {
  const results = [];
  // Find result rows — they contain links to inspectionDetail.asp or wl11.asp with mode=3
  // Links look like: <a href="...?mode=3&search=Name&SID=&brd=H&typ=&LicNbr=XXX&...">
  // or links to inspectionDetail.asp?InspVisitID=XXX&licid=YYY
  const rowRe = /<a\s+href=["']([^"']*(?:inspectionDetail|wl11)[^"']*)["'][^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const href = m[1];
    const name = stripHtml(decodeEntities(m[2]));
    if (!name || name.length < 2) continue;

    // Extract license number and visit ID from the href
    const licNbrMatch = href.match(/[?&]LicNbr=([^&]+)/i);
    const licIdMatch = href.match(/[?&]licid=([^&]+)/i);
    const visitIdMatch = href.match(/[?&]InspVisitID=([^&]+)/i);

    // Find the surrounding row to extract address, city, county, etc.
    const rowStart = html.lastIndexOf("<tr", m.index);
    const rowEnd = html.indexOf("</tr>", m.index);
    const rowHtml = rowEnd > 0 ? html.slice(rowStart, rowEnd + 5) : "";

    // Extract table cells
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      cells.push(stripHtml(decodeEntities(cm[1])));
    }

    results.push({
      name,
      href: href.startsWith("http") ? href : BASE_URL + "/" + href.replace(/^\.\.\//, ""),
      license_number: licNbrMatch ? decodeEntities(licNbrMatch[1]) : (licIdMatch ? decodeEntities(licIdMatch[1]) : ""),
      visit_id: visitIdMatch ? decodeEntities(visitIdMatch[1]) : "",
      cells,
      rowHtml,
    });
  }
  return results;
}

/**
 * Parse the inspection detail page for violations and inspection metadata.
 */
function parseInspectionDetail(html, facility) {
  // Florida inspection detail pages list violations in a table with categories:
  // High Priority, Intermediate, Basic
  const violations = [];
  let highPriority = 0, intermediate = 0, basic = 0;

  // Violation entries typically appear as table rows with violation code + description
  // Pattern: <td>...</td><td>...</td><td>Violation: CODE - Description</td>
  const violRe = /Violation[:\s]*.*?(\d{1,3})\s*[-–—]\s*([^<]+)/gi;
  let m;
  while ((m = violRe.exec(html)) !== null) {
    const code = parseInt(m[1]) || 0;
    const desc = stripHtml(m[2]);
    if (!desc) continue;
    // Florida violation codes: 1-29 = High Priority, 30-49 = Intermediate, 50-99 = Basic
    let category, points;
    if (code <= 29) { category = "High Priority"; points = 7; highPriority++; }
    else if (code <= 49) { category = "Intermediate"; points = 4; intermediate++; }
    else { category = "Basic"; points = 1.5; basic++; }
    violations.push({ code: String(code), description: desc, category, points });
  }

  // Also try broader pattern for violation rows
  if (violations.length === 0) {
    const broadRe = /<td[^>]*>\s*(\d{1,3})\s*<\/td>\s*<td[^>]*>([^<]+(?:High Priority|Intermediate|Basic)[^<]*)<\/td>/gi;
    while ((m = broadRe.exec(html)) !== null) {
      const code = parseInt(m[1]) || 0;
      const desc = stripHtml(m[2]);
      if (code <= 29) { highPriority++; }
      else if (code <= 49) { intermediate++; }
      else { basic++; }
      violations.push({ code: String(code), description: desc, category: code <= 29 ? "High Priority" : code <= 49 ? "Intermediate" : "Basic", points: code <= 29 ? 7 : code <= 49 ? 4 : 1.5 });
    }
  }

  // Extract inspection date
  let dateStr = "";
  const dateRe = /(\d{1,2}\/\d{1,2}\/\d{4})/;
  const dateM = html.match(dateRe);
  if (dateM) dateStr = formatDate(dateM[1]);

  // Extract inspection type (Routine, Follow-up, etc.)
  let inspType = "Routine";
  if (/follow\s*-?\s*up/i.test(html)) inspType = "Follow-up";
  if (/complaint/i.test(html)) inspType = "Complaint";
  if (/opening/i.test(html)) inspType = "Opening";

  // Determine result
  let result = "Satisfactory";
  if (/closed?/i.test(html) || /suspended/i.test(html)) result = "Closed";
  else if (violations.length > 0 || /follow\s*-?\s*up/i.test(html)) result = "Follow-up Inspection Required";

  const totalPts = highPriority * 7 + intermediate * 4 + Math.round(basic * 1.5);
  const safetyScore = Math.max(0, Math.min(100, 100 - totalPts));

  return {
    ...facility,
    allInspections: [{
      inspection_id: facility.visit_id || "",
      date: dateStr,
      type: inspType,
      result,
      high_priority_violations: highPriority,
      intermediate_violations: intermediate,
      core_violations: basic,
      score: safetyScore,
      violations: violations.map(v => ({ description: `${v.category}: ${v.description}`, severity: v.category === "High Priority" ? "critical" : "minor", points: v.points })),
      report_url: facility.detail_url || "",
    }],
    safetyScore,
    latestDate: dateStr,
    latestResult: result,
    totalInspections: 1,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, name, city, county } = body;

    if (action === "search") {
      const searchName = (name || "").trim();
      if (!searchName) return Response.json({ error: "Restaurant name required" }, { status: 400 });

      // Step 1: Submit the search form directly to mode=2
      // The form fields from mode=1: HRLicType, City, County, Name, LicenseNbr, etc.
      const formData = new URLSearchParams();
      formData.append("HRLicType", "F"); // Food Service
      formData.append("City", city || "");
      formData.append("County", county || "");
      formData.append("Name", searchName);
      formData.append("LicenseNbr", "");
      formData.append("SortBy", "L");
      formData.append("btnSearch", "Search");
      formData.append("SearchType", "Name");
      formData.append("SID", "");
      formData.append("brd", "H");

      const searchUrl = `${BASE_URL}/wl11.asp?mode=2&search=Name&SID=&brd=H&typ=`;
      const searchRes = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": `${BASE_URL}/wl11.asp?mode=1&SID=&brd=H&typ=`,
        },
        body: formData.toString(),
      });
      const searchHtml = await searchRes.text();

      // Check for "no records found"
      if (/no records found/i.test(searchHtml)) {
        return Response.json({ facilities: [] });
      }

      // Parse results
      let results = parseResultsTable(searchHtml);

      // If no results with link parsing, try a broader approach
      if (results.length === 0) {
        // Look for any table rows with license numbers
        const broadRowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rm;
        while ((rm = broadRowRe.exec(searchHtml)) !== null) {
          const rowContent = rm[1];
          if (/Food Service|Restaurant/i.test(rowContent) && /<a\s/i.test(rowContent)) {
            const nameMatch = rowContent.match(/<a[^>]*>([^<]+)<\/a>/i);
            const hrefMatch = rowContent.match(/<a[^>]*href=["']([^"']+)["']/i);
            if (nameMatch && hrefMatch) {
              const cells = [];
              const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
              let cm;
              while ((cm = cellRe.exec(rowContent)) !== null) {
                cells.push(stripHtml(decodeEntities(cm[1])));
              }
              results.push({
                name: stripHtml(decodeEntities(nameMatch[1])),
                href: hrefMatch[1].startsWith("http") ? hrefMatch[1] : BASE_URL + "/" + hrefMatch[1].replace(/^\.\.\//, ""),
                license_number: "",
                visit_id: "",
                cells,
                rowHtml: rowContent,
              });
            }
          }
        }
      }

      // Extract facility details from result rows
      const facilities = results.slice(0, 20).map((r) => {
        // Parse address from the row cells or surrounding HTML
        const allText = stripHtml(decodeEntities(r.rowHtml));
        // Try to extract address, city, zip from the cells
        const cells = r.cells || [];
        // Florida results table columns: License Type | Name | Name Type | License Number/Rank | Status/Expires | Address info
        const addressInfo = cells.find(c => /\d+\s+\w+/i.test(c)) || "";
        const licenseNumber = r.license_number || cells.find(c => /^\d+$/.test(c.trim())) || "";

        return {
          business_id: r.license_number || `fl-${r.name}-${licenseNumber}`,
          name: r.name,
          address: addressInfo,
          city: city || "",
          zip_code: "",
          phone: "",
          license_number: licenseNumber,
          detail_url: r.href,
          safetyScore: null,
          latestResult: "",
          latestDate: "",
        };
      });

      return Response.json({ facilities });
    }

    if (action === "detail") {
      const { detail_url, name, address, city } = body;
      if (!detail_url) return Response.json({ error: "detail_url required" }, { status: 400 });

      const detailRes = await fetch(detail_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": `${BASE_URL}/wl11.asp?mode=2&search=Name&SID=&brd=H&typ=`,
        },
      });
      const detailHtml = await detailRes.text();

      const facility = { name, address, city, detail_url };
      const enriched = parseInspectionDetail(detailHtml, facility);

      return Response.json({ facility: enriched });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});