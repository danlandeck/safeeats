import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const PORTAL_URL = "https://foodserviceprod.adh.arkansas.gov/Web/inspection/publicinspectionsearch.aspx";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Extract all form fields (hidden + text + select) from the initial GET response.
 */
function extractFormFields(html) {
  const fields = {};
  // Hidden inputs
  for (const m of html.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/name="([^"]*)"/)?.[1];
    const val = tag.match(/value="([^"]*)"/)?.[1] || "";
    if (name) fields[name] = val;
  }
  // Text inputs
  for (const m of html.matchAll(/<input[^>]*type="text"[^>]*>/gi)) {
    const tag = m[0];
    const name = tag.match(/name="([^"]*)"/)?.[1];
    const val = tag.match(/value="([^"]*)"/)?.[1] || "";
    if (name && !(name in fields)) fields[name] = val;
  }
  // Selects — use selected option or first option
  for (const m of html.matchAll(/<select[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const name = m[1];
    const options = m[2];
    const selected = options.match(/<option[^>]*selected="selected"[^>]*value="([^"]*)"/i);
    const firstOpt = options.match(/<option[^>]*value="([^"]*)"/i);
    fields[name] = selected ? selected[1] : (firstOpt ? firstOpt[1] : "");
  }
  return fields;
}

/**
 * Extract the upGrid UpdatePanel content from an ASP.NET AJAX partial postback response.
 * The response is pipe-delimited: length|type|id|content|length|type|...
 */
function extractUpdatePanelContent(ajaxResponse, panelId) {
  const marker = `|updatePanel|${panelId}|`;
  const idx = ajaxResponse.indexOf(marker);
  if (idx < 0) return "";
  const startIdx = idx + marker.length + 1; // +1 for the pipe after the marker
  const rest = ajaxResponse.substring(startIdx);
  // The content ends at the next field: |<number>|<type>|
  const endMatch = rest.search(/\|\d+\|[^|]+\|/);
  return endMatch > 0 ? rest.substring(0, endMatch) : rest;
}

/**
 * Parse a city/state/zip string like "Marion, AR 72364" into components.
 */
function parseCityStateZip(locationStr) {
  const match = locationStr.match(/^(.+?),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/);
  if (match) {
    return { city: match[1].trim(), state: match[2], zip: match[3] || "" };
  }
  return { city: locationStr.trim(), state: "AR", zip: "" };
}

/**
 * Parse the first <td> content (name cell) to extract name, address, city, state, zip, phone.
 * The <td> has: NAME<BR><div>STREET  CITY, ST ZIP</div><div>PHONE</div>
 * Falls back to NonFormattedNameAddress if name can't be extracted from <td>.
 */
function parseNameCell(tdHtml, rawNameAddr) {
  // Name = text before <BR> (or <br>)
  const nameMatch = tdHtml.match(/^([^<]*)<br/i);
  let name = nameMatch ? nameMatch[1].trim() : "";

  // Address line = first <div> content
  const divs = [...tdHtml.matchAll(/<div[^>]*>([^<]*)<\/div>/gi)].map(m => m[1].trim());
  const addressLine = divs[0] || "";
  const phone = divs[1] || "";

  // Parse "STREET  CITY, ST ZIP" from the address line
  let street = "";
  let city = "";
  let state = "AR";
  let zip = "";

  const cityStateZipMatch = addressLine.match(/,\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?\s*$/);
  if (cityStateZipMatch) {
    state = cityStateZipMatch[1];
    zip = cityStateZipMatch[2] || "";
    const beforeComma = addressLine.substring(0, cityStateZipMatch.index).trim();
    const parts = beforeComma.split(/\s{2,}/);
    if (parts.length >= 2) {
      city = parts[parts.length - 1].trim();
      street = parts.slice(0, -1).join("  ").trim();
    } else {
      street = beforeComma;
    }
  } else {
    street = addressLine;
  }

  // Fallback: if name is empty, extract from NonFormattedNameAddress
  // by finding the street in the raw string and taking everything before it
  if (!name && rawNameAddr && street) {
    const decoded = rawNameAddr.replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
    // Remove phone from the end
    const phoneIdx = decoded.search(/\d{3}-\d{3}-\d{4}/);
    const noPhone = phoneIdx > 0 ? decoded.substring(0, phoneIdx).trim() : decoded;
    // Find the street in the remaining string
    const streetIdx = noPhone.indexOf(street);
    if (streetIdx > 0) {
      name = noPhone.substring(0, streetIdx).trim();
    } else {
      // Can't find street — take first word(s) before 2+ spaces
      const parts = noPhone.split(/\s{2,}/);
      name = parts[0] ? parts[0].trim() : "";
    }
  }

  return { name, address: street, city, state, zip_code: zip, phone };
}

