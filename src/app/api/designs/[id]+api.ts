import { and, eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { designs } from '@/lib/db/schema';
import { toDesign } from '@/lib/designs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { id }: Record<string, string>) {
  const user = await requireUser(request);
  const [row] = UUID.test(id)
    ? await db.select().from(designs).where(and(eq(designs.id, id), eq(designs.userId, user.id)))
    : [];
  if (!row) return Response.json({ error: 'Design not found' }, { status: 404 });
  return Response.json(toDesign(row));
}
