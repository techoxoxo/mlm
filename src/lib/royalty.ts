import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { RoyaltyTier } from "@/db/schema";
import { post, getSettings, withTxRetry } from "./distribution";

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
 * Run one royalty distribution (meant to fire ~3×/month on fixed dates).
 *
 * Rank rewards: the pool is split into per-band sub-pools (band % of the pool),
 * each shared equally among the users whose HIGHEST qualifying band it is.
 * "Directs" = users you personally referred (sponsor_id = you), independent of
 * autopool placement. A configurable % (default 5) is held back as a reserve.
 *
 * Reserve rewards: the accumulated reserve is shared among players who have
 * existed for >= reserveInactivityMonths without clearing a stage and who
 * haven't received a reserve reward within that same window.
 */
export async function distributeRoyalty(): Promise<RoyaltyResult> {
  return withTxRetry(() =>
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

      /* ---------------- rank rewards ---------------- */
      // direct-referral counts per sponsor
      const directRows = await tx
        .select({ sponsor: users.sponsorId, n: sql<number>`count(*)::int` })
        .from(users)
        .where(sql`${users.sponsorId} is not null and ${users.role} = 'user'`)
        .groupBy(users.sponsorId);

      // assign each qualifying user to their highest band
      const bandMembers = new Map<number, string[]>(); // minDirects -> userIds
      for (const r of directRows) {
        let band: (typeof tiers)[number] | null = null;
        for (const t of tiers) if (r.n >= t.minDirects) band = t; // tiers asc → ends on highest
        if (band && r.sponsor) {
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
          await post(tx, uid, "royalty_payout", per, { note: `Royalty rank reward (${t.label})` });
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

      /* ---------------- reserve rewards ---------------- */
      const reserveBalance = pool.royaltyReserve + reserveAdded;
      const cutoff = sql`now() - (${cfg.reserveInactivityMonths} || ' months')::interval`;
      const eligible = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, "user"),
            sql`${users.status} not in ('exited','completed')`,
            lte(users.createdAt, cutoff), // has existed at least the inactivity window
            or(isNull(users.lastStageClearedAt), lte(users.lastStageClearedAt, cutoff)),
            or(isNull(users.lastReserveRewardAt), lte(users.lastReserveRewardAt, cutoff)),
          ),
        );

      let reserveDistributed = 0;
      let reserveRecipients = 0;
      if (eligible.length > 0 && reserveBalance > 0) {
        const per = Math.floor(reserveBalance / eligible.length);
        if (per > 0) {
          for (const u of eligible) {
            await post(tx, u.id, "royalty_reserve_reward", per, { note: "Royalty reserve reward" });
            await tx.update(users).set({ lastReserveRewardAt: sql`now()` }).where(eq(users.id, u.id));
            await tx.insert(royaltyPayouts).values({ runId: run.id, userId: u.id, kind: "reserve", amount: per });
            reserveDistributed += per;
            reserveRecipients++;
          }
        }
      }

      /* ---------------- settle pools + audit ---------------- */
      const carryPool = poolBefore - reserveAdded - rankDistributed; // undistributed bands + rounding
      const carryReserve = reserveBalance - reserveDistributed;
      await tx
        .update(pools)
        .set({ royaltyPool: carryPool, royaltyReserve: carryReserve, updatedAt: sql`now()` })
        .where(eq(pools.id, 1));
      await tx
        .update(royaltyRuns)
        .set({ rankDistributed, reserveDistributed, rankRecipients, reserveRecipients })
        .where(eq(royaltyRuns.id, run.id));

      return {
        poolBefore,
        reserveAdded,
        rankDistributed,
        reserveDistributed,
        rankRecipients,
        reserveRecipients,
        carryPool,
        carryReserve,
      };
    }),
  );
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
      .where(eq(users.sponsorId, uid));
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
