import "dotenv/config";
import { db, pool, schema } from "@/db";
import { activate, decideChoice } from "@/lib/distribution";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

const { users, slots, transactions, slabCompletions } = schema;

const N = 80;

async function main() {
  console.log(`=== Stress test: ${N} users, concurrent activations, random exit/upgrade ===\n`);
  const pw = await hashPassword("x");

  // batch-create users with random sponsors (referencing earlier batch members)
  const ids: string[] = [];
  const rows = Array.from({ length: N }, (_, i) => {
    const id = crypto.randomUUID();
    const sponsorId = ids.length && Math.random() > 0.2 ? ids[Math.floor(Math.random() * ids.length)] : null;
    ids.push(id);
    return {
      id,
      name: `s${i}`,
      email: `s${i}-${Math.floor(performance.now() * 1000)}@stress.local`,
      passwordHash: pw,
      sponsorId,
      referralCode: genReferralCode(),
      status: "registered" as const,
    };
  });
  await db.insert(users).values(rows);

  // all 80 activate concurrently
  const t0 = performance.now();
  await Promise.all(ids.map((id) => activate(id)));
  console.log(`Activated ${N} users concurrently in ${Math.round(performance.now() - t0)}ms`);

  // several rounds of decisions: ~50% exit, ~50% upgrade, all concurrent
  let exits = 0;
  let upgrades = 0;
  for (let round = 0; round < 5; round++) {
    const pending = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.pendingChoiceSlab} is not null and ${users.email} like '%@stress.local'`);
    if (!pending.length) break;
    await Promise.all(
      pending.map((p) => {
        const choice = Math.random() < 0.5 ? ("exit" as const) : ("upgrade" as const);
        return decideChoice(p.id, choice)
          .then((r) => {
            if (r.choice === "exit") exits++;
            else upgrades++;
          })
          .catch(() => {});
      }),
    );
  }
  console.log(`Decisions processed: ${exits} exits, ${upgrades} upgrades\n`);

  /* ---------------- invariants ---------------- */
  const fails: string[] = [];

  // 1. cached balance == ledger sum, every user
  const mism = await db.execute(sql`
    select count(*)::int n from ${users} u
    where u.points_balance <> coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0)
  `);
  const mismN = (mism.rows[0] as { n: number }).n;
  if (mismN > 0) fails.push(`${mismN} balance/ledger mismatches`);

  // 2. slot integrity: filled ⇒ has occupant ≠ owner; open ⇒ no occupant
  const badSlots = await db.execute(sql`
    select count(*)::int n from ${slots}
    where (status='filled' and (occupant_id is null or occupant_id = owner_id))
       or (status='open' and occupant_id is not null)
  `);
  const badSlotsN = (badSlots.rows[0] as { n: number }).n;
  if (badSlotsN > 0) fails.push(`${badSlotsN} corrupt slots`);

  // 3. every filled slot has exactly one matching slot_credit for its owner+level...
  //    (aggregate: filled slot count per (owner,level) == slot_credit count)
  const creditMismatch = await db.execute(sql`
    with fills as (
      select owner_id, slab_level, count(*)::int n
      from ${slots} where status='filled' group by 1,2
    ), credits as (
      select user_id, slab_level, count(*)::int n
      from ${transactions} where type='slot_credit' group by 1,2
    )
    select count(*)::int n from fills f
    full outer join credits c on c.user_id = f.owner_id and c.slab_level = f.slab_level
    where coalesce(f.n,0) <> coalesce(c.n,0)
  `);
  const creditN = (creditMismatch.rows[0] as { n: number }).n;
  if (creditN > 0) fails.push(`${creditN} fill/credit count mismatches`);

  // 4. exit accounting: forfeit == floor(collected * (100-exit%)/100) per exited completion
  const badExits = await db.execute(sql`
    select count(*)::int n
    from ${slabCompletions} sc
    join ${schema.slabs} sl on sl.level = sc.slab_level
    where sc.status = 'exited'
      and sc.payout <> sc.collected - floor(sc.collected * (100 - sl.exit_percent) / 100.0)
  `);
  const badExitsN = (badExits.rows[0] as { n: number }).n;
  if (badExitsN > 0) fails.push(`${badExitsN} exit payouts with wrong math`);

  // 5. exited users are out of the game: no pending choice, status exited
  const zombie = await db.execute(sql`
    select count(*)::int n from ${users}
    where status='exited' and pending_choice_slab is not null
  `);
  const zombieN = (zombie.rows[0] as { n: number }).n;
  if (zombieN > 0) fails.push(`${zombieN} exited users still pending`);

  // summary
  const byStatus = await db
    .select({ status: users.status, n: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`email like '%@stress.local'`)
    .groupBy(users.status);
  console.log("Final user states:", byStatus.map((r) => `${r.status}=${r.n}`).join(", "));

  const [{ filled }] = await db
    .select({ filled: sql<number>`count(*) filter (where status='filled')::int` })
    .from(slots);
  console.log(`Slots filled: ${filled}`);

  if (fails.length) {
    console.log("\n❌ FAILURES:\n  - " + fails.join("\n  - "));
    process.exitCode = 1;
  } else {
    console.log("\n✅ ALL INVARIANTS HOLD (ledger, slots, credits, exit math, lifecycle)");
  }

  await pool.end();
  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
