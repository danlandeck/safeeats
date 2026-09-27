import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Auto-moderation for user-submitted restaurant safety reports.
// Only the three whitelisted inputs below are accepted — the LLM prompt
// is fixed and cannot be influenced beyond the report's own fields.

const ISSUE_TYPES = new Set(["hygiene", "pests", "temp", "labeling", "other"]);

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const restaurantName = typeof body?.restaurantName === 'string' ? body.restaurantName.slice(0, 200) : '';
    const issueType = typeof body?.issueType === 'string' ? body.issueType.slice(0, 40) : '';
    const description = typeof body?.description === 'string' ? body.description.slice(0, 500) : '';
    if (!restaurantName || !ISSUE_TYPES.has(issueType) || !description.trim()) {
      return Response.json({ error: 'Invalid report' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a food safety report moderator. A user submitted this report about a restaurant. Determine if it is genuine and not spam/offensive.
Restaurant: ${restaurantName}
Issue type: ${issueType}
Description: "${description}"
Respond with JSON: {"approved": true/false, "reason": "short reason"}`,
      response_json_schema: {
        type: "object",
        properties: {
          approved: { type: "boolean" },
          reason: { type: "string" },
        },
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}