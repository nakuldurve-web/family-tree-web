import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Check whether the incoming request carries a valid admin session cookie.
 * The session token is base64(password) for simplicity — no external signing library needed.
 */
export function isAdmin(request: Request): boolean {
  try {
    const { env } = getRequestContext<CloudflareEnv>();
    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) return false;

    const cookieHeader = request.headers.get('cookie') ?? '';
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies['admin_session'];
    if (!sessionToken) return false;

    // Token is base64-encoded password
    const decoded = atob(sessionToken);
    return decoded === adminPassword;
  } catch {
    return false;
  }
}

/**
 * Build the Set-Cookie header value for the admin session.
 */
export function buildSessionCookie(password: string): string {
  const token = btoa(password);
  // 7-day session, HttpOnly, SameSite=Strict
  return `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`;
}

/**
 * Build the Set-Cookie header to clear the admin session.
 */
export function clearSessionCookie(): string {
  return `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key) result[key.trim()] = rest.join('=').trim();
  }
  return result;
}
