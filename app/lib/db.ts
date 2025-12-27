import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Neon / Postgres (pooled connection string recommended)
export const sql = postgres(DATABASE_URL, {
  ssl: "require",
  max: 5,
  idle_timeout: 20,
});