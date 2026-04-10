export const runtime = 'edge';

import { getDB } from '@/lib/db';

interface SubmissionBody {
  type: string;
  person_name?: string;
  person_full_name?: string;
  parent_id?: string;
  spouse_of?: string;
  image_url?: string;
  link_url?: string;
  link_description?: string;
  person_id?: string;
  tooltip?: string;
  submitter_name?: string;
  submitter_email?: string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as SubmissionBody;

    const {
      type,
      person_name = '',
      person_full_name = '',
      parent_id = '',
      spouse_of = '',
      image_url = '',
      link_url = '',
      link_description = '',
      // 'person_id' on link/correction forms maps to parent_id field for routing
      person_id = '',
      tooltip = '',
      submitter_name = '',
      submitter_email = '',
      notes = '',
    } = body;

    if (!type) {
      return Response.json({ error: 'type is required' }, { status: 400 });
    }

    const allowedTypes = ['person', 'link', 'correction'];
    if (!allowedTypes.includes(type)) {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    // For link / correction submissions, person_id is the target person
    const effectiveParentId = type === 'person' ? parent_id : person_id;

    const db = getDB();
    await db
      .prepare(
        `INSERT INTO submissions
          (type, person_name, person_full_name, parent_id, spouse_of, image_url,
           link_url, link_description, tooltip, submitter_name, submitter_email, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .bind(
        type,
        person_name,
        person_full_name,
        effectiveParentId,
        spouse_of,
        image_url,
        link_url,
        link_description,
        tooltip,
        submitter_name,
        submitter_email,
        notes
      )
      .run();

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('POST /api/submit error:', err);
    return Response.json({ error: 'Failed to save submission' }, { status: 500 });
  }
}
