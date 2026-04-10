export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { buildSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { env } = getRequestContext<CloudflareEnv>();
    const { password } = await request.json() as { password?: string };

    if (!password) {
      return Response.json({ error: 'Password required' }, { status: 400 });
    }

    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return Response.json(
        { error: 'ADMIN_PASSWORD secret not configured on the server' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return Response.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const cookie = buildSessionCookie(password);
    return Response.json(
      { success: true },
      {
        status: 200,
        headers: { 'Set-Cookie': cookie },
      }
    );
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}

// DELETE — sign out (clear cookie)
export async function DELETE() {
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: { 'Set-Cookie': clearSessionCookie() },
    }
  );
}
