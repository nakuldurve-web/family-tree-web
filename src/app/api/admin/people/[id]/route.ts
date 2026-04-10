export const runtime = 'edge';

import { isAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';

interface PatchBody {
  full_name?: string;
  alt_name?: string;
  parent_id?: string | null;
  tooltip?: string;
  image_url?: string;
  status?: string;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const personId = (await params).id;
    const body = await request.json() as PatchBody;

    const db = getDB();

    // Build SET clause dynamically from provided fields
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name); }
    if (body.alt_name !== undefined) { updates.push('alt_name = ?'); values.push(body.alt_name); }
    if (body.parent_id !== undefined) { updates.push('parent_id = ?'); values.push(body.parent_id || null); }
    if (body.tooltip !== undefined) { updates.push('tooltip = ?'); values.push(body.tooltip); }
    if (body.image_url !== undefined) { updates.push('image_url = ?'); values.push(body.image_url); }
    if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(personId);

    await db
      .prepare(`UPDATE people SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/admin/people/[id] error:', err);
    return Response.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const personId = (await params).id;
    const db = getDB();

    // Delete related data too
    await db.batch([
      db.prepare('DELETE FROM people WHERE id = ?').bind(personId),
      db.prepare('DELETE FROM spouses WHERE person_id = ?').bind(personId),
      db.prepare('DELETE FROM links WHERE person_id = ?').bind(personId),
    ]);

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/people/[id] error:', err);
    return Response.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}
