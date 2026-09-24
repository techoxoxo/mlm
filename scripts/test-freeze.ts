import "dotenv/config";
import { db, pool, schema } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { activate, post } from "@/lib/distribution";
import { investInRoiPlan, runRoiDailyDistribution, getRoiOverview } from "@/lib/roiPlan";
import { getRoyaltyOverview } from "@/lib/royalty";

const { users } = schema;

function log(label: string) {
  console.log(`\n=== ${label} ===`);
}

async function makeUser(name: string, sponsorId: string | null) {
  const [u] = await db
    .insert(users)
    .values({
      email: `freezetest-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}@sim.local`,
      passwordHash: await hashPassword("x"),
      name,
      sponsorId,
      referralCode: genReferralCode(),
      status: "active",
    })
    .returning();
  return u;
}

async function credit(userId: string, amount: number) {
  await db.transaction((tx) =>
    post(tx, userId, "usdt_deposit", amount, { note: "test funding", idempotencyKey: `testfund:${userId}:${Date.now()}:${Math.random()}` }),
  );
}

async function setFrozen(userId: string, frozen: boolean) {
  await db.update(users).set({ frozen, frozenAt: frozen ? new Date() : null }).where(eq(users.id, userId));
}

async function balanceOf(userId: string): Promise<number> {
  const [u] = await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, userId));
  return u.pointsBalance;
}

