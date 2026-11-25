import { createRealtime, pgParam, rawSql } from '@neon/realtime/server';

import { requireUser } from '@/lib/auth';

const realtime = createRealtime({
  secret: process.env.NEON_REALTIME_SECRET!,
  db: new URL(process.env.DATABASE_URL!).pathname.slice(1),
});

/**
 * Sealed live query: how many designs this user made since `day` (a UTC date, YYYY-MM-DD).
 * The app passes the day so a renewal keeps the same query; it re-seals at UTC midnight.
 * Server-side quota enforcement lives in the generate Function, not here.
 */
export async function POST(request: Request) {
  const user = await requireUser(request);
  const { day } = await request.json().catch(() => ({}));
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return Response.json({ error: 'Bad day' }, { status: 400 });
  const query = rawSql<{ used: number }>(
    'SELECT count(*)::int AS used FROM designs WHERE user_id = $1 AND created_at >= $2',
    [user.id, pgParam.timestamptz(`${day}T00:00:00Z`)],
  );
  return Response.json(await realtime.seal({ query }));
}
