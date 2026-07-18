import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BASE_URL = 'https://dc.healthinspections.us';
const REPORT_URL = `${BASE_URL}/lib/mod/inspection/paper/_paper_food_inspection_report.cfm`;

interface DCFacility {
  business_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  ward: string;
  quadrant: string;
  facility_type: string;
  permit_id: string;
  inspections: DCInspection[];
  portal_url: string;
  source: string;
}

interface DCInspection {
  inspection_id: string;
  date: string;
  type: string;
  priority_violations: number;
  priority_foundation_violations: number;
  core_violations: number;
  cos_count: number;
  repeat_count: number;
  score: number | null;
  result: string;
  report_url: string;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .trim();
}

function formatDate(dateStr: string): string {
  // Input: "Monday, July 29, 2024" → "2024-07-29"
  const m = dateStr.match(/(\w+),?\s+(\w+)\s+(\d+),?\s+(\d{4})/);
  if (!m) return dateStr;
  const months: Record<string, string> = {
    January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
    July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
  };
  const month = months[m[2]];
  if (!month) return dateStr;
  const day = m[3].padStart(2, '0');
  return `${m[4]}-${month}-${day}`;
}

function computeScore(priority: number, foundation: number, core: number): number {
  const pts = priority * 7 + foundation * 4 + core * 1.5;
  return Math.max(0, Math.min(100, Math.round(100 - pts)));
}

function getResultLabel(priority: number, foundation: number, core: number): string {
  if (priority > 0) return `${priority} priority violation${priority > 1 ? 's' : ''}`;
  if (foundation > 0) return `${foundation} priority foundation violation${foundation > 1 ? 's' : ''}`;
  if (core > 0) return `${core} core violation${core > 1 ? 's' : ''}`;
  return 'Pass — No violations';
}

