import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Resets the SafeEats search subsystem state.
 * Client-side localStorage is cleared by the frontend via clearSearchState().
 * This endpoint handles any server-side confirmation.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side: nothing persistent to clear (all search state is client-only localStorage).
    // Return the required confirmation object.
    return Response.json({ search_state: "cleared", history_count: 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});