export const runtime = 'edge';

import { getR2, getEnv } from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Limit file size to 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const r2 = getR2();
    const env = getEnv();

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();

    await r2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = env.NEXT_PUBLIC_R2_PUBLIC_URL
      ? `${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
      : `/r2-placeholder/${key}`;

    return Response.json({ url: publicUrl }, { status: 200 });
  } catch (err) {
    console.error('PUT /api/upload error:', err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
