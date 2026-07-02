import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DB } from "@/db";
import { publishEvent, type GameEvent } from "./events";

const { users, slabs, slots, transactions, settings, slabCompletions } = schema;

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type TxType = (typeof schema.txType.enumValues)[number];

/** Transaction types that are allowed to push a user's balance below zero. */
const SYSTEM_DEBIT_TYPES: Set<TxType> = new Set([
  "activation_fee",
  "upgrade_fee",
  "id_pin_fee",
  "royalty_fee",
  "company_fee",
]);

/** Postgres deadlock (40P01) / serialization (40001) — safe to retry whole tx. */
function isRetryableTxError(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  const code = err?.code ?? err?.cause?.code;
  return code === "40P01" || code === "40001";
}

async function withTxRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts - 1 || !isRetryableTxError(e)) throw e;
      await new Promise((r) => setTimeout(r, 30 * (i + 1) + Math.random() * 60));
    }
  }
}

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

  // Prevent negative balance on user-initiated debits.
  // System debits (fees charged during activation/upgrade) are allowed to go
  // negative because they're immediately preceded by a deposit credit within
  // the same transaction.
  if (balanceAfter < 0 && points < 0 && !SYSTEM_DEBIT_TYPES.has(type)) {
    throw new Error(
      `Insufficient balance: ${u.balance} + (${points}) = ${balanceAfter} for ${type}`,
    );
  }

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
  if (!slab.active) throw new Error(`Slab ${level} (${slab.name}) is not active`);

  const cfg = await getSettings(tx);

  const [member] = await tx.select().from(users).where(eq(users.id, userId));
  if (!member) throw new Error("member not found");

  // 1) Claim the oldest open slot at this level — atomic via SKIP LOCKED
  //    (never blocks, so slots can't participate in a deadlock cycle).
  //    If we are entering Slab 1 and this member has a direct sponsor,
  //    prioritize checking for any open slot owned by the sponsor in Slab 1 first.
  let openSlot = null;
  if (level === 1 && member.sponsorId) {
    const [sponsorSlot] = await tx
      .select()
      .from(slots)
      .where(
        and(
          eq(slots.slabLevel, level),
          eq(slots.status, "open"),
          eq(slots.ownerId, member.sponsorId)
        )
      )
      .orderBy(slots.queueSeq)
      .limit(1)
      .for("update", { skipLocked: true });
    if (sponsorSlot) {
      openSlot = sponsorSlot;
    }
  }

  if (!openSlot) {
    [openSlot] = await tx
      .select()
      .from(slots)
      .where(and(eq(slots.slabLevel, level), eq(slots.status, "open")))
      .orderBy(slots.queueSeq)
      .limit(1)
      .for("update", { skipLocked: true });
  }

  // 2) Lock every participant's user row in canonical (id) order BEFORE any
  //    balance write. Without this, two entries whose members are each
  //    other's slot-owners acquire the same row locks in opposite order and
  //    deadlock. (withTxRetry remains the safety net for residual cases.)
  const participants = [
    userId,
    ...(openSlot && openSlot.ownerId !== userId ? [openSlot.ownerId] : []),
    ...(member.sponsorId && slab.referralBonus > 0 ? [member.sponsorId] : []),
  ];
  const ordered = [...new Set(participants)].sort();
  await tx
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.id} in ${ordered}`)
    .orderBy(users.id)
    .for("update");

  // 3) Member pays the slab fee (debit).
  await post(tx, userId, level === 1 ? "activation_fee" : "upgrade_fee", -slab.fee, {
    slabLevel: level,
    note: `Enter ${slab.name} (slab ${level})`,
    idempotencyKey: `enter:${userId}:${level}:${Date.now()}`,
  });

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
      idempotencyKey: `slot_credit:${openSlot.id}`,
    });
    if (houseCut > 0) {
      await post(tx, openSlot.ownerId, "company_fee", -houseCut, {
        counterpartyId: userId,
        slabLevel: level,
        note: `House cut on slot ${openSlot.position} at slab ${level}`,
        idempotencyKey: `company_fee:${openSlot.id}`,
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

  // 4) Referral bonus to the direct sponsor (system-funded).
  let referralPaid = 0;
  if (member.sponsorId && slab.referralBonus > 0) {
    referralPaid = slab.referralBonus;
    await post(tx, member.sponsorId, "referral_bonus", slab.referralBonus, {
      counterpartyId: userId,
      slabLevel: level,
      note: `Referral bonus for ${member.name}`,
      idempotencyKey: `ref_bonus:${userId}:${level}`,
    });
  }

  // 5) Open the member's own slots — they now wait in the FIFO queue.
  await tx.insert(slots).values(
    Array.from({ length: slab.slots }, (_, i) => ({
      ownerId: userId,
      slabLevel: level,
      position: i + 1,
      status: "open" as const,
    })),
  );

  // 6) Advance the member's state.
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

  const [nextSlab] = await tx.select().from(slabs).where(eq(slabs.level, level + 1));
  const isFinal = !nextSlab || !nextSlab.active;

  if (isFinal) {
    await tx
      .insert(slabCompletions)
      .values({ userId, slabLevel: level, collected, status: "exited", payout: collected, decidedAt: sql`now()` })
      .onConflictDoNothing();

    await post(tx, userId, "exit_payout", 0, {
      slabLevel: level,
      note: `Auto exit at final slab ${level}: kept 100% = ${collected}`,
      meta: { payout: collected, keepPct: 100, auto: true, reason: "final_slab" },
    });

    await tx
      .update(users)
      .set({
        status: "completed",
        pendingChoiceSlab: null,
        exitedAt: sql`now()`,
        lastStageClearedAt: sql`now()`,
      })
      .where(eq(users.id, userId));
  } else {
    // Check if the user is flagged for automatic upgrade
    const [user] = await tx.select({ autoUpgrade: users.autoUpgrade }).from(users).where(eq(users.id, userId));
    const isAutoUpgrade = user?.autoUpgrade ?? false;

    if (isAutoUpgrade) {
      const kept = Math.max(0, collected - nextSlab.fee);
      await post(tx, userId, "upgrade_take", 0, {
        slabLevel: level,
        note: `Auto upgrade to ${nextSlab.name}: seed ${nextSlab.fee}, kept ${kept} of ${collected}`,
        meta: { kept, seed: nextSlab.fee, collected, auto: true },
      });
      await tx
        .insert(slabCompletions)
        .values({ userId, slabLevel: level, collected, status: "upgraded", payout: kept, decidedAt: sql`now()` })
        .onConflictDoNothing();

      const entry = await enterSlab(tx, userId, level + 1);
      // Trigger notifications asynchronously
      notifyEntry(userId, entry).catch(console.error);
    } else {
      await tx
        .insert(slabCompletions)
        .values({ userId, slabLevel: level, collected, status: "pending" })
        .onConflictDoNothing();

      // clearing a stage resets the royalty-reserve inactivity clock
      await tx
        .update(users)
        .set({ pendingChoiceSlab: level, lastStageClearedAt: sql`now()` })
        .where(eq(users.id, userId));

      // Notify the user that a decision is required
      publishEvent(userId, { type: "slab_complete", level }).catch(() => {});
    }
  }
}


/**
 * User decides what to do when a slab completes: exit (cash a %) or upgrade.
 * Runs in its own transaction.
 */
export async function decideChoice(userId: string, choice: "exit" | "upgrade") {
  const result = await withTxRetry(() => db.transaction(async (tx) => {
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
          idempotencyKey: `exit_forfeit:${userId}:${level}`,
        });
      }
      const payout = collected - forfeit;
      await post(tx, userId, "exit_payout", 0, {
        slabLevel: level,
        note: `Exit at slab ${level}: kept ${keepPct}% = ${payout}`,
        meta: { payout, keepPct, auto: isFinal && choice !== "exit" },
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

    // UPGRADE: the next level's entry fee is the "seed"; everything collected
    // beyond it stays in the player's balance. enterSlab charges that fee, so
    // the net kept = collected - nextFee (clamped at 0). Recorded as a 0-point
    // marker since the balance already reflects it.
    const kept = Math.max(0, collected - nextSlab.fee);
    await post(tx, userId, "upgrade_take", 0, {
      slabLevel: level,
      note: `Upgrade to ${nextSlab.name}: seed ${nextSlab.fee}, kept ${kept} of ${collected}`,
      meta: { kept, seed: nextSlab.fee, collected },
    });
    await tx
      .update(slabCompletions)
      .set({ status: "upgraded", payout: kept, decidedAt: sql`now()` })
      .where(eq(slabCompletions.id, completion.id));

    const entry = await enterSlab(tx, userId, nextLevel);
    return { choice: "upgrade" as const, fromLevel: level, toLevel: nextLevel, kept, entry };
  }));

  if (result.choice === "upgrade") await notifyEntry(userId, result.entry);
  return result;
}

/** First-time activation: registered → slab 1. Runs in its own transaction. */
export async function activate(userId: string) {
  const result = await withTxRetry(() => db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("user not found");
    if (user.currentSlab !== 0) throw new Error("Already activated");

    // Verify slab 1 exists and is active before attempting entry
    const [slab1] = await tx.select().from(slabs).where(eq(slabs.level, 1));
    if (!slab1 || !slab1.active) throw new Error("Slab 1 is not configured or not active");

    return enterSlab(tx, userId, 1);
  }));
  await notifyEntry(userId, result);
  return result;
}

/**
 * Charge the registration fees that are NOT the autopool entry:
 *   id_pin_fee (→ system) + royalty_fee (→ royalty pool).
 * The autopool portion (slab 1 fee) is charged separately by enterSlab.
 */
export async function chargeRegistration(tx: Tx, userId: string) {
  const cfg = await getSettings(tx);
  const [member] = await tx
    .select({ sponsorId: users.sponsorId, name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  // registrant pays the full ID & PIN fee…
  if (cfg.idPinFee > 0) {
    await post(tx, userId, "id_pin_fee", -cfg.idPinFee, {
      note: "ID & PIN fee",
      idempotencyKey: `id_pin:${userId}`,
    });
  }
  // …of which the sponsor reward is routed to the referrer (if any). With no
  // sponsor the whole id_pin_fee stays with the system. Not tied to a slab.
  if (member?.sponsorId && cfg.sponsorReward > 0) {
    await post(tx, member.sponsorId, "referral_bonus", cfg.sponsorReward, {
      counterpartyId: userId,
      note: `Sponsor reward for ${member?.name ?? "referral"}`,
      idempotencyKey: `sponsor_reward:${userId}`,
    });
  }
  if (cfg.royaltyFee > 0) {
    await post(tx, userId, "royalty_fee", -cfg.royaltyFee, {
      note: "Royalty program contribution",
      idempotencyKey: `royalty_fee:${userId}`,
    });
    // the contribution flows into the shared royalty pool
    await tx
      .update(schema.pools)
      .set({ royaltyPool: sql`${schema.pools.royaltyPool} + ${cfg.royaltyFee}`, updatedAt: sql`now()` })
      .where(eq(schema.pools.id, 1));
  }
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

export { post, getSlab, getSettings, withTxRetry };
