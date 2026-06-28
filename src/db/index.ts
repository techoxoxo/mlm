import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __mlmPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __mlmReadPool: Pool | undefined;
}

// Reuse the pool across hot-reloads in dev.
const pool =
  global.__mlmPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") global.__mlmPool = pool;

export const db = drizzle(pool, { schema });

const readPool =
  global.__mlmReadPool ??
  new Pool({
    connectionString: env.DATABASE_READ_URL,
    max: 20,
  });

if (process.env.NODE_ENV !== "production") global.__mlmReadPool = readPool;

export const readDb = drizzle(readPool, { schema });

export { pool, readPool, schema };
export type DB = typeof db;

