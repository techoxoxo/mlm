import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { readDb as db, schema } from "@/db";

const { users, slabs, slots, transactions, slabCompletions, royaltyPayouts } = schema;

export function maskName(serialNo: number | null): string {
  return serialNo ? `APX-${String(serialNo).padStart(6, '0')}` : "APX-000000";
}

export async function getDashboard(uid: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, uid) });
  if (!user) return null;

  // everything below only depends on `user` — run it all in parallel
  const [
    allSlabs,
    mySlots,
    collectedRows,
    pending,
    recentTx,
    referrals,
    earnedRows,
    earningsByType,
    leaderboard,
    spentRows,
    withdrawnRows,
    matrixEarnedRows,
    referralEarnedRows,
    royaltyEarnedRows,
    restTiersEarnedRows,
  ] =
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
        .select({ id: users.id, name: users.name, serialNo: users.serialNo, slab: users.currentSlab, status: users.status, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.sponsorId, uid))
        .orderBy(desc(users.createdAt)),
      db
        .select({ earned: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), sql`${transactions.points} > 0`, sql`${transactions.type} != 'usdt_deposit'`)),
      // earnings by source (positive only)
      db
        .select({ type: transactions.type, total: sql<number>`sum(${transactions.points})::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), sql`${transactions.points} > 0`, sql`${transactions.type} != 'usdt_deposit'`))
        .groupBy(transactions.type),
      // global leaderboard — top earners
      db
        .select({ serialNo: users.serialNo, name: users.name, earned: sql<number>`coalesce(sum(${transactions.points}) filter (where ${transactions.points} > 0 and ${transactions.type} != 'usdt_deposit'),0)::int` })
        .from(users)
        .leftJoin(transactions, eq(transactions.userId, users.id))
        .where(eq(users.role, "user"))
        .groupBy(users.id, users.serialNo, users.name)
        .orderBy(desc(sql`coalesce(sum(${transactions.points}) filter (where ${transactions.points} > 0 and ${transactions.type} != 'usdt_deposit'),0)`))
        .limit(5),
      // Financial breakouts
      db
        .select({ total: sql<number>`coalesce(sum(abs(${transactions.points})),0)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), sql`${transactions.points} < 0`)),
      db
        .select({ total: sql<number>`coalesce(sum(${schema.cryptoTransactions.amountPoints}),0)::int` })
        .from(schema.cryptoTransactions)
        .where(and(eq(schema.cryptoTransactions.userId, uid), eq(schema.cryptoTransactions.type, "withdrawal"), eq(schema.cryptoTransactions.status, "completed"))),
      db
        .select({ total: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), sql`${transactions.type} in ('slot_credit', 'upgrade_take')`)),
      db
        .select({ total: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), eq(transactions.type, "referral_bonus"))),
      db
        .select({ total: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(and(eq(transactions.userId, uid), sql`${transactions.type} in ('royalty_payout', 'royalty_reserve_reward')`)),
      db
        .select({ total: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, uid),
            sql`${transactions.points} > 0`,
            sql`${transactions.slabLevel} is not null and ${transactions.slabLevel} not in (1, 5)`
          )
        ),
    ]);

  const currentSlab = allSlabs.find((s) => s.level === user.currentSlab) ?? null;
  const nextSlab = allSlabs.find((s) => s.level === user.currentSlab + 1) ?? null;
  const filled = mySlots.filter((s) => s.status === "filled").length;
  const collected = collectedRows[0]?.collected ?? 0;
  const earned = earnedRows[0]?.earned ?? 0;

  let queuePosition: number | null = null;
  if (user.currentSlab) {
    const [myOldestSlot] = await db
      .select({ queueSeq: slots.queueSeq })
      .from(slots)
      .where(
        and(
          eq(slots.ownerId, uid),
          eq(slots.slabLevel, user.currentSlab),
          eq(slots.status, "open")
        )
      )
      .orderBy(slots.queueSeq)
      .limit(1);

    if (myOldestSlot) {
      const [{ countBefore }] = await db
        .select({ countBefore: sql<number>`count(*)::int` })
        .from(slots)
        .where(
          and(
            eq(slots.slabLevel, user.currentSlab),
            eq(slots.status, "open"),
            sql`${slots.queueSeq} < ${myOldestSlot.queueSeq}`
          )
        );
      queuePosition = countBefore + 1;
    }
  }

  const spent = spentRows[0]?.total ?? 0;
  const withdrawn = withdrawnRows[0]?.total ?? 0;
  const matrixEarned = matrixEarnedRows[0]?.total ?? 0;
  const referralEarned = referralEarnedRows[0]?.total ?? 0;
  const royaltyEarned = royaltyEarnedRows[0]?.total ?? 0;
  const restTiersEarned = restTiersEarnedRows[0]?.total ?? 0;

  const withdrawableRest = Math.floor(restTiersEarned * 0.30);
  const lockedPoints = restTiersEarned - withdrawableRest;
  const withdrawablePoints = Math.max(0, user.pointsBalance - lockedPoints);

  return {
    queuePosition,
    user,
    currentSlab,
    nextSlab,
    allSlabs,
    mySlots,
    filled,
    collected,
    pending,
    recentTx,
    referrals: referrals.map((r) => ({ ...r, name: maskName(r.serialNo) })),
    totalEarned: earned,
    earningsByType,
    leaderboard: leaderboard.map((l) => ({ ...l, name: maskName(l.serialNo) })),
    withdrawablePoints,
    lockedPoints,
    financials: {
      spent,
      withdrawn,
      matrixEarned,
      referralEarned,
      royaltyEarned,
    },
  };
}