// Parse the search results HTML to extract establishments and their inspections
function parseSearchResults(html: string): DCFacility[] {
  const facilities: DCFacility[] = [];
  
  // Split HTML by establishment permitID links to get individual blocks
  // Each establishment starts with <a href="...permitID=XXX">NAME</a>
  const parts = html.split(/(?=<a[^>]+permitID=\d+[^>]*>)/i);
  
  for (const part of parts) {
    // Extract permitID and name from the first link in this block
    const estMatch = part.match(/<a[^>]+permitID=(\d+)[^>]*>([^<]+)<\/a>/i);
    if (!estMatch) continue;
    
    const permitId = estMatch[1];
    const name = decodeEntities(estMatch[2]);
    if (!name || name.length < 2) continue;
    
    // Extract address from plain text after </h3> and before <br>
    // POST response format: </h3>\n\t\tADDRESS TEXT Washington, DC ZIPCODE<br />
    let address = '';
    let zipCode = '';
    const addrTextMatch = part.match(/<\/h3>\s*([\s\S]*?)<br\s*\/?>/i);
    if (addrTextMatch) {
      const addrRaw = decodeEntities(addrTextMatch[1].replace(/\r?\n/g, ' ').replace(/\t/g, '').trim());
      const zipMatch = addrRaw.match(/(\d{5})/);
      zipCode = zipMatch ? zipMatch[1] : '';
      // Remove "Washington, DC 20008" suffix to get just the street address
      address = addrRaw.replace(/,?\s*(WASHINGTON|Washington),?\s*DC\s*\d*.*/i, '').trim();
    }
    // Fallback: try Google Maps link if present (GET response format)
    if (!address) {
      const addrMatch = part.match(/maps\.google\.com\/maps\?q=([^"'\)]+)/i);
      if (addrMatch) {
        const addrRaw = decodeEntities(addrMatch[1].replace(/%20/g, ' ').replace(/&amp;/g, '&'));
        const zipMatch = addrRaw.match(/(\d{5})/);
        zipCode = zipMatch ? zipMatch[1] : '';
        address = addrRaw.replace(/,?\s*(WASHINGTON|Washington),?\s*DC\s*\d*.*/i, '').trim();
      }
    }
    
    // Extract ward
    const wardMatch = part.match(/Ward:\s*([^\|<]+)/i);
    const ward = wardMatch ? wardMatch[1].trim() : '';
    
    // Extract quadrant
    const quadMatch = part.match(/Quad:\s*(\w+)/i);
    const quadrant = quadMatch ? quadMatch[1].trim() : '';
    
    // Extract type
    const typeMatch = part.match(/Type:\s*([^<\n]+)/i);
    const facilityType = typeMatch ? typeMatch[1].trim() : '';
    
    // Extract inspections - each has a report link with inspectionID
    // Pattern: <a href="...inspectionID=XXX...">TYPE: DATE</a> (HTML)
    const inspRegex = /inspectionID=(\d+)[^>]*>([^<]+):\s*(\w+,\s+\w+\s+\d+,?\s+\d{4})/gi;
    const inspections: DCInspection[] = [];
    let inspMatch;
    
    while ((inspMatch = inspRegex.exec(part)) !== null) {
      const inspectionId = inspMatch[1];
      const inspType = inspMatch[2].trim();
      const inspDate = formatDate(inspMatch[3]);
      
      inspections.push({
        inspection_id: inspectionId,
        date: inspDate,
        type: inspType,
        priority_violations: 0,
        priority_foundation_violations: 0,
        core_violations: 0,
        cos_count: 0,
        repeat_count: 0,
        score: null as any,
        result: '',
        report_url: `${REPORT_URL}?inspectionID=${inspectionId}&wguid=1367&wgunm=sysact&wgdmn=431`,
      });
    }
    
    // Sort inspections by date descending
    inspections.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    
    facilities.push({
      business_id: `dc-${permitId}`,
      name,
      address,
      city: 'Washington',
      state: 'DC',
      zip_code: zipCode,
      ward,
      quadrant,
      facility_type: facilityType,
      permit_id: permitId,
      inspections,
      portal_url: `${BASE_URL}/?a=inspections&permitID=${permitId}`,
      source: 'dc',
    });
  }
  
  return facilities;
}

// Fetch and parse an individual inspection report to get violation counts
async function fetchInspectionDetails(inspectionId: string): Promise<Partial<DCInspection> | null> {
  try {
    const url = `${REPORT_URL}?inspectionID=${inspectionId}&wguid=1367&wgunm=sysact&wgdmn=431`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SafeEats/1.0)',
        'Accept': 'text/html',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    
    // Extract violation counts from the summary table
    // Pattern: Priority Violations | 0 | COS | 0 | R | 0
    const priorityMatch = html.match(/Priority<\/\w+>\s*Violations?\s*<\/\w+>\s*<\/\w+>\s*<\w+[^>]*>(\d+)/i);
    const foundationMatch = html.match(/Priority\s*Foundation<\/\w+>\s*Violations?\s*<\/\w+>\s*<\/\w+>\s*<\w+[^>]*>(\d+)/i);
    const coreMatch = html.match(/Core<\/\w+>\s*Violations?\s*<\/\w+>\s*<\/\w+>\s*<\w+[^>]*>(\d+)/i);
    
    // Alternative simpler pattern: just look for the violation counts near the labels
    const priority = priorityMatch ? parseInt(priorityMatch[1]) || 0 : extractViolationCount(html, 'Priority Violations');
    const foundation = foundationMatch ? parseInt(foundationMatch[1]) || 0 : extractViolationCount(html, 'Priority Foundation Violations');
    const core = coreMatch ? parseInt(coreMatch[1]) || 0 : extractViolationCount(html, 'Core Violations');
    
    const score = computeScore(priority, foundation, core);
    const result = getResultLabel(priority, foundation, core);
    
    return {
      priority_violations: priority,
      priority_foundation_violations: foundation,
      core_violations: core,
      score,
      result,
    };
  } catch {
    return null;
  }
}

// Fallback: extract violation count by looking for the number after the label
function extractViolationCount(html: string, label: string): number {
  // Look for pattern like "Priority Violations | 0 |"
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped + '[^0-9]*(\\d+)', 'i');
  const match = html.match(regex);
  return match ? parseInt(match[1]) || 0 : 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    
    const body = await req.json();
    const { action, name, town } = body;
    
    if (action === 'search') {
      const searchName = (name || '').trim();
      if (!searchName) {
        return Response.json({ facilities: [] });
      }
      
      // POST to the search form
      const params = new URLSearchParams();
      params.append('inputEstabName', searchName);
      params.append('inputPermitType', 'ANY');
      params.append('inputInspType', 'ANY');
      params.append('inputWard', 'ANY');
      params.append('inputQuad', 'ANY');
      params.append('startDate', '01/01/2023');
      params.append('endDate', '12/31/2026');
      params.append('btnSearch', 'Search');
      params.append('a', 'inspections');
      
      const res = await fetch(`${BASE_URL}/index.cfm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; SafeEats/1.0)',
          'Accept': 'text/html',
        },
        body: params.toString(),
      });
      
      if (!res.ok) {
        return Response.json({ error: `Search failed: ${res.status}` }, { status: 502 });
      }
      
      const html = await res.text();
      let facilities = parseSearchResults(html);
      
      // Filter to Restaurant Total type if we have too many results (prioritize restaurants)
      if (facilities.length > 15) {
        const restaurants = facilities.filter(f => /restaurant/i.test(f.facility_type));
        if (restaurants.length >= 5) facilities = restaurants;
      }
      
      // Limit to first 15 facilities for performance
      facilities = facilities.slice(0, 15);
      
      // Fetch violation details for the most recent inspection of each facility
      const enrichedFacilities = await Promise.all(
        facilities.map(async (facility) => {
          if (facility.inspections.length > 0) {
            const latest = facility.inspections[0];
            if (latest.inspection_id) {
              const details = await fetchInspectionDetails(latest.inspection_id);
              if (details) {
                Object.assign(latest, details);
              }
            }
          }
          return facility;
        })
      );
      
      // Compute safety score for each facility based on latest inspection
      const result = enrichedFacilities.map(f => {
        const latest = f.inspections[0];
        const safetyScore = latest?.score ?? null;
        const latestDate = latest?.date || '';
        const latestResult = latest?.result || '';
        const totalInspections = f.inspections.length;
        
        return {
          business_id: f.business_id,
          name: f.name,
          address: f.address,
          city: f.city,
          state: f.state,
          zip_code: f.zip_code,
          ward: f.ward,
          facility_type: f.facility_type,
          permit_id: f.permit_id,
          safetyScore,
          latestDate,
          latestResult,
          totalInspections,
          allInspections: f.inspections.map(insp => ({
            inspection_id: insp.inspection_id,
            date: insp.date,
            type: insp.type,
            priority_violations: insp.priority_violations,
            priority_foundation_violations: insp.priority_foundation_violations,
            core_violations: insp.core_violations,
            score: insp.score,
            result: insp.result,
            report_url: insp.report_url,
          })),
          portal_url: f.portal_url,
          source: 'dc',
        };
      });
      
      return Response.json({ facilities: result });
    }
    
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});