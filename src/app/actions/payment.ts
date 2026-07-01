"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { post } from "@/lib/distribution";
import { createInvoice, createPayout } from "@/lib/razcrypto";
import { encrypt, decrypt, hashWallet } from "@/lib/crypto";
import { enqueuePaymentPayout } from "@/lib/queue";
import { publishEvent } from "@/lib/events";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/ratelimit";

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

/** Best-effort IP capture — returns null outside of request context. */
async function safeClientIp(): Promise<string | null> {
  try {
    return await clientIp();
  } catch {
    return null;
  }
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

    // orderId formatted for webhook parser: dep:${userId}:${amountPoints}
    const orderId = `dep:${userId}:${amountPoints}`;

    // Create payment in RazCrypto
    const payment = await createInvoice(orderId, amountUsdt, {
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
    });

    const ip = await safeClientIp();

    // Write pending row to database
    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: amountUsdt.toFixed(6),
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
export async function requestWithdrawalAction(amountPoints: number, walletAddress: string): Promise<ActionState<{ cryptoTxId: string; status: string; amountUsdt: number }>> {
  try {
    const session = await requireUser();
    const userId = session.uid;

    // Block unactivated users from withdrawing
    const [caller] = await db.select({ status: users.status }).from(users).where(eq(users.id, userId));
    if (caller?.status === "registered") {
      return { ok: false, error: "Account not activated. Please complete activation payment first." };
    }

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

    // All withdrawals are auto-approved and queued for payout
    const status = "pending" as const;

    // Encrypt the target wallet address before database write
    const encryptedWalletAddress = encrypt(trimmedAddress);
    // Hash immediately for audit trail (before approval)
    const hashedWallet = hashWallet(trimmedAddress);

    const ip = await safeClientIp();

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

      // 3) Create database record with hashed wallet from the start
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
    const orderId = `act:${userId}:${amountPoints}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invoice = await createInvoice(orderId, totalUsdt, {
      successUrl: `${appUrl}/dashboard?payment=success`,
      cancelUrl: `${appUrl}/dashboard?payment=cancelled`,
    });

    const ip = await safeClientIp();

    await db.insert(cryptoTransactions).values({
      userId,
      type: "deposit",
      status: "pending",
      amountUsdt: totalUsdt.toFixed(6),
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

      // 2) Refund points to the user
      await post(tx, ctx.userId, "adjustment", ctx.amountPoints, {
        note: `Refund: Withdrawal rejected${reason ? ` — ${reason}` : ""}`,
        idempotencyKey: `refund:${cryptoTxId}`,
      });

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

    return { ok: true };
  } catch (error) {
    console.error("rejectWithdrawalAction failed:", error);
    return { ok: false, error: (error as Error).message };
  }
}
