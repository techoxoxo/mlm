import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __mlmPool: Pool | undefined;
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
export { pool, schema };
export type DB = typeof db;
