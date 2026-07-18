import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = "https://www.myfloridalicense.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeEntities(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s) {
  return decodeEntities((s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function extractFormFields(formHtml) {
  const fields = {};
  // Hidden/text inputs: name before value
  let m;
  const re1 = /<input[^>]*name=["']([^"']+)["'][^>]*value=["']([^"']*)["']/gi;
  while ((m = re1.exec(formHtml)) !== null) fields[m[1]] = m[2];
  // value before name
  const re2 = /<input[^>]*value=["']([^"']*)["'][^>]*name=["']([^"']+)["']/gi;
  while ((m = re2.exec(formHtml)) !== null) { if (!(m[2] in fields)) fields[m[2]] = m[1]; }
  // name only, no value
  const re3 = /<input[^>]*name=["']([^"']+)["'][^>]*>/gi;
  while ((m = re3.exec(formHtml)) !== null) { if (!(m[1] in fields)) fields[m[1]] = ""; }
  // Selects: take first option value
  const selRe = /<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
  while ((m = selRe.exec(formHtml)) !== null) {
    if (!(m[1] in fields)) {
      const opt = m[2].match(/<option[^>]*value=["']([^"']*)["']/i);
      fields[m[1]] = opt ? opt[1] : "";
    }
  }
  return fields;
}

// Parse "MM/DD/YYYY" → "YYYY-MM-DD"
function formatDate(dateStr) {
  if (!dateStr) return "";
  const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

// Parse the results table: find all inspectionDates.asp links and their
// surrounding context (name, address, city, license number, status).
function parseSearchResults(html) {
  const facilities = [];
  // Find all inspectionDates links with the restaurant name
  const linkRe = /<a\s+href=["']inspectionDates\.asp\?SID=&id=(\d+)["'][^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const licenseId = m[1];
    const name = stripTags(m[2]);
    // Look forward in the HTML for the License Location address
    // The address is in a <font> tag after "License Location" text, in the format:
    // "STREET  CITY, FL ZIP"
    const afterLink = html.slice(m.index, m.index + 3000);
    // Find the License Location section
    const locIdx = afterLink.indexOf("License Location");
    let address = "";
    let city = "";
    let zip = "";
    let state = "FL";
    if (locIdx >= 0) {
      // Get the next <font> content after License Location
      const afterLoc = afterLink.slice(locIdx);
      const fontMatch = afterLoc.match(/<font[^>]*>([^<]+)<\/font>/i);
      if (fontMatch) {
        const addrText = decodeEntities(fontMatch[1]).replace(/\s+/g, " ").trim();
        // Parse "STREET CITY, FL ZIP" — city is the word(s) right before ", FL"
        const addrParts = addrText.match(/^(.+)\s+([^,]+),\s*FL\s*(\d{5}.*)$/i);
        if (addrParts) {
          address = addrParts[1].trim();
          city = addrParts[2].trim();
          zip = addrParts[3].trim().slice(0, 5);
        } else {
          // Fallback: try to at least split on ", FL"
          const flSplit = addrText.split(/,\s*FL\s*/i);
          if (flSplit.length >= 2) {
            const streetCity = flSplit[0].trim();
            zip = flSplit[1].trim().slice(0, 5);
            // City is the last word(s) — split from the right
            const lastSpace = streetCity.lastIndexOf(" ");
            if (lastSpace > 0) {
              address = streetCity.slice(0, lastSpace).trim();
              city = streetCity.slice(lastSpace + 1).trim();
            } else {
              address = streetCity;
            }
          } else {
            address = addrText;
          }
        }
      }
    }
    // Also find license number and status from the row
    const rowHtml = afterLink.slice(0, 1500);
    const licMatch = rowHtml.match(/>([A-Z]{3}\d{4,})</);
    const statusMatch = rowHtml.match(/(Current,\s*Active|Voluntary\s*Inactive|Inactive|Delinquent)/i);
    facilities.push({
      license_id: licenseId,
      name,
      address,
      city,
      state,
      zip_code: zip,
      license_number: licMatch ? licMatch[1] : "",
      status: statusMatch ? statusMatch[1] : "",
    });
  }
  return facilities;
}

// Parse inspection dates page — find all inspectionDetail.asp links
function parseInspectionDates(html) {
  const inspections = [];
  const linkRe = /<a\s+href=["']inspectionDetail\.asp\?(InspVisitID=\d+&id=\d+)["'][^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    inspections.push({
      params: m[1],
      date: formatDate(stripTags(m[2])),
      dateRaw: stripTags(m[2]),
    });
  }
  return inspections;
}

// Parse an inspection detail page — extract type, result, violation counts.
// The date comes from the inspectionDates.asp link text (more reliable).
function parseInspectionDetail(html, linkDate) {
  const text = stripTags(html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ""));

  // Inspection type: look for the type that appears right before the date
  // The detail page shows: "Routine - Food | 03/05/2026 | Met Inspection Standards"
  // But "Complaint" may appear elsewhere in the page text. We look for the type
  // that appears near the result/date.
  const resultIdx = text.indexOf("Met Inspection Standards") >= 0
    ? text.indexOf("Met Inspection Standards")
    : text.indexOf("Inspection Not Met");
  // Search backwards from result for the inspection type
  const beforeResult = resultIdx > 0 ? text.slice(Math.max(0, resultIdx - 200), resultIdx) : "";
  const typeMatch = beforeResult.match(/(Routine\s*-\s*Food|Callback\s*-\s*Food|Callback|Opening|Complaint\s*-\s*Food|Complaint|Licensing|Change\s+of\s+Ownership|Temporary\s+Food\s+Service)/i);
  const inspectionType = typeMatch ? typeMatch[1].replace(/\s+/g, " ").trim() : "Routine";

  // Result
  const resultMatch = text.match(/(Met Inspection Standards|Inspection Not Met)/i);
  const result = resultMatch ? resultMatch[1].trim() : "";

  // Violation counts — the three numbers appear right after the result text
  // Format in page: "Met Inspection Standards During This Visit ... 1 0 1"
  let hp = 0, intermediate = 0, basic = 0;
  const afterResultIdx = resultIdx >= 0 ? resultIdx + 40 : 0;
  const afterResult = text.slice(afterResultIdx, afterResultIdx + 300);
  // Find sequences of standalone numbers
  const nums = afterResult.match(/\b(\d+)\b/g);
  if (nums && nums.length >= 3) {
    hp = parseInt(nums[0]) || 0;
    intermediate = parseInt(nums[1]) || 0;
    basic = parseInt(nums[2]) || 0;
  }

  // Calculate safety score
  const penalty = hp * 10 + intermediate * 5 + basic * 2;
  let safetyScore = Math.max(0, Math.min(100, 100 - penalty));
  if (/Met Inspection Standards/i.test(result) && safetyScore < 85) {
    safetyScore = Math.max(85, safetyScore);
  }
  if (/Not Met/i.test(result)) {
    safetyScore = Math.min(safetyScore, 69);
  }

  return {
    inspectionType,
    date: linkDate || "",
    result: result || (safetyScore >= 85 ? "Met Inspection Standards" : "Inspection Not Met"),
    highPriority: hp,
    intermediate,
    basic,
    safetyScore,
    penalty,
  };
}

