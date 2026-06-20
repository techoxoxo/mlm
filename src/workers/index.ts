import "dotenv/config";
import { Worker } from "bullmq";
import { connection } from "@/lib/redis";
import {
  DISTRIBUTION_QUEUE,
  ROYALTY_QUEUE,
  ROYALTY_CRON,
  DistributionJob,
  ensureRoyaltySchedule,
  PAYMENT_CREDIT_QUEUE,
  PAYMENT_PAYOUT_QUEUE,
  PaymentCreditJob,
  PaymentPayoutJob,
} from "@/lib/queue";
import { activate, decideChoice, post } from "@/lib/distribution";
import { distributeRoyalty } from "@/lib/royalty";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { decrypt, hashWallet } from "@/lib/crypto";
import { createPayout } from "@/lib/nowpayments";
import { publishEvent } from "@/lib/events";

/**
 * The distribution worker. Concurrency > 1 is safe because slot assignment
 * uses FOR UPDATE SKIP LOCKED and every balance write locks its user row.
 */
const worker = new Worker<DistributionJob>(
  DISTRIBUTION_QUEUE,
  async (job) => {
    const data = job.data;
    switch (data.kind) {
      case "activate":
        return activate(data.userId);
      case "decide":
        return decideChoice(data.userId, data.choice);
      default:
        throw new Error(`Unknown job kind: ${(data as { kind: string }).kind}`);
    }
  },
  { connection, concurrency: 4 },
);

worker.on("completed", (job) => {
  console.log(`✓ ${job.name} ${job.id}`);
});
worker.on("failed", (job, err) => {
  console.error(`✗ ${job?.name} ${job?.id}: ${err.message}`);
});

// Royalty distribution worker (fired by the recurring schedule, or manually).
const royaltyWorker = new Worker(
  ROYALTY_QUEUE,
  async () => {
    const res = await distributeRoyalty();
    console.log(`✓ royalty distribution: rank ${res.rankDistributed}→${res.rankRecipients}, reserve ${res.reserveDistributed}→${res.reserveRecipients}`);
    return res;
  },
  { connection, concurrency: 1 },
);
royaltyWorker.on("failed", (job, err) => console.error(`✗ royalty ${job?.id}: ${err.message}`));

ensureRoyaltySchedule()
  .then(() => console.log(`Royalty schedule registered (cron "${ROYALTY_CRON}").`))
  .catch((e) => console.error("Failed to register royalty schedule:", e.message));

// Payment Credit Worker
const paymentCreditWorker = new Worker<PaymentCreditJob>(
  PAYMENT_CREDIT_QUEUE,
  async (job) => {
    const { userId, paymentId, amountPoints } = job.data;
    
    await db.transaction(async (tx) => {
      const [ctx] = await tx
        .select()
        .from(schema.cryptoTransactions)
        .where(eq(schema.cryptoTransactions.paymentId, paymentId))
        .for("update");
      
      if (ctx && ctx.status === "completed") {
        return;
      }

      if (ctx) {
        await tx
          .update(schema.cryptoTransactions)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(schema.cryptoTransactions.id, ctx.id));
      } else {
        await tx.insert(schema.cryptoTransactions).values({
          userId,
          type: "deposit",
          status: "completed",
          amountUsdt: (amountPoints * 1).toFixed(6),
          amountPoints,
          network: "unknown",
          paymentId,
          updatedAt: new Date(),
        });
      }

      await post(tx, userId, "usdt_deposit", amountPoints, {
        note: `USDT Deposit (ID: ${paymentId})`,
        idempotencyKey: `dep:${paymentId}`,
      });
    });

    await publishEvent(userId, { type: "payment_update", status: "completed" });
  },
  { connection, concurrency: 4 }
);
paymentCreditWorker.on("completed", (job) => console.log(`✓ credit ${job.id}`));
paymentCreditWorker.on("failed", (job, err) => console.error(`✗ credit ${job?.id}: ${err.message}`));

// Payment Payout Worker (Concurrency = 1)
const paymentPayoutWorker = new Worker<PaymentPayoutJob>(
  PAYMENT_PAYOUT_QUEUE,
  async (job) => {
    const { cryptoTxId } = job.data;
    
    const [ctx] = await db
      .select()
      .from(schema.cryptoTransactions)
      .where(eq(schema.cryptoTransactions.id, cryptoTxId));
      
    if (!ctx || (ctx.status !== "pending" && ctx.status !== "pending_admin_approval")) {
      return;
    }

    await db
      .update(schema.cryptoTransactions)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(schema.cryptoTransactions.id, cryptoTxId));

    if (!ctx.encryptedWalletAddress) {
      throw new Error(`Payout ${cryptoTxId} has no wallet address`);
    }

    let walletAddress = "";
    try {
      walletAddress = decrypt(ctx.encryptedWalletAddress);
    } catch (e) {
      console.error(`Failed to decrypt wallet address for payout ${cryptoTxId}`, e);
      await db
        .update(schema.cryptoTransactions)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(schema.cryptoTransactions.id, cryptoTxId));
      
      await db.transaction(async (tx) => {
        await post(tx, ctx.userId, "adjustment", ctx.amountPoints, {
          note: `Refund: Decryption failed for payout ${cryptoTxId}`,
        });
      });
      await publishEvent(ctx.userId, { type: "payment_update", status: "failed" });
      return;
    }

    try {
      const payoutRes = await createPayout(
        walletAddress,
        Number(ctx.amountUsdt),
        ctx.network
      );

      const withdrawal = payoutRes.withdrawals?.[0];
      const payoutId = payoutRes.id;
      const txHash = withdrawal?.txid ?? null;

      await db
        .update(schema.cryptoTransactions)
        .set({
          status: "completed",
          paymentId: payoutId,
          txHash,
          encryptedWalletAddress: null,
          hashedWalletAddress: hashWallet(walletAddress),
          updatedAt: new Date(),
        })
        .where(eq(schema.cryptoTransactions.id, cryptoTxId));

      await publishEvent(ctx.userId, { type: "payment_update", status: "completed" });
    } catch (apiError) {
      console.error(`NowPayments payout API error for payout ${cryptoTxId}:`, apiError);
      
      await db
        .update(schema.cryptoTransactions)
        .set({
          status: "failed",
          encryptedWalletAddress: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.cryptoTransactions.id, cryptoTxId));

      await db.transaction(async (tx) => {
        await post(tx, ctx.userId, "adjustment", ctx.amountPoints, {
          note: `Refund: NowPayments payout failed for transaction ${cryptoTxId}`,
        });
      });

      await publishEvent(ctx.userId, { type: "payment_update", status: "failed" });
    }
  },
  { connection, concurrency: 1 }
);
paymentPayoutWorker.on("completed", (job) => console.log(`✓ payout ${job.id}`));
paymentPayoutWorker.on("failed", (job, err) => console.error(`✗ payout ${job?.id}: ${err.message}`));

console.log("Distribution and Payment workers started. Waiting for jobs…");

const shutdown = async () => {
  console.log("Shutting down workers…");
  await Promise.all([
    worker.close(),
    royaltyWorker.close(),
    paymentCreditWorker.close(),
    paymentPayoutWorker.close(),
  ]);
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
