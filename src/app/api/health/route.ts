import { sql } from "drizzle-orm";
import { db } from "@/db";
import { connection } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness + readiness probe: verifies Postgres and Redis are reachable.
export async function GET() {
  const checks: Record<string, "ok" | "fail"> = { db: "fail", redis: "fail" };
  try {
    await db.execute(sql`select 1`);
    checks.db = "ok";
  } catch {
    /* leave as fail */
  }
  try {
    const pong = await connection.ping();
    if (pong === "PONG") checks.redis = "ok";
  } catch {
    /* leave as fail */
  }
  const healthy = checks.db === "ok" && checks.redis === "ok";
  return Response.json(
    { status: healthy ? "ok" : "degraded", checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