export type DashboardData = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;

export type MatrixNode = {
  id: string;
  serialNo: number;
  name: string;
  slab: number;
  rank: number | null; // user's entry position within this tier (1-based)
  position: number | null; // which of the parent's slots this user filled
  depth: number;
  children: MatrixNode[];
};

/** Compact summary for the matrix node modal: earnings + matrix line + downline. */
export async function getNodeSummary(id: string, level: number) {
  const [user] = await db
    .select({ id: users.id, serialNo: users.serialNo, name: users.name, status: users.status, slab: users.currentSlab, balance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, id));
  if (!user) return null;

  const [[earned], [royalty], [directsRow], upRes, downRes] = await Promise.all([
    db.select({ v: sql<number>`coalesce(sum(${transactions.points}) filter (where ${transactions.points} > 0),0)::int` }).from(transactions).where(eq(transactions.userId, id)),
    db.select({ v: sql<number>`coalesce(sum(${transactions.points}) filter (where ${transactions.type} in ('royalty_payout','royalty_reserve_reward')),0)::int` }).from(transactions).where(eq(transactions.userId, id)),
    db.select({ v: sql<number>`count(*)::int` }).from(users).where(eq(users.sponsorId, id)),
    // matrix upline: walk occupant → owner up to the root, at this stage
    db.execute(sql`
      WITH RECURSIVE up AS (
        SELECT s.owner_id, 1 AS depth FROM ${slots} s WHERE s.occupant_id = ${id} AND s.slab_level = ${level}
        UNION ALL
        SELECT s.owner_id, u.depth + 1 FROM ${slots} s JOIN up u ON s.occupant_id = u.owner_id WHERE s.slab_level = ${level}
      )
      SELECT us.serial_no, us.name, up.depth FROM up JOIN ${users} us ON us.id = up.owner_id ORDER BY up.depth DESC
    `),
    // immediate slot fills beneath this user at this stage
    db
      .select({ position: slots.position, status: slots.status, serialNo: users.serialNo, name: users.name })
      .from(slots)
      .leftJoin(users, eq(users.id, slots.occupantId))
      .where(and(eq(slots.ownerId, id), eq(slots.slabLevel, level)))
      .orderBy(slots.position),
  ]);

  return {
    ...user,
    name: maskName(user.serialNo),
    totalEarned: earned?.v ?? 0,
    royaltyEarned: royalty?.v ?? 0,
    directs: directsRow?.v ?? 0,
    upline: (upRes.rows as { serial_no: number; name: string; depth: number }[]).map((r) => ({ serialNo: r.serial_no, name: maskName(r.serial_no) })),
    downline: downRes.map((d) => ({ ...d, name: maskName(d.serialNo) })),
  };
}
export type NodeSummary = NonNullable<Awaited<ReturnType<typeof getNodeSummary>>>;

