export const runtime = 'edge';

import { isAdmin } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = getDB();
    const result = await db
      .prepare('SELECT id, full_name, person_id, image_url FROM spouses ORDER BY person_id ASC')
      .all();
    return Response.json({ spouses: result.results });
  } catch (err) {
    console.error('GET /api/admin/spouses error:', err);
    return Response.json({ error: 'Failed to fetch spouses' }, { status: 500 });
  }
}

interface SpouseBody {
  id: string;
  full_name: string;
  person_id: string;
  image_url?: string;
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json() as SpouseBody;
    const { id, full_name, person_id, image_url = '' } = body;
    if (!id || !full_name || !person_id) {
      return Response.json({ error: 'id, full_name and person_id are required' }, { status: 400 });
    }
    const db = getDB();
    const existing = await db.prepare('SELECT id FROM spouses WHERE id = ?').bind(id).first();
    if (existing) {
      return Response.json({ error: `Spouse with id "${id}" already exists` }, { status: 409 });
    }
    await db
      .prepare('INSERT INTO spouses (id, full_name, person_id, image_url) VALUES (?, ?, ?, ?)')
      .bind(id, full_name, person_id, image_url)
      .run();
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/spouses error:', err);
    return Response.json({ error: 'Failed to add spouse' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json() as Partial<SpouseBody> & { id: string };
    const { id, ...fields } = body;
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });

    const updates: string[] = [];
    const values: unknown[] = [];
    if (fields.full_name !== undefined) { updates.push('full_name = ?'); values.push(fields.full_name); }
    if (fields.person_id !== undefined) { updates.push('person_id = ?'); values.push(fields.person_id); }
    if (fields.image_url !== undefined) { updates.push('image_url = ?'); values.push(fields.image_url); }

    if (updates.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });
    values.push(id);

    const db = getDB();
    await db.prepare(`UPDATE spouses SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/admin/spouses error:', err);
    return Response.json({ error: 'Failed to update spouse' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });
    const db = getDB();
    await db.prepare('DELETE FROM spouses WHERE id = ?').bind(id).run();
    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/spouses error:', err);
    return Response.json({ error: 'Failed to delete spouse' }, { status: 500 });
  }
}
