import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { users, transactions, reconciliationRuns } = schema;

export type MismatchEntry = {
  userId: string;
  email: string;
  cached: number;
  calculated: number;
  drift: number;
};

export type ReconciliationResult = {
  totalUsers: number;
  mismatchCount: number;
  mismatches: MismatchEntry[];
  autoFixed: boolean;
};

/**
 * Compare every user's cached `pointsBalance` against the true sum of their
 * ledger transactions. Reports any mismatches and optionally auto-corrects.
 *
 * Designed to run nightly via BullMQ cron or triggered by admin.
 */
export async function reconcileBalances(
  triggeredBy: "cron" | "admin",
  autoFix = false,
): Promise<ReconciliationResult> {
  // Compute the true balance from the ledger for all users in one query
  const rows = await db.execute(sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.points_balance AS cached,
      COALESCE(t.calculated, 0)::int AS calculated
    FROM ${users} u
    LEFT JOIN (
      SELECT user_id, SUM(points)::int AS calculated
      FROM ${transactions}
      GROUP BY user_id
    ) t ON t.user_id = u.id
    WHERE u.points_balance != COALESCE(t.calculated, 0)
  `);

  const mismatches: MismatchEntry[] = (
    rows.rows as { user_id: string; email: string; cached: number; calculated: number }[]
  ).map((r) => ({
    userId: r.user_id,
    email: r.email,
    cached: r.cached,
    calculated: r.calculated,
    drift: r.cached - r.calculated,
  }));

  // Total user count for the run record
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if (autoFix && mismatches.length > 0) {
    for (const m of mismatches) {
      await db
        .update(users)
        .set({ pointsBalance: m.calculated })
        .where(eq(users.id, m.userId));
      console.warn(
        `Reconciliation auto-fix: ${m.email} balance ${m.cached} → ${m.calculated} (drift ${m.drift})`,
      );
    }
  }

  if (mismatches.length > 0) {
    console.warn(
      `Reconciliation: ${mismatches.length} mismatches found out of ${count} users`,
    );
  }

  // Persist the run for audit
  await db.insert(reconciliationRuns).values({
    totalUsers: count,
    mismatchCount: mismatches.length,
    mismatches: mismatches as never,
    autoFixed: autoFix && mismatches.length > 0,
    triggeredBy,
  });

  return {
    totalUsers: count,
    mismatchCount: mismatches.length,
    mismatches,
    autoFixed: autoFix && mismatches.length > 0,
  };
}
