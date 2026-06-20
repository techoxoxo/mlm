import "dotenv/config";
import { db, pool, schema } from "@/db";
import { eq } from "drizzle-orm";
import { initiateDepositAction, requestWithdrawalAction } from "@/app/actions/payment";
import { post } from "@/lib/distribution";
import { encrypt, decrypt, hashWallet } from "@/lib/crypto";
import { QueueEvents, Worker } from "bullmq";
import { connection } from "@/lib/redis";
import {
  PAYMENT_CREDIT_QUEUE,
  PAYMENT_PAYOUT_QUEUE,
  PaymentCreditJob,
  PaymentPayoutJob,
} from "@/lib/queue";
import { POST as webhookHandler } from "@/app/api/webhooks/nowpayments/route";
import { createHmac } from "crypto";
import { createPayout } from "@/lib/nowpayments";

async function main() {
  console.log("=== Starting NowPayments USDT Payment Integration Tests ===");

  // Set environment overrides for mock testing
  process.env.NOWPAYMENTS_API_KEY = "mock_api_key_for_testing";
  process.env.NOWPAYMENTS_IPN_SECRET = "mock_ipn_secret_for_testing";
  process.env.CRYPTO_ENCRYPTION_KEY = "e0f7f3da4b9a9d7d4c8e762b32943716a5b28d0176cddeba25e36f9011de3a09";

  // 1) Test Cryptographic Helpers
  console.log("\n1. Testing Cryptography...");
  const sampleWallet = "TY7R8sP1zE2g3B4H5K6N7Q8W9X0Z1Y2V3M";
  const encrypted = encrypt(sampleWallet);
  const decrypted = decrypt(encrypted);
  if (decrypted !== sampleWallet) {
    throw new Error("FAIL: Decrypted wallet does not match the source wallet");
  }
  console.log("  ✓ AES-256-GCM Encryption/Decryption verified");
  
  const hashed1 = hashWallet(sampleWallet);
  const hashed2 = hashWallet(sampleWallet + "   "); // Should handle trailing spaces
  if (hashed1 !== hashed2) {
    throw new Error("FAIL: Wallet hash normalization failed");
  }
  console.log("  ✓ Wallet hashing is normalized and deterministic");

  // 2) Find or create test user
  console.log("\n2. Setting up Test User...");
  const email = "test_payment_user@apex.demo";
  let user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({
        name: "Test Payment User",
        email,
        passwordHash: "dummyhash",
        referralCode: "TESTPAY",
        status: "registered",
        pointsBalance: 0,
      })
      .returning();
    console.log(`  ✓ Created test user (ID: ${user.id})`);
  } else {
    // Reset points balance to 0
    await db
      .update(schema.users)
      .set({ pointsBalance: 0 })
      .where(eq(schema.users.id, user.id));
    console.log(`  ✓ Found existing test user, reset points balance to 0`);
  }

  // Set global mockSession for server actions bypass
  (global as any).mockSession = {
    uid: user.id,
    role: "user",
    email: user.email,
  };

  // Instantiate QueueEvents to wait for background processing
  const creditEvents = new QueueEvents(PAYMENT_CREDIT_QUEUE, { connection });
  const payoutEvents = new QueueEvents(PAYMENT_PAYOUT_QUEUE, { connection });

  // 3) Start temporary workers to run inside the test process
  console.log("\n3. Launching temporary test workers...");
  
  // Payment Credit Worker
  const creditWorker = new Worker<PaymentCreditJob>(
    PAYMENT_CREDIT_QUEUE,
    async (job) => {
      const { userId, paymentId, amountPoints } = job.data;
      await db.transaction(async (tx) => {
        const [ctx] = await tx
          .select()
          .from(schema.cryptoTransactions)
          .where(eq(schema.cryptoTransactions.paymentId, paymentId))
          .for("update");
        
        if (ctx && ctx.status === "completed") return;

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
            amountUsdt: (amountPoints / 10).toFixed(6),
            amountPoints,
            network: "trc20",
            paymentId,
            updatedAt: new Date(),
          });
        }

        await post(tx, userId, "usdt_deposit", amountPoints, {
          note: `USDT Deposit (ID: ${paymentId})`,
          idempotencyKey: `dep:${paymentId}`,
        });
      });
    },
    { connection, concurrency: 1 }
  );

  // Payment Payout Worker
  const payoutWorker = new Worker<PaymentPayoutJob>(
    PAYMENT_PAYOUT_QUEUE,
    async (job) => {
      const { cryptoTxId } = job.data;
      const [ctx] = await db
        .select()
        .from(schema.cryptoTransactions)
        .where(eq(schema.cryptoTransactions.id, cryptoTxId));
        
      if (!ctx || ctx.status !== "pending") return;

      await db
        .update(schema.cryptoTransactions)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(schema.cryptoTransactions.id, cryptoTxId));

      if (!ctx.encryptedWalletAddress) throw new Error("No address");
      const walletAddress = decrypt(ctx.encryptedWalletAddress);

      try {
        const payoutRes = await createPayout(walletAddress, Number(ctx.amountUsdt), ctx.network);
        await db
          .update(schema.cryptoTransactions)
          .set({
            status: "completed",
            paymentId: payoutRes.id,
            txHash: payoutRes.withdrawals[0]?.txid || "mock_hash",
            encryptedWalletAddress: null,
            hashedWalletAddress: hashWallet(walletAddress),
            updatedAt: new Date(),
          })
          .where(eq(schema.cryptoTransactions.id, cryptoTxId));
      } catch (e) {
        await db
          .update(schema.cryptoTransactions)
          .set({ status: "failed", encryptedWalletAddress: null, updatedAt: new Date() })
          .where(eq(schema.cryptoTransactions.id, cryptoTxId));
        await db.transaction(async (tx) => {
          await post(tx, ctx.userId, "adjustment", ctx.amountPoints, { note: "Refund" });
        });
      }
    },
    { connection, concurrency: 1 }
  );

  // 4) Test Deposit Flow
  console.log("\n4. Testing Deposit Flow...");
  const depositAmountUsdt = 10; // $10 deposit yields 98 points
  const expectedPoints = 98;

  console.log("  a) Initiating deposit server action...");
  const depRes = await initiateDepositAction(depositAmountUsdt);
  if (!depRes.ok || !depRes.data) {
    throw new Error(`FAIL: initiateDepositAction failed: ${depRes.error}`);
  }
  const paymentId = depRes.data.paymentId;
  console.log(`    ✓ Deposit initiated. NowPayments ID: ${paymentId}`);

  // Construct mock Webhook (IPN) payload
  const webhookBody = {
    payment_id: paymentId,
    payment_status: "finished",
    order_id: `dep:${user.id}:${expectedPoints}`,
    actually_paid: depositAmountUsdt,
  };
  
  // Calculate signature
  const sortedPayload: Record<string, unknown> = {};
  Object.keys(webhookBody).sort().forEach((key) => {
    sortedPayload[key] = (webhookBody as any)[key];
  });
  const hmac = createHmac("sha512", "mock_ipn_secret_for_testing");
  hmac.update(JSON.stringify(sortedPayload));
  const signature = hmac.digest("hex");

  console.log("  b) Simulating IPN Webhook call...");
  const req = new Request("http://localhost/api/webhooks/nowpayments", {
    method: "POST",
    headers: {
      "x-nowpayments-sig": signature,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(webhookBody),
  });
  const webhookResponse = await webhookHandler(req);
  if (webhookResponse.status !== 200) {
    throw new Error(`FAIL: Webhook route returned error status: ${webhookResponse.status}`);
  }
  console.log("    ✓ Webhook accepted signature and enqueued job successfully");

  // Wait for the credit job to finish
  console.log("  c) Waiting for BullMQ credit worker to process...");
  await new Promise((resolve) => setTimeout(resolve, 1500)); // wait for job completion

  const [finalUser] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  if (finalUser.pointsBalance !== expectedPoints) {
    throw new Error(`FAIL: Points balance not updated. Expected ${expectedPoints}, got ${finalUser.pointsBalance}`);
  }
  console.log(`    ✓ Points balance successfully credited: ${finalUser.pointsBalance} pts`);

  const [dbTx] = await db
    .select()
    .from(schema.cryptoTransactions)
    .where(eq(schema.cryptoTransactions.paymentId, paymentId));
  if (dbTx.status !== "completed") {
    throw new Error(`FAIL: Database transaction status not completed. Got: ${dbTx.status}`);
  }
  console.log("    ✓ Database transaction record updated to status 'completed'");

  // 5) Test Withdrawal Flow
  console.log("\n5. Testing Withdrawal Flow...");
  
  console.log("  a) Testing insufficient points error validation...");
  const badWithdrawal = await requestWithdrawalAction(200, sampleWallet);
  if (badWithdrawal.ok) {
    throw new Error("FAIL: Withdrawal request should have failed due to insufficient points balance");
  }
  console.log("    ✓ Properly blocked insufficient balance cashout request");

  // Give user points directly to test payout
  console.log("  b) Crediting points to user to bypass balance check...");
  await db.transaction(async (tx) => {
    await post(tx, user.id, "adjustment", 500, { note: "Credit for withdrawal test" });
  });

  const [userAfterCredit] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  console.log(`    ✓ User balance now: ${userAfterCredit.pointsBalance} pts`);

  console.log("  c) Initiating valid withdrawal server action...");
  // Withdrawal: 200 points ($20 base). Net payout: 200/10 * 0.98 - 2 = 17.6 USDT
  const payoutRes = await requestWithdrawalAction(200, sampleWallet);
  if (!payoutRes.ok || !payoutRes.data) {
    throw new Error(`FAIL: Withdrawal request failed: ${payoutRes.error}`);
  }
  const cryptoTxId = payoutRes.data.cryptoTxId;
  console.log(`    ✓ Payout created. DB Record ID: ${cryptoTxId}. Net USDT: ${payoutRes.data.amountUsdt}`);

  // Assert points debited immediately
  const [userAfterWithdrawal] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  if (userAfterWithdrawal.pointsBalance !== userAfterCredit.pointsBalance - 200) {
    throw new Error(`FAIL: Points were not debited. Balance: ${userAfterWithdrawal.pointsBalance}`);
  }
  console.log(`    ✓ Points lock-step debit confirmed. Remaining: ${userAfterWithdrawal.pointsBalance} pts`);

  // Assert target wallet address is encrypted in DB
  const [dbPayoutTx] = await db
    .select()
    .from(schema.cryptoTransactions)
    .where(eq(schema.cryptoTransactions.id, cryptoTxId));
  if (!dbPayoutTx.encryptedWalletAddress || dbPayoutTx.encryptedWalletAddress.includes(sampleWallet)) {
    throw new Error(`FAIL: Wallet address is not securely encrypted in database. Value: ${dbPayoutTx.encryptedWalletAddress}`);
  }
  console.log("    ✓ Wallet address verified to be securely encrypted in database");

  // Wait for payout worker to execute
  console.log("  d) Waiting for BullMQ payout worker to process...");
  await new Promise((resolve) => setTimeout(resolve, 1500)); // wait for job completion

  const [dbPayoutFinal] = await db
    .select()
    .from(schema.cryptoTransactions)
    .where(eq(schema.cryptoTransactions.id, cryptoTxId));
  
  if (dbPayoutFinal.status !== "completed") {
    throw new Error(`FAIL: Payout transaction status not completed. Got: ${dbPayoutFinal.status}`);
  }
  console.log("    ✓ Payout worker executed successfully, status updated to 'completed'");

  // Assert wallet address is purged and hashed correctly
  if (dbPayoutFinal.encryptedWalletAddress !== null) {
    throw new Error(`FAIL: Wallet address was not purged from database after completion`);
  }
  console.log("    ✓ Plaintext encrypted address successfully purged from DB");

  const expectedHash = hashWallet(sampleWallet);
  if (dbPayoutFinal.hashedWalletAddress !== expectedHash) {
    throw new Error(`FAIL: Salted wallet hash does not match. Expected ${expectedHash}, got ${dbPayoutFinal.hashedWalletAddress}`);
  }
  console.log("    ✓ One-way salted hash correctly recorded in database");

  // 6) Cleanup and shutdown
  console.log("\n6. Cleaning up test artifacts...");
  // Delete mock transactions & user to keep DB clean
  await db.delete(schema.cryptoTransactions).where(eq(schema.cryptoTransactions.userId, user.id));
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  console.log("  ✓ Database cleaned");

  await creditWorker.close();
  await payoutWorker.close();
  await creditEvents.close();
  await payoutEvents.close();
  await pool.end();
  console.log("  ✓ Closed BullMQ workers and database connections");

  console.log("\n=== ALL USDT PAYMENT INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("\n✗ TEST RUN ENCOUNTERED AN ERROR:\n", e);
  process.exit(1);
});
