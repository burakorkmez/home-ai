// Server only: Expo API routes (Neon serverless driver) and the `generate` Neon Function (pg pool).
// Relative imports so the Neon Function bundler resolves them without the `@/` alias.
import { and, count, eq, gte, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';

import { DAILY_LIMIT, roomName, styleName } from './catalog';
import { designs } from './db/schema';
import { shareCardUrl, signedUrl } from './imagekit';

type Db = PgDatabase<any, any>;

// Counts reservations too. Call inside the transaction that locks the user row (see functions/generate.ts).
export async function remainingToday(db: Db, userId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(designs)
    .where(and(eq(designs.userId, userId), gte(designs.createdAt, sql`date_trunc('day', now(), 'UTC')`)));
  return Math.max(0, DAILY_LIMIT - n);
}

export const toDesign = (d: typeof designs.$inferSelect) => ({
  id: d.id,
  roomType: d.roomType,
  style: d.style,
  createdAt: d.createdAt.toISOString(),
  originalUrl: signedUrl(d.originalPath),
  resultUrl: signedUrl(d.resultPath!), // callers only pass finished rows
  hdUrl: signedUrl(d.resultPath!, [{ aiUpscale: true }]), // tr:e-upscale, async (see design/[id].tsx); cached forever after the first run
  shareUrl: shareCardUrl(d.resultPath!, d.originalPath, `${styleName(d.style)} · ${roomName(d.roomType)}`),
});
