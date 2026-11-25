// Neon Function `generate`: the only long request in the app (an image edit takes 30-120 s).
// Runs on Neon Functions (15 min time-to-first-byte) instead of EAS Hosting, next to Postgres.
// Native apps send the same Better Auth session cookie they send to the Expo API routes; the web app
// (different origin, httpOnly cookie) sends the session token as a Bearer header instead.
import { attachDatabasePool } from '@neon/functions';
import { and, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import OpenAI, { toFile } from 'openai';
import { Pool } from 'pg';

import { buildPrompt, DAILY_LIMIT, isOwnOriginal, isRoomType, isStyle } from '../src/lib/catalog';
import { designs, session, user } from '../src/lib/db/schema';
import { remainingToday, toDesign } from '../src/lib/designs';
import { imagekit, signedUrl, userFolder } from '../src/lib/imagekit';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);
const db = drizzle(pool);

const openai = new OpenAI(); // OPENAI_API_KEY, declared as Function env in neon.ts

// Auth is an explicit cookie/Bearer header, never ambient browser credentials, so any origin is fine.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST' };

const error = (status: number, message: string) => Response.json({ error: message }, { status });
const FAILED = "We couldn't redesign this photo. Your daily quota wasn't used, so feel free to try again.";

/** Better Auth session token -> user id. The cookie is `<token>.<signature>`; the token itself is the secret. */
async function sessionUserId(request: Request) {
  const raw =
    request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1] ?? request.headers.get('cookie')?.match(/session_token=([^;]+)/)?.[1];
  if (!raw) return null;
  const token = decodeURIComponent(raw).split('.')[0];
  const [row] = await db
    .select({ userId: session.userId })
    .from(session)
    .where(and(eq(session.token, token), gt(session.expiresAt, new Date())));
  return row?.userId ?? null;
}

async function handle(request: Request) {
  if (request.method !== 'POST') return error(405, 'POST only');
  const userId = await sessionUserId(request);
  if (!userId) return error(401, 'Please sign in again.');

  const { originalPath, roomType, style, landscape } = await request.json().catch(() => ({}));
  if (!isRoomType(roomType) || !isStyle(style) || !isOwnOriginal(originalPath, userId)) {
    return error(400, 'Something went wrong with this request. Go back and try again.');
  }

  // Reserve a row atomically: the user-row lock serializes this user's requests (and waits out a
  // concurrent account deletion), so parallel requests can't overshoot DAILY_LIMIT.
  // ponytail: a run that crashes before releasing keeps its row: it holds 1 quota until 00:00 UTC and
  // retries of that exact upload get 409 (a fresh upload works). Expire stale pending rows if that bites.
  const reserved = await db.transaction(async (tx) => {
    const [owner] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    if (!owner) return error(401, 'Please sign in again.');
    const [existing] = await tx
      .select()
      .from(designs)
      .where(and(eq(designs.userId, userId), eq(designs.originalPath, originalPath)));
    if (existing) {
      // A retry of a request that already ran (e.g. the response was lost): never generate twice.
      return existing.resultPath ? Response.json(toDesign(existing)) : error(409, 'Still working on this photo. Check My Designs in a minute.');
    }
    if ((await remainingToday(tx, userId)) === 0) {
      return error(429, `You've used all ${DAILY_LIMIT} designs for today. Come back tomorrow.`);
    }
    const [row] = await tx.insert(designs).values({ userId, roomType, style, originalPath }).returning({ id: designs.id });
    return row.id;
  });
  if (reserved instanceof Response) return reserved;

  // Every failure below deletes the reservation, so failures and moderation refusals never use quota.
  const release = () => db.delete(designs).where(eq(designs.id, reserved)).catch((e) => console.error('release failed', e));

  const photo = await fetch(signedUrl(originalPath)).catch(() => null);
  if (!photo?.ok) {
    await release();
    return error(400, "We couldn't find your uploaded photo. Go back and try again.");
  }

  const b64 = await openai.images
    .edit({
      model: 'gpt-image-2.6-sunburst',
      image: await toFile(photo, 'room.jpg', { type: 'image/jpeg' }),
      prompt: buildPrompt(roomType, style),
      quality: 'medium',
      size: landscape === true ? '1536x1024' : '1024x1536',
      output_format: 'jpeg',
    })
    .then((res) => res.data?.[0]?.b64_json)
    .catch((e) => {
      console.error('openai edit failed', e);
      return undefined;
    });
  if (!b64) {
    await release();
    return error(502, FAILED);
  }

  const uploaded = await imagekit.files
    .upload({ file: b64, fileName: 'result.jpg', folder: `${userFolder(userId)}/results`, isPrivateFile: true })
    .catch((e) => {
      console.error('result upload failed', e);
      return null;
    });
  if (!uploaded?.filePath || !uploaded.fileId) {
    await release();
    return error(502, FAILED);
  }

  // No row back = the reservation is gone (account deleted meanwhile; the row cascaded) or the write
  // failed. Either way, don't leave the result file behind.
  const [row] = await db
    .update(designs)
    .set({ resultPath: uploaded.filePath })
    .where(eq(designs.id, reserved))
    .returning()
    .catch((e) => {
      console.error('saving design failed', e);
      return [];
    });
  if (!row) {
    await Promise.all([release(), imagekit.files.delete(uploaded.fileId).catch((e) => console.error('result cleanup failed', e))]);
    return error(500, FAILED);
  }
  return Response.json(toDesign(row));
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const res = await handle(request);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  },
};
