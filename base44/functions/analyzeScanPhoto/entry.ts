import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Vision extraction for a scanned food label / restaurant sign photo.
// Input is a public file_url uploaded by the client; the prompt and schema
// live here so the endpoint can only ever do this one operation.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = typeof body?.file_url === 'string' ? body.file_url : '';
    if (!fileUrl || fileUrl.length > 1000 || !/^https?:\/\//i.test(fileUrl)) {
      return Response.json({ error: 'A valid uploaded image URL is required' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert at reading food packaging, restaurant signs, menus, and health inspection placards in ANY language including Japanese (kanji/hiragana/katakana), Chinese, Korean, and other scripts.

Detect whether this image is a FOOD PRODUCT LABEL or a RESTAURANT SIGN/PLACARD, then extract:

FOR RESTAURANT SIGNS / INSPECTION PLACARDS:
- name: restaurant name (translate to English if needed)
- address, city, inspection_grade, inspection_score
- is_food_label: false

FOR FOOD PRODUCT LABELS (Japanese konbini, supermarket, packaged food):
- product_name in English (translate)
- ingredients: English array (translate all)
- allergens: flag shellfish, nuts, dairy, gluten, eggs, soy, wheat, fish. In Japan look for 特定原材料 (mandatory) and hidden shellfish in sauces (エキス = extract)
- nutrition_per_100g: {calories, protein_g, fat_g, carbs_g, sodium_mg} — Japanese labels use per 100g
- expiration_date: translate 賞味期限 (best before) or 消費期限 (use by), include type
- dietary_flags: halal, vegan, vegetarian, gluten-free, organic, kosher
- country_of_origin: translate 国産 as "Japan (domestic)"
- warnings: any safety/allergen warnings in plain English
- is_food_label: true

Set unknown fields to null. ALWAYS translate non-English text.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          inspection_grade: { type: "string" },
          inspection_score: { type: "number" },
          is_food_label: { type: "boolean" },
          product_name: { type: "string" },
          ingredients: { type: "array", items: { type: "string" } },
          allergens: { type: "array", items: { type: "string" } },
          nutrition_per_100g: { type: "object" },
          expiration_date: { type: "string" },
          dietary_flags: { type: "array", items: { type: "string" } },
          country_of_origin: { type: "string" },
          warnings: { type: "array", items: { type: "string" } },
        },
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}