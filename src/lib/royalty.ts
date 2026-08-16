import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { RoyaltyTier } from "@/db/schema";
import { post, getSettings, withTxRetry } from "./distribution";
import { publishEvent } from "./events";

const { users, pools, royaltyTiers, royaltyRuns, royaltyPayouts } = schema;

export type RoyaltyResult = {
  poolBefore: number;
  reserveAdded: number;
  rankDistributed: number;
  reserveDistributed: number;
  rankRecipients: number;
  reserveRecipients: number;
  carryPool: number;
  carryReserve: number;
};

/**
 * Run one royalty distribution (meant to fire twice a month, on the 1st and 16th).
 *
 * Rank rewards: the pool is split into per-band sub-pools (band % of the pool),
 * each shared equally among the users whose HIGHEST qualifying band it is.
 * "Directs" = users you personally referred (sponsor_id = you), independent of
 * autopool placement. Additionally, a sponsor must have onboarded (referred)
 * at least 1 member with active status within the last 15 days to qualify
 * for rank royalty this run — this 15-day activity check does NOT apply to
 * reserve rewards below,
 * which use their own 6-month inactivity window. A configurable % (default 5)
 * is held back as a reserve.
 *
 * Reserve rewards: the accumulated reserve is shared among players who have
 * existed for >= reserveInactivityMonths without clearing a stage and who
 * haven't received a reserve reward within that same window.
 */
export type RankRoyaltyResult = {
  poolBefore: number;
  reserveAdded: number;
  rankDistributed: number;
  rankRecipients: number;
  carryPool: number;
};

export async function distributeRankRoyalty(): Promise<RankRoyaltyResult> {
  const result = await withTxRetry(() =>
    db.transaction(async (tx) => {
      const cfg = await getSettings(tx);
      const [pool] = await tx.select().from(pools).where(eq(pools.id, 1)).for("update");
      const tiers = await tx.select().from(royaltyTiers).orderBy(asc(royaltyTiers.minDirects));

      const poolBefore = pool.royaltyPool;
      const reserveAdded = Math.floor((poolBefore * cfg.royaltyReservePercent) / 100);

      const [run] = await tx
        .insert(royaltyRuns)
        .values({
          poolBefore,
          reserveAdded,
          rankDistributed: 0,
          reserveDistributed: 0,
          rankRecipients: 0,
          reserveRecipients: 0,
        })
        .returning({ id: royaltyRuns.id });

      const directRows = await tx
        .select({ sponsor: users.sponsorId, n: sql<number>`count(*)::int` })
        .from(users)
        .where(sql`${users.sponsorId} is not null and ${users.role} = 'user' and ${users.status} = 'active'`)
        .groupBy(users.sponsorId);

      const recentOnboardRows = await tx
        .select({ sponsor: users.sponsorId })
        .from(users)
        .where(
          sql`${users.sponsorId} is not null and ${users.role} = 'user' and ${users.status} = 'active' and ${users.createdAt} >= now() - interval '15 days'`
        )
        .groupBy(users.sponsorId);
      const recentOnboardSponsors = new Set(recentOnboardRows.map((r) => r.sponsor as string));

      const bandMembers = new Map<number, string[]>();
      for (const r of directRows) {
        if (!r.sponsor || !recentOnboardSponsors.has(r.sponsor)) continue;
        let band: (typeof tiers)[number] | null = null;
        for (const t of tiers) if (r.n >= t.minDirects) band = t;
        if (band) {
          const arr = bandMembers.get(band.minDirects) ?? [];
          arr.push(r.sponsor);
          bandMembers.set(band.minDirects, arr);
        }
      }

      let rankDistributed = 0;
      let rankRecipients = 0;
      for (const t of tiers) {
        const members = bandMembers.get(t.minDirects) ?? [];
        if (members.length === 0) continue;
        const subPool = Math.floor((poolBefore * t.percent) / 100);
        const per = Math.floor(subPool / members.length);
        if (per <= 0) continue;
        for (const uid of members) {
          await post(tx, uid, "royalty_payout", per, {
            note: `Royalty rank reward (${t.label})`,
            idempotencyKey: `royalty_rank:${run.id}:${uid}`,
          });
          await tx.insert(royaltyPayouts).values({
            runId: run.id,
            userId: uid,
            kind: "rank",
            directs: directRows.find((d) => d.sponsor === uid)?.n ?? null,
            bandPercent: t.percent,
            amount: per,
          });
          rankDistributed += per;
          rankRecipients++;
        }
      }

      const carryPool = poolBefore - reserveAdded - rankDistributed;
      const carryReserve = pool.royaltyReserve + reserveAdded;

      await tx
        .update(pools)
        .set({ royaltyPool: carryPool, royaltyReserve: carryReserve, updatedAt: sql`now()` })
        .where(eq(pools.id, 1));

      await tx
        .update(royaltyRuns)
        .set({ rankDistributed, rankRecipients })
        .where(eq(royaltyRuns.id, run.id));

      const notifyIds: string[] = [];
      for (const members of bandMembers.values()) notifyIds.push(...members);

      return {
        poolBefore,
        reserveAdded,
        rankDistributed,
        rankRecipients,
        carryPool,
        _notifyIds: notifyIds,
      };
    })
  );

  const uniqueIds = [...new Set(result._notifyIds)];
  await Promise.all(
    uniqueIds.map((uid: string) =>
      publishEvent(uid, { type: "royalty_payout" }).catch(() => {})
    )
  );

  const { _notifyIds, ...publicResult } = result;
  return publicResult;
}

export type ReserveRoyaltyResult = {
  reserveBefore: number;
  reserveDistributed: number;
  reserveRecipients: number;
  carryReserve: number;
};

