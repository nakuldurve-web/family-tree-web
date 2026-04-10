interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
  ADMIN_PASSWORD: string;
  NEXT_PUBLIC_R2_PUBLIC_URL: string;
  [key: string]: unknown;
}
