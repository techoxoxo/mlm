import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type { DB } from "@/db";
import { post, withTxRetry } from "./distribution";
import { publishEvent } from "./events";

const { users, roiSettings, roiLevelTiers, roiInvestments, roiTransactions, transactions } = schema;

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type RoiTxType = (typeof schema.roiTxType.enumValues)[number];

/**
 * The ROI plan — a second, independent income stream alongside the
 * slab/autopool/royalty system:
 *
 *  - Invest $100-$2000 (in $100 steps) and earn a daily ROI on it.
 *  - Direct income: 10% of a direct referral's investment, paid once, immediately.
 *  - Daily ROI: 0.3%/day by default; once your directs' investments add up to
 *    $2,500 total (cumulative, USDT), you permanently move to 0.5%/day.
 *  - Level income ("ROI of ROI"): a share of each downline's daily ROI
 *    payout, 20 levels deep (see roi_level_tiers).
 *  - Every stream is capped: a user's total ROI-plan earnings (direct + daily
 *    + level, combined) never exceed investment × capMultiplier (3x default).
 *    A user with no investment of their own has no cap headroom, so they
 *    can't earn from this plan until they invest.
 *
 * Earnings accrue with full decimal precision (users.roiEarned) — daily/level
 * percentages on modest investments are routinely worth less than $1, and
 * flooring each one to a whole dollar would mean most investors earn exactly
 * $0 forever. The spendable wallet (points_balance, integer) only receives
 * whole-dollar transfers as they accrue — see accrueAndSettle below.
 */

export async function getRoiSettings(tx: Tx | DB = db) {
  const [s] = await tx.select().from(roiSettings).where(eq(roiSettings.id, 1));
  if (!s) throw new Error("ROI settings not initialised");
  return s;
}

export async function getRoiLevelTiers(tx: Tx | DB = db) {
  return tx.select().from(roiLevelTiers).orderBy(asc(roiLevelTiers.level));
}

/**
 * Remaining headroom a user can still earn from this plan before hitting
 * their cap — combined across both currencies, since the cap is on total
 * earnings (USDT + Token), not either half alone.
 */
function headroom(
  u: { roiInvested: number; roiEarned: string | number; roiTokenEarned: string | number },
  capMultiplier: number,
): number {
  return Math.max(0, u.roiInvested * capMultiplier - Number(u.roiEarned) - Number(u.roiTokenEarned));
}

/**
 * Records an exact-decimal earning event, splits it 50/50 USDT/Token (per
 * the plan's design — every direct/daily/level income stream pays half in
 * each), and settles whatever whole-dollar portion the USDT half newly
 * crosses into the ROI plan's OWN isolated withdrawable balance —
 * deliberately never pointsBalance. This plan's earnings are a separate
 * wallet from the main plan's; the only ways money crosses between them are
 * external (a direct USDT deposit, or a real bank/crypto withdrawal), never
 * an internal transfer. The Token half accrues as a tracked balance only —
 * no withdrawal flow exists for it yet.
 *
 * The roi_transactions insert records the FULL pre-split amount and is the
 * source of truth and idempotency boundary — it always happens, even for a
 * $0.003 accrual, which is what lets daily distribution detect "already
 * processed today" reliably.
 */
async function accrueAndSettle(
  tx: Tx,
  userId: string,
  amount: number,
  roiType: RoiTxType,
  opts: {
    counterpartyId?: string | null;
    investmentId?: string | null;
    level?: number | null;
    note: string;
    idempotencyKey: string;
  },
): Promise<void> {
  const [u] = await tx
    .select({ roiEarned: users.roiEarned, roiTokenEarned: users.roiTokenEarned, roiWalletCredited: users.roiWalletCredited })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if (!u) throw new Error(`accrueAndSettle: user ${userId} not found`);

  await tx.insert(roiTransactions).values({
    userId,
    type: roiType,
    points: amount.toFixed(6),
    counterpartyId: opts.counterpartyId ?? null,
    investmentId: opts.investmentId ?? null,
    level: opts.level ?? null,
    note: opts.note,
    idempotencyKey: opts.idempotencyKey,
  });

  const usdtHalf = amount / 2;
  const tokenHalf = amount - usdtHalf; // avoids losing a fraction of a cent to rounding vs amount/2 twice

  const newEarned = Number(u.roiEarned) + usdtHalf;
  const newTokenEarned = Number(u.roiTokenEarned) + tokenHalf;
  const newWhole = Math.floor(newEarned);
  const toSettle = Math.max(0, newWhole - u.roiWalletCredited);

  await tx
    .update(users)
    .set({
      roiEarned: newEarned.toFixed(6),
      roiTokenEarned: newTokenEarned.toFixed(6),
      roiWalletCredited: u.roiWalletCredited + toSettle,
      roiWithdrawableBalance: sql`${users.roiWithdrawableBalance} + ${toSettle}`,
    })
    .where(eq(users.id, userId));
}