async function main() {
  const results: { test: string; pass: boolean; detail: string }[] = [];
  const record = (test: string, pass: boolean, detail: string) => {
    results.push({ test, pass, detail });
    console.log(`${pass ? "✅" : "❌"} ${test} — ${detail}`);
  };

  const [roiSettingsBefore] = await db.select().from(schema.roiSettings).where(eq(schema.roiSettings.id, 1));
  await db.update(schema.roiSettings).set({ enabled: true }).where(eq(schema.roiSettings.id, 1));

  const createdUserIds: string[] = [];

  try {
    // ---------------------------------------------------------------- Test 1: slot_credit + referral_bonus skipped for a frozen owner/sponsor
    log("Test 1: a frozen slot owner/sponsor forfeits slot_credit and referral_bonus (main plan)");
    const owner = await makeUser("FreezeOwner", null);
    createdUserIds.push(owner.id);
    await credit(owner.id, 1000);
    await activate(owner.id); // enters slab 1, opens their own slots as owner

    const entrant1 = await makeUser("FreezeEntrant1", owner.id);
    createdUserIds.push(entrant1.id);
    await credit(entrant1.id, 1000);

    await setFrozen(owner.id, true);
    const ownerBalanceBeforeEntrant1 = await balanceOf(owner.id);
    await activate(entrant1.id); // should fill owner's open slot, but owner is frozen
    const ownerBalanceAfterEntrant1 = await balanceOf(owner.id);

    record(
      "frozen owner gets no slot_credit/referral_bonus when their slot fills",
      ownerBalanceAfterEntrant1 === ownerBalanceBeforeEntrant1,
      `owner balance before=${ownerBalanceBeforeEntrant1}, after=${ownerBalanceAfterEntrant1} (expected unchanged)`,
    );

    await setFrozen(owner.id, false);
    const entrant2 = await makeUser("FreezeEntrant2", owner.id);
    createdUserIds.push(entrant2.id);
    await credit(entrant2.id, 1000);
    const ownerBalanceBeforeEntrant2 = await balanceOf(owner.id);
    await activate(entrant2.id); // owner unfrozen now — should pay normally if a slot is still open
    const ownerBalanceAfterEntrant2 = await balanceOf(owner.id);

    record(
      "unfrozen owner receives slot_credit/referral_bonus normally again",
      ownerBalanceAfterEntrant2 > ownerBalanceBeforeEntrant2,
      `owner balance before=${ownerBalanceBeforeEntrant2}, after=${ownerBalanceAfterEntrant2} (expected an increase)`,
    );

    // ---------------------------------------------------------------- Test 2: ROI plan — investing blocked while frozen
    log("Test 2: frozen accounts can't invest in the ROI plan");
    const roiUser = await makeUser("FreezeRoiUser", owner.id);
    createdUserIds.push(roiUser.id);
    await credit(roiUser.id, 1000);
    await setFrozen(roiUser.id, true);

    try {
      await investInRoiPlan(roiUser.id, 100);
      record("frozen account is rejected from ROI plan investing", false, "did not throw");
    } catch (e) {
      const msg = (e as Error).message;
      record("frozen account is rejected from ROI plan investing", msg.includes("frozen"), msg);
    }

    await setFrozen(roiUser.id, false);
    await investInRoiPlan(roiUser.id, 100);
    const roiOverviewAfterInvest = await getRoiOverview(roiUser.id);
    record(
      "unfrozen account can invest normally",
      roiOverviewAfterInvest.me?.invested === 100,
      `invested=${roiOverviewAfterInvest.me?.invested} (expected 100)`,
    );

    // ---------------------------------------------------------------- Test 3: ROI plan — daily distribution skips a frozen owner
    log("Test 3: daily distribution pays nothing to a frozen investor (marks the day evaluated, doesn't backdate later)");
    await setFrozen(roiUser.id, true);
    const earnedBeforeRun = (await getRoiOverview(roiUser.id)).me?.earned ?? -1;
    await runRoiDailyDistribution("admin");
    const earnedAfterRun = (await getRoiOverview(roiUser.id)).me?.earned ?? -1;
    record(
      "frozen investor earns nothing from today's distribution run",
      earnedAfterRun === earnedBeforeRun,
      `earned before=${earnedBeforeRun}, after=${earnedAfterRun} (expected unchanged)`,
    );

    await setFrozen(roiUser.id, false);

    // ---------------------------------------------------------------- Test 4: royalty — a frozen direct doesn't count toward their sponsor's directs
    log("Test 4: a frozen direct is excluded from their sponsor's royalty directs count");
    const royaltySponsor = await makeUser("FreezeRoyaltySponsor", null);
    createdUserIds.push(royaltySponsor.id);
    const royaltyDirect = await makeUser("FreezeRoyaltyDirect", royaltySponsor.id);
    createdUserIds.push(royaltyDirect.id);

    const overviewBefore = await getRoyaltyOverview(royaltySponsor.id);
    await setFrozen(royaltyDirect.id, true);
    const overviewAfterFreeze = await getRoyaltyOverview(royaltySponsor.id);
    record(
      "freezing a direct decreases the sponsor's counted directs by 1",
      (overviewAfterFreeze.me?.directs ?? -1) === (overviewBefore.me?.directs ?? -1) - 1,
      `before=${overviewBefore.me?.directs}, after freeze=${overviewAfterFreeze.me?.directs}`,
    );

    await setFrozen(royaltyDirect.id, false);
    const overviewAfterUnfreeze = await getRoyaltyOverview(royaltySponsor.id);
    record(
      "unfreezing restores the direct to the sponsor's count",
      overviewAfterUnfreeze.me?.directs === overviewBefore.me?.directs,
      `before=${overviewBefore.me?.directs}, after unfreeze=${overviewAfterUnfreeze.me?.directs}`,
    );
  } finally {
    log("Cleaning up test data");
    if (createdUserIds.length) {
      await db.delete(schema.roiInvestments).where(inArray(schema.roiInvestments.userId, createdUserIds));
      await db.delete(schema.roiTransactions).where(inArray(schema.roiTransactions.userId, createdUserIds));
      await db.delete(schema.transactions).where(inArray(schema.transactions.userId, createdUserIds));
      await db.delete(schema.slots).where(inArray(schema.slots.ownerId, createdUserIds));
      await db.delete(schema.slabCompletions).where(inArray(schema.slabCompletions.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    await db.update(schema.roiSettings).set({ enabled: roiSettingsBefore.enabled }).where(eq(schema.roiSettings.id, 1));
  }

  log("SUMMARY");
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("FAILED:");
    failed.forEach((f) => console.log(`  - ${f.test}: ${f.detail}`));
  }

  await pool.end();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  await pool.end();
  process.exit(1);
});
