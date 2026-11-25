import { functionBaseUrl } from '@neon/env';

import { requireUser } from '@/lib/auth';
import { imagekit, userFolder } from '@/lib/imagekit';

/**
 * Short-lived signature so the app can upload straight to ImageKit (keeps big bodies off our server),
 * plus where to send the generate request (the `generate` Neon Function).
 */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!process.env.IMAGEKIT_PUBLIC_KEY) {
    console.error('IMAGEKIT_PUBLIC_KEY is not set (see .env.example)');
    return Response.json({ error: 'Photo uploads are not configured on the server.' }, { status: 500 });
  }
  return Response.json({
    ...imagekit.helper.getAuthenticationParameters(),
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    folder: `${userFolder(user.id)}/originals`,
    generateUrl: functionBaseUrl('generate'),
  });
}
