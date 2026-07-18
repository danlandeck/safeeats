import { base44 } from "@/api/base44Client";

// Trimmed schema — only fields needed for the search results list.
export const LLM_SCHEMA = {
  type: "object",
  properties: {
    restaurants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name:                   { type: "string" },
          address:                { type: "string" },
          city:                   { type: "string" },
          zip_code:               { type: "string" },
          phone:                  { type: "string" },
          latest_score:           { type: "number" },
          latest_date:            { type: "string" },
          latest_result:          { type: "string" },
          total_inspections:      { type: "number" },
          violations:             { type: "array", items: { type: "string" } },
          cuisine:                { type: "string" },
          data_confidence:        { type: "string", enum: ["high", "medium", "low", "none"] },
          is_currently_operating: { type: "boolean" },
          verification_source:   { type: "string" },
        },
      },
    },
  },
};

// Schema for the inspection-enrichment pass
export const INSPECTION_SCHEMA = {
  type: "object",
  properties: {
    inspections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          idx:                 { type: "number" },
          latest_score:        { type: "number" },
          latest_date:         { type: "string" },
          latest_result:       { type: "string" },
          total_inspections:   { type: "number" },
          violations:          { type: "array", items: { type: "string" } },
          data_confidence:     { type: "string", enum: ["high", "medium", "low"] },
          verification_source: { type: "string" },
        },
      },
    },
  },
};

export const PROMPT_ENRICH = (list, location, today, ctx = "") =>
  `Today is ${today}. Below are VERIFIED, REAL restaurants${location ? ` in ${location}` : ""} (confirmed via Google Places — do NOT question their existence or alter their details).
Search the LIVE WEB for OFFICIAL health inspection records for these EXACT establishments:
${list.map((r, i) => `${i}. ${r.name} — ${r.address}`).join("\n")}
${ctx ? `SOURCE GUIDANCE: ${ctx}\n` : ""}RULES:
1. Return one entry per restaurant you find inspection data for, keyed by "idx" (the number above).
2. latest_score 0–100, latest_date, latest_result, violations: from REAL official inspection records ONLY.
3. If the inspection was CLEAN (no violations found), return latest_score: 100, latest_result: "No violations found", violations: [].
4. If the source uses a rating system instead of numeric scores, CONVERT to a 0-100 score: "Great/Excellent/A grade" → 90-100, "Okay/Satisfactory/B grade" → 70-89, "Needs to Improve/C grade" → 40-69, "Closed/Failed/F grade" → 0-39. Always return a numeric latest_score.
5. If you cannot find an official inspection record for a restaurant, OMIT that idx entirely. NEVER invent scores, dates, or results.
6. data_confidence: "high"=official record found; "medium"=inspection referenced secondhand; "low"=uncertain match.
7. verification_source: the URL or agency name where you found the record.`;

export const PROMPT_LOCATION = (query, location, today) =>
  `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" in ${location} ONLY.
RULES:
1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.
2. city MUST be "${location}" or start with the same word. NEVER return results from outside ${location}.
3. latest_score: 0–100 from REAL inspection data. If not found, set null. latest_date/latest_result/violations: REAL only.
4. data_confidence: "high"=official inspection record found; "medium"=restaurant confirmed with inspection reference; "low"=found but no inspection details; "none"=unverified.
5. is_currently_operating: true ONLY if evidence it's open today.
6. verification_source: URL/name where you confirmed it exists.
7. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.
8. Return max 8 verified results. ZERO fabricated data. Identify cuisine type.`;

export const PROMPT_GLOBAL = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real health inspection records for "${query}" anywhere in the world.
RULES:
1. ONLY return restaurants you can VERIFY exist via web search. Omit anything unverified.
2. Return up to 8 real, verifiable businesses. No invented data or fabricated scores.
3. latest_score: 0–100 from REAL inspection data. If not found, set null and data_confidence to "none".
4. latest_date/latest_result/violations: REAL only.
5. data_confidence: "high"=official record; "medium"=some reference; "low"=found but no details; "none"=unverified.
6. is_currently_operating: true ONLY if evidence it's open today.
7. verification_source: URL/name where you confirmed it exists.
8. address: full street address REQUIRED for every result. If you cannot find the street address, OMIT the restaurant entirely.
9. Identify cuisine type.`;

export const PROMPT_DUBAI = (query, today) =>
  `Today is ${today}. Search the LIVE WEB for real food safety inspection records for "${query}" PHYSICALLY IN DUBAI, UAE ONLY.
RULES:
1. BLOCK all US cities, London, Paris, Tokyo, Abu Dhabi, Sharjah — ANY non-UAE location = REJECTED.
2. city MUST be exactly "Dubai". Address MUST include: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, or "Dubai, UAE".
3. ONLY return restaurants you can VERIFY exist via web search. If unsure = OMIT.
4. latest_score: 0–100 from REAL inspection data. If not found, set null. Never fabricate.
5. data_confidence: "high"=official record; "medium"=confirmed with reference; "low"=found no details; "none"=unverified.
6. is_currently_operating: true ONLY if evidence it's open today.
7. verification_source: URL/name where you confirmed it exists.
8. Return max 8 verified Dubai restaurants only.`;

export const FAST_PROMPT = (query, location) => location
  ? `List up to 8 real restaurants matching "${query}" in ${location}. Training data only. Only results physically in ${location}.`
  : `List up to 8 real restaurants matching "${query}" worldwide. Training data only.`;

export const FAST_PROMPT_DUBAI = (query) =>
  `DUBAI ONLY. REJECT: Miami, Boston, New York, Chicago, LA, SF, Austin, London, Paris, Tokyo, Abu Dhabi, any US city.
List ONLY restaurants in DUBAI, UAE. city="Dubai" ALWAYS. Address: Jumeirah, Deira, Bur Dubai, Marina, Downtown, JBR, DIFC, Business Bay, Palm, Sheikh Zayed, Dubai.
Return max 8. If unsure = OMIT. ZERO non-Dubai results.`;

export function llmCall(prompt, internet = false, schema = LLM_SCHEMA) {
  return base44.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: internet,
    response_json_schema: schema,
    ...(internet ? { model: "gemini_3_flash" } : { model: "gpt_5_mini" }),
  });
}