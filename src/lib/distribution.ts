import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DB } from "@/db";
import { publishEvent, type GameEvent } from "./events";

const { users, slabs, slots, transactions, settings, slabCompletions } = schema;

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type TxType = (typeof schema.txType.enumValues)[number];

/**
 * The distribution engine.
 *
 * Every money movement goes through `post()`, which appends to the
 * append-only ledger and keeps the cached `pointsBalance` in lock-step.
 * Slot assignment uses `FOR UPDATE SKIP LOCKED` so that two concurrent
 * entries can never claim the same FIFO slot — the worker can run with
 * concurrency > 1 and the matrix stays consistent.
 */

async function post(
  tx: Tx,
  userId: string,
  type: TxType,
  points: number,
  opts: {
    counterpartyId?: string | null;
    slabLevel?: number | null;
    note?: string;
    idempotencyKey?: string;
    meta?: Record<string, unknown>;
  } = {},
) {
  // Lock the user row so balanceAfter is computed serially per user.
  const [u] = await tx
    .select({ balance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (!u) throw new Error(`post: user ${userId} not found`);

  const balanceAfter = u.balance + points;
  await tx
    .update(users)
    .set({ pointsBalance: balanceAfter })
    .where(eq(users.id, userId));

  await tx.insert(transactions).values({
    userId,
    type,
    points,
    balanceAfter,
    counterpartyId: opts.counterpartyId ?? null,
    slabLevel: opts.slabLevel ?? null,
    note: opts.note,
    idempotencyKey: opts.idempotencyKey,
    meta: opts.meta as never,
  });

  return balanceAfter;
}

async function getSlab(tx: Tx, level: number) {
  const [s] = await tx.select().from(slabs).where(eq(slabs.level, level));
  if (!s) throw new Error(`Slab ${level} not configured`);
  return s;
}

async function getSettings(tx: Tx) {
  const [s] = await tx.select().from(settings).where(eq(settings.id, 1));
  if (!s) throw new Error("Settings not initialised");
  return s;
}

export type EntryResult = {
  level: number;
  filledUplineSlot: boolean;
  uplineOwnerId: string | null;
  uplineSlotPosition: number | null;
  ownerSlabCompleted: boolean;
  referralPaid: number;
  referralSponsorId: string | null;
};

/** Fire live notifications for an entry result (call AFTER the tx commits). */
async function notifyEntry(memberId: string, r: EntryResult) {
  const jobs: Promise<unknown>[] = [];
  if (r.filledUplineSlot && r.uplineOwnerId) {
    jobs.push(
      publishEvent(r.uplineOwnerId, {
        type: "slot_filled",
        level: r.level,
        position: r.uplineSlotPosition ?? 0,
        by: memberId,
      } satisfies GameEvent),
    );
  }
  if (r.ownerSlabCompleted && r.uplineOwnerId) {
    jobs.push(publishEvent(r.uplineOwnerId, { type: "slab_complete", level: r.level }));
  }
  if (r.referralPaid > 0 && r.referralSponsorId) {
    jobs.push(publishEvent(r.referralSponsorId, { type: "referral", level: r.level }));
  }
  jobs.push(publishEvent(memberId, { type: "entered", level: r.level }));
  await Promise.all(jobs);
}

/**
 * Place a member into a slab: charge the fee, fill the oldest open upline
 * slot (FIFO), pay the referral bonus, and open the member's own slots.
 * Must run inside a transaction.
 */
export async function enterSlab(
  tx: Tx,
  userId: string,
  level: number,
): Promise<EntryResult> {
  const slab = await getSlab(tx, level);
  const cfg = await getSettings(tx);

  const [member] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
  if (!member) throw new Error("member not found");

  // 1) Member pays the slab fee (debit).
  await post(tx, userId, level === 1 ? "activation_fee" : "upgrade_fee", -slab.fee, {
    slabLevel: level,
    note: `Enter ${slab.name} (slab ${level})`,
  });

  // 2) Fill the oldest open slot at this level — atomic via SKIP LOCKED.
  const [openSlot] = await tx
    .select()
    .from(slots)
    .where(and(eq(slots.slabLevel, level), eq(slots.status, "open")))
    .orderBy(slots.queueSeq)
    .limit(1)
    .for("update", { skipLocked: true });

  let uplineOwnerId: string | null = null;
  let uplineSlotPosition: number | null = null;
  let ownerSlabCompleted = false;

  if (openSlot && openSlot.ownerId !== userId) {
    uplineOwnerId = openSlot.ownerId;
    uplineSlotPosition = openSlot.position;
    await tx
      .update(slots)
      .set({ status: "filled", occupantId: userId, filledAt: sql`now()` })
      .where(eq(slots.id, openSlot.id));

    // Credit the slot owner with the fee, minus the house cut.
    const houseCut = Math.floor((slab.fee * cfg.companyPercent) / 100);
    const ownerCredit = slab.fee - houseCut;
    await post(tx, openSlot.ownerId, "slot_credit", ownerCredit, {
      counterpartyId: userId,
      slabLevel: level,
      note: `Slot ${openSlot.position} filled at slab ${level}`,
    });
    if (houseCut > 0) {
      await post(tx, openSlot.ownerId, "company_fee", -houseCut, {
        slabLevel: level,
        note: "House cut",
      });
    }

    // Did this complete the owner's slab? (no more open slots they own here)
    const [{ remaining }] = await tx
      .select({ remaining: sql<number>`count(*)::int` })
      .from(slots)
      .where(
        and(
          eq(slots.ownerId, openSlot.ownerId),
          eq(slots.slabLevel, level),
          eq(slots.status, "open"),
        ),
      );
    if (remaining === 0) {
      ownerSlabCompleted = true;
      await markSlabComplete(tx, openSlot.ownerId, level);
    }
  }

  // 3) Referral bonus to the direct sponsor (system-funded).
  let referralPaid = 0;
  if (member.sponsorId && slab.referralBonus > 0) {
    referralPaid = slab.referralBonus;
    await post(tx, member.sponsorId, "referral_bonus", slab.referralBonus, {
      counterpartyId: userId,
      slabLevel: level,
      note: `Referral bonus for ${member.name}`,
    });
  }

  // 4) Open the member's own slots — they now wait in the FIFO queue.
  await tx.insert(slots).values(
    Array.from({ length: slab.slots }, (_, i) => ({
      ownerId: userId,
      slabLevel: level,
      position: i + 1,
      status: "open" as const,
    })),
  );

  // 5) Advance the member's state.
  await tx
    .update(users)
    .set({
      currentSlab: level,
      status: "active",
      activatedAt: member.activatedAt ?? sql`now()`,
      pendingChoiceSlab: null,
    })
    .where(eq(users.id, userId));

  return {
    level,
    filledUplineSlot: !!uplineOwnerId,
    uplineOwnerId,
    uplineSlotPosition,
    ownerSlabCompleted,
    referralPaid,
    referralSponsorId: referralPaid > 0 ? member.sponsorId : null,
  };
}

async function markSlabComplete(tx: Tx, userId: string, level: number) {
  // points collected at this slab = slot credits + referral bonuses
  const [{ collected }] = await tx
    .select({ collected: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.slabLevel, level),
        sql`${transactions.type} in ('slot_credit','referral_bonus')`,
      ),
    );

  await tx
    .insert(slabCompletions)
    .values({ userId, slabLevel: level, collected, status: "pending" })
    .onConflictDoNothing();

  await tx
    .update(users)
    .set({ pendingChoiceSlab: level })
    .where(eq(users.id, userId));
}

/**
 * User decides what to do when a slab completes: exit (cash a %) or upgrade.
 * Runs in its own transaction.
 */
export async function decideChoice(userId: string, choice: "exit" | "upgrade") {
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new Error("user not found");
    if (user.pendingChoiceSlab == null) throw new Error("No pending slab decision");

    const level = user.pendingChoiceSlab;
    const slab = await getSlab(tx, level);
    const [completion] = await tx
      .select()
      .from(slabCompletions)
      .where(and(eq(slabCompletions.userId, userId), eq(slabCompletions.slabLevel, level)))
      .for("update");
    if (!completion || completion.status !== "pending") throw new Error("Already decided");

    const collected = completion.collected;
    const nextLevel = level + 1;
    const [nextSlab] = await tx.select().from(slabs).where(eq(slabs.level, nextLevel));
    const isFinal = !nextSlab || !nextSlab.active;

    if (choice === "exit" || isFinal) {
      // Keep exitPercent of what was collected; forfeit the rest to the house.
      const keepPct = isFinal ? 100 : slab.exitPercent;
      const forfeit = Math.floor((collected * (100 - keepPct)) / 100);
      if (forfeit > 0) {
        await post(tx, userId, "company_fee", -forfeit, {
          slabLevel: level,
          note: `Exit forfeit (${100 - keepPct}% of ${collected})`,
        });
      }
      const payout = collected - forfeit;
      await post(tx, userId, "exit_payout", 0, {
        slabLevel: level,
        note: `Exit at slab ${level}: kept ${keepPct}% = ${payout}`,
        meta: { payout, keepPct },
      });
      await tx
        .update(users)
        .set({
          status: isFinal ? "completed" : "exited",
          pendingChoiceSlab: null,
          exitedAt: sql`now()`,
        })
        .where(eq(users.id, userId));
      await tx
        .update(slabCompletions)
        .set({ status: "exited", payout, decidedAt: sql`now()` })
        .where(eq(slabCompletions.id, completion.id));
      return { choice: "exit" as const, level, payout, keepPct };
    }

    // UPGRADE: pocket upgradeTakePercent of collected (informational — already in
    // balance), then enter the next slab (which charges the next fee + opens slots).
    const take = Math.floor((collected * slab.upgradeTakePercent) / 100);
    await post(tx, userId, "upgrade_take", 0, {
      slabLevel: level,
      note: `Upgrade from slab ${level}: pocketed ${slab.upgradeTakePercent}% = ${take}`,
      meta: { take },
    });
    await tx
      .update(slabCompletions)
      .set({ status: "upgraded", payout: take, decidedAt: sql`now()` })
      .where(eq(slabCompletions.id, completion.id));

    const entry = await enterSlab(tx, userId, nextLevel);
    return { choice: "upgrade" as const, fromLevel: level, toLevel: nextLevel, take, entry };
  });

  if (result.choice === "upgrade") await notifyEntry(userId, result.entry);
  return result;
}

/** First-time activation: registered → slab 1. Runs in its own transaction. */
export async function activate(userId: string) {
  const result = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new Error("user not found");
    if (user.currentSlab !== 0) throw new Error("Already activated");
    return enterSlab(tx, userId, 1);
  });
  await notifyEntry(userId, result);
  return result;
}

/** Charge the one-time join fee at registration. */
export async function chargeJoinFee(tx: Tx, userId: string) {
  const cfg = await getSettings(tx);
  await post(tx, userId, "join_fee", -cfg.joinFee, { note: "Join fee" });
}

/** Read a user's per-slab collected total (for display). */
export async function collectedAtSlab(userId: string, level: number) {
  const [{ collected }] = await db
    .select({ collected: sql<number>`coalesce(sum(${transactions.points}),0)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.slabLevel, level),
        sql`${transactions.type} in ('slot_credit','referral_bonus')`,
      ),
    );
  return collected;
}

export { post, getSlab, getSettings };
