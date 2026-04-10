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
      .prepare('SELECT id, person_id, url, description, display_html FROM links ORDER BY id ASC')
      .all();

    return Response.json({ links: result.results });
  } catch (err) {
    console.error('GET /api/admin/links error:', err);
    return Response.json({ error: 'Failed to fetch links' }, { status: 500 });
  }
}

interface NewLinkBody {
  person_id: string;
  url: string;
  description?: string;
  display_html?: string;
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as NewLinkBody;
    const { person_id, url, description = '', display_html = '' } = body;

    if (!person_id || !url) {
      return Response.json({ error: 'person_id and url are required' }, { status: 400 });
    }

    const db = getDB();
    await db
      .prepare(
        'INSERT INTO links (person_id, url, description, display_html) VALUES (?, ?, ?, ?)'
      )
      .bind(person_id, url, description, display_html)
      .run();

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/links error:', err);
    return Response.json({ error: 'Failed to add link' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'id query param is required' }, { status: 400 });
    }

    const db = getDB();
    await db.prepare('DELETE FROM links WHERE id = ?').bind(Number(id)).run();

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/links error:', err);
    return Response.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
