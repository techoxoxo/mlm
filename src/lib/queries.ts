import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { users, slabs, slots, transactions, slabCompletions } = schema;

export async function getDashboard(uid: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, uid) });
  if (!user) return null;

  // everything below only depends on `user` — run it all in parallel
  const [allSlabs, mySlots, collectedRows, pending, recentTx, referrals, earnedRows] =
    await Promise.all([
      db.select().from(slabs).orderBy(slabs.level),
      user.currentSlab
        ? db
            .select()
            .from(slots)
            .where(and(eq(slots.ownerId, uid), eq(slots.slabLevel, user.currentSlab)))
            .orderBy(slots.position)
        : Promise.resolve([]),
      db
        .select({ collected: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, uid),
            eq(transactions.slabLevel, user.currentSlab),
            sql`${transactions.type} in ('slot_credit','referral_bonus')`,
          ),
        ),
      user.pendingChoiceSlab != null
        ? db.query.slabCompletions.findFirst({
            where: and(eq(slabCompletions.userId, uid), eq(slabCompletions.slabLevel, user.pendingChoiceSlab)),
          })
        : Promise.resolve(null),
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, uid))
        .orderBy(desc(transactions.createdAt))
        .limit(12),
      db
        .select({ id: users.id, name: users.name, slab: users.currentSlab, status: users.status, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.sponsorId, uid))
        .orderBy(desc(users.createdAt)),
      db
        .select({ earned: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), sql`${transactions.points} > 0`)),
    ]);

  const currentSlab = allSlabs.find((s) => s.level === user.currentSlab) ?? null;
  const nextSlab = allSlabs.find((s) => s.level === user.currentSlab + 1) ?? null;
  const filled = mySlots.filter((s) => s.status === "filled").length;
  const collected = collectedRows[0]?.collected ?? 0;
  const earned = earnedRows[0]?.earned ?? 0;

  return {
    user,
    currentSlab,
    nextSlab,
    allSlabs,
    mySlots,
    filled,
    collected,
    pending,
    recentTx,
    referrals,
    totalEarned: earned,
  };
}

export type DashboardData = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;

export type TreeNode = {
  id: string;
  name: string;
  slab: number;
  status: string;
  depth: number;
  children: TreeNode[];
};

/**
 * Build the referral downline tree rooted at `uid` via a recursive CTE.
 * Depth- and row-capped so a huge network can't blow up the page render.
 */
export async function getDownlineTree(uid: string, maxDepth = 6, maxRows = 500): Promise<TreeNode | null> {
  const res = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT id, name, sponsor_id, current_slab, status, 0 AS depth
      FROM users WHERE id = ${uid}
      UNION ALL
      SELECT u.id, u.name, u.sponsor_id, u.current_slab, u.status, t.depth + 1
      FROM users u
      JOIN tree t ON u.sponsor_id = t.id
      WHERE t.depth < ${maxDepth}
    )
    SELECT id, name, sponsor_id, current_slab, status, depth
    FROM tree ORDER BY depth LIMIT ${maxRows}
  `);

  const rows = res.rows as {
    id: string;
    name: string;
    sponsor_id: string | null;
    current_slab: number;
    status: string;
    depth: number;
  }[];
  if (rows.length === 0) return null;

  const byId = new Map<string, TreeNode>();
  for (const r of rows) {
    byId.set(r.id, { id: r.id, name: r.name, slab: r.current_slab, status: r.status, depth: r.depth, children: [] });
  }
  let root: TreeNode | null = null;
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.id === uid) root = node;
    else if (r.sponsor_id && byId.has(r.sponsor_id)) byId.get(r.sponsor_id)!.children.push(node);
  }
  return root;
}
