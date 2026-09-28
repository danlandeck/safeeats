import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Server-side proxy for user-submitted report / scan photos.
// The storage-credit-using upload happens here — not on the client — so it
// cannot be invoked directly from outside the app. Requires a signed-in user
// and accepts only small base64 image data URLs.

const MAX_BYTES = 5 * 1024 * 1024;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dataUrl = typeof body?.image_data_url === 'string' ? body.image_data_url : '';
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!match) return Response.json({ error: 'A base64 image data URL is required' }, { status: 400 });

    const binary = atob(match[2]);
    if (binary.length > MAX_BYTES) return Response.json({ error: 'Image too large (max 5MB)' }, { status: 400 });

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const file = new File([bytes], `photo.${ext}`, { type: `image/${match[1]}` });
    const res = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    return Response.json({ file_url: res.file_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}