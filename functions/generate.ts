// Neon Function `generate`: the only long request in the app (an image edit takes 30-120 s).
// Runs on Neon Functions (15 min time-to-first-byte) instead of EAS Hosting, next to Postgres.
// The app calls it directly with the same Better Auth session cookie it sends to the Expo API routes.
import { attachDatabasePool } from '@neon/functions';
import { and, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import OpenAI, { toFile } from 'openai';
import { Pool } from 'pg';

import { buildPrompt, DAILY_LIMIT, isOwnOriginal, isRoomType, isStyle } from '../src/lib/catalog';
import { designs, session } from '../src/lib/db/schema';
import { remainingToday, toDesign } from '../src/lib/designs';
import { imagekit, signedUrl, userFolder } from '../src/lib/imagekit';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);
const db = drizzle(pool);

const openai = new OpenAI(); // OPENAI_API_KEY, declared as Function env in neon.ts

const error = (status: number, message: string) => Response.json({ error: message }, { status });

/** Better Auth session cookie -> user id. The cookie is `<token>.<signature>`; the token itself is the secret. */
async function sessionUserId(request: Request) {
  const raw = request.headers.get('cookie')?.match(/session_token=([^;]+)/)?.[1];
  if (!raw) return null;
  const token = decodeURIComponent(raw).split('.')[0];
  const [row] = await db
    .select({ userId: session.userId })
    .from(session)
    .where(and(eq(session.token, token), gt(session.expiresAt, new Date())));
  return row?.userId ?? null;
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return error(405, 'POST only');
    const userId = await sessionUserId(request);
    if (!userId) return error(401, 'Please sign in again.');

    const { originalPath, roomType, style, landscape } = await request.json().catch(() => ({}));
    if (!isRoomType(roomType) || !isStyle(style) || !isOwnOriginal(originalPath, userId)) {
      return error(400, 'Something went wrong with this request. Go back and try again.');
    }
    if ((await remainingToday(db, userId)) === 0) {
      return error(429, `You've used all ${DAILY_LIMIT} designs for today. Come back tomorrow.`);
    }

    const photo = await fetch(signedUrl(originalPath));
    if (!photo.ok) return error(400, "We couldn't find your uploaded photo. Go back and try again.");

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
    // Failures and moderation refusals insert no row, so they never use quota.
    if (!b64) return error(502, "We couldn't redesign this photo. Your daily quota wasn't used, so feel free to try again.");

    const uploaded = await imagekit.files.upload({ file: b64, fileName: 'result.jpg', folder: `${userFolder(userId)}/results`, isPrivateFile: true });
    const [row] = await db.insert(designs).values({ userId, roomType, style, originalPath, resultPath: uploaded.filePath! }).returning();
    return Response.json(toDesign(row));
  },
};