export type InvestResult = { investmentId: string; amount: number; directPaid: number; sponsorId: string | null };

/**
 * Core investment logic, given an already-open transaction — used both by
 * the standalone `investInRoiPlan` (opens its own tx) and by the payment
 * webhook's credit worker, which runs this INSIDE the same transaction that
 * credits the deposit, guarded by that worker's "already completed" check.
 * That guard is what makes a webhook retry safe — running this twice in two
 * separate transactions would double-invest, since nothing here is keyed to
 * a specific payment.
 *
 * `source` is accepted for compatibility with callers that fund the
 * investment via a fresh deposit in the same transaction (direct USDT
 * payment, admin manual funding) vs. an existing wallet balance — there's no
 * behavioral difference anymore now that pointsBalance and the ROI plan's
 * own wallet are fully isolated (see accrueAndSettle): pointsBalance can
 * never contain ROI-plan-earned money in the first place, so there's
 * nothing to guard against either way.
 */
export async function investInRoiPlanTx(
  tx: Tx,
  userId: string,
  amount: number,
  _opts: { source?: "wallet" | "external" } = {},
): Promise<InvestResult> {
  const cfg = await getRoiSettings(tx);
  if (!cfg.enabled) {
    throw new Error("The ROI plan isn't open yet");
  }
  if (amount < cfg.minInvest || amount > cfg.maxInvest || amount % cfg.investStep !== 0) {
    throw new Error(
      `Investment must be between ${cfg.minInvest} and ${cfg.maxInvest}, in multiples of ${cfg.investStep}`,
    );
  }

  const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
  if (!user) throw new Error("User not found");
  if (user.status !== "active") {
    throw new Error(
      user.status === "registered"
        ? "Complete your account activation before investing in the ROI plan"
        : "Your account is not active, so you can't invest in the ROI plan",
    );
  }

  // Debit from the main plan's points wallet — investing is funded from
  // pointsBalance (or a direct/admin-credited deposit into it) only. It
  // never touches roiWithdrawableBalance, which is a fully separate wallet
  // for this plan's own earnings — see accrueAndSettle.
  await post(tx, userId, "roi_investment", -amount, {
    note: `ROI plan investment`,
    idempotencyKey: `roi_invest:${userId}:${Date.now()}`,
  });

  const [inv] = await tx
    .insert(roiInvestments)
    .values({ userId, amount })
    .returning({ id: roiInvestments.id });

  await tx
    .update(users)
    .set({ roiInvested: sql`${users.roiInvested} + ${amount}` })
    .where(eq(users.id, userId));

  // Direct income + boost-threshold bookkeeping for the sponsor — but only
  // for sponsors who have already invested themselves AND are currently
  // active. A sponsor with no investment of their own can't earn from this
  // plan at all (see headroom), and per the same rule, a direct's investment
  // made BEFORE their sponsor ever joined (or while the sponsor's account is
  // deactivated/exited) must not count toward that sponsor's boost threshold
  // either — otherwise a sponsor could join/return later and be instantly
  // boosted purely from activity that happened while they weren't
  // participating. Once the sponsor is active and has invested, every direct
  // investment from that point on counts normally.
  let directPaid = 0;
  if (user.sponsorId) {
    const [sponsor] = await tx.select().from(users).where(eq(users.id, user.sponsorId)).for("update");
    if (sponsor && sponsor.roiInvested > 0 && sponsor.status === "active") {
      const newDirectTotal = sponsor.roiDirectTotal + amount;
      const justUnlocked = !sponsor.roiBoosted && newDirectTotal >= cfg.boostThresholdUsdt;

      await tx
        .update(users)
        .set({
          roiDirectTotal: newDirectTotal,
          ...(justUnlocked ? { roiBoosted: true, roiBoostedAt: sql`now()` } : {}),
        })
        .where(eq(users.id, sponsor.id));

      const wanted = (amount * cfg.directIncomePercent) / 100;
      const room = headroom(sponsor, cfg.capMultiplier);
      directPaid = Math.min(wanted, room);
      if (directPaid > 0) {
        await accrueAndSettle(tx, sponsor.id, directPaid, "direct_income", {
          counterpartyId: userId,
          investmentId: inv.id,
          note: `ROI plan direct income (${cfg.directIncomePercent}% of ${amount})`,
          idempotencyKey: `roi_direct:${inv.id}`,
        });
      }
    }
  }

  return { investmentId: inv.id, amount, directPaid, sponsorId: user.sponsorId };
}