export async function distributeReserveRoyalty(): Promise<ReserveRoyaltyResult> {
  const result = await withTxRetry(() =>
    db.transaction(async (tx) => {
      const cfg = await getSettings(tx);
      const [pool] = await tx.select().from(pools).where(eq(pools.id, 1)).for("update");

      const reserveBefore = pool.royaltyReserve;

      const [run] = await tx
        .insert(royaltyRuns)
        .values({
          poolBefore: 0,
          reserveAdded: 0,
          rankDistributed: 0,
          reserveDistributed: 0,
          rankRecipients: 0,
          reserveRecipients: 0,
        })
        .returning({ id: royaltyRuns.id });

      const cutoff = sql`now() - (${cfg.reserveInactivityMonths} || ' months')::interval`;
      const eligible = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, "user"),
            sql`${users.status} not in ('exited','completed')`,
            lte(users.createdAt, cutoff),
            or(isNull(users.lastStageClearedAt), lte(users.lastStageClearedAt, cutoff)),
            or(isNull(users.lastReserveRewardAt), lte(users.lastReserveRewardAt, cutoff)),
          ),
        );

      let reserveDistributed = 0;
      let reserveRecipients = 0;
      if (eligible.length > 0 && reserveBefore > 0) {
        const per = Math.floor(reserveBefore / eligible.length);
        if (per > 0) {
          for (const u of eligible) {
            await post(tx, u.id, "royalty_reserve_reward", per, {
              note: "Royalty reserve reward",
              idempotencyKey: `royalty_reserve:${run.id}:${u.id}`,
            });
            await tx.update(users).set({ lastReserveRewardAt: sql`now()` }).where(eq(users.id, u.id));
            await tx.insert(royaltyPayouts).values({ runId: run.id, userId: u.id, kind: "reserve", amount: per });
            reserveDistributed += per;
            reserveRecipients++;
          }
        }
      }

      const carryReserve = reserveBefore - reserveDistributed;
      await tx
        .update(pools)
        .set({ royaltyReserve: carryReserve, updatedAt: sql`now()` })
        .where(eq(pools.id, 1));

      await tx
        .update(royaltyRuns)
        .set({ reserveDistributed, reserveRecipients })
        .where(eq(royaltyRuns.id, run.id));

      const notifyIds: string[] = eligible.map((u) => u.id);

      return {
        reserveBefore,
        reserveDistributed,
        reserveRecipients,
        carryReserve,
        _notifyIds: notifyIds,
      };
    })
  );

  const uniqueIds = [...new Set(result._notifyIds)];
  await Promise.all(
    uniqueIds.map((uid: string) =>
      publishEvent(uid, { type: "royalty_payout" }).catch(() => {})
    )
  );

  const { _notifyIds, ...publicResult } = result;
  return publicResult;
}

/** Pool/reserve state + tier config + a player's current standing (for UI). */
export async function getRoyaltyOverview(uid?: string) {
  const [[pool], tiers] = await Promise.all([
    db.select().from(pools).where(eq(pools.id, 1)),
    db.select().from(royaltyTiers).orderBy(asc(royaltyTiers.minDirects)),
  ]);

  let me: { directs: number; band: RoyaltyTier | null; earned: number } | undefined;
  if (uid) {
    const [{ directs }] = await db
      .select({ directs: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.sponsorId, uid), eq(users.status, "active")));
    const [{ earned }] = await db
      .select({ earned: sql<number>`coalesce(sum(${schema.transactions.points}),0)::int` })
      .from(schema.transactions)
      .where(and(eq(schema.transactions.userId, uid), sql`${schema.transactions.type} in ('royalty_payout','royalty_reserve_reward')`));
    let band: RoyaltyTier | null = null;
    for (const t of tiers) if (directs >= t.minDirects) band = t;
    me = { directs, band, earned };
  }

  return { pool: pool ?? { royaltyPool: 0, royaltyReserve: 0 }, tiers, me };
}

export async function getRoyaltyEligibleUsers() {
  const tiers = await db.select().from(royaltyTiers).orderBy(asc(royaltyTiers.minDirects));
  const activeUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "user"), eq(users.status, "active")));

  const recentOnboardRows = await db
    .select({ sponsor: users.sponsorId })
    .from(users)
    .where(
      sql`${users.sponsorId} is not null and ${users.role} = 'user' and ${users.status} = 'active' and ${users.createdAt} >= now() - interval '15 days'`
    )
    .groupBy(users.sponsorId);
  const recentOnboardSponsors = new Set(recentOnboardRows.map((r) => r.sponsor as string));

  // Get active referrals count for all active users who onboarded someone in the last 15 days
  const membersWithDirects = await Promise.all(
    activeUsers
      .filter((u) => recentOnboardSponsors.has(u.id))
      .map(async (u) => {
      const [{ directsCount }] = await db
        .select({ directsCount: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.sponsorId, u.id), eq(users.status, "active")));
      return {
        id: u.id,
        name: u.name,
        serialNo: u.serialNo,
        directsCount,
      };
    })
  );

  // Map members to their highest qualifying tier
  return tiers.map((t) => {
    // Find members whose HIGHEST tier is this one
    const members = membersWithDirects.filter((m) => {
      let highestTier: (typeof tiers)[number] | null = null;
      for (const tier of tiers) {
        if (m.directsCount >= tier.minDirects) {
          highestTier = tier;
        }
      }
      return highestTier && highestTier.minDirects === t.minDirects;
    });

    return {
      minDirects: t.minDirects,
      label: t.label,
      percent: t.percent,
      members,
    };
  });
}
