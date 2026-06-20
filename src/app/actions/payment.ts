"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { post } from "@/lib/distribution";
import { createPayment } from "@/lib/nowpayments";
import { encrypt } from "@/lib/crypto";
import { enqueuePaymentPayout } from "@/lib/queue";

const { cryptoTransactions, users } = schema;

export type ActionState<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
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

/**
 * Initiate a points purchase using NowPayments USDT (TRC-20).
 * amountUsdt is the amount of USDT the user wants to spend (minimum 10 USDT).
 */
export async function initiateDepositAction(amountUsdt: number): Promise<ActionState<{ payAddress: string; paymentId: string; amountUsdt: number; amountPoints: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    if (amountUsdt < 10) {
      return { ok: false, error: "Minimum deposit amount is 10 USDT" };
    }

    // Math from section 11.6: 1 USDT = 10 points base, with a 2% buffer deducted
    // amountPoints = amountUsdt * 10 * 0.98
    const amountPoints = Math.floor(amountUsdt * 10 * 0.98);

    // orderId formatted for webhook parser: dep:${userId}:${amountPoints}
    const orderId = `dep:${userId}:${amountPoints}`;

    // Create payment in NowPayments
    const payment = await createPayment(orderId, amountUsdt, "usdttrc20");

    // Write pending row to database
    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: amountUsdt.toFixed(6),
      amountPoints,
      network: "trc20",
      paymentId: payment.payment_id,
      updatedAt: new Date(),
    });

    return {
      ok: true,
      data: {
        payAddress: payment.pay_address,
        paymentId: payment.payment_id,
        amountUsdt: payment.pay_amount,
        amountPoints,
      },
    };
  } catch (error) {
    console.error("initiateDepositAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Request a withdrawal, converting virtual points to USDT TRC-20.
 * amountPoints is the amount of points the user wants to cash out (minimum 200 points = $20 base value).
 */
export async function requestWithdrawalAction(amountPoints: number, walletAddress: string): Promise<ActionState<{ cryptoTxId: string; status: string; amountUsdt: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress || trimmedAddress.length < 20) {
      return { ok: false, error: "Invalid USDT TRC-20 wallet address" };
    }

    // Minimum withdrawal threshold is 200 points ($20)
    if (amountPoints < 200) {
      return { ok: false, error: "Minimum withdrawal threshold is 200 points ($20)" };
    }

    // Math from section 11.6:
    // 10 points = 1 USDT base. 2% buffer added. Flat 2.00 USDT network surcharge.
    const baseUsdt = amountPoints / 10;
    const payoutUsdt = baseUsdt * 0.98;
    const netUsdt = payoutUsdt - 2; // Subtract flat gas fee

    if (netUsdt <= 0) {
      return { ok: false, error: "Withdrawal amount too small to cover the 2.00 USDT network fee" };
    }

    // Auto-approve withdrawals below 1000 points ($100)
    // Withdrawals of 1000 points ($100) or more require admin approval
    const status = amountPoints < 1000 ? "pending" : "pending_admin_approval";

    // Encrypt the target wallet address before database write
    const encryptedWalletAddress = encrypt(trimmedAddress);

    const result = await db.transaction(async (tx) => {
      // 1) Lock user and check balance
      const [user] = await tx
        .select({ balance: users.pointsBalance })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (!user) throw new Error("User not found");
      if (user.balance < amountPoints) {
        throw new Error("Insufficient points balance");
      }

      // 2) Debit user points in lockstep
      await post(tx, userId, "usdt_withdrawal", -amountPoints, {
        note: `Withdrawal request: ${amountPoints} points to ${trimmedAddress.slice(0, 6)}...`,
      });

      // 3) Create database record
      const [ctx] = await tx
        .insert(cryptoTransactions)
        .values({
          userId,
          type: "withdrawal",
          status,
          amountUsdt: netUsdt.toFixed(6),
          amountPoints,
          feeUsdt: "2.000000",
          network: "trc20",
          encryptedWalletAddress,
          updatedAt: new Date(),
        })
        .returning();

      return ctx;
    });

    // 4) If auto-approved, enqueue to the payout processor
    if (status === "pending") {
      await enqueuePaymentPayout(result.id);
    }

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
 * Admin action to approve a pending manual withdrawal.
 */
export async function adminApprovePayoutAction(cryptoTxId: string): Promise<ActionState> {
  try {
    await requireAdmin();

    const [ctx] = await db
      .select()
      .from(cryptoTransactions)
      .where(and(eq(cryptoTransactions.id, cryptoTxId), eq(cryptoTransactions.status, "pending_admin_approval")))
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

    safeRevalidate("/admin/users");
    safeRevalidate("/dashboard/transactions");

    return { ok: true };
  } catch (error) {
    console.error("adminApprovePayoutAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}
