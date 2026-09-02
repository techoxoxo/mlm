import "dotenv/config";
import { spawn, ChildProcess } from "child_process";
import { db, pool, schema } from "@/db";
import { eq, inArray, and } from "drizzle-orm";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { post } from "@/lib/distribution";
import { connection } from "@/lib/redis";

const { users } = schema;

const results: { test: string; pass: boolean; detail: string }[] = [];
function record(test: string, pass: boolean, detail: string) {
  results.push({ test, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${test} — ${detail}`);
}
function log(label: string, obj?: unknown) {
  console.log(`\n=== ${label} ===`);
  if (obj !== undefined) console.log(JSON.stringify(obj, null, 2));
}

async function makeUser(name: string, status: "active" | "registered", sponsorId: string | null = null) {
  const [u] = await db
    .insert(users)
    .values({
      email: `gwtest-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}@sim.local`,
      passwordHash: await hashPassword("x"),
      name,
      sponsorId,
      referralCode: genReferralCode(),
      status,
    })
    .returning();
  return u;
}

async function credit(userId: string, amount: number) {
  await db.transaction((tx) =>
    post(tx, userId, "usdt_deposit", amount, { note: "test funding", idempotencyKey: `gwtestfund:${userId}:${Date.now()}:${Math.random()}` }),
  );
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 15000, intervalMs = 250): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function sendWebhook(payload: Record<string, unknown>, signature = "mock_ipn_sig") {
  const { POST } = await import("@/app/api/webhooks/razcrypto/route");
  const req = new Request("http://localhost/api/webhooks/razcrypto", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razcrypto-signature": signature },
    body: JSON.stringify(payload),
  });
  return POST(req);
}

async function main() {
  const createdUserIds: string[] = [];
  let worker: ChildProcess | null = null;

  try {
    log("Booting a real worker process (npx tsx src/workers/index.ts)");
    worker = spawn("npx", ["tsx", "src/workers/index.ts"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let workerLog = "";
    worker.stdout?.on("data", (d) => (workerLog += d.toString()));
    worker.stderr?.on("data", (d) => (workerLog += d.toString()));
    const workerReady = await waitFor(async () => workerLog.includes("workers started"), 20000, 300);
    record("worker process boots successfully", workerReady, workerReady ? "saw startup log" : `timed out. log so far:\n${workerLog.slice(-2000)}`);
    if (!workerReady) throw new Error("worker did not start; aborting remaining tests");

    // Ensure ROI plan enabled for the duration.
    const [beforeRoiSettings] = await db.select().from(schema.roiSettings).where(eq(schema.roiSettings.id, 1));
    await db.update(schema.roiSettings).set({ enabled: true }).where(eq(schema.roiSettings.id, 1));

    // ================================================================ Test A: ROI investment via direct USDT payment, happy path
    log("Test A: ROI investment direct payment — happy path through the REAL webhook + REAL worker");
    const roiUser = await makeUser("RoiPayUser", "active");
    createdUserIds.push(roiUser.id);
    (global as any).mockSession = { uid: roiUser.id, role: "user" };

    const { initiateRoiInvestDepositAction } = await import("@/app/actions/payment");
    const invRes = await initiateRoiInvestDepositAction(200);
    log("invoice", invRes);
    record("invoice created for ROI investment", invRes.ok === true, JSON.stringify(invRes));

    if (invRes.ok) {
      const invData = invRes.data!;
      const orderIdMatch = new URL(invData.invoiceUrl.replace("undefined", "http://localhost")).searchParams.get("order_id");
      record("orderId embedded in invoice uses roi: prefix", !!orderIdMatch?.startsWith("roi:"), `orderId=${orderIdMatch}`);

      const webhookRes = await sendWebhook({
        payment_id: invData.invoiceId,
        status: "completed",
        amount: invData.amountUsdt.toString(),
        actually_paid: invData.amountUsdt.toString(),
        custom_data: { orderId: orderIdMatch },
      });
      record("webhook accepted (200)", webhookRes.status === 200, `status=${webhookRes.status}`);

      const settled = await waitFor(async () => {
        const [u] = await db.select({ roiInvested: users.roiInvested }).from(users).where(eq(users.id, roiUser.id));
        return u.roiInvested >= 200;
      });
      const [finalUser] = await db.select().from(users).where(eq(users.id, roiUser.id));
      const [ctx] = await db.select().from(schema.cryptoTransactions).where(eq(schema.cryptoTransactions.paymentId, invData.invoiceId));
      const [invRow] = await db.select().from(schema.roiInvestments).where(eq(schema.roiInvestments.userId, roiUser.id));

      record(
        "worker actually invested the credited amount (not just wallet top-up)",
        settled && finalUser.roiInvested === 200,
        `roiInvested=${finalUser.roiInvested}, cryptoTx.status=${ctx?.status}, investmentRow=${!!invRow}, pointsBalance=${finalUser.pointsBalance}`,
      );
      record(
        "crypto_transactions row marked completed",
        ctx?.status === "completed",
        `status=${ctx?.status}`,
      );
      record(
        "wallet balance net-zero after invest (credited then immediately invested)",
        finalUser.pointsBalance === 0,
        `pointsBalance=${finalUser.pointsBalance} (expected 0 — deposited 200, invested 200)`,
      );
    }

    // ================================================================ Test B: duplicate webhook delivery is a no-op
    log("Test B: duplicate webhook delivery for the same payment_id must not double-credit");
    const dupUser = await makeUser("DupUser", "active");
    createdUserIds.push(dupUser.id);
    (global as any).mockSession = { uid: dupUser.id, role: "user" };
    const dupInv = await initiateRoiInvestDepositAction(100);
    if (dupInv.ok) {
      const dupData = dupInv.data!;
      const orderId = new URL(dupData.invoiceUrl.replace("undefined", "http://localhost")).searchParams.get("order_id");
      const payload = {
        payment_id: dupData.invoiceId,
        status: "completed",
        amount: dupData.amountUsdt.toString(),
        actually_paid: dupData.amountUsdt.toString(),
        custom_data: { orderId },
      };
      await sendWebhook(payload);
      await waitFor(async () => {
        const [u] = await db.select({ roiInvested: users.roiInvested }).from(users).where(eq(users.id, dupUser.id));
        return u.roiInvested >= 100;
      });
      // Send the SAME webhook 3 more times in a row.
      await Promise.all([sendWebhook(payload), sendWebhook(payload), sendWebhook(payload)]);
      await new Promise((r) => setTimeout(r, 2000)); // let anything wrongly-enqueued settle
      const [dupFinal] = await db.select().from(users).where(eq(users.id, dupUser.id));
      const investCount = await db.select().from(schema.roiInvestments).where(eq(schema.roiInvestments.userId, dupUser.id));
      record(
        "repeated webhook deliveries do not double-invest",
        dupFinal.roiInvested === 100 && investCount.length === 1,
        `roiInvested=${dupFinal.roiInvested} (expected 100), investment rows=${investCount.length} (expected 1)`,
      );
    }

    // ================================================================ Test C: invalid signature is rejected
    log("Test C: invalid webhook signature must be rejected outright");
    const sigUser = await makeUser("SigUser", "active");
    createdUserIds.push(sigUser.id);
    (global as any).mockSession = { uid: sigUser.id, role: "user" };
    const sigInv = await initiateRoiInvestDepositAction(100);
    if (sigInv.ok) {
      const sigData = sigInv.data!;
      const orderId = new URL(sigData.invoiceUrl.replace("undefined", "http://localhost")).searchParams.get("order_id");
      const badRes = await sendWebhook(
        { payment_id: sigData.invoiceId, status: "completed", amount: sigData.amountUsdt.toString(), custom_data: { orderId } },
        "totally_wrong_signature",
      );
      record("bad signature rejected with 401", badRes.status === 401, `status=${badRes.status}`);
      await new Promise((r) => setTimeout(r, 1500));
      const [sigFinal] = await db.select().from(users).where(eq(users.id, sigUser.id));
      record("no crediting happened after rejected signature", sigFinal.roiInvested === 0 && sigFinal.pointsBalance === 0, `roiInvested=${sigFinal.roiInvested}, pointsBalance=${sigFinal.pointsBalance}`);
    }

    // ================================================================ Test D: cross-verification catches a wrong DB mapping
    log("Test D: webhook must trust the verified orderId payload over a mismatched DB record, not misattribute the payment");
    const rightUser = await makeUser("RightUser", "active");
    const wrongUser = await makeUser("WrongUser", "active");
    createdUserIds.push(rightUser.id, wrongUser.id);
    const fakePaymentId = `mock_raz_crosscheck_${Date.now()}`;
    const fakeOrderId = `dep:${rightUser.id}:50:${Date.now()}`;
    // Simulate a DB record that (hypothetically, via some bug elsewhere) got the WRONG userId.
    await db.insert(schema.cryptoTransactions).values({
      userId: wrongUser.id,
      type: "deposit",
      status: "pending",
      amountUsdt: "50.000000",
      amountPoints: 50,
      network: "bep20",
      gateway: "razcrypto",
      paymentId: fakePaymentId,
      updatedAt: new Date(),
    });
    await sendWebhook({
      payment_id: fakePaymentId,
      status: "completed",
      amount: "50",
      actually_paid: "50",
      custom_data: { orderId: fakeOrderId },
    });
    const crossSettled = await waitFor(async () => {
      const [ru] = await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, rightUser.id));
      return ru.pointsBalance >= 50;
    });
    const [rightFinal] = await db.select().from(users).where(eq(users.id, rightUser.id));
    const [wrongFinal] = await db.select().from(users).where(eq(users.id, wrongUser.id));
    record(
      "payment credited to the verified orderId user, not the mismatched DB row's user",
      crossSettled && rightFinal.pointsBalance === 50 && wrongFinal.pointsBalance === 0,
      `right.pointsBalance=${rightFinal.pointsBalance} (expected 50), wrong.pointsBalance=${wrongFinal.pointsBalance} (expected 0)`,
    );

    // ================================================================ Test E: ROI plan disabled mid-flight (after invoice, before webhook)
    log("Test E: what happens if admin disables the ROI plan AFTER an invoice was created but BEFORE payment completes");
    const midFlightUser = await makeUser("MidFlightUser", "active");
    createdUserIds.push(midFlightUser.id);
    (global as any).mockSession = { uid: midFlightUser.id, role: "user" };
    const midInv = await initiateRoiInvestDepositAction(100);
    if (midInv.ok) {
      const midData = midInv.data!;
      await db.update(schema.roiSettings).set({ enabled: false }).where(eq(schema.roiSettings.id, 1));
      const orderId = new URL(midData.invoiceUrl.replace("undefined", "http://localhost")).searchParams.get("order_id");
      await sendWebhook({
        payment_id: midData.invoiceId,
        status: "completed",
        amount: midData.amountUsdt.toString(),
        actually_paid: midData.amountUsdt.toString(),
        custom_data: { orderId },
      });
      await new Promise((r) => setTimeout(r, 3000));
      const [ctx] = await db.select().from(schema.cryptoTransactions).where(eq(schema.cryptoTransactions.paymentId, midData.invoiceId));
      const [mfUser] = await db.select().from(users).where(eq(users.id, midFlightUser.id));
      record(
        "REPORT ONLY — mid-flight disable behavior (not a pass/fail assertion, see summary)",
        true,
        `crypto_transactions.status=${ctx?.status}, user.pointsBalance=${mfUser.pointsBalance}, user.roiInvested=${mfUser.roiInvested}`,
      );
      await db.update(schema.roiSettings).set({ enabled: true }).where(eq(schema.roiSettings.id, 1));
    }
  } finally {
    if (worker) {
      worker.kill("SIGTERM");
    }
    log("Cleaning up test data");
    if (createdUserIds.length) {
      await db.delete(schema.roiTransactions).where(inArray(schema.roiTransactions.userId, createdUserIds));
      await db.delete(schema.roiInvestments).where(inArray(schema.roiInvestments.userId, createdUserIds));
      await db.delete(schema.transactions).where(inArray(schema.transactions.userId, createdUserIds));
      await db.delete(schema.cryptoTransactions).where(inArray(schema.cryptoTransactions.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    delete (global as any).mockSession;
  }

  log("SUMMARY");
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((f) => console.log(`  - ${f.test}: ${f.detail}`));
  }

  await connection.quit().catch(() => {});
  await pool.end();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await pool.end().catch(() => {});
  process.exit(1);
});