/**
 * Parse establishment rows from the grid HTML.
 * Splits by NonFormattedNameAddress attribute to isolate each establishment block.
 */
function parseEstablishments(gridHtml) {
  const establishments = [];
  // Split by the NonFormattedNameAddress attribute to get individual establishment blocks
  const blocks = gridHtml.split(/<tr[^>]*NonFormattedNameAddress="/i);
  // First element is the HTML before the first establishment row — skip it
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];

    // The block starts with the attribute value, followed by "> ... <td>NAME<BR>... <td>DATE <td>TYPE"
    // Extract the NonFormattedNameAddress value (up to the next ")
    const attrEnd = block.indexOf('"');
    if (attrEnd < 0) continue;
    const rawNameAddr = block.substring(0, attrEnd);
    const rowHtml = block.substring(attrEnd + 1);

    // Extract the first 3 <td> elements from the row
    const td1Match = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!td1Match) continue;
    const td1Content = td1Match[1];

    // Extract date and type from the 2nd and 3rd <td>
    const afterTd1 = rowHtml.substring(td1Match.index + td1Match[0].length);
    const td2Match = afterTd1.match(/<td[^>]*>([^<]*)<\/td>/i);
    const td3Match = td2Match ? afterTd1.substring(td2Match.index + td2Match[0].length).match(/<td[^>]*>([^<]*)<\/td>/i) : null;

    const latestDate = td2Match ? td2Match[1].trim() : "";
    const inspectionType = td3Match ? td3Match[1].trim() : "";

    // Parse name, address, city, state, zip, phone from the first <td> content
    const parsed = parseNameCell(td1Content, rawNameAddr);

    // Extract establishment Key from the row
    const keyMatch = rowHtml.match(/Key="(\d+)"/);
    const establishmentKey = keyMatch ? keyMatch[1] : "";

    // Format date from MM/DD/YYYY to YYYY-MM-DD
    let formattedDate = "";
    if (latestDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [mm, dd, yyyy] = latestDate.split("/");
      formattedDate = `${yyyy}-${mm}-${dd}`;
    }

    establishments.push({
      name: parsed.name,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      zip_code: parsed.zip_code,
      phone: parsed.phone,
      business_id: establishmentKey || `${parsed.name}-${parsed.address}`.replace(/\s+/g, "-").toLowerCase(),
      latestDate: formattedDate,
      latestResult: inspectionType,
      totalInspections: null,
      detail_url: PORTAL_URL,
      source: "arkansas",
    });
  }
  return establishments;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "search";
    const searchName = body.name || "";
    const searchCity = body.city || "";

    if (action === "search") {
      // Step 1: GET the search page to extract form fields and cookies
      const getResp = await fetch(PORTAL_URL, {
        headers: { "User-Agent": UA },
      });
      const pageHtml = await getResp.text();

      // Extract cookies from the response
      const setCookies = getResp.headers.getSetCookie?.() || [];
      const cookieStr = setCookies.map(c => c.split(";")[0]).join("; ");
      if (!cookieStr) {
        return Response.json({ error: "No session cookies returned" }, { status: 502 });
      }

      // Extract all form fields
      const formFields = extractFormFields(pageHtml);

      // Step 2: Build AJAX partial postback request
      const formData = new URLSearchParams();
      for (const [k, v] of Object.entries(formFields)) {
        formData.set(k, v);
      }
      formData.set("ctl00$ScriptManager1", "ctl00$MainContent$upGrid|ctl00$MainContent$btnSearch");
      formData.set("ctl00$MainContent$txtEstablistmentName", searchName);
      if (searchCity) {
        formData.set("ctl00$MainContent$txtCity", searchCity);
      }
      formData.set("ctl00$MainContent$btnSearch", "Search");
      formData.set("__ASYNCPOST", "true");

      // Step 3: POST the AJAX search
      const postResp = await fetch(PORTAL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "User-Agent": UA,
          "Referer": PORTAL_URL,
          "X-MicrosoftAjax": "Delta=true",
          "X-Requested-With": "XMLHttpRequest",
          "Cookie": cookieStr,
        },
        body: formData.toString(),
      });

      const ajaxResponse = await postResp.text();

      // Step 4: Extract the upGrid UpdatePanel content
      const gridHtml = extractUpdatePanelContent(ajaxResponse, "MainContent_upGrid");
      if (!gridHtml) {
        return Response.json({ facilities: [], error: "No results grid in response" });
      }

      // Step 5: Parse establishment rows
      const facilities = parseEstablishments(gridHtml);

      return Response.json({ facilities, count: facilities.length });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});