/** The placement subtree rooted at one user, for a stage (their "My matrix" view). */
export async function getMatrixSubtree(rootId: string, level: number, maxDepth = 12, maxRows = 1000) {
  const res = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT u.id, u.serial_no, u.name, u.current_slab, 0 AS depth, NULL::int AS position, NULL::uuid AS parent
      FROM ${users} u WHERE u.id = ${rootId}
      UNION ALL
      SELECT u.id, u.serial_no, u.name, u.current_slab, t.depth + 1, s.position, t.id
      FROM ${slots} s
      JOIN ${users} u ON u.id = s.occupant_id
      JOIN tree t ON s.owner_id = t.id
      WHERE s.slab_level = ${level} AND s.occupant_id IS NOT NULL AND t.depth < ${maxDepth}
    ),
    ranked AS (
      SELECT t.*, DENSE_RANK() OVER (ORDER BY min_seq) AS rank
      FROM tree t
      LEFT JOIN LATERAL (
        SELECT min(s.queue_seq) AS min_seq FROM ${slots} s WHERE s.owner_id = t.id AND s.slab_level = ${level}
      ) sq ON true
    )
    SELECT id, serial_no, name, current_slab, depth, position, parent, rank::int FROM ranked ORDER BY depth, position LIMIT ${maxRows}
  `);
  const rows = res.rows as { id: string; serial_no: number; name: string; current_slab: number; depth: number; position: number | null; parent: string | null; rank: number }[];
  const byId = new Map<string, MatrixNode>();
  for (const r of rows) byId.set(r.id, { id: r.id, serialNo: r.serial_no, name: maskName(r.serial_no), slab: r.current_slab, rank: r.rank, position: r.position, depth: r.depth, children: [] });
  let root: MatrixNode | null = null;
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.id === rootId) root = node;
    else if (r.parent && byId.has(r.parent)) byId.get(r.parent)!.children.push(node);
  }
  return { root, total: rows.length - 1 /* exclude self */ };
}

/** A user's royalty standing + payout history (for the My Royalty page). */
export async function getMyRoyalty(uid: string) {
  const payouts = await db
    .select()
    .from(schema.royaltyPayouts)
    .where(eq(schema.royaltyPayouts.userId, uid))
    .orderBy(desc(schema.royaltyPayouts.createdAt))
    .limit(50);
  return { payouts };
}

/**
 * The autopool placement forest for one stage: owner → the occupants of their
 * slots, recursively. Roots are stage entrants who filled no upline slot.
 * Each entrant fills exactly one upline slot per stage, so this is a clean tree.
 * Note: Names are masked for privacy.
 */
export async function getSlotHierarchy(level: number, maxDepth = 12, maxRows = 2000) {
  const res = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT u.id, u.serial_no, u.name, u.current_slab, 0 AS depth, NULL::int AS position, NULL::uuid AS parent
      FROM ${users} u
      WHERE u.id IN (SELECT DISTINCT owner_id FROM ${slots} WHERE slab_level = ${level})
        AND NOT EXISTS (SELECT 1 FROM ${slots} s WHERE s.slab_level = ${level} AND s.occupant_id = u.id)
      UNION ALL
      SELECT u.id, u.serial_no, u.name, u.current_slab, t.depth + 1, s.position, t.id
      FROM ${slots} s
      JOIN ${users} u ON u.id = s.occupant_id
      JOIN tree t ON s.owner_id = t.id
      WHERE s.slab_level = ${level} AND s.occupant_id IS NOT NULL AND t.depth < ${maxDepth}
    ),
    ranked AS (
      SELECT t.*, DENSE_RANK() OVER (ORDER BY min_seq) AS rank
      FROM tree t
      LEFT JOIN LATERAL (
        SELECT min(s.queue_seq) AS min_seq FROM ${slots} s WHERE s.owner_id = t.id AND s.slab_level = ${level}
      ) sq ON true
    )
    SELECT id, serial_no, name, current_slab, depth, position, parent, rank::int FROM ranked ORDER BY depth, position LIMIT ${maxRows}
  `);

  const rows = res.rows as {
    id: string; serial_no: number; name: string; current_slab: number; depth: number; position: number | null; parent: string | null; rank: number;
  }[];

  const byId = new Map<string, MatrixNode>();
  for (const r of rows) byId.set(r.id, { id: r.id, serialNo: r.serial_no, name: maskName(r.serial_no), slab: r.current_slab, rank: r.rank, position: r.position, depth: r.depth, children: [] });
  const roots: MatrixNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent && byId.has(r.parent)) byId.get(r.parent)!.children.push(node);
    else roots.push(node);
  }
  roots.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  return { roots, total: rows.length, capped: rows.length >= maxRows };
}

