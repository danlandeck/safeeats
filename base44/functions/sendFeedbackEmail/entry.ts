import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Sends the contact/feedback form to the SafeEats owner. The recipient and
// subject are fixed here — a caller can never redirect email to anyone else.

const FEEDBACK_RECIPIENT = "dan.landeck@gmail.com";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.slice(0, 100).trim() : '';
    const email = typeof body?.email === 'string' ? body.email.slice(0, 200).trim() : '';
    const message = typeof body?.message === 'string' ? body.message.slice(0, 2000).trim() : '';
    if (!message || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email and message are required' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: FEEDBACK_RECIPIENT,
      subject: "SafeEats™ FEEDBACK",
      body: `
New SafeEats™ Feedback Received:

Name: ${name}
Email: ${email}

Message:
${message}

---
Submitted from SafeEats™ App
      `.trim(),
    });
    return Response.json({ sent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}