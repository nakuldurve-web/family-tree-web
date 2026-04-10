import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDB(): D1Database {
  const { env } = getRequestContext<CloudflareEnv>();
  return env.DB;
}

export function getR2(): R2Bucket {
  const { env } = getRequestContext<CloudflareEnv>();
  return env.R2;
}

export function getEnv(): CloudflareEnv {
  const { env } = getRequestContext<CloudflareEnv>();
  return env;
}
