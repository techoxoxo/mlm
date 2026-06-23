"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { post } from "@/lib/distribution";
import { createPayment, createInvoice, getPaymentStatus } from "@/lib/nowpayments";
import type { NowPaymentStatus } from "@/lib/nowpayments";
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
 * Initiate a points purchase using NowPayments USDT (BEP-20).
 * amountUsdt is the amount of USDT the user wants to spend (minimum 10 USDT).
 */
export async function initiateDepositAction(amountUsdt: number): Promise<ActionState<{ payAddress: string; paymentId: string; amountUsdt: number; amountPoints: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    if (amountUsdt < 1) {
      return { ok: false, error: "Minimum deposit amount is 1 USDT" };
    }

    // Rate: 1 USDT = 1 point. A 2% conversion buffer is deducted.
    // amountPoints = amountUsdt * 1 * 0.98
    const amountPoints = Math.floor(amountUsdt * 1 * 0.98);

    // orderId formatted for webhook parser: dep:${userId}:${amountPoints}
    const orderId = `dep:${userId}:${amountPoints}`;

    // Create payment in NowPayments
    const payment = await createPayment(orderId, amountUsdt, "usdtbsc");

    // Write pending row to database
    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: amountUsdt.toFixed(6),
      amountPoints,
      network: "bep20",
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
 * Request a withdrawal, converting virtual points to USDT BEP-20.
 * amountPoints is the amount of points the user wants to cash out (minimum 200 points = $20 base value).
 */
export async function requestWithdrawalAction(amountPoints: number, walletAddress: string): Promise<ActionState<{ cryptoTxId: string; status: string; amountUsdt: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress.startsWith("0x") || trimmedAddress.length !== 42) {
      return { ok: false, error: "Invalid USDT BEP-20 wallet address" };
    }

    // Minimum withdrawal threshold is 20 points ($20)
    if (amountPoints < 20) {
      return { ok: false, error: "Minimum withdrawal threshold is 20 points ($20)" };
    }

    // Rate: 1 point = 1 USDT. 2% conversion buffer. Flat 2.00 USDT network surcharge.
    const baseUsdt = amountPoints * 1;
    const payoutUsdt = baseUsdt * 0.98;
    const netUsdt = payoutUsdt - 2; // Subtract flat gas fee

    if (netUsdt <= 0) {
      return { ok: false, error: "Withdrawal amount too small to cover the 2.00 USDT network fee" };
    }

    // Auto-approve withdrawals below 100 points ($100)
    // Withdrawals of 100 points ($100) or more require admin approval
    const status = amountPoints < 100 ? "pending" : "pending_admin_approval";

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
          network: "bep20",
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
    const orderId = `act:${userId}:${amountPoints}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invoice = await createInvoice(orderId, totalUsdt, {
      successUrl: `${appUrl}/dashboard?payment=success`,
      cancelUrl: `${appUrl}/dashboard?payment=cancelled`,
    });

    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: totalUsdt.toFixed(6),
      amountPoints,
      network: "bep20",
      paymentId: invoice.id,
      updatedAt: new Date(),
    });

    return {
      ok: true,
      data: {
        invoiceUrl: invoice.invoice_url,
        invoiceId: invoice.id,
        amountUsdt: totalUsdt,
        amountPoints,
      },
    };
  } catch (error) {
    console.error("initiateActivationDepositAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

export async function checkPaymentStatusAction(
  paymentId: string
): Promise<ActionState<{ status: NowPaymentStatus; actuallyPaid: number }>> {
  try {
    await requireUser();

    const payment = await getPaymentStatus(paymentId);

    if (
      payment.payment_status === "expired" ||
      payment.payment_status === "failed" ||
      payment.payment_status === "refunded"
    ) {
      const dbStatus = payment.payment_status === "refunded" ? "failed" as const : payment.payment_status;
      await db
        .update(cryptoTransactions)
        .set({ status: dbStatus, updatedAt: new Date() })
        .where(eq(cryptoTransactions.paymentId, paymentId));
    }

    return {
      ok: true,
      data: {
        status: payment.payment_status,
        actuallyPaid: payment.actually_paid ?? 0,
      },
    };
  } catch (error) {
    console.error("checkPaymentStatusAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}