/**
 * Join/add to the ROI plan. Debits the amount from the user's existing points
 * balance (already USDT-equivalent — see usdt_deposit), opens a new
 * investment, and immediately pays the sponsor's direct income.
 */
export async function investInRoiPlan(
  userId: string,
  amount: number,
  opts: { source?: "wallet" | "external" } = {},
): Promise<InvestResult> {
  const result = await withTxRetry(() => db.transaction((tx) => investInRoiPlanTx(tx, userId, amount, opts)));

  if (result.directPaid > 0 && result.sponsorId) {
    await publishEvent(result.sponsorId, { type: "royalty_payout" }).catch(() => {});
  }

  return result;
}

export type ReverseInvestmentResult = { investmentId: string; userId: string; amount: number };

/**
 * Reverses a single investment: refunds its principal to the user's
 * withdrawable wallet and marks it inactive (it immediately stops earning
 * — daily distribution already filters on `active`), reducing their
 * roiInvested (and therefore their cap) by that amount.
 *
 * Deliberately scoped to just the principal. It does NOT claw back:
 *  - earnings this user already accrued from this investment (roiEarned /
 *    roiTokenEarned), some of which may already be withdrawn, or
 *  - direct/level income this investment already paid out to their sponsor
 *    or upline.
 * Unwinding money that's already moved into other people's accounts is a
 * much bigger, riskier operation than "undo this investment" — if that's
 * ever actually needed, it should be a separate, explicit, per-recipient
 * decision, not something bundled silently into a reversal.
 */
export async function reverseRoiInvestment(investmentId: string): Promise<ReverseInvestmentResult> {
  return withTxRetry(() =>
    db.transaction(async (tx) => {
      const [inv] = await tx.select().from(roiInvestments).where(eq(roiInvestments.id, investmentId)).for("update");
      if (!inv) throw new Error("Investment not found");
      if (!inv.active) throw new Error("This investment has already been reversed");

      const [user] = await tx.select().from(users).where(eq(users.id, inv.userId)).for("update");
      if (!user) throw new Error("User not found");

      await tx
        .update(roiInvestments)
        .set({ active: false })
        .where(eq(roiInvestments.id, investmentId));

      await tx
        .update(users)
        .set({ roiInvested: sql`greatest(0, ${users.roiInvested} - ${inv.amount})` })
        .where(eq(users.id, user.id));

      await post(tx, user.id, "adjustment", inv.amount, {
        note: `ROI plan investment reversed by admin (investment ${investmentId})`,
        idempotencyKey: `roi_reverse:${investmentId}`,
      });

      return { investmentId, userId: user.id, amount: inv.amount };
    }),
  );
}

/** Walk up the sponsor chain, immediate sponsor first, up to `maxLevels` deep. */
async function getUplineChain(tx: Tx, userId: string, maxLevels: number): Promise<string[]> {
  const chain: string[] = [];
  let current = userId;
  for (let i = 0; i < maxLevels; i++) {
    const [row] = await tx.select({ sponsorId: users.sponsorId }).from(users).where(eq(users.id, current));
    if (!row?.sponsorId) break;
    chain.push(row.sponsorId);
    current = row.sponsorId;
  }
  return chain;
}

export type DailyRoiResult = {
  investmentsProcessed: number;
  daysProcessed: number;
  dailyPaid: number;
  levelPaid: number;
  dailyRecipients: number;
  levelPayouts: number;
};

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return toDateKey(d);
}

