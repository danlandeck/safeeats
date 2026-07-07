import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SEARCH_URL = "https://aca-prod.accela.com/TPCHD/GeneralProperty/PropertyLookUp.aspx?isFoodFacility=Y&TabName=APO";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractField(html, id) {
  const m = html.match(new RegExp('id="' + id + '"\\s+value="([^"]*)"'));
  return m ? m[1] : "";
}

function stripTags(s) {
  return (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse the Accela AJAX partial-response HTML for food facility search results.
 * Each grid row contains: business name, facility type, PR ID, address, city, zip.
 */
function parseSearchResults(html) {
  const facilities = [];
  const rowRegex = /<tr[^>]*class="ACA_TabRow_(?:Odd|Even)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    const nameMatch = rowHtml.match(/lnkBusinessName[^>]*>([^<]+)<\/a>/i);
    const name = nameMatch ? stripTags(nameMatch[1]) : "";

    const prMatch = rowHtml.match(/lnkLicenseRefNumber[^>]*>([^<]+)<\/a>/i);
    const prId = prMatch ? stripTags(prMatch[1]) : "";

    const typeMatch = rowHtml.match(/lblBusiName2[^>]*>([^<]+)<\/span>/i);
    const facilityType = typeMatch ? stripTags(typeMatch[1]) : "";

    // Address span contains <br/> separated lines: street, city+state+zip, country
    const addrMatch = rowHtml.match(/lblAddress[^>]*>([\s\S]*?)<\/span>/i);
    const addrHtml = addrMatch ? addrMatch[1] : "";
    const addrParts = addrHtml.split(/<br\s*\/?>/i).map(s => stripTags(s));
    const address = addrParts[0] || "";

    const lblCityMatch = rowHtml.match(/lblCity[^>]*>([^<]+)<\/span>/i);
    const lblZipMatch = rowHtml.match(/lblZip[^>]*>([^<]+)<\/span>/i);
    const city = lblCityMatch ? stripTags(lblCityMatch[1]) : "";
    const zip = lblZipMatch ? stripTags(lblZipMatch[1]) : "";

    if (name && prId) {
      facilities.push({ name, prId, facilityType, address, city, zip });
    }
  }
  return facilities;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, name } = body;

    if (action === "search") {
      // Step 1: GET the search page to obtain ViewState + session cookies
      const getRes = await fetch(SEARCH_URL, {
        headers: { "User-Agent": UA },
      });
      const html = await getRes.text();

      // Extract cookies (getSetCookie returns string[])
      const rawCookies = getRes.headers.getSetCookie ? getRes.headers.getSetCookie() : [];
      const cookieStr = rawCookies.map(c => c.split(";")[0]).join("; ");

      const vs = extractField(html, "__VIEWSTATE");
      const vsg = extractField(html, "__VIEWSTATEGENERATOR");
      const csrf = extractField(html, "ACA_CS_FIELD");

      // Step 2: POST the AJAX search (ASP.NET partial postback)
      const fd = new URLSearchParams();
      fd.append("ctl00$ScriptManager1", "ctl00$PlaceHolderMain$updatePanel|ctl00$PlaceHolderMain$btnNewSearch");
      fd.append("__EVENTTARGET", "ctl00$PlaceHolderMain$btnNewSearch");
      fd.append("__EVENTARGUMENT", "");
      fd.append("__VIEWSTATE", vs);
      fd.append("__VIEWSTATEGENERATOR", vsg);
      fd.append("__VIEWSTATEENCRYPTED", "");
      fd.append("ACA_CS_FIELD", csrf);
      fd.append("ctl00$HeaderNavigation$hdnShoppingCartItemNumber", "");
      fd.append("ctl00$HeaderNavigation$hdnShowReportLink", "N");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtBusiName", name || "");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtAddress1", "");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtCity", "");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtZipCode", "");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtZipCode_ZipFromAA", "0");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtZipCode_zipMask", "");
      fd.append("ctl00$PlaceHolderMain$refFoodFacilitySearchForm$txtZipCode_ext_ClientState", "");
      fd.append("ctl00$HDExpressionParam", "");
      fd.append("Submit", "Submit");
      fd.append("ctl00$PlaceHolderMain$btnNewSearch", "Search");
      fd.append("__ASYNCPOSTBACK", "true");

      const postRes = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          "X-Requested-With": "XMLHttpRequest",
          "X-MicrosoftAjax": "Delta=true",
          "Cookie": cookieStr,
          "User-Agent": UA,
          "Referer": SEARCH_URL,
          "Origin": "https://aca-prod.accela.com",
        },
        body: fd.toString(),
      });
      const searchText = await postRes.text();

      const facilities = parseSearchResults(searchText);
      return Response.json({ facilities });
    }

    return Response.json({ facilities: [], error: "Unknown action" });
  } catch (error) {
    return Response.json({ facilities: [], error: error.message }, { status: 500 });
  }
});