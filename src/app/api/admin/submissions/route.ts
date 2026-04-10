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
      .prepare('SELECT * FROM submissions ORDER BY submitted_at DESC')
      .all();

    return Response.json({ submissions: result.results });
  } catch (err) {
    console.error('GET /api/admin/submissions error:', err);
    return Response.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

interface PatchBody {
  id: number;
  action: 'approve' | 'reject';
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, action } = await request.json() as PatchBody;

    if (!id || !action) {
      return Response.json({ error: 'id and action are required' }, { status: 400 });
    }

    const db = getDB();

    // Fetch the submission
    const submission = await db
      .prepare('SELECT * FROM submissions WHERE id = ?')
      .bind(id)
      .first<{
        id: number;
        type: string;
        person_name: string;
        person_full_name: string;
        parent_id: string;
        spouse_of: string;
        image_url: string;
        link_url: string;
        link_description: string;
        tooltip: string;
        status: string;
      }>();

    if (!submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (action === 'reject') {
      await db
        .prepare("UPDATE submissions SET status = 'rejected' WHERE id = ?")
        .bind(id)
        .run();
      return Response.json({ success: true });
    }

    // action === 'approve'
    if (submission.type === 'person') {
      if (submission.spouse_of && submission.spouse_of.trim()) {
        // Insert as a spouse
        await db
          .prepare(
            'INSERT OR IGNORE INTO spouses (id, full_name, person_id, image_url) VALUES (?, ?, ?, ?)'
          )
          .bind(
            submission.person_name || `spouse_${Date.now()}`,
            submission.person_full_name,
            submission.spouse_of,
            submission.image_url
          )
          .run();
      } else {
        // Insert as a regular person
        await db
          .prepare(
            `INSERT OR IGNORE INTO people (id, full_name, parent_id, tooltip, image_url, status)
             VALUES (?, ?, ?, ?, ?, 'approved')`
          )
          .bind(
            submission.person_name || `person_${Date.now()}`,
            submission.person_full_name,
            submission.parent_id || null,
            submission.tooltip,
            submission.image_url
          )
          .run();
      }
    } else if (submission.type === 'link') {
      await db
        .prepare(
          'INSERT INTO links (person_id, url, description) VALUES (?, ?, ?)'
        )
        .bind(submission.parent_id, submission.link_url, submission.link_description)
        .run();
    }
    // For 'correction' type, just mark approved (admin handles it manually)

    await db
      .prepare("UPDATE submissions SET status = 'approved' WHERE id = ?")
      .bind(id)
      .run();

    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/admin/submissions error:', err);
    return Response.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