/** Every calendar day from `startKey` through `endKey`, inclusive, in order. */
function enumerateDateKeys(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let k = startKey;
  while (k <= endKey) {
    keys.push(k);
    k = nextDateKey(k);
  }
  return keys;
}

/**
 * Run ROI + level-income distribution, catching up on any calendar day that
 * hasn't been processed yet for each investment — not just "today". Meant to
 * fire once a day via cron, but is safe (and self-healing) to run after a gap
 * of any length: a missed run (worker downtime, a Redis blip, a forgotten
 * manual trigger) never permanently loses an investor's earnings, since each
 * investment tracks its own last-processed day independently and this simply
 * backfills every day since then, in order, up through today.
 *
 * The one thing that's deliberately NOT backfilled: days where an account
 * wasn't active. Those are recorded as a $0 evaluated day (so they're never
 * retried once the gap-filling logic runs again), which is what keeps this
 * consistent with the separate "must be active to earn" rule — reactivating
 * an account resumes earning going forward, it doesn't retroactively grant
 * everything missed while inactive.
 */
export async function runRoiDailyDistribution(): Promise<DailyRoiResult> {
  const todayKey = toDateKey(new Date());
  const cfg = await getRoiSettings();
  if (!cfg.enabled) {
    return { investmentsProcessed: 0, daysProcessed: 0, dailyPaid: 0, levelPaid: 0, dailyRecipients: 0, levelPayouts: 0 };
  }
  const tiers = await getRoiLevelTiers();

  const investments = await db
    .select()
    .from(roiInvestments)
    .where(eq(roiInvestments.active, true))
    .orderBy(asc(roiInvestments.createdAt));

  // Last calendar day each investment was evaluated (paid or correctly
  // skipped) — the idempotencyKey format is roi_daily:{investmentId}:{date}.
  const lastEvaluatedRows = await db
    .select({ idempotencyKey: roiTransactions.idempotencyKey })
    .from(roiTransactions)
    .where(eq(roiTransactions.type, "daily_payout"));
  const lastEvaluatedByInvestment = new Map<string, string>();
  for (const row of lastEvaluatedRows) {
    const parts = row.idempotencyKey?.split(":");
    if (!parts || parts.length !== 3) continue;
    const [, invId, dateKey] = parts;
    const current = lastEvaluatedByInvestment.get(invId);
    if (!current || dateKey > current) lastEvaluatedByInvestment.set(invId, dateKey);
  }

  let dailyPaid = 0;
  let levelPaid = 0;
  let dailyRecipients = 0;
  let levelPayouts = 0;
  let daysProcessed = 0;
  const notifyIds = new Set<string>();

  for (const inv of investments) {
    const lastEvaluated = lastEvaluatedByInvestment.get(inv.id);
    const startKey = lastEvaluated ? nextDateKey(lastEvaluated) : toDateKey(inv.createdAt);
    if (startKey > todayKey) continue;

    for (const dateKey of enumerateDateKeys(startKey, todayKey)) {
      daysProcessed++;
      const paid = await withTxRetry(() =>
        db.transaction(async (tx) => {
          const [owner] = await tx.select().from(users).where(eq(users.id, inv.userId)).for("update");
          if (!owner) return null;

          // Ongoing check, evaluated per-day — if the account wasn't active on
          // this specific day, record a $0 evaluated marker (so catch-up
          // never retries it) but pay nothing for it, now or later.
          if (owner.status !== "active") {
            await tx.insert(roiTransactions).values({
              userId: owner.id,
              type: "daily_payout",
              points: "0",
              investmentId: inv.id,
              note: `ROI daily payout skipped — account not active on ${dateKey}`,
              idempotencyKey: `roi_daily:${inv.id}:${dateKey}`,
            });
            return null;
          }

          const rate = Number(owner.roiBoosted ? cfg.boostedDailyRoiPercent : cfg.baseDailyRoiPercent);
          const wanted = (inv.amount * rate) / 100;
          const room = headroom(owner, cfg.capMultiplier);
          const credit = Math.min(wanted, room);
          if (credit <= 0) {
            // Cap reached — same idea: mark this day evaluated so we don't
            // loop over an exhausted investment's history forever.
            await tx.insert(roiTransactions).values({
              userId: owner.id,
              type: "daily_payout",
              points: "0",
              investmentId: inv.id,
              note: `ROI daily payout — cap reached on ${dateKey}`,
              idempotencyKey: `roi_daily:${inv.id}:${dateKey}`,
            });
            return null;
          }

          await accrueAndSettle(tx, owner.id, credit, "daily_payout", {
            investmentId: inv.id,
            note: `ROI daily payout (${rate}% of ${inv.amount}) for ${dateKey}`,
            idempotencyKey: `roi_daily:${inv.id}:${dateKey}`,
          });

          // Level income: a share of THIS day's credit paid up to 20 levels of sponsors.
          const upline = await getUplineChain(tx, owner.id, tiers.length);
          const levelResults: { userId: string; amount: number }[] = [];
          for (let i = 0; i < upline.length; i++) {
            const level = i + 1;
            const tier = tiers.find((t) => t.level === level);
            if (!tier) continue;

            const [up] = await tx.select().from(users).where(eq(users.id, upline[i])).for("update");
            if (!up || up.status !== "active") continue;

            const levelWanted = (credit * Number(tier.percent)) / 100;
            const levelRoom = headroom(up, cfg.capMultiplier);
            const levelCredit = Math.min(levelWanted, levelRoom);
            if (levelCredit <= 0) continue;

            await accrueAndSettle(tx, up.id, levelCredit, "level_income", {
              counterpartyId: owner.id,
              investmentId: inv.id,
              level,
              note: `ROI level ${level} income (${tier.percent}% of downline's daily ROI) for ${dateKey}`,
              idempotencyKey: `roi_level:${inv.id}:${level}:${dateKey}`,
            });

            levelResults.push({ userId: up.id, amount: levelCredit });
          }

          return { ownerId: owner.id, credit, levelResults };
        }),
      );

      if (!paid) continue;
      dailyPaid += paid.credit;
      dailyRecipients++;
      notifyIds.add(paid.ownerId);
      for (const l of paid.levelResults) {
        levelPaid += l.amount;
        levelPayouts++;
        notifyIds.add(l.userId);
      }
    }
  }

  await Promise.all(
    [...notifyIds].map((uid) => publishEvent(uid, { type: "royalty_payout" }).catch(() => {})),
  );

  return {
    investmentsProcessed: investments.length,
    daysProcessed,
    dailyPaid,
    levelPaid,
    dailyRecipients,
    levelPayouts,
  };
}

