import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Farmington Valley Health District (FVHD) — Connecticut
 * Covers: Avon, Barkhamsted, Canton, Colebrook, East Granby, Farmington,
 * Granby, Hartland, New Hartford, Simsbury
 *
 * FVHD publishes A/B/C/U food ratings per town on their website.
 * Each town page has accordion items with restaurant name, address,
 * current rating + date, and full inspection history.
 *
 * Grade conversion: A=95, B=85, C=75, U=30
 */

const FVHD_TOWNS = [
  "avon", "barkhamsted", "canton", "colebrook", "east-granby",
  "farmington", "granby", "hartland", "new-hartford", "simsbury"
];

const TOWN_DISPLAY: Record<string, string> = {
  "avon": "Avon",
  "barkhamsted": "Barkhamsted",
  "canton": "Canton",
  "colebrook": "Colebrook",
  "east-granby": "East Granby",
  "farmington": "Farmington",
  "granby": "Granby",
  "hartland": "Hartland",
  "new-hartford": "New Hartford",
  "simsbury": "Simsbury",
};

const GRADE_TO_SCORE: Record<string, number> = {
  "A": 95,
  "B": 85,
  "C": 75,
  "U": 30,
};

const GRADE_TO_RESULT: Record<string, string> = {
  "A": "Excellent — No significant issues",
  "B": "Good — Minor non-critical issues",
  "C": "Fair — Noticeable violations, needs improvement",
  "U": "Unsatisfactory — Significant violations",
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#8211;/g, "–")   // en dash
    .replace(/&#8212;/g, "—")   // em dash
    .replace(/&#8217;/g, "'")   // right single quote
    .replace(/&#8220;/g, '"')   // left double quote
    .replace(/&#8221;/g, '"')   // right double quote
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract just a date string (M/D/YYYY) from arbitrary text. */
function extractDate(text: string): string {
  const m = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  return m ? m[1] : "";
}

/**
 * Parse a single town page's HTML and extract all restaurant entries.
 * Each accordion-item has:
 *   <span>Name</span> inside accordion-title
 *   <p>Address</p> as first child of accordion-inner
 *   <p><strong>Current Rating: X</strong>– date</p>
 *   <p>History</p>
 *   <p><strong>X</strong>– date</p> (repeated)
 */
function parseTownPage(html: string, townSlug: string): any[] {
  const facilities: any[] = [];
  const townName = TOWN_DISPLAY[townSlug] || townSlug;

  // Split by accordion-item to get individual restaurant blocks
  const itemRegex = /<div[^>]*class="accordion-item"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*(?=<div[^>]*class="accordion-item"|<\/div>\s*<\/div>\s*<h1|$)/g;

  // More reliable: extract accordion-title span + accordion-inner content
  const blockRegex = /class="accordion-title[^"]*"[^>]*>\s*<button[^>]*>[\s\S]*?<\/button>\s*<span>([\s\S]*?)<\/span>\s*<\/a>\s*<div[^>]*class="accordion-inner"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;

  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const name = stripHtml(match[1]);
    if (!name) continue;

    const innerHtml = match[2];
    const paragraphs = innerHtml.split(/<p[^>]*>/).filter(s => s.trim());

    // Address = first paragraph that isn't "Current Rating" or "History"
    let address = "";
    let currentGrade = "";
    let currentDate = "";
    const history: { grade: string; date: string }[] = [];

    for (const raw of paragraphs) {
      const text = stripHtml(raw);
      if (!text) continue;

      // Skip "History" label
      if (text.toLowerCase() === "history") continue;

      // Current Rating line
      const currentMatch = text.match(/Current\s*Rating:\s*([A-U])/i);
      if (currentMatch) {
        currentGrade = currentMatch[1].toUpperCase();
        currentDate = extractDate(text);
        continue;
      }

      // History entry: "A – date" or "B - date"
      const histMatch = text.match(/^([A-U])\s*[–\-]/);
      if (histMatch) {
        const date = extractDate(text);
        if (date) {
          history.push({ grade: histMatch[1].toUpperCase(), date });
        }
        continue;
      }

      // If no rating found yet, treat as address
      if (!currentGrade && !address) {
        address = text;
      }
    }

    if (!currentGrade) continue;

    const score = GRADE_TO_SCORE[currentGrade] ?? null;
    const result = GRADE_TO_RESULT[currentGrade] || "";

    facilities.push({
      name,
      address: address ? `${address}, ${townName}, CT` : `${townName}, CT`,
      city: townName,
      state: "CT",
      zip_code: "",
      town: townName,
      business_id: `fvhd-${townSlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}`,
      current_grade: currentGrade,
      current_date: currentDate,
      latest_score: score,
      latest_result: result,
      latest_grade: currentGrade,
      total_inspections: history.length + 1,
      history: JSON.stringify([{ grade: currentGrade, date: currentDate }, ...history]),
      source: "fvhd",
      source_url: `https://fvhd.org/environmental-health/food/food-ratings/${townSlug}/`,
    });
  }

  return facilities;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, name, town } = body;

    if (action === "search") {
      // Determine which towns to search — all by default, or a specific town
      const townsToSearch = town
        ? FVHD_TOWNS.filter(t => t === town.toLowerCase().replace(/\s+/g, "-") ||
                                  TOWN_DISPLAY[t]?.toLowerCase() === town.toLowerCase())
        : FVHD_TOWNS;

      // Fetch all town pages in parallel
      const fetches = townsToSearch.map(async (t) => {
        try {
          const url = `https://fvhd.org/environmental-health/food/food-ratings/${t}/`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SafeEatsBot/1.0)',
              'Accept': 'text/html',
            },
          });
          if (!res.ok) return [];
          const html = await res.text();
          return parseTownPage(html, t);
        } catch {
          return [];
        }
      });

      const results = await Promise.all(fetches);
      const allFacilities = results.flat();

      // Filter by name if provided (case-insensitive contains)
      let filtered = allFacilities;
      if (name) {
        const nameLower = name.toLowerCase().trim();
        filtered = allFacilities.filter(f =>
          f.name.toLowerCase().includes(nameLower)
        );
      }

      return Response.json({
        facilities: filtered,
        total: filtered.length,
        towns_searched: townsToSearch,
      });
    }

    if (action === "detail") {
      // Detail is embedded in the search results (history field)
      // The frontend can parse the history JSON
      return Response.json({
        error: "Detail data is included in search results. Use the history field.",
      });
    }

    return Response.json({ error: "Unknown action. Use 'search' or 'detail'." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});