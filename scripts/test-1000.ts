import "dotenv/config";
import { db, pool, schema } from "@/db";
import { activate, decideChoice, chargeJoinFee, post } from "@/lib/distribution";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { and, eq, sql } from "drizzle-orm";

const { users, slots, transactions, slabCompletions, slabs, settings } = schema;

const N = Number(process.argv[2] ?? 1000);

// ---- tiny assert helpers ----
let checks = 0;
const fails: string[] = [];
function check(cond: boolean, label: string) {
  checks++;
  if (!cond) fails.push(label);
}
async function expectThrow(fn: () => Promise<unknown>, label: string) {
  checks++;
  try {
    await fn();
    fails.push(`expected throw but succeeded: ${label}`);
  } catch {
    /* expected */
  }
}

async function makeUser(i: number, sponsorId: string | null, pw: string) {
  return db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({
        name: `u${i}`,
        email: `u${i}-${Math.floor(performance.now() * 1000)}@t1k.local`,
        passwordHash: pw,
        sponsorId,
        referralCode: genReferralCode(),
        status: "registered",
      })
      .returning({ id: users.id });
    await chargeJoinFee(tx, u.id);
    return u.id;
  });
}

// weighted target tier — when a user's current slab >= target, they exit;
// tier-5 completers cash out fully. Spreads decisions across every tier.
function pickTarget(): number {
  const r = Math.random();
  if (r < 0.3) return 1;
  if (r < 0.6) return 2;
  if (r < 0.82) return 3;
  if (r < 0.95) return 4;
  return 5;
}

