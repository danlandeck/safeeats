import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, establishmentName, city, inspectionId } = body;

    const BASE_URL = 'https://www.pafoodsafety.pa.gov/Web/Inspection/PublicInspectionSearch.aspx';

    if (action === 'test_ok_search') {
      // Test Oklahoma search
      const okUrl = 'https://www.phin.state.ok.us/inspections/';
      
      // Step 1: GET initial page
      const initRes = await fetch(okUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const initHtml = await initRes.text();
      
      const viewstate = initHtml.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/)?.[1] || '';
      const eventValidation = initHtml.match(/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/)?.[1] || '';
      const viewstateGenerator = initHtml.match(/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/)?.[1] || '';
      
      const cookies = initRes.headers.get('set-cookie') || '';
      const cookieStr = cookies.split(',').map(c => c.split(';')[0]).join('; ');
      
      // Extract form field names
      const inputFields = [...initHtml.matchAll(/<input[^>]*name="([^"]*)"[^>]*>/g)].map(m => m[1]);
      const selectFields = [...initHtml.matchAll(/<select[^>]*name="([^"]*)"[^>]*>/g)].map(m => m[1]);
      const btnFields = [...initHtml.matchAll(/<input[^>]*type="submit"[^>]*name="([^"]*)"[^>]*>/g)].map(m => m[1]);
      
      // Step 2: POST search — search for "McDonald" in Oklahoma County
      const formData = new URLSearchParams();
      formData.append('__EVENTTARGET', '');
      formData.append('__EVENTARGUMENT', '');
      formData.append('__VIEWSTATE', viewstate);
      if (viewstateGenerator) formData.append('__VIEWSTATEGENERATOR', viewstateGenerator);
      if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);
      
      // Set search text
      formData.append('txtSearch', 'McDonald');
      // Set county to Oklahoma County — extract actual value from the HTML
      const countyOptions = [...initHtml.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)];
      const okCountyOption = countyOptions.find(m => m[2].trim() === 'Oklahoma');
      if (okCountyOption) formData.append('cmbCounties', okCountyOption[1]);
      // Add search button
      formData.append('cmdSearch', 'Search');
      
      const searchRes = await fetch(okUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookieStr,
          'Referer': okUrl,
        },
        body: formData.toString(),
      });
      const searchHtml = await searchRes.text();
      
      const title = searchHtml.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      const hasResults = searchHtml.includes('Search Results') || searchHtml.includes('gvResults') || searchHtml.includes('dgResults');
      const hasBlocked = searchHtml.includes('blocked') || searchHtml.includes('Block');
      const hasTable = searchHtml.includes('<table');
      const hasPdfLinks = searchHtml.includes('.pdf') || searchHtml.includes('Pdf') || searchHtml.includes('Inspection');
      const hasViolation = searchHtml.toLowerCase().includes('violation');
      
      // Extract any table data
      const tables = [...searchHtml.matchAll(/<table[^>]*id="([^"]*)"[^>]*>/g)].map(m => m[1]);
      const dataGrids = [...searchHtml.matchAll(/id="([^"]*(?:dg|gv|grd|DataGrid|Grid)[^"]*)"/gi)].map(m => m[1]);
      
      // Look for facility names in the response
      const facilityMatches = [...searchHtml.matchAll(/<a[^>]*>([^<]*(?:McDonald|Restaurant|Inc|LLC)[^<]*)<\/a>/gi)].map(m => m[1]).slice(0, 5);
      
      return Response.json({
        initHtmlLength: initHtml.length,
        inputFields,
        selectFields,
        btnFields,
        nameField,
        countyField,
        searchHtmlLength: searchHtml.length,
        title,
        hasResults,
        hasBlocked,
        hasTable,
        hasPdfLinks,
        hasViolation,
        tables,
        dataGrids,
        facilityMatches,
        htmlSample: searchHtml.substring(0, 5000),
      });
    }

    if (action === 'test_ok') {
      // Test Oklahoma portal accessibility
      const okUrl = 'https://www.phin.state.ok.us/inspections/';
      const res = await fetch(okUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });
      const html = await res.text();
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      const hasSearchForm = html.includes('txtEstablistmentName') || html.includes('Search');
      const hasBlocked = html.includes('blocked') || html.includes('Block');
      const hasForm = html.includes('<form');

      return Response.json({
        status: res.status,
        url: res.url,
        title,
        htmlLength: html.length,
        hasSearchForm,
        hasBlocked,
        hasForm,
        htmlSample: html.substring(0, 3000),
      });
    }

    if (action === 'test_search') {
      // Step 1: GET initial page to extract hidden fields
      const initRes = await fetch(BASE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      const initHtml = await initRes.text();

      // Extract hidden fields
      const viewstate = initHtml.match(/name="__VIEWSTATE"\s+id="__VIEWSTATE"\s+value="([^"]*)"/)?.[1] || '';
      const viewstateGenerator = initHtml.match(/name="__VIEWSTATEGENERATOR"\s+id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/)?.[1] || '';
      const eventValidation = initHtml.match(/name="__EVENTVALIDATION"\s+id="__EVENTVALIDATION"\s+value="([^"]*)"/)?.[1] || '';
      const viewstateEncrypted = initHtml.match(/name="__VIEWSTATEENCRYPTED"\s+id="__VIEWSTATEENCRYPTED"\s+value="([^"]*)"/)?.[1] || '';

      // Extract cookies
      const cookies = initRes.headers.get('set-cookie') || '';
      const cookieStr = cookies.split(',').map(c => c.split(';')[0]).join('; ');

      // Step 2: POST search
      const formData = new URLSearchParams();
      formData.append('__EVENTTARGET', '');
      formData.append('__EVENTARGUMENT', '');
      formData.append('__VIEWSTATE', viewstate);
      formData.append('__VIEWSTATEGENERATOR', viewstateGenerator);
      if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);
      if (viewstateEncrypted) formData.append('__VIEWSTATEENCRYPTED', viewstateEncrypted);
      formData.append('ctl00$MainContent$txtEstablistmentName', establishmentName || 'McDonald');
      formData.append('ctl00$MainContent$btnSearch', 'Search');

      const searchRes = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookieStr,
          'Referer': BASE_URL,
        },
        body: formData.toString(),
      });

      const searchHtml = await searchRes.text();

      // Check what we got — look for result table, violation data, PDF links
      const hasResultsTable = searchHtml.includes('MainContent_gvSearchResults') || searchHtml.includes('Search Results');
      const hasPdfLinks = searchHtml.includes('.pdf') || searchHtml.includes('Pdf');
      const hasViolationData = searchHtml.includes('violation') || searchHtml.includes('Violation');
      const hasCompliance = searchHtml.includes('In Compliance') || searchHtml.includes('Out of Compliance');

      // Try to extract facility rows from results table
      const facilityRows = [];
      const rowRegex = /<tr[^>]*class="[^"]*(?:SearchResultRow|GridRow|AlternatingRow)[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
      let match;
      while ((match = rowRegex.exec(searchHtml)) !== null && facilityRows.length < 5) {
        facilityRows.push(match[1].substring(0, 500));
      }

      // Also look for table with id containing "gvSearchResults" or "grdResults"
      const tableMatch = searchHtml.match(/<table[^>]*id="[^"]*(?:gvSearch|grdSearch|gvResults|grdResults)[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
      const tableContent = tableMatch ? tableMatch[1].substring(0, 2000) : null;

      // Check for ScriptManager / UpdatePanel
      const hasScriptManager = initHtml.includes('ScriptManager') || initHtml.includes('scriptManager');
      const hasUpdatePanel = initHtml.includes('UpdatePanel') || initHtml.includes('upSearchParameters');

      // Look for the actual search button name
      const btnMatches = [...initHtml.matchAll(/name="(ctl00\$MainContent\$[^"]*[Bb]tn[^"]*)"/g)].map(m => m[1]);

      // Extract all hidden inputs
      const hiddenInputs = [...initHtml.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]*)"[^>]*>/g)].map(m => m[1]);

      // Check response for error indicators
      const hasError = searchHtml.includes('Error') || searchHtml.includes('error');
      const hasNoResults = searchHtml.includes('No results') || searchHtml.includes('no records');
      const responseTitle = searchHtml.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      const responseH1 = searchHtml.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] || '';
      const responseH2 = searchHtml.match(/<h2[^>]*>([^<]*)<\/h2>/)?.[1] || '';

      // Look for any table in the response
      const allTables = [...searchHtml.matchAll(/<table[^>]*>/g)].length;

      // Check if response is the same form (meaning search didn't execute)
      const hasSearchForm = searchHtml.includes('txtEstablistmentName');

      return Response.json({
        status: 'success',
        htmlLength: searchHtml.length,
        hasResultsTable,
        hasPdfLinks,
        hasViolationData,
        hasCompliance,
        facilityRowCount: facilityRows.length,
        facilityRows,
        tableContent,
        hasScriptManager,
        hasUpdatePanel,
        btnMatches,
        hiddenInputs,
        hasError,
        hasNoResults,
        responseTitle,
        responseH1,
        responseH2,
        allTables,
        hasSearchForm,
        htmlSample: searchHtml.substring(0, 5000),
        htmlSample2: searchHtml.substring(searchHtml.length - 3000),
      });
    }

    return Response.json({ error: 'Unknown action. Use action=test_search.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});