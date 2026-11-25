// Thin client for the API routes in src/app/api. All business logic lives on the server.
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { API_URL, authClient } from '@/lib/auth-client';
import type { RoomTypeId, StyleId } from '@/lib/catalog';

export { DAILY_LIMIT } from '@/lib/catalog';

export type ImageRef = string | number; // signed URL, or a bundled asset
export type Design = { id: string; roomType: RoomTypeId; style: StyleId; createdAt: string; originalUrl: string; resultUrl: string };
export type DesignSummary = { id: string; roomType: RoomTypeId; style: StyleId; createdAt: string; thumbUrl: string };

export const SAMPLE_LIVING = require('@/assets/images/rooms/living-before.jpg');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const web = Platform.OS === 'web';

/**
 * `path` is an API route ("/api/…") or a full URL (the generate Neon Function).
 * Native: we send the stored session cookie ourselves ('include' can clobber it).
 * Web: the browser owns the httpOnly cookie; the cross-origin Function gets the session token as a Bearer header.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const external = path.startsWith('http');
  const auth: Record<string, string> = !web
    ? { Cookie: await authClient.getCookie() }
    : external
      ? { Authorization: `Bearer ${(await authClient.getSession()).data?.session.token ?? ''}` }
      : {};
  const res = await fetch(external ? path : `${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...auth },
    credentials: web && !external ? 'include' : 'omit',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? 'Something went wrong. Try again.');
  return body as T;
}

export const listDesigns = () => request<{ designs: DesignSummary[] }>('/api/designs');

export const getDesign = (id: string) => request<Design>(`/api/designs/${encodeURIComponent(id)}`);

export const generateDesign = (generateUrl: string, input: { originalPath: string; roomType: RoomTypeId; style: StyleId; landscape: boolean }) =>
  request<Design>(generateUrl, { method: 'POST', body: JSON.stringify(input) });

/** Shrink to at most 1536px JPEG on the phone, then upload straight to ImageKit as a private file. */
export async function uploadPhoto(uri: string) {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const landscape = image.width >= image.height;
  const scale = 1536 / Math.max(image.width, image.height);
  const ctx = ImageManipulator.manipulate(image);
  if (scale < 1) ctx.resize(landscape ? { width: 1536 } : { height: 1536 });
  const small = await (await ctx.renderAsync()).saveAsync({ compress: 0.85, format: SaveFormat.JPEG });

  const auth = await request<{ token: string; expire: number; signature: string; publicKey: string; folder: string; generateUrl: string }>(
    '/api/upload-auth',
  );
  const form = new FormData();
  form.append('file', new File(small.uri)); // expo/fetch can't send RN-style { uri } parts; File is a real Blob
  form.append('fileName', 'room.jpg');
  form.append('folder', auth.folder);
  form.append('isPrivateFile', 'true');
  form.append('useUniqueFileName', 'true');
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.filePath) throw new ApiError(res.status, "We couldn't upload your photo. Check your connection and try again.");
  return { path: body.filePath as string, landscape, generateUrl: auth.generateUrl };
}