/**
 * Slot hierarchy filtered to only users whose current_slab = level.
 * Users who have upgraded past this tier are excluded.
 */
export async function getSlotHierarchyCurrentOnly(level: number, maxDepth = 12, maxRows = 2000) {
  const res = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT u.id, u.serial_no, u.name, u.current_slab, 0 AS depth, NULL::int AS position, NULL::uuid AS parent
      FROM ${users} u
      WHERE u.current_slab = ${level}
        AND u.id IN (SELECT DISTINCT owner_id FROM ${slots} WHERE slab_level = ${level})
        AND NOT EXISTS (SELECT 1 FROM ${slots} s WHERE s.slab_level = ${level} AND s.occupant_id = u.id AND EXISTS (SELECT 1 FROM ${users} u2 WHERE u2.id = s.owner_id AND u2.current_slab = ${level}))
      UNION ALL
      SELECT u.id, u.serial_no, u.name, u.current_slab, t.depth + 1, s.position, t.id
      FROM ${slots} s
      JOIN ${users} u ON u.id = s.occupant_id
      JOIN tree t ON s.owner_id = t.id
      WHERE s.slab_level = ${level} AND s.occupant_id IS NOT NULL AND t.depth < ${maxDepth}
        AND u.current_slab = ${level}
    ),
    ranked AS (
      SELECT t.*, DENSE_RANK() OVER (ORDER BY min_seq) AS rank
      FROM tree t
      LEFT JOIN LATERAL (
        SELECT min(s.queue_seq) AS min_seq FROM ${slots} s WHERE s.owner_id = t.id AND s.slab_level = ${level}
      ) sq ON true
    )
    SELECT id, serial_no, name, current_slab, depth, position, parent, rank::int FROM ranked ORDER BY depth, position LIMIT ${maxRows}
  `);

  const rows = res.rows as {
    id: string; serial_no: number; name: string; current_slab: number; depth: number; position: number | null; parent: string | null; rank: number;
  }[];

  const byId = new Map<string, MatrixNode>();
  for (const r of rows) byId.set(r.id, { id: r.id, serialNo: r.serial_no, name: maskName(r.serial_no), slab: r.current_slab, rank: r.rank, position: r.position, depth: r.depth, children: [] });
  const roots: MatrixNode[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent && byId.has(r.parent)) byId.get(r.parent)!.children.push(node);
    else roots.push(node);
  }
  roots.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  return { roots, total: rows.length, capped: rows.length >= maxRows };
}

export type TreeNode = {
  id: string;
  name: string;
  slab: number;
  status: string;
  depth: number;
  children: TreeNode[];
};

/** Full per-user activity for the admin journey page. */
export async function getUserJourney(uid: string) {
  const sponsor = alias(users, "sponsor");
  const [user] = await db
    .select({
      u: users,
      sponsorName: sponsor.name,
      sponsorSerial: sponsor.serialNo,
      sponsorId: sponsor.id,
    })
    .from(users)
    .leftJoin(sponsor, eq(users.sponsorId, sponsor.id))
    .where(eq(users.id, uid));
  if (!user) return null;

  const occupant = alias(users, "occupant");
  const [
    earnedRow,
    directs,
    ownedSlots,
    completions,
    ledger,
    royalties,
  ] = await Promise.all([
    db
      .select({ earned: sql<number>`coalesce(sum(${transactions.points}) filter (where ${transactions.points} > 0 and ${transactions.type} != 'usdt_deposit'),0)::int` })
      .from(transactions)
      .where(eq(transactions.userId, uid)),
    db
      .select({ id: users.id, serialNo: users.serialNo, name: users.name, slab: users.currentSlab, status: users.status, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.sponsorId, uid))
      .orderBy(desc(users.createdAt)),
    db
      .select({
        slabLevel: slots.slabLevel,
        position: slots.position,
        status: slots.status,
        filledAt: slots.filledAt,
        occName: occupant.name,
        occSerial: occupant.serialNo,
      })
      .from(slots)
      .leftJoin(occupant, eq(slots.occupantId, occupant.id))
      .where(eq(slots.ownerId, uid))
      .orderBy(slots.slabLevel, slots.position),
    db.select().from(slabCompletions).where(eq(slabCompletions.userId, uid)).orderBy(slabCompletions.slabLevel),
    db.select().from(transactions).where(eq(transactions.userId, uid)).orderBy(desc(transactions.createdAt)).limit(300),
    db.select().from(royaltyPayouts).where(eq(royaltyPayouts.userId, uid)).orderBy(desc(royaltyPayouts.createdAt)),
  ]);

  return {
    user: user.u,
    sponsor: user.sponsorId ? { id: user.sponsorId, name: user.sponsorName, serialNo: user.sponsorSerial } : null,
    totalEarned: earnedRow[0]?.earned ?? 0,
    directs,
    ownedSlots,
    completions,
    ledger,
    royalties,
  };
}

/**
 * Build the referral downline tree rooted at `uid` via a recursive CTE.
 * Depth- and row-capped so a huge network can't blow up the page render.
 */
export async function getDownlineTree(uid: string, maxDepth = 6, maxRows = 500): Promise<TreeNode | null> {
  const res = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT id, name, serial_no, sponsor_id, current_slab, status, 0 AS depth
      FROM users WHERE id = ${uid}
      UNION ALL
      SELECT u.id, u.name, u.serial_no, u.sponsor_id, u.current_slab, u.status, t.depth + 1
      FROM users u
      JOIN tree t ON u.sponsor_id = t.id
      WHERE t.depth < ${maxDepth}
    )
    SELECT id, name, serial_no, sponsor_id, current_slab, status, depth
    FROM tree ORDER BY depth LIMIT ${maxRows}
  `);

  const rows = res.rows as {
    id: string;
    name: string;
    serial_no: number | null;
    sponsor_id: string | null;
    current_slab: number;
    status: string;
    depth: number;
  }[];
  if (rows.length === 0) return null;

  const byId = new Map<string, TreeNode>();
  for (const r of rows) {
    byId.set(r.id, { id: r.id, name: maskName(r.serial_no), slab: r.current_slab, status: r.status, depth: r.depth, children: [] });
  }
  let root: TreeNode | null = null;
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.id === uid) root = node;
    else if (r.sponsor_id && byId.has(r.sponsor_id)) byId.get(r.sponsor_id)!.children.push(node);
  }
  return root;
}