export type RoiOverview = {
  settings: Awaited<ReturnType<typeof getRoiSettings>>;
  tiers: Awaited<ReturnType<typeof getRoiLevelTiers>>;
  me?: {
    invested: number;
    earned: number;
    tokenEarned: number;
    withdrawableBalance: number;
    cap: number;
    remaining: number;
    boosted: boolean;
    directTotal: number;
    dailyRatePercent: number;
    investments: { id: string; amount: number; active: boolean; createdAt: Date }[];
  };
};

export async function getRoiOverview(uid?: string): Promise<RoiOverview> {
  const [settings, tiers] = await Promise.all([getRoiSettings(), getRoiLevelTiers()]);

  let me: RoiOverview["me"];
  if (uid) {
    const [user] = await db.select().from(users).where(eq(users.id, uid));
    const myInvestments = await db
      .select()
      .from(roiInvestments)
      .where(eq(roiInvestments.userId, uid))
      .orderBy(asc(roiInvestments.createdAt));
    if (user) {
      const earned = Number(user.roiEarned);
      const tokenEarned = Number(user.roiTokenEarned);
      const cap = user.roiInvested * settings.capMultiplier;
      me = {
        invested: user.roiInvested,
        earned,
        tokenEarned,
        withdrawableBalance: user.roiWithdrawableBalance,
        cap,
        remaining: Math.max(0, cap - earned - tokenEarned),
        boosted: user.roiBoosted,
        directTotal: user.roiDirectTotal,
        dailyRatePercent: Number(user.roiBoosted ? settings.boostedDailyRoiPercent : settings.baseDailyRoiPercent),
        investments: myInvestments,
      };
    }
  }

  return { settings, tiers, me };
}

export type RoiInvestorRow = {
  id: string;
  name: string;
  serialNo: number;
  status: string;
  invested: number;
  earned: number;
  tokenEarned: number;
  cap: number;
  boosted: boolean;
  directTotal: number;
  investmentCount: number;
  sponsorId: string | null;
  sponsorName: string | null;
  activeInvestments: { id: string; amount: number }[];
};

