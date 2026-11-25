import { and, desc, eq, isNotNull } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { designs } from '@/lib/db/schema';
import { signedUrl } from '@/lib/imagekit';

export async function GET(request: Request) {
  const user = await requireUser(request);
  const rows = await db.select().from(designs).where(and(eq(designs.userId, user.id), isNotNull(designs.resultPath))).orderBy(desc(designs.createdAt));
  return Response.json({
    designs: rows.map((d) => ({
      id: d.id,
      roomType: d.roomType,
      style: d.style,
      createdAt: d.createdAt.toISOString(),
      thumbUrl: signedUrl(d.resultPath!, [{ width: 400, format: 'auto', quality: 70 }]), // tr:w-400,f-auto,q-70
      placeholderUrl: signedUrl(d.resultPath!, [{ width: 20, quality: 20, blur: 6 }]), // tr:w-20,q-20,bl-6, ~1 KB
    })),
  });
}
