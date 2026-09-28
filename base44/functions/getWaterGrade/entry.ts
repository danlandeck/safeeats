import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { handleWaterRequest } from "../../shared/waterQuality.ts";

// EPA tap-water lookup + grade. Public read-only lookup — must work for
// signed-out visitors on the live site.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    return await handleWaterRequest(req, base44);
  } catch (error) {
    return Response.json({ available: false, reason: error.message }, { status: 500 });
  }
});