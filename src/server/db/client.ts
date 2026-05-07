import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL?.trim();

if (!DATABASE_URL) {
  console.warn('DATABASE_URL is missing. Database features will be unavailable.');
}

export const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? 30_000),
}) : null;

export const db = pool ? drizzle(pool, { schema }) : null;
