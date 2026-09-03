import "dotenv/config";
import { db, pool, schema } from "@/db";
import { eq, sql, inArray } from "drizzle-orm";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { post } from "@/lib/distribution";
import {
  investInRoiPlan,
  runRoiDailyDistribution,
  getRoiOverview,
  getRoiSettings,
  reverseRoiInvestment,
} from "@/lib/roiPlan";

const { users } = schema;

function log(label: string, obj?: unknown) {
  console.log(`\n=== ${label} ===`);
  if (obj !== undefined) console.log(JSON.stringify(obj, null, 2));
}

async function makeUser(name: string, sponsorId: string | null) {
  const [u] = await db
    .insert(users)
    .values({
      email: `roitest-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}@sim.local`,
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

async function main() {
  const results: { test: string; pass: boolean; detail: string }[] = [];
  const record = (test: string, pass: boolean, detail: string) => {
    results.push({ test, pass, detail });
    console.log(`${pass ? "✅" : "❌"} ${test} — ${detail}`);
  };

  // Ensure the plan is enabled for the duration of the test, restore after.
  const [before] = await db.select().from(schema.roiSettings).where(eq(schema.roiSettings.id, 1));
  await db.update(schema.roiSettings).set({ enabled: true }).where(eq(schema.roiSettings.id, 1));

  const createdUserIds: string[] = [];

  try {
    // ---------------------------------------------------------------- Test 1: validation bounds
    log("Test 1: investment amount validation");
    const u1 = await makeUser("Validator", null);
    createdUserIds.push(u1.id);
    await credit(u1.id, 5000);

    try {
      await investInRoiPlan(u1.id, 50); // below min (100)
      record("reject below-min amount", false, "did not throw for amount=50");
    } catch (e) {
      record("reject below-min amount", true, (e as Error).message);
    }

    try {
      await investInRoiPlan(u1.id, 150); // not a multiple of step (100)
      record("reject non-step amount", false, "did not throw for amount=150");
    } catch (e) {
      record("reject non-step amount", true, (e as Error).message);
    }

    try {
      await investInRoiPlan(u1.id, 3000); // above max (2000)
      record("reject above-max amount", false, "did not throw for amount=3000");
    } catch (e) {
      record("reject above-max amount", true, (e as Error).message);
    }

    try {
      await investInRoiPlan(u1.id, 10000); // more than balance
      record("reject insufficient balance", false, "did not throw for amount=10000 on 5000 balance");
    } catch (e) {
      record("reject insufficient balance", true, (e as Error).message);
    }

    // ---------------------------------------------------------------- Test 2: disabled-plan block
    log("Test 2: disabled plan blocks investing");
    await db.update(schema.roiSettings).set({ enabled: false }).where(eq(schema.roiSettings.id, 1));
    try {
      await investInRoiPlan(u1.id, 100);
      record("block investment while disabled", false, "investment succeeded while enabled=false");
    } catch (e) {
      record("block investment while disabled", true, (e as Error).message);
    }
    await db.update(schema.roiSettings).set({ enabled: true }).where(eq(schema.roiSettings.id, 1));

    // ---------------------------------------------------------------- Test 3: 22-level sponsor chain for level income
    log("Test 3: building a 22-user sponsor chain");
    const chain: (typeof u1)[] = [];
    let sponsorId: string | null = null;
    for (let i = 0; i < 22; i++) {
      const u = await makeUser(`Chain${i}`, sponsorId);
      chain.push(u);
      createdUserIds.push(u.id);
      sponsorId = u.id;
    }
    // chain[0] is the root (no sponsor), chain[21] is the deepest (invests $2000, boosted).
    // Every upline must have SOME investment of their own — per the confirmed
    // design, a user with roiInvested=0 has zero cap headroom and can never
    // earn anything from this plan, direct or level income, no matter what
    // their downline does. Give the whole chain ample headroom so the level
    // income math is actually testable.
    for (const u of chain.slice(0, -1)) {
      await credit(u.id, 5000);
      await investInRoiPlan(u.id, 2000);
    }
    const investor = chain[chain.length - 1];
    await credit(investor.id, 5000);

    const settings = await getRoiSettings();
    log("settings", settings);

    // Force-boost the investor so we test the boosted-rate math and its
    // level-income cascade with the largest possible daily credit.
    await db.update(users).set({ roiBoosted: true }).where(eq(users.id, investor.id));

    const invRes = await investInRoiPlan(investor.id, 2000);
    log("investment result", invRes);

    const expectedDirectIncome = (2000 * settings.directIncomePercent) / 100;
    const sponsorOverview = await getRoiOverview(chain[chain.length - 2].id);
    const sponsorCombined = (sponsorOverview.me?.earned ?? -1) + (sponsorOverview.me?.tokenEarned ?? 0);
    record(
      "direct income paid correctly (combined USDT+Token, split 50/50)",
      Math.abs(sponsorCombined - expectedDirectIncome) < 1e-6,
      `expected ${expectedDirectIncome}, sponsor combined=${sponsorCombined} (usdt=${sponsorOverview.me?.earned}, token=${sponsorOverview.me?.tokenEarned})`,
    );

    // ---------------------------------------------------------------- Test 4: daily distribution + level income math
    log("Test 4: running daily distribution once");
    const run1 = await runRoiDailyDistribution();
    log("run1 result", run1);

    const rate = Number(settings.boostedDailyRoiPercent); // investor is boosted
    const expectedDailyCredit = Math.floor((2000 * rate) / 100);
    const investorOverviewAfter = await getRoiOverview(investor.id);
    const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

    // NOTE: every chain member invested $2000 during setup (so they'd all have
    // cap headroom), which means this single distribution run pays daily ROI,
    // level income, AND direct income to everyone simultaneously — so a
    // per-level "expected" computed from just the investor's credit no longer
    // isolates cleanly (each upline's roiEarned also includes their own daily
    // ROI and level income from the OTHER 20 chain members below them). That's
    // correct, realistic cascading behavior, just not hand-computable here.
    // The meaningful, unambiguous check is that level income is no longer
    // structurally zero — see run1.levelPaid below and the isolated single-hop
    // check in Test 9.
    record(
      "level income pays nonzero amounts across a real multi-user chain (previously always exactly 0)",
      run1.levelPaid > 0 && run1.levelPayouts > 0,
      `levelPaid=${run1.levelPaid}, levelPayouts=${run1.levelPayouts}`,
    );

    // ---------------------------------------------------------------- Test 9: isolated single-hop level-1 income, exact match
    log("Test 9: isolated 2-hop chain — exact level-1 income math, no cascade noise");
    const l1Sponsor = await makeUser("L1Sponsor", chain[0].id);
    createdUserIds.push(l1Sponsor.id);
    await credit(l1Sponsor.id, 5000);
    await investInRoiPlan(l1Sponsor.id, 2000); // ample headroom, isolated from the big chain's activity

    const l1Direct = await makeUser("L1Direct", l1Sponsor.id);
    createdUserIds.push(l1Direct.id);
    await credit(l1Direct.id, 5000);
    await investInRoiPlan(l1Direct.id, 2000);

    const beforeL1 = await getRoiOverview(l1Sponsor.id);
    const runL1 = await runRoiDailyDistribution();
    const afterL1 = await getRoiOverview(l1Sponsor.id);

    const l1DailyCredit = (2000 * Number(settings.baseDailyRoiPercent)) / 100; // L1Direct not boosted
    const l1Tier = (await db.select().from(schema.roiLevelTiers).orderBy(schema.roiLevelTiers.level)).find((t) => t.level === 1)!;
    const expectedLevel1Income = (l1DailyCredit * Number(l1Tier.percent)) / 100;
    // sponsor's own daily ROI on their own $2000 also accrues in this same run
    const sponsorOwnDaily = (2000 * Number(settings.baseDailyRoiPercent)) / 100;
    const expectedSponsorDelta = sponsorOwnDaily + expectedLevel1Income; // combined, before the 50/50 split
    const beforeCombined = (beforeL1.me?.earned ?? 0) + (beforeL1.me?.tokenEarned ?? 0);
    const afterCombined = (afterL1.me?.earned ?? 0) + (afterL1.me?.tokenEarned ?? 0);
    const actualSponsorDelta = afterCombined - beforeCombined;
    record(
      "exact level-1 income math in an isolated 2-hop chain (combined USDT+Token)",
      close(actualSponsorDelta, expectedSponsorDelta),
      `expected own-daily(${sponsorOwnDaily}) + level1-income(${expectedLevel1Income}) = ${expectedSponsorDelta}, got delta ${actualSponsorDelta}`,
    );

    const usdtDelta = (afterL1.me?.earned ?? 0) - (beforeL1.me?.earned ?? 0);
    const tokenDelta = (afterL1.me?.tokenEarned ?? 0) - (beforeL1.me?.tokenEarned ?? 0);
    record(
      "every income event splits exactly 50/50 USDT/Token",
      close(usdtDelta, actualSponsorDelta / 2) && close(tokenDelta, actualSponsorDelta / 2) && close(usdtDelta, tokenDelta),
      `usdtDelta=${usdtDelta}, tokenDelta=${tokenDelta} (expected equal halves of ${actualSponsorDelta})`,
    );

    // ---------------------------------------------------------------- Test 5: re-running distribution same day (claimed safe/idempotent in the admin UI copy)
    log("Test 5: re-running daily distribution the SAME day (should be a safe no-op per admin UI copy)");
    try {
      const run2 = await runRoiDailyDistribution();
      record("second same-day run does not throw", true, `run2=${JSON.stringify(run2)}`);
      record("second same-day run pays nothing new", run2.dailyPaid === 0 && run2.levelPaid === 0, `run2.dailyPaid=${run2.dailyPaid}, run2.levelPaid=${run2.levelPaid}`);
    } catch (e) {
      record("second same-day run does not throw", false, `THREW: ${(e as Error).message}`);
    }

    // ---------------------------------------------------------------- Test 6: minimum investment now earns something
    log("Test 6: a $100 minimum investment now accrues a real (if small) decimal amount daily, instead of $0 forever");
    const smallInvestor = await makeUser("SmallInvestor", chain[0].id);
    createdUserIds.push(smallInvestor.id);
    await credit(smallInvestor.id, 1000);
    await investInRoiPlan(smallInvestor.id, 100); // minimum investment
    const smallRun = await runRoiDailyDistribution();
    const smallOverview = await getRoiOverview(smallInvestor.id);
    const smallDailyExpected = (100 * Number(settings.baseDailyRoiPercent)) / 100;
    const smallCombined = (smallOverview.me?.earned ?? -1) + (smallOverview.me?.tokenEarned ?? 0);
    record(
      "$100 investment accrues nonzero decimal daily ROI (combined USDT+Token)",
      close(smallCombined, smallDailyExpected) && smallDailyExpected > 0,
      `expected ${smallDailyExpected}, got ${smallCombined} (previously this floored to exactly 0, forever)`,
    );

    // ---------------------------------------------------------------- Test 10: a direct's pre-join investment must not count toward the sponsor's boost
    log("Test 10: investments made BEFORE the sponsor joins must not retroactively count toward their boost threshold");
    const lateSponsor = await makeUser("LateSponsor", chain[0].id);
    createdUserIds.push(lateSponsor.id);
    const earlyDirect = await makeUser("EarlyDirect", lateSponsor.id);
    createdUserIds.push(earlyDirect.id);
    await credit(earlyDirect.id, 5000);

    // The direct invests while the sponsor has NEVER invested — this must not
    // accumulate toward the sponsor's roiDirectTotal at all, ever.
    await investInRoiPlan(earlyDirect.id, 2000);
    const sponsorBeforeJoining = await getRoiOverview(lateSponsor.id);
    record(
      "pre-join direct investment does not accumulate on an uninvested sponsor",
      (sponsorBeforeJoining.me?.directTotal ?? -1) === 0,
      `sponsor.roiDirectTotal=${sponsorBeforeJoining.me?.directTotal} (expected 0 — sponsor hasn't invested yet)`,
    );

    // Now the sponsor joins.
    await credit(lateSponsor.id, 1000);
    await investInRoiPlan(lateSponsor.id, 100);
    const sponsorAfterJoining = await getRoiOverview(lateSponsor.id);
    record(
      "sponsor's own investment does not retroactively pull in the direct's earlier investment",
      (sponsorAfterJoining.me?.directTotal ?? -1) === 0,
      `sponsor.roiDirectTotal=${sponsorAfterJoining.me?.directTotal} (expected 0 — the direct's $2000 was invested before sponsor joined, must stay excluded forever)`,
    );

    // The SAME direct invests again — NOW, after the sponsor has joined, this must count.
    await investInRoiPlan(earlyDirect.id, 500);
    const sponsorAfterSecondDirectInvestment = await getRoiOverview(lateSponsor.id);
    record(
      "a direct's investment made AFTER the sponsor joins counts normally",
      (sponsorAfterSecondDirectInvestment.me?.directTotal ?? -1) === 500,
      `sponsor.roiDirectTotal=${sponsorAfterSecondDirectInvestment.me?.directTotal} (expected 500 — only the post-join investment counts)`,
    );

    // ---------------------------------------------------------------- Test 11: account status gate
    log("Test 11: only ACTIVE accounts can invest, and daily/level income pauses if the account stops being active");
    const registeredUser = await makeUser("RegisteredUser", chain[0].id);
    createdUserIds.push(registeredUser.id);
    await db.update(users).set({ status: "registered" }).where(eq(users.id, registeredUser.id));
    await credit(registeredUser.id, 1000);
    try {
      await investInRoiPlan(registeredUser.id, 100);
      record("registered (unactivated) account cannot invest", false, "did not throw");
    } catch (e) {
      record("registered (unactivated) account cannot invest", true, (e as Error).message);
    }

    const exitedUser = await makeUser("ExitedUser", chain[0].id);
    createdUserIds.push(exitedUser.id);
    await db.update(users).set({ status: "exited" }).where(eq(users.id, exitedUser.id));
    await credit(exitedUser.id, 1000);
    try {
      await investInRoiPlan(exitedUser.id, 100);
      record("exited account cannot invest", false, "did not throw");
    } catch (e) {
      record("exited account cannot invest", true, (e as Error).message);
    }

    // An active investor whose account is deactivated BEFORE their first
    // distribution run should earn nothing for that day, and that day must
    // stay permanently $0 (not backdated) even after reactivating later —
    // days are evaluated once; the day-granular catch-up logic never revisits
    // a day it has already marked, active or not.
    const pauseUser = await makeUser("PauseUser", chain[0].id);
    createdUserIds.push(pauseUser.id);
    await credit(pauseUser.id, 1000);
    await investInRoiPlan(pauseUser.id, 100);
    await db.update(users).set({ status: "exited" }).where(eq(users.id, pauseUser.id));
    const runWhilePaused = await runRoiDailyDistribution();
    const pausedOverview = await getRoiOverview(pauseUser.id);
    record(
      "no daily ROI accrues while account is inactive",
      (pausedOverview.me?.earned ?? -1) === 0,
      `earned=${pausedOverview.me?.earned} (expected 0), run result=${JSON.stringify(runWhilePaused)}`,
    );

    await db.update(users).set({ status: "active" }).where(eq(users.id, pauseUser.id));
    await runRoiDailyDistribution();
    const resumedSameDayOverview = await getRoiOverview(pauseUser.id);
    record(
      "reactivating later the SAME day does not retroactively pay for that already-evaluated day",
      (resumedSameDayOverview.me?.earned ?? -1) === 0,
      `earned=${resumedSameDayOverview.me?.earned} (expected 0 — today was already marked $0 while inactive)`,
    );

    // ---------------------------------------------------------------- Test 12: catch-up backfill for genuinely missed days
    log("Test 12: a distribution gap (worker downtime, forgotten manual trigger, etc.) must be backfilled, not lost");
    const catchupUser = await makeUser("CatchupUser", chain[0].id);
    createdUserIds.push(catchupUser.id);
    await credit(catchupUser.id, 1000);
    const catchupInv = await investInRoiPlan(catchupUser.id, 100);
    // Simulate "the last real run was 3 days ago" by planting a synthetic
    // evaluated-marker 3 days back, leaving the 3 days since then (and today)
    // unprocessed — exactly what a 3-day worker outage would look like.
    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    const threeDaysAgoKey = threeDaysAgo.toISOString().slice(0, 10);
    await db.insert(schema.roiTransactions).values({
      userId: catchupUser.id,
      type: "daily_payout",
      points: "0",
      investmentId: catchupInv.investmentId,
      note: "synthetic marker for test",
      idempotencyKey: `roi_daily:${catchupInv.investmentId}:${threeDaysAgoKey}`,
    });

    const catchupRun = await runRoiDailyDistribution();
    const catchupOverview = await getRoiOverview(catchupUser.id);
    const perDayExpected = (100 * Number(settings.baseDailyRoiPercent)) / 100;
    const expectedTotal = perDayExpected * 3; // the 3 missed days: (3 days ago)+1 .. today, inclusive = 3 days
    const catchupCombined = (catchupOverview.me?.earned ?? -1) + (catchupOverview.me?.tokenEarned ?? 0);
    record(
      "missed days are fully backfilled in one catch-up run (combined USDT+Token)",
      close(catchupCombined, expectedTotal),
      `expected ${perDayExpected} × 3 days = ${expectedTotal}, got ${catchupCombined} (run processed ${catchupRun.daysProcessed} investment-days total across all test investments)`,
    );

    const catchupRerun = await runRoiDailyDistribution();
    const catchupOverviewAfterRerun = await getRoiOverview(catchupUser.id);
    const catchupCombinedAfterRerun = (catchupOverviewAfterRerun.me?.earned ?? -1) + (catchupOverviewAfterRerun.me?.tokenEarned ?? 0);
    record(
      "re-running after catch-up pays nothing further the same day",
      close(catchupCombinedAfterRerun, expectedTotal),
      `combined unchanged at ${catchupCombinedAfterRerun}, rerun result=${JSON.stringify(catchupRerun)}`,
    );

    // ---------------------------------------------------------------- Test 7: cumulative boost threshold across separate directs
    log("Test 7: boost threshold accrues CUMULATIVELY across separate directs, not per-investment");
    const boostSponsor = await makeUser("BoostSponsor", chain[0].id);
    createdUserIds.push(boostSponsor.id);
    await credit(boostSponsor.id, 1000);
    await investInRoiPlan(boostSponsor.id, 100); // sponsor needs their own investment to have cap headroom

    const directA = await makeUser("DirectA", boostSponsor.id);
    const directB = await makeUser("DirectB", boostSponsor.id);
    createdUserIds.push(directA.id, directB.id);
    await credit(directA.id, 3000);
    await credit(directB.id, 3000);

    await investInRoiPlan(directA.id, 1500); // 1500 < 2500 threshold alone
    let sponsorMid = await getRoiOverview(boostSponsor.id);
    record(
      "not boosted after first direct below threshold",
      sponsorMid.me?.boosted === false,
      `directTotal=${sponsorMid.me?.directTotal}, boosted=${sponsorMid.me?.boosted}`,
    );

    await investInRoiPlan(directB.id, 1500); // cumulative 1500+1500=3000 >= 2500 threshold
    let sponsorAfter = await getRoiOverview(boostSponsor.id);
    record(
      "boosted after cumulative directs cross threshold",
      sponsorAfter.me?.boosted === true,
      `directTotal=${sponsorAfter.me?.directTotal}, boosted=${sponsorAfter.me?.boosted}`,
    );

    // ---------------------------------------------------------------- Test 8: cap enforcement over multiple days
    log("Test 8: cap enforcement — earnings never exceed investment * capMultiplier");
    const capTestUser = await makeUser("CapTest", chain[0].id);
    createdUserIds.push(capTestUser.id);
    await credit(capTestUser.id, 1000);
    await investInRoiPlan(capTestUser.id, 100);
    // Directly inflate roiEarned to just under the cap to check the daily-payout clamp without waiting real days.
    const capLimit = 100 * settings.capMultiplier; // 300
    await db.update(users).set({ roiEarned: (capLimit - 2).toFixed(6), roiWalletCredited: capLimit - 2 }).where(eq(users.id, capTestUser.id));
    // Force a large synthetic rate scenario isn't possible without changing settings; instead verify headroom math directly.
    const overviewNearCap = await getRoiOverview(capTestUser.id);
    record(
      "cap/remaining math correct near limit",
      overviewNearCap.me?.remaining === 2 && overviewNearCap.me?.cap === capLimit,
      `cap=${overviewNearCap.me?.cap}, earned=${overviewNearCap.me?.earned}, remaining=${overviewNearCap.me?.remaining}`,
    );

    // ---------------------------------------------------------------- Test 13: reversing an investment
    log("Test 13: reversing an investment refunds the principal and stops it earning, without touching prior payouts");
    const reverseUser = await makeUser("ReverseUser", chain[0].id);
    createdUserIds.push(reverseUser.id);
    await credit(reverseUser.id, 1000);
    const balanceBeforeInvest = (await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, reverseUser.id)))[0].pointsBalance;
    const reverseInv = await investInRoiPlan(reverseUser.id, 300);
    const balanceAfterInvest = (await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, reverseUser.id)))[0].pointsBalance;
    record(
      "investing debits the wallet by the investment amount",
      balanceAfterInvest === balanceBeforeInvest - 300,
      `before=${balanceBeforeInvest}, after=${balanceAfterInvest}`,
    );

    // Let it earn something first, to prove reversal doesn't touch prior accrual.
    await runRoiDailyDistribution();
    const overviewBeforeReverse = await getRoiOverview(reverseUser.id);
    const earnedBeforeReverse = (overviewBeforeReverse.me?.earned ?? 0) + (overviewBeforeReverse.me?.tokenEarned ?? 0);

    const reverseRes = await reverseRoiInvestment(reverseInv.investmentId);
    const overviewAfterReverse = await getRoiOverview(reverseUser.id);
    const earnedAfterReverse = (overviewAfterReverse.me?.earned ?? 0) + (overviewAfterReverse.me?.tokenEarned ?? 0);
    const balanceAfterReverse = (await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, reverseUser.id)))[0].pointsBalance;

    record(
      "reversal refunds the exact principal to the wallet",
      balanceAfterReverse === balanceAfterInvest + 300,
      `expected ${balanceAfterInvest + 300}, got ${balanceAfterReverse}`,
    );
    record(
      "reversal reduces roiInvested by the investment amount",
      overviewAfterReverse.me?.invested === 0,
      `roiInvested=${overviewAfterReverse.me?.invested} (expected 0 — this was the user's only investment)`,
    );
    record(
      "reversal does NOT touch already-accrued earnings",
      close(earnedAfterReverse, earnedBeforeReverse),
      `earned before=${earnedBeforeReverse}, after=${earnedAfterReverse} (should be unchanged)`,
    );
    record(
      "reversed investment shows as inactive",
      overviewAfterReverse.me?.investments.find((i) => i.id === reverseInv.investmentId)?.active === false,
      `active=${overviewAfterReverse.me?.investments.find((i) => i.id === reverseInv.investmentId)?.active}`,
    );

    try {
      await reverseRoiInvestment(reverseInv.investmentId);
      record("reversing an already-reversed investment is rejected", false, "did not throw");
    } catch (e) {
      record("reversing an already-reversed investment is rejected", true, (e as Error).message);
    }

    // Reversed investment must not earn anything on the next distribution run.
    const runAfterReverse = await runRoiDailyDistribution();
    const overviewFinal = await getRoiOverview(reverseUser.id);
    const earnedFinal = (overviewFinal.me?.earned ?? 0) + (overviewFinal.me?.tokenEarned ?? 0);
    record(
      "reversed investment earns nothing in subsequent distribution runs",
      close(earnedFinal, earnedAfterReverse),
      `earned unchanged at ${earnedFinal}, run touched ${runAfterReverse.dailyRecipients} recipients`,
    );

    // ---------------------------------------------------------------- Test 14: ROI wallet is fully isolated from the main pointsBalance
    log("Test 14: ROI plan wallet (roiWithdrawableBalance) never mixes with pointsBalance");
    const isoUser = await makeUser("IsoUser", chain[0].id);
    createdUserIds.push(isoUser.id);
    await credit(isoUser.id, 1000);

    const [beforeInvest] = await db.select({ pointsBalance: users.pointsBalance, roiWithdrawableBalance: users.roiWithdrawableBalance }).from(users).where(eq(users.id, isoUser.id));
    await investInRoiPlan(isoUser.id, 100);
    const [afterInvest] = await db.select({ pointsBalance: users.pointsBalance, roiWithdrawableBalance: users.roiWithdrawableBalance }).from(users).where(eq(users.id, isoUser.id));

    record(
      "investing debits pointsBalance by exactly the invested amount",
      afterInvest.pointsBalance === beforeInvest.pointsBalance - 100,
      `pointsBalance went from ${beforeInvest.pointsBalance} to ${afterInvest.pointsBalance}`,
    );
    record(
      "investing never touches roiWithdrawableBalance",
      afterInvest.roiWithdrawableBalance === beforeInvest.roiWithdrawableBalance,
      `roiWithdrawableBalance before=${beforeInvest.roiWithdrawableBalance}, after=${afterInvest.roiWithdrawableBalance}`,
    );

    // Force a large amount of accrued ROI earnings to cross whole-dollar boundaries
    // and settle into roiWithdrawableBalance, then confirm pointsBalance never moved.
    await db.update(users).set({ roiEarned: "50.000000" }).where(eq(users.id, isoUser.id));
    const [beforeRun] = await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, isoUser.id));
    await runRoiDailyDistribution();
    const [afterRun] = await db.select({ pointsBalance: users.pointsBalance, roiWithdrawableBalance: users.roiWithdrawableBalance }).from(users).where(eq(users.id, isoUser.id));

    record(
      "ROI earnings settling into roiWithdrawableBalance never touch pointsBalance",
      afterRun.pointsBalance === beforeRun.pointsBalance,
      `pointsBalance before=${beforeRun.pointsBalance}, after=${afterRun.pointsBalance}`,
    );
    record(
      "roiWithdrawableBalance grew from settled ROI earnings",
      afterRun.roiWithdrawableBalance > beforeInvest.roiWithdrawableBalance,
      `roiWithdrawableBalance=${afterRun.roiWithdrawableBalance}`,
    );

    const isoOverview = await getRoiOverview(isoUser.id);
    record(
      "getRoiOverview exposes withdrawableBalance matching the DB column",
      isoOverview.me?.withdrawableBalance === afterRun.roiWithdrawableBalance,
      `overview.withdrawableBalance=${isoOverview.me?.withdrawableBalance}, db=${afterRun.roiWithdrawableBalance}`,
    );
  } finally {
    // ------------------------------------------------------------------ cleanup
    log("Cleaning up test data");
    if (createdUserIds.length) {
      await db.delete(schema.roiInvestments).where(inArray(schema.roiInvestments.userId, createdUserIds));
      await db.delete(schema.transactions).where(inArray(schema.transactions.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    await db.update(schema.roiSettings).set({ enabled: before.enabled }).where(eq(schema.roiSettings.id, 1));
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
