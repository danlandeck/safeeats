import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ── Mississippi State Department of Health (MSDH) ─────────────────────────────
// Portal: apps.msdh.ms.gov/food (CodeCharge Studio ASP.NET)
// State-wide coverage: ALL 82 counties. A/B/C grading (A=90+, B=80+, C=70+).
// Flow: GET default.aspx → extract __VIEWSTATE + __EVENTVALIDATION → POST search
// → parse facility list → GET FacilityRecord.aspx per facility for inspection grades.
// Detail: parse inspection history table (Ref#, Type, Score, Date).

const BASE_URL = "https://apps.msdh.ms.gov/food";

function extractHidden(html, name) {
  const re = new RegExp(`name="${name}"\\s+id="${name}"\\s+value="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function parseFacilityListings(html) {
  const facilities = [];
  const rowRe = /<a href="FacilityRecord\.aspx\?PimsID=(\d+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const pimsId = m[1];
    const name = m[2].trim();
    // Extract table cells from the row (starts from the <a> tag, so cell 0 = city)
    const rowHtml = m[0];
    const cells = rowHtml.match(/<td class="KnockoutDataTD">([\s\S]*?)<\/td>/gi) || [];
    const cellTexts = cells.map(c => c.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim());
    facilities.push({
      pimsId,
      name,
      city: cellTexts[0] || "",
      address: cellTexts[1] || "",
      phone: cellTexts[2] || "",
      permitDate: cellTexts[3] || "",
      expireDate: cellTexts[4] || "",
    });
  }
  return facilities;
}

function parseInspectionTable(html, section) {
  const inspections = [];
  const sectionIdx = html.indexOf(section);
  if (sectionIdx === -1) return inspections;
  // For old system, stop at "Complaints" section to avoid parsing complaint rows
  let endIdx = sectionIdx + 30000;
  if (section === "Inspection(s) Summary") {
    const complaintsIdx = html.indexOf("Complaints / Enforcement", sectionIdx);
    if (complaintsIdx !== -1 && complaintsIdx < endIdx) endIdx = complaintsIdx;
  }
  const tableHtml = html.substring(sectionIdx, endIdx);
  const trRe = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(tableHtml)) !== null) {
    const rowHtml = trMatch[0];
    if (rowHtml.includes("KnockoutColumnTD") || rowHtml.includes("SorterLink")) continue;
    const cells = rowHtml.match(/<td class="KnockoutDataTD"[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const cellTexts = cells.map(c => c.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim());
    if (cellTexts.length >= 4) {
      const refNum = cellTexts[0];
      const type = cellTexts[1];
      const score = cellTexts[2];
      const date = cellTexts[3];
      // Validate: date must be MM/DD/YYYY and score must be A/B/C/Pass/Fail
      if (refNum && date && /^\d{2}\/\d{2}\/\d{4}$/.test(date) && /^(A|B|C|Pass|Fail)$/i.test(score)) {
        inspections.push({ refNum, type, score, date });
      }
    }
  }
  return inspections;
}

function gradeToScore(grade) {
  const g = grade.toUpperCase().trim();
  if (g === "A") return { safetyScore: 95, grade: "A" };
  if (g === "B") return { safetyScore: 85, grade: "B" };
  if (g === "C") return { safetyScore: 75, grade: "C" };
  if (g === "PASS") return { safetyScore: 90, grade: "A" };
  if (g === "FAIL") return { safetyScore: 50, grade: "F" };
  return { safetyScore: null, grade: "U" };
}

function normalizeDate(dateStr) {
  // MM/DD/YYYY → YYYY-MM-DD
  const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[1]}-${m[2]}`;
}

async function searchFacilities(query) {
  // Step 1: GET to establish session + get viewstate
  const getResp = await fetch(`${BASE_URL}/default.aspx`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SafeEatsBot/1.0)" },
  });
  const getHtml = await getResp.text();
  const setCookie = getResp.headers.get("set-cookie") || "";
  const sessionId = setCookie.match(/ASP\.NET_SessionId=([^;]+)/)?.[1] || "";
  const viewstate = extractHidden(getHtml, "__VIEWSTATE");
  const eventValidation = extractHidden(getHtml, "__EVENTVALIDATION");

  // Step 2: POST search
  const formData = new URLSearchParams();
  formData.append("__VIEWSTATE", viewstate);
  formData.append("__EVENTVALIDATION", eventValidation);
  formData.append("Searchs_FacilityTypesID", "");
  formData.append("Searchs_FacilityName", query);
  formData.append("Searchs_FacilityStreet", "");
  formData.append("Searchs_FacilityCity", "");
  formData.append("Searchs_CountyID", "");
  formData.append("Searchs_SmokeFreeTypeID", "");
  formData.append("SearchDoSearch", "Search");

  const postResp = await fetch(`${BASE_URL}/default.aspx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; SafeEatsBot/1.0)",
      "Cookie": `ASP.NET_SessionId=${sessionId}`,
      "Referer": `${BASE_URL}/default.aspx`,
    },
    body: formData.toString(),
  });
  const postHtml = await postResp.text();
  return parseFacilityListings(postHtml);
}

async function getFacilityInspections(pimsId) {
  const resp = await fetch(`${BASE_URL}/FacilityRecord.aspx?PimsID=${pimsId}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SafeEatsBot/1.0)" },
  });
  const html = await resp.text();
  // Parse facility header info
  const nameMatch = html.match(/Name:\s*([^<]+?)\s+Status:\s*(\w+)/);
  const streetMatch = html.match(/Street:\s*([^<]+?)\s+City:\s*([^<]+?)\s+State:\s*(\w+)\s+Zip:\s*(\d+)/);
  // Parse new inspection system (A/B/C grades)
  const newInspections = parseInspectionTable(html, "New Inspection");
  // Parse old inspection system (Pass/Fail)
  const oldInspections = parseInspectionTable(html, "Inspection(s) Summary");
  return {
    name: nameMatch ? nameMatch[1].trim() : "",
    status: nameMatch ? nameMatch[2].trim() : "",
    address: streetMatch ? streetMatch[1].trim() : "",
    city: streetMatch ? streetMatch[2].trim() : "",
    state: streetMatch ? streetMatch[3].trim() : "MS",
    zip: streetMatch ? streetMatch[4].trim() : "",
    newInspections,
    oldInspections,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, query, pimsId } = body;

    if (action === "search") {
      const facilities = await searchFacilities(query);
      // For each facility, get the latest inspection grade (limit to 15 for performance)
      const results = [];
      for (const fac of facilities.slice(0, 15)) {
        try {
          const detail = await getFacilityInspections(fac.pimsId);
          const allInspections = [
            ...detail.newInspections.map(i => ({ ...i, system: "new" })),
            ...detail.oldInspections.map(i => ({ ...i, system: "old" })),
          ];
          // Sort by date descending
          allInspections.sort((a, b) => new Date(normalizeDate(b.date)) - new Date(normalizeDate(a.date)));
          const latest = allInspections[0];
          const { safetyScore, grade } = latest ? gradeToScore(latest.score) : { safetyScore: null, grade: "U" };
          results.push({
            business_id: fac.pimsId,
            name: detail.name || fac.name,
            address: detail.address || fac.address,
            city: detail.city || fac.city,
            state: detail.state || "MS",
            zip_code: detail.zip,
            phone: fac.phone,
            safetyScore,
            grade,
            totalInspections: allInspections.length,
            latestDate: latest ? normalizeDate(latest.date) : "",
            latestResult: latest ? `${latest.score} (${latest.type})` : "",
            source: "mississippi",
            isLLMData: false,
          });
        } catch (e) {
          // Skip facilities that fail to load
        }
      }
      return Response.json({ facilities: results });
    }

    if (action === "detail") {
      const detail = await getFacilityInspections(pimsId);
      const allInspections = [
        ...detail.newInspections.map(i => ({ ...i, system: "new" })),
        ...detail.oldInspections.map(i => ({ ...i, system: "old" })),
      ];
      allInspections.sort((a, b) => new Date(normalizeDate(b.date)) - new Date(normalizeDate(a.date)));
      // Build detail rows
      const rows = [];
      for (const insp of allInspections) {
        const { safetyScore, grade } = gradeToScore(insp.score);
        rows.push({
          inspection_serial_num: `ms-${pimsId}-${insp.refNum}`,
          inspection_date: normalizeDate(insp.date),
          inspection_score: safetyScore ? String(100 - safetyScore) : "0",
          inspection_result: insp.score,
          inspection_type: insp.type,
          violation_description: insp.system === "new"
            ? `Grade: ${insp.score} — FDA Food Code inspection checklist`
            : `Result: ${insp.score} — Legacy inspection system`,
          violation_type: insp.score === "A" || insp.score === "Pass" ? "BLUE" : "RED",
          violation_points: safetyScore ? String(100 - safetyScore) : "50",
        });
      }
      return Response.json({ detail: rows });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});