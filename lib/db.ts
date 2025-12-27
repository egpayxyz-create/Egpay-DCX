import { Pool } from "pg";

/**
 * Neon / Render / Vercel Postgres compatible
 * Dev hot-reload safe
 */

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL;

export const pool =
  global._pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