export async function getUserWithdrawableDetails(userId: string) {
  const [user] = await db
    .select({ pointsBalance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return { pointsBalance: 0, lockedPoints: 0, withdrawablePoints: 0 };

  const [earnedRow] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.points} > 0`,
        sql`${transactions.slabLevel} is not null and ${transactions.slabLevel} not in (1, 5)`
      )
    );

  const restTiersEarned = earnedRow?.total ?? 0;
  const withdrawableRest = Math.floor(restTiersEarned * 0.30);
  const lockedPoints = restTiersEarned - withdrawableRest;
  const withdrawablePoints = Math.max(0, user.pointsBalance - lockedPoints);

  return {
    pointsBalance: user.pointsBalance,
    lockedPoints,
    withdrawablePoints,
  };
}

export async function getUserWithdrawableDetailsTx(tx: any, userId: string) {
  const [user] = await tx
    .select({ pointsBalance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (!user) throw new Error("User not found");

  const [earnedRow] = await tx
    .select({ total: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.points} > 0`,
        sql`${transactions.slabLevel} is not null and ${transactions.slabLevel} not in (1, 5)`
      )
    );

  const restTiersEarned = earnedRow?.total ?? 0;
  const withdrawableRest = Math.floor(restTiersEarned * 0.30);
  const lockedPoints = restTiersEarned - withdrawableRest;
  const withdrawablePoints = Math.max(0, user.pointsBalance - lockedPoints);

  return {
    pointsBalance: user.pointsBalance,
    lockedPoints,
    withdrawablePoints,
  };
}
