"use server";

import { revalidatePath } from "next/cache";
import { eq, and, or, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { post } from "@/lib/distribution";
import { createInvoice, createPayout } from "@/lib/razcrypto";
import { encrypt, decrypt, hashWallet } from "@/lib/crypto";
import { enqueuePaymentPayout } from "@/lib/queue";
import { publishEvent } from "@/lib/events";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/ratelimit";
import { getUserWithdrawableDetailsTx } from "@/lib/queries";

const { cryptoTransactions, users } = schema;

export type ActionState<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

function safeRevalidate(path: string, type?: "layout" | "page") {
  try {
    revalidatePath(path, type);
  } catch {
    // Ignore static generation store missing error when run from CLI scripts
  }
}

/**
 * Require a logged-in user session.
 */
async function requireUser() {
  if ((global as any).mockSession) return (global as any).mockSession;
  const s = await getSession();
  if (!s || !s.uid) throw new Error("Unauthorized");
  return s;
}

/**
 * Require an admin session.
 */
async function requireAdmin() {
  if ((global as any).mockSession) return (global as any).mockSession;
  const s = await getSession();
  if (!s || s.role !== "admin") throw new Error("Forbidden");
  return s;
}

/** Best-effort IP capture — returns null outside of request context. */
async function safeClientIp(): Promise<string | null> {
  try {
    return await clientIp();
  } catch {
    return null;
  }
}

/**
 * Generates a unique USDT amount with a tiny fraction to prevent payment gateway collisions.
 * The fraction is between 0.000001 and 0.009999.
 */
async function generateUniqueAmount(baseAmount: number): Promise<number> {
  let uniqueAmount = baseAmount;
  let attempts = 0;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  while (attempts < 100) {
    const fraction = (Math.floor(Math.random() * 9999) + 1) / 1000000; // 0.000001 to 0.009999
    const candidate = parseFloat((baseAmount + fraction).toFixed(6));
    const [existing] = await db
      .select()
      .from(cryptoTransactions)
      .where(
        and(
          eq(cryptoTransactions.type, "deposit"),
          eq(cryptoTransactions.amountUsdt, candidate.toFixed(6)),
          or(
            eq(cryptoTransactions.status, "pending"),
            gt(cryptoTransactions.createdAt, oneHourAgo)
          )
        )
      )
      .limit(1);
    if (!existing) {
      uniqueAmount = candidate;
      break;
    }
    attempts++;
  }
  return uniqueAmount;
}

/**
 * Initiate a points purchase using NowPayments USDT (BEP-20).
 * amountUsdt is the amount of USDT the user wants to spend (minimum 10 USDT).
 */
export async function initiateDepositAction(amountUsdt: number): Promise<ActionState<{ payAddress: string; paymentId: string; amountUsdt: number; amountPoints: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    // Block unactivated users from depositing (they must use activation flow)
    const [caller] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    if (caller?.status === "registered") {
      return { ok: false, error: "Account not activated. Please complete activation payment first." };
    }

    if (amountUsdt < 1) {
      return { ok: false, error: "Minimum deposit amount is 1 USDT" };
    }

    // Rate: 1 USDT = 1 point. A 2% conversion buffer is deducted.
    // amountPoints = amountUsdt * 1 * 0.98
    const amountPoints = Math.floor(amountUsdt * 1 * 0.98);

    // Generate unique amount to prevent collisions
    const uniqueAmountUsdt = await generateUniqueAmount(amountUsdt);

    // orderId formatted for webhook parser: dep:${userId}:${amountPoints}:${timestamp}
    const orderId = `dep:${userId}:${amountPoints}:${Date.now()}`;

    // Create payment in RazCrypto using the unique amount
    const payment = await createInvoice(orderId, uniqueAmountUsdt, {
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
    });

    const ip = await safeClientIp();

    // Write pending row to database
    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: uniqueAmountUsdt.toFixed(6),
      amountPoints,
      network: "bep20",
      gateway: "razcrypto",
      paymentId: payment.payment_id,
      ipAddress: ip,
      updatedAt: new Date(),
    });

    return {
      ok: true,
      data: {
        payAddress: payment.checkout_page,
        paymentId: payment.payment_id,
        amountUsdt: payment.amount,
        amountPoints,
      },
    };
  } catch (error) {
    console.error("initiateDepositAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Request a withdrawal, converting virtual points to USDT BEP-20.
 * amountPoints is the amount of points the user wants to cash out (minimum 200 points = $20 base value).
 */
export async function requestWithdrawalAction(amountPoints: number, walletAddress: string, otp: string): Promise<ActionState<{ cryptoTxId: string; status: string; amountUsdt: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    // Block unactivated users from withdrawing
    const [caller] = await db.select({ status: users.status, email: users.email }).from(users).where(eq(users.id, userId));
    if (caller?.status === "registered") {
      return { ok: false, error: "Account not activated. Please complete activation payment first." };
    }

    const trimmedOtp = String(otp || "").trim();
    if (!trimmedOtp) {
      return { ok: false, error: "Verification code is required" };
    }

    const { connection } = await import("@/lib/redis");
    const savedOtp = await connection.get(`otp:${caller.email.toLowerCase()}`);
    if (!savedOtp || savedOtp !== trimmedOtp) {
      return { ok: false, error: "Invalid or expired verification code" };
    }

    // Purge the OTP to prevent reuse
    await connection.del(`otp:${caller.email.toLowerCase()}`);

    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress.startsWith("0x") || trimmedAddress.length !== 42) {
      return { ok: false, error: "Invalid USDT BEP-20 wallet address" };
    }

    // Minimum withdrawal threshold is 10 points ($10)
    if (amountPoints < 10) {
      return { ok: false, error: "Minimum withdrawal threshold is 10 points ($10)" };
    }

    // Rate: 1 point = 1 USDT. 5% withdrawal fee.
    const baseUsdt = amountPoints * 1;
    const feeAmount = baseUsdt * 0.05;
    const netUsdt = baseUsdt - feeAmount;

    // All withdrawals are auto-approved and queued for payout
    const status = "pending" as const;

    // Encrypt the target wallet address before database write
    const encryptedWalletAddress = encrypt(trimmedAddress);
    // Hash immediately for audit trail (before approval)
    const hashedWallet = hashWallet(trimmedAddress);

    const ip = await safeClientIp();

    const result = await db.transaction(async (tx) => {
      // 1) Lock user and check withdrawable balance
      const withdrawableDetails = await getUserWithdrawableDetailsTx(tx, userId);
      if (withdrawableDetails.withdrawablePoints < amountPoints) {
        throw new Error(`Insufficient withdrawable balance. You can only withdraw up to ${withdrawableDetails.withdrawablePoints} points.`);
      }

      // 2) Debit user points in lockstep
      await post(tx, userId, "usdt_withdrawal", -amountPoints, {
        note: `Withdrawal request of ${amountPoints} points`,
      });

      // 3) Create database record with hashed wallet from the start
      const [ctx] = await tx
        .insert(cryptoTransactions)
        .values({
          userId,
          type: "withdrawal",
          status,
          amountUsdt: netUsdt.toFixed(6),
          amountPoints,
          feeUsdt: feeAmount.toFixed(6),
          network: "bep20",
          gateway: "razcrypto",
          encryptedWalletAddress,
          hashedWalletAddress: hashedWallet,
          ipAddress: ip,
          updatedAt: new Date(),
        })
        .returning();

      return ctx;
    });

    // 4) Enqueue to the payout processor
    await enqueuePaymentPayout(result.id);

    safeRevalidate("/dashboard/transactions");

    return {
      ok: true,
      data: {
        cryptoTxId: result.id,
        status,
        amountUsdt: netUsdt,
      },
    };
  } catch (error) {
    console.error("requestWithdrawalAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Withdraw from the ROI plan's OWN isolated balance (roiWithdrawableBalance)
 * — deliberately separate from requestWithdrawalAction above, which debits
 * pointsBalance and applies the main plan's tier-based withdrawal-limit
 * rules. The ROI plan has no such rules; this only checks the ROI wallet
 * itself. The actual payout mechanics (OTP, wallet validation, fee, queueing
 * to the same payout worker) mirror the main withdrawal exactly — only the
 * balance being debited, and the ledger recording it, are different.
 */
export async function requestRoiWithdrawalAction(
  amountPoints: number,
  walletAddress: string,
  otp: string,
): Promise<ActionState<{ cryptoTxId: string; status: string; amountUsdt: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    const [caller] = await db.select({ status: users.status, email: users.email }).from(users).where(eq(users.id, userId));
    if (caller?.status === "registered") {
      return { ok: false, error: "Account not activated. Please complete activation payment first." };
    }

    const trimmedOtp = String(otp || "").trim();
    if (!trimmedOtp) {
      return { ok: false, error: "Verification code is required" };
    }

    const { connection } = await import("@/lib/redis");
    const savedOtp = await connection.get(`otp:${caller.email.toLowerCase()}`);
    if (!savedOtp || savedOtp !== trimmedOtp) {
      return { ok: false, error: "Invalid or expired verification code" };
    }
    await connection.del(`otp:${caller.email.toLowerCase()}`);

    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress.startsWith("0x") || trimmedAddress.length !== 42) {
      return { ok: false, error: "Invalid USDT BEP-20 wallet address" };
    }

    if (amountPoints < 10) {
      return { ok: false, error: "Minimum withdrawal threshold is $10" };
    }

    const baseUsdt = amountPoints * 1;
    const feeAmount = baseUsdt * 0.05;
    const netUsdt = baseUsdt - feeAmount;
    const status = "pending" as const;

    const encryptedWalletAddress = encrypt(trimmedAddress);
    const hashedWallet = hashWallet(trimmedAddress);
    const ip = await safeClientIp();

    const result = await db.transaction(async (tx) => {
      const [u] = await tx
        .select({ roiWithdrawableBalance: users.roiWithdrawableBalance })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      if (!u) throw new Error("User not found");
      if (u.roiWithdrawableBalance < amountPoints) {
        throw new Error(`Insufficient ROI plan balance. You can only withdraw up to $${u.roiWithdrawableBalance}.`);
      }

      await tx
        .update(users)
        .set({ roiWithdrawableBalance: sql`${users.roiWithdrawableBalance} - ${amountPoints}` })
        .where(eq(users.id, userId));

      const [ctx] = await tx
        .insert(cryptoTransactions)
        .values({
          userId,
          type: "withdrawal",
          source: "roi",
          status,
          amountUsdt: netUsdt.toFixed(6),
          amountPoints,
          feeUsdt: feeAmount.toFixed(6),
          network: "bep20",
          gateway: "razcrypto",
          encryptedWalletAddress,
          hashedWalletAddress: hashedWallet,
          ipAddress: ip,
          updatedAt: new Date(),
        })
        .returning();

      return ctx;
    });

    await enqueuePaymentPayout(result.id);
    safeRevalidate("/dashboard/roi-plan");

    return {
      ok: true,
      data: { cryptoTxId: result.id, status, amountUsdt: netUsdt },
    };
  } catch (error) {
    console.error("requestRoiWithdrawalAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Admin action to approve a pending manual withdrawal.
 */
export async function adminApprovePayoutAction(cryptoTxId: string): Promise<ActionState> {
  try {
    await requireAdmin();

    // Use FOR UPDATE to prevent race between two admins approving the same tx
    const [ctx] = await db
      .select()
      .from(cryptoTransactions)
      .where(and(eq(cryptoTransactions.id, cryptoTxId), eq(cryptoTransactions.status, "pending_admin_approval")))
      .for("update")
      .limit(1);

    if (!ctx) {
      return { ok: false, error: "Pending transaction not found or already processed" };
    }

    // Update status to pending
    await db
      .update(cryptoTransactions)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(cryptoTransactions.id, cryptoTxId));

    // Enqueue payout job
    await enqueuePaymentPayout(cryptoTxId);

    await logAudit({
      action: "approve_payout_queue",
      targetType: "crypto_transaction",
      targetId: cryptoTxId,
      before: { status: "pending_admin_approval" },
      after: { status: "pending" },
      note: `Re-queued withdrawal ${cryptoTxId} for payout processing`,
    });

    safeRevalidate("/admin/users");
    safeRevalidate("/dashboard/transactions");

    return { ok: true };
  } catch (error) {
    console.error("adminApprovePayoutAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Initiate the registration + activation payment (50 USDT) via NOWPayments Invoice.
 * Returns an invoice_url that redirects the user to NOWPayments hosted checkout.
 */
export async function initiateActivationDepositAction(): Promise<ActionState<{ invoiceUrl: string; invoiceId: string; amountUsdt: number; amountPoints: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return { ok: false, error: "User not found" };
    }
    if (user.status !== "registered") {
      return { ok: false, error: "Account is already active" };
    }

    // Dynamic fee computation from settings & slab 1
    const [cfg] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
    const [slab1] = await db.select().from(schema.slabs).where(eq(schema.slabs.level, 1));
    const idPinFee = cfg?.idPinFee ?? 10;
    const royaltyFee = cfg?.royaltyFee ?? 10;
    const activationFee = slab1?.fee ?? 30;
    const totalUsdt = idPinFee + royaltyFee + activationFee;

    const amountPoints = totalUsdt;

    // Generate unique amount to prevent collisions
    const uniqueAmountUsdt = await generateUniqueAmount(totalUsdt);

    const orderId = `act:${userId}:${amountPoints}:${Date.now()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invoice = await createInvoice(orderId, uniqueAmountUsdt, {
      successUrl: `${appUrl}/dashboard?payment=success`,
      cancelUrl: `${appUrl}/dashboard?payment=cancelled`,
    });

    const ip = await safeClientIp();

    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: uniqueAmountUsdt.toFixed(6),
      amountPoints,
      network: "bep20",
      gateway: "razcrypto",
      paymentId: invoice.payment_id,
      ipAddress: ip,
      updatedAt: new Date(),
    });

    return {
      ok: true,
      data: {
        invoiceUrl: invoice.checkout_page,
        invoiceId: invoice.payment_id,
        amountUsdt: uniqueAmountUsdt,
        amountPoints,
      },
    };
  } catch (error) {
    console.error("initiateActivationDepositAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Initiate a direct USDT payment for an ROI plan investment — for when the
 * user's wallet balance doesn't cover it. Uses the same unique-amount +
 * payment_id/orderId cross-verification safeguards as every other deposit
 * here, so a concurrent payment from someone else can never land in this
 * user's session/balance. On completion, the webhook credits the deposit and
 * invests it atomically (see investInRoiPlanTx) — never just a wallet top-up.
 */
export async function initiateRoiInvestDepositAction(
  amount: number,
): Promise<ActionState<{ invoiceUrl: string; invoiceId: string; amountUsdt: number; amount: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    const [caller] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    if (caller?.status === "registered") {
      return { ok: false, error: "Account not activated. Please complete activation payment first." };
    }
    if (caller?.status !== "active") {
      return { ok: false, error: "Your account is not active, so you can't invest in the ROI plan" };
    }

    const { getRoiSettings } = await import("@/lib/roiPlan");
    const cfg = await getRoiSettings();
    if (!cfg.enabled) {
      return { ok: false, error: "The ROI plan isn't open yet" };
    }
    if (!Number.isInteger(amount) || amount < cfg.minInvest || amount > cfg.maxInvest || amount % cfg.investStep !== 0) {
      return {
        ok: false,
        error: `Amount must be between ${cfg.minInvest} and ${cfg.maxInvest}, in multiples of ${cfg.investStep}`,
      };
    }

    const uniqueAmountUsdt = await generateUniqueAmount(amount);

    // orderId prefix "roi:" tells the webhook to invest the credited amount
    // (not just credit the wallet) — see razcrypto webhook route.
    const orderId = `roi:${userId}:${amount}:${Date.now()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invoice = await createInvoice(orderId, uniqueAmountUsdt, {
      successUrl: `${appUrl}/dashboard/roi-plan?payment=success`,
      cancelUrl: `${appUrl}/dashboard/roi-plan?payment=cancelled`,
    });

    const ip = await safeClientIp();

    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: uniqueAmountUsdt.toFixed(6),
      amountPoints: amount,
      network: "bep20",
      gateway: "razcrypto",
      paymentId: invoice.payment_id,
      ipAddress: ip,
      updatedAt: new Date(),
    });

    return {
      ok: true,
      data: {
        invoiceUrl: invoice.checkout_page,
        invoiceId: invoice.payment_id,
        amountUsdt: uniqueAmountUsdt,
        amount,
      },
    };
  } catch (error) {
    console.error("initiateRoiInvestDepositAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

export async function checkPaymentStatusAction(
  paymentId: string
): Promise<ActionState<{ status: string; actuallyPaid: number }>> {
  try {
    await requireUser();

    // In RazCrypto, we look up the transaction status from our database table (cryptoTransactions)
    // since webhook IPN/SSE already handles status updates in real-time.
    const [tx] = await db
      .select()
      .from(cryptoTransactions)
      .where(eq(cryptoTransactions.paymentId, paymentId))
      .limit(1);

    const status = tx?.status === "completed" ? "completed" : tx?.status || "pending";

    return {
      ok: true,
      data: {
        status,
        actuallyPaid: tx ? Number(tx.amountUsdt) : 0,
      },
    };
  } catch (error) {
    console.error("checkPaymentStatusAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Approve a pending withdrawal by assigning the transaction hash and marking it completed.
 */
export async function approveWithdrawalAction(
  cryptoTxId: string,
  txHash: string
): Promise<ActionState<void>> {
  try {
    const session = await requireAdmin();

    const trimmedHash = txHash.trim();
    if (!trimmedHash || trimmedHash.length < 10) {
      return { ok: false, error: "Please enter a valid Transaction Hash (TxID)" };
    }

    // Use FOR UPDATE to prevent two admins approving the same tx concurrently
    const result = await db.transaction(async (tx) => {
      const [ctx] = await tx
        .select()
        .from(cryptoTransactions)
        .where(eq(cryptoTransactions.id, cryptoTxId))
        .for("update")
        .limit(1);

      if (!ctx || ctx.type !== "withdrawal") {
        throw new Error("Withdrawal transaction not found");
      }

      if (ctx.status !== "pending_admin_approval" && ctx.status !== "pending") {
        throw new Error(`Transaction is already in status: ${ctx.status}`);
      }

      // Decrypt wallet for hashing, then clear the encrypted version
      let walletAddress = "";
      if (ctx.encryptedWalletAddress) {
        walletAddress = decrypt(ctx.encryptedWalletAddress);
      }

      await tx
        .update(cryptoTransactions)
        .set({
          status: "completed",
          txHash: trimmedHash,
          encryptedWalletAddress: null,
          hashedWalletAddress: walletAddress ? hashWallet(walletAddress) : ctx.hashedWalletAddress,
          approvedByAdminId: session.uid,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cryptoTransactions.id, cryptoTxId));

      return ctx;
    });

    await logAudit({
      action: "approve_withdrawal",
      targetType: "crypto_transaction",
      targetId: cryptoTxId,
      before: { status: result.status, amountUsdt: result.amountUsdt, amountPoints: result.amountPoints },
      after: { status: "completed", txHash: trimmedHash },
      note: `Approved withdrawal of ${result.amountUsdt} USDT (${result.amountPoints} points) for user ${result.userId}`,
    });

    await publishEvent(result.userId, { type: "payment_update", status: "completed" });
    safeRevalidate("/admin/payments");
    safeRevalidate("/dashboard/wallet");
    safeRevalidate("/dashboard/transactions");
    safeRevalidate("/", "layout");

    return { ok: true };
  } catch (error) {
    console.error("approveWithdrawalAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Reject a pending withdrawal, marking it failed and refunding the points back to the user balance.
 */
export async function rejectWithdrawalAction(
  cryptoTxId: string,
  reason?: string
): Promise<ActionState<void>> {
  try {
    const session = await requireAdmin();

    const result = await db.transaction(async (tx) => {
      // Use FOR UPDATE to prevent race conditions
      const [ctx] = await tx
        .select()
        .from(cryptoTransactions)
        .where(eq(cryptoTransactions.id, cryptoTxId))
        .for("update")
        .limit(1);

      if (!ctx || ctx.type !== "withdrawal") {
        throw new Error("Withdrawal transaction not found");
      }

      if (ctx.status !== "pending_admin_approval" && ctx.status !== "pending") {
        throw new Error(`Transaction is already in status: ${ctx.status}`);
      }

      // 1) Mark transaction as failed with rejection details
      await tx
        .update(cryptoTransactions)
        .set({
          status: "failed",
          encryptedWalletAddress: null,
          rejectedByAdminId: session.uid,
          rejectedAt: new Date(),
          rejectionReason: reason || "Rejected by admin",
          updatedAt: new Date(),
        })
        .where(eq(cryptoTransactions.id, cryptoTxId));

      // 2) Refund to whichever wallet this was debited from — pointsBalance
      // for a normal withdrawal, or the ROI plan's own isolated balance for
      // one sourced from there. Never mix the two.
      if (ctx.source === "roi") {
        await tx
          .update(users)
          .set({ roiWithdrawableBalance: sql`${users.roiWithdrawableBalance} + ${ctx.amountPoints}` })
          .where(eq(users.id, ctx.userId));
      } else {
        await post(tx, ctx.userId, "adjustment", ctx.amountPoints, {
          note: `Refund: Withdrawal rejected${reason ? ` — ${reason}` : ""}`,
          idempotencyKey: `refund:${cryptoTxId}`,
        });
      }

      return ctx;
    });

    await logAudit({
      action: "reject_withdrawal",
      targetType: "crypto_transaction",
      targetId: cryptoTxId,
      before: { status: result.status, amountUsdt: result.amountUsdt, amountPoints: result.amountPoints },
      after: { status: "failed", reason: reason || "Rejected by admin" },
      note: `Rejected withdrawal of ${result.amountUsdt} USDT for user ${result.userId}. ${result.amountPoints} points refunded.`,
    });

    await publishEvent(result.userId, { type: "payment_update", status: "failed" });
    safeRevalidate("/admin/payments");
    safeRevalidate("/dashboard/wallet");
    safeRevalidate("/dashboard/transactions");
    safeRevalidate("/", "layout");

    return { ok: true };
  } catch (error) {
    console.error("rejectWithdrawalAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}