async function main() {
  const t0 = performance.now();
  console.log(`=== Full lifecycle test: ${N} users, built one-by-one ===\n`);

  // clean slate — TRUNCATE wipes any orphan rows left by prior runs too
  await db.execute(sql`truncate ${transactions}, ${slots}, ${slabCompletions} restart identity`);
  await db.delete(users).where(sql`role='user'`);
  // reset any surviving (admin) row's cached game state so it reconciles to the now-empty ledger
  await db
    .update(users)
    .set({ pointsBalance: 0, currentSlab: 0, pendingChoiceSlab: null, status: "active" });

  const [cfg] = await db.select().from(settings).where(eq(settings.id, 1));
  const slabRows = await db.select().from(slabs).orderBy(slabs.level);
  const maxLevel = Math.max(...slabRows.map((s) => s.level));
  const joinFee = cfg.joinFee;

  const pw = await hashPassword("test1234");
  const ids: string[] = [];
  const target = new Map<string, number>();

  // ---- Phase 1: register + activate, one user at a time ----
  console.log("Phase 1: registering & activating sequentially…");
  const tReg = performance.now();
  for (let i = 0; i < N; i++) {
    // ~25% are fresh roots, rest sponsored by a random earlier user (real tree)
    const sponsorId = ids.length && Math.random() > 0.25 ? ids[Math.floor(Math.random() * ids.length)] : null;
    const id = await makeUser(i, sponsorId, pw);
    ids.push(id);
    target.set(id, pickTarget());
    await activate(id); // registered → tier 1, fills oldest upline slot
    if ((i + 1) % 200 === 0) console.log(`  …${i + 1}/${N} activated`);
  }
  console.log(`  done in ${Math.round(performance.now() - tReg)}ms (${Math.round((N / (performance.now() - tReg)) * 1000)} users/s)\n`);

  // ---- Phase 2: drain decisions (upgrade toward target, else exit) ----
  console.log("Phase 2: draining upgrade/exit decisions…");
  let round = 0;
  let totalDecisions = 0;
  const counts = { exit: 0, upgrade: 0, completed: 0 };
  for (;;) {
    const pending = await db
      .select({ id: users.id, level: users.pendingChoiceSlab })
      .from(users)
      .where(sql`pending_choice_slab is not null and email like '%@t1k.local'`);
    if (pending.length === 0) break;
    round++;
    for (const p of pending) {
      const lvl = p.level!;
      const tgt = target.get(p.id) ?? 1;
      const isFinal = lvl >= maxLevel;
      const choice = lvl >= tgt || isFinal ? "exit" : "upgrade";
      const res = await decideChoice(p.id, choice as "exit" | "upgrade");
      totalDecisions++;
      if (res.choice === "exit") {
        counts.exit++;
        if (isFinal) counts.completed++;
      } else counts.upgrade++;
    }
    if (round > 5000) {
      fails.push("decision drain did not converge");
      break;
    }
  }
  console.log(`  ${totalDecisions} decisions over ${round} rounds → ${counts.upgrade} upgrades, ${counts.exit} exits (${counts.completed} full completions)\n`);

  // ---- Phase 2b: final-tier completion (full payout) ----
  // The top tier needs 32 fills per owner, which a random population can't
  // cascade to — so drive one user into the exact pre-decision state at the
  // final tier and run it through the REAL decideChoice engine.
  console.log("Phase 2b: final-tier completion / full payout…");
  const TOP_COLLECTED = 500;
  let finalId = "";
  await db.transaction(async (tx) => {
    const [f] = await tx
      .insert(users)
      .values({
        name: "topper",
        email: `topper-${Math.floor(performance.now() * 1000)}@t1k.local`,
        passwordHash: pw,
        referralCode: genReferralCode(),
        status: "active",
        currentSlab: maxLevel,
        pendingChoiceSlab: maxLevel,
      })
      .returning({ id: users.id });
    finalId = f.id;
    // credit collected points at the top tier (keeps balance == ledger)
    await post(tx, f.id, "slot_credit", TOP_COLLECTED, { slabLevel: maxLevel, note: "seed top tier" });
    await tx.insert(slabCompletions).values({ userId: f.id, slabLevel: maxLevel, collected: TOP_COLLECTED, status: "pending" });
  });
  const finalRes = await decideChoice(finalId, "exit"); // final tier → full payout
  const [topUser] = await db.select().from(users).where(eq(users.id, finalId));
  const [topComp] = await db
    .select()
    .from(slabCompletions)
    .where(and(eq(slabCompletions.userId, finalId), eq(slabCompletions.slabLevel, maxLevel)));
  check(finalRes.choice === "exit" && "payout" in finalRes && finalRes.payout === TOP_COLLECTED, "final tier pays full collected");
  check(topUser.status === "completed", "final-tier user marked completed");
  check(topUser.pendingChoiceSlab === null, "completed user has no pending choice");
  check(topComp.status === "exited" && topComp.payout === TOP_COLLECTED, "final completion records full payout");
  check(topUser.pointsBalance === TOP_COLLECTED, "completed balance keeps 100%");
  counts.completed++;
  console.log(`  topper completed at tier ${maxLevel}, full payout ${TOP_COLLECTED}\n`);

  // ---- Phase 3: edge-case / negative assertions ----
  console.log("Phase 3: edge-case assertions…");
  // double activation
  const anActive = (await db.select({ id: users.id }).from(users).where(sql`current_slab >= 1 and email like '%@t1k.local'`).limit(1))[0];
  if (anActive) await expectThrow(() => activate(anActive.id), "re-activate active user");
  // decide with no pending
  const noPending = (await db.select({ id: users.id }).from(users).where(sql`pending_choice_slab is null and current_slab >= 1 and email like '%@t1k.local'`).limit(1))[0];
  if (noPending) await expectThrow(() => decideChoice(noPending.id, "upgrade"), "decide with no pending choice");
  // activate a non-existent user
  await expectThrow(() => activate("00000000-0000-0000-0000-000000000000"), "activate missing user");
  console.log(`  edge cases done\n`);

  // ---- Phase 4: invariant suite (SQL) ----
  console.log("Phase 4: invariants…");
  const scalar = async (q: ReturnType<typeof sql>) => Number(((await db.execute(q)).rows[0] as { n: number }).n);

  check((await scalar(sql`select count(*)::int n from ${users} u where u.points_balance <> coalesce((select sum(points) from ${transactions} t where t.user_id=u.id),0)`)) === 0, "balance == ledger sum");

  check((await scalar(sql`select count(*)::int n from ${slots} where (status='filled' and (occupant_id is null or occupant_id=owner_id)) or (status='open' and occupant_id is not null)`)) === 0, "slot occupant integrity");

  // organic cohort only — the synthetic topper fixture is seeded with a credit
  // but no matching slot (it never built its matrix), so exclude it here
  check((await scalar(sql`
    with fills as (select owner_id, slab_level, count(*)::int n from ${slots} where status='filled' group by 1,2),
         credits as (select user_id, slab_level, count(*)::int n from ${transactions} where type='slot_credit' and user_id <> ${finalId} group by 1,2)
    select count(*)::int n from fills f full outer join credits c on c.user_id=f.owner_id and c.slab_level=f.slab_level
    where coalesce(f.n,0) <> coalesce(c.n,0)`)) === 0, "filled-slot count == slot_credit count");

  // non-final exits keep exit_percent%; final-tier completions keep 100%
  check((await scalar(sql`
    select count(*)::int n from ${slabCompletions} sc join ${slabs} sl on sl.level=sc.slab_level
    where sc.status='exited'
      and exists (select 1 from ${slabs} hi where hi.level = sc.slab_level + 1 and hi.active)
      and sc.payout <> sc.collected - floor(sc.collected*(100-sl.exit_percent)/100.0)`)) === 0, "exit payout math (non-final tiers)");
  check((await scalar(sql`
    select count(*)::int n from ${slabCompletions} sc
    where sc.status='exited'
      and not exists (select 1 from ${slabs} hi where hi.level = sc.slab_level + 1 and hi.active)
      and sc.payout <> sc.collected`)) === 0, "final-tier completion pays 100%");

  check((await scalar(sql`select count(*)::int n from ${users} where status in ('exited','completed') and pending_choice_slab is not null`)) === 0, "terminal users have no pending choice");

  check((await scalar(sql`select count(*)::int n from ${users} where pending_choice_slab is not null and not exists (select 1 from ${slabCompletions} sc where sc.user_id=${users.id} and sc.slab_level=${users.pendingChoiceSlab} and sc.status='pending')`)) === 0, "pending flag matches a pending completion");

  // tree integrity: no self-sponsor; every sponsor exists
  check((await scalar(sql`select count(*)::int n from ${users} where sponsor_id = id`)) === 0, "no self-sponsorship");
  check((await scalar(sql`select count(*)::int n from ${users} u where u.sponsor_id is not null and not exists (select 1 from ${users} s where s.id=u.sponsor_id)`)) === 0, "every sponsor exists");

  // each user owns exactly slab.slots open+filled rows for every level they entered
  check((await scalar(sql`
    with owned as (select owner_id, slab_level, count(*)::int n from ${slots} group by 1,2)
    select count(*)::int n from owned o join ${slabs} sl on sl.level=o.slab_level where o.n <> sl.slots`)) === 0, "each entered level has exactly slab.slots owned slots");

  // join fee charged exactly once per player (admin never registers, so scope to role=user)
  // synthetic topper is created directly (no registration), so exclude it
  check((await scalar(sql`select count(*)::int n from ${users} u where u.role='user' and u.id <> ${finalId} and (select count(*) from ${transactions} t where t.user_id=u.id and t.type='join_fee') <> 1`)) === 0, "exactly one join_fee per player");

  // referral bonuses: count == entries by sponsored users at levels with bonus>0
  check((await scalar(sql`
    with expected as (
      select count(*)::int n from ${transactions} t
      join ${users} u on u.id=t.user_id
      join ${slabs} sl on sl.level=t.slab_level
      where t.type in ('activation_fee','upgrade_fee') and u.sponsor_id is not null and sl.referral_bonus>0
    ), actual as (select count(*)::int n from ${transactions} where type='referral_bonus')
    select abs((select n from expected)-(select n from actual))::int n`)) === 0, "referral bonus count matches sponsored entries");

  console.log(`  ${checks} checks run\n`);

  // ---- report ----
  const byStatus = await db.select({ s: users.status, n: sql<number>`count(*)::int` }).from(users).where(sql`email like '%@t1k.local'`).groupBy(users.status);
  const bySlab = await db.select({ l: users.currentSlab, n: sql<number>`count(*)::int` }).from(users).where(sql`email like '%@t1k.local'`).groupBy(users.currentSlab).orderBy(users.currentSlab);
  const ledger = await db.select({ type: transactions.type, n: sql<number>`count(*)::int`, sum: sql<number>`sum(points)::int` }).from(transactions).groupBy(transactions.type);
  const [{ filled }] = await db.select({ filled: sql<number>`count(*) filter (where status='filled')::int` }).from(slots);

  console.log("Status:", byStatus.map((r) => `${r.s}=${r.n}`).join("  "));
  console.log("Highest slab reached:", bySlab.map((r) => `L${r.l}=${r.n}`).join("  "));
  console.log("Slots filled:", filled, " | join fee:", joinFee);
  console.log("\nLedger by type:");
  for (const l of ledger) console.log(`  ${l.type.padEnd(16)} n=${String(l.n).padStart(5)}  sum=${l.sum}`);

  console.log(`\nTotal wall time: ${Math.round(performance.now() - t0)}ms`);
  if (fails.length) {
    console.log(`\n❌ ${fails.length} FAILURE(S):\n  - ${fails.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`\n✅ ALL ${checks} CHECKS PASSED — full lifecycle clean across ${N} users`);
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