// ── Session management: 3-step form flow ─────────────────────────────────────

async function getSessionAndSearchForm(cookieStr) {
  // Step 1: GET the landing page to establish session
  await fetch(`${BASE_URL}/wl11.asp?mode=0&SID=&brd=H`, {
    headers: { "User-Agent": UA, "Cookie": cookieStr },
  });
  // Merge any new cookies
  return cookieStr;
}

async function submitSearch(name, city, cookieStr) {
  // Step 2: POST to mode=1 to get the search form with all hidden fields
  const step1Data = new URLSearchParams();
  step1Data.append("SearchType", "Name");
  step1Data.append("SelectSearchType", "Search");
  step1Data.append("SID", "");
  step1Data.append("brd", "H");
  
  const res1 = await fetch(`${BASE_URL}/wl11.asp?mode=1&SID=&brd=H&typ=`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      "Cookie": cookieStr,
    },
    body: step1Data.toString(),
  });
  const html1 = await res1.text();
  
  // Extract the form and all its fields
  const formStart = html1.indexOf("<form");
  const formEnd = html1.indexOf("</form>");
  if (formStart < 0 || formEnd < 0) return [];
  const formHtml = html1.slice(formStart, formEnd + 7);
  const fields = extractFormFields(formHtml);
  
  // Step 3: Set search criteria and submit to mode=2
  fields["OrgName"] = name;
  fields["HRLicType"] = "F"; // Food Service
  fields["SearchFuzzy"] = "Y";
  fields["SearchHistoric"] = "Yes";
  if (city) fields["City"] = city;
  fields["Search1"] = "Search";
  
  const step2Data = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    step2Data.append(k, v);
  }
  
  const res2 = await fetch(`${BASE_URL}/wl11.asp?mode=2&search=Name&SID=&brd=H&typ=`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      "Referer": `${BASE_URL}/wl11.asp?mode=1&SID=&brd=H&typ=`,
      "Cookie": cookieStr,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Origin": BASE_URL,
    },
    body: step2Data.toString(),
  });
  const html2 = await res2.text();
  return parseSearchResults(html2);
}

async function fetchInspectionHistory(licenseId, cookieStr) {
  // Get the list of inspection dates
  const res = await fetch(`${BASE_URL}/inspectionDates.asp?SID=&id=${licenseId}`, {
    headers: { "User-Agent": UA, "Cookie": cookieStr },
  });
  const html = await res.text();
  
  // Check if there are no recent inspections
  if (/no recent inspections/i.test(html)) return [];
  
  const dateLinks = parseInspectionDates(html);
  // Limit to 5 most recent inspections to avoid excessive requests
  const recent = dateLinks.slice(0, 5);
  
  const inspections = [];
  for (const dl of recent) {
    try {
      const detailRes = await fetch(`${BASE_URL}/inspectionDetail.asp?${dl.params}`, {
        headers: { "User-Agent": UA, "Cookie": cookieStr },
      });
      const detailHtml = await detailRes.text();
      const parsed = parseInspectionDetail(detailHtml, dl.date);
      inspections.push({
        ...parsed,
        visit_id: dl.params.match(/InspVisitID=(\d+)/)?.[1] || "",
      });
    } catch { /* skip failed detail fetch */ }
  }
  return inspections;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    
    const body = await req.json().catch(() => ({}));
    const { action, name, city, license_id } = body;
    
    // Initialize session
    const cookieStr = await getSessionAndSearchForm("");
    
    if (action === "search") {
      const facilities = await submitSearch(name || "", city || "", cookieStr);
      return Response.json({ facilities });
    }
    
    if (action === "detail" && license_id) {
      const inspections = await fetchInspectionHistory(license_id, cookieStr);
      return Response.json({ inspections });
    }
    
    return Response.json({ error: "Invalid action. Use 'search' or 'detail'." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});