/** Every user who has ever invested, with their cap/boost standing — for the admin overview table. */
export async function getRoiInvestorsOverview(): Promise<RoiInvestorRow[]> {
  const settings = await getRoiSettings();
  const sponsor = alias(users, "roi_sponsor");

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      serialNo: users.serialNo,
      status: users.status,
      invested: users.roiInvested,
      earned: users.roiEarned,
      tokenEarned: users.roiTokenEarned,
      boosted: users.roiBoosted,
      directTotal: users.roiDirectTotal,
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      investmentCount: sql<number>`(select count(*)::int from ${roiInvestments} where ${roiInvestments.userId} = ${users.id})`,
    })
    .from(users)
    .leftJoin(sponsor, eq(users.sponsorId, sponsor.id))
    .where(sql`${users.roiInvested} > 0`)
    .orderBy(sql`${users.roiInvested} desc`);

  if (rows.length === 0) return [];

  const activeInvRows = await db
    .select({ id: roiInvestments.id, userId: roiInvestments.userId, amount: roiInvestments.amount })
    .from(roiInvestments)
    .where(and(inArray(roiInvestments.userId, rows.map((r) => r.id)), eq(roiInvestments.active, true)))
    .orderBy(asc(roiInvestments.createdAt));
  const activeByUser = new Map<string, { id: string; amount: number }[]>();
  for (const r of activeInvRows) {
    const arr = activeByUser.get(r.userId) ?? [];
    arr.push({ id: r.id, amount: r.amount });
    activeByUser.set(r.userId, arr);
  }

  return rows.map((r) => ({
    ...r,
    earned: Number(r.earned),
    tokenEarned: Number(r.tokenEarned),
    cap: r.invested * settings.capMultiplier,
    activeInvestments: activeByUser.get(r.id) ?? [],
  }));
}

/** A user's direct referrals with their own ROI plan standing — "which directs, and their performance". */
export async function getRoiDirectsPerformance(uid: string) {
  const settings = await getRoiSettings();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      serialNo: users.serialNo,
      invested: users.roiInvested,
      earned: users.roiEarned,
      tokenEarned: users.roiTokenEarned,
      boosted: users.roiBoosted,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.sponsorId, uid))
    .orderBy(sql`${users.roiInvested} desc`);

  return rows.map((r) => ({ ...r, earned: Number(r.earned), tokenEarned: Number(r.tokenEarned), cap: r.invested * settings.capMultiplier }));
}

export type RoiActivityRow = { id: string; type: string; points: number; createdAt: Date };

/**
 * A user's ROI plan activity feed: investment debits (from the shared wallet
 * ledger) merged with every precise earning accrual (from roi_transactions).
 * Deliberately omits the internal whole-dollar settlement rows in the shared
 * ledger — those are the same money already shown here as accrual events,
 * just re-surfaced as a wallet transfer; showing both would double-count.
 */
export async function getMyRoiTransactions(uid: string, limit = 50): Promise<RoiActivityRow[]> {
  const [investmentRows, accrualRows] = await Promise.all([
    db
      .select({ id: transactions.id, type: transactions.type, points: transactions.points, createdAt: transactions.createdAt })
      .from(transactions)
      .where(and(eq(transactions.userId, uid), eq(transactions.type, "roi_investment")))
      .orderBy(desc(transactions.createdAt))
      .limit(limit),
    db
      .select({ id: roiTransactions.id, type: roiTransactions.type, points: roiTransactions.points, createdAt: roiTransactions.createdAt })
      .from(roiTransactions)
      .where(eq(roiTransactions.userId, uid))
      .orderBy(desc(roiTransactions.createdAt))
      .limit(limit),
  ]);

  const TYPE_MAP: Record<string, string> = {
    direct_income: "roi_direct_income",
    daily_payout: "roi_daily_payout",
    level_income: "roi_level_income",
  };

  const merged: RoiActivityRow[] = [
    ...investmentRows.map((r) => ({ id: r.id, type: r.type, points: r.points, createdAt: r.createdAt })),
    ...accrualRows.map((r) => ({ id: r.id, type: TYPE_MAP[r.type] ?? r.type, points: Number(r.points), createdAt: r.createdAt })),
  ];

  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}
