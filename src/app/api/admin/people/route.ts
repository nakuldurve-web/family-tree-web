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
      .prepare('SELECT id, full_name, parent_id, tooltip, image_url, status FROM people ORDER BY created_at ASC')
      .all();

    return Response.json({ people: result.results });
  } catch (err) {
    console.error('GET /api/admin/people error:', err);
    return Response.json({ error: 'Failed to fetch people' }, { status: 500 });
  }
}

interface NewPersonBody {
  id: string;
  full_name: string;
  parent_id?: string;
  tooltip?: string;
  image_url?: string;
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as NewPersonBody;
    const { id, full_name, parent_id = '', tooltip = '', image_url = '' } = body;

    if (!id || !full_name) {
      return Response.json({ error: 'id and full_name are required' }, { status: 400 });
    }

    const db = getDB();

    // Check for duplicate ID
    const existing = await db
      .prepare('SELECT id FROM people WHERE id = ?')
      .bind(id)
      .first();

    if (existing) {
      return Response.json({ error: `A person with id "${id}" already exists` }, { status: 409 });
    }

    await db
      .prepare(
        `INSERT INTO people (id, full_name, parent_id, tooltip, image_url, status)
         VALUES (?, ?, ?, ?, ?, 'approved')`
      )
      .bind(id, full_name, parent_id || null, tooltip, image_url)
      .run();

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/people error:', err);
    return Response.json({ error: 'Failed to add person' }, { status: 500 });
  }
}
