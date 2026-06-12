import "dotenv/config";
import { db, pool, schema } from "@/db";
import { activate, decideChoice } from "@/lib/distribution";
import { genReferralCode, hashPassword } from "@/lib/auth";
import { eq, sql, and } from "drizzle-orm";

const { users, slots, transactions } = schema;

async function makeUser(name: string, sponsorId: string | null) {
  const [u] = await db
    .insert(users)
    .values({
      email: `${name}-${Math.floor(performance.now() * 1000)}@sim.local`,
      passwordHash: await hashPassword("x"),
      name,
      sponsorId,
      referralCode: genReferralCode(),
      status: "registered",
    })
    .returning();
  return u;
}

async function main() {
  console.log("=== Distribution simulation ===\n");

  // root user (no sponsor) activates first → owns the first open slots
  const root = await makeUser("root", null);
  await activate(root.id);

  // 30 members join, each sponsored by root, each activates into slab 1
  const members = [];
  for (let i = 1; i <= 30; i++) {
    const m = await makeUser(`m${i}`, root.id);
    members.push(m);
  }

  // Activate them concurrently to stress the FIFO / locking
  await Promise.all(members.map((m) => activate(m.id)));

  // As slabs complete, auto-upgrade everyone who can, a few rounds
  for (let round = 0; round < 4; round++) {
    const pending = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.pendingChoiceSlab} is not null`);
    if (pending.length === 0) break;
    await Promise.all(pending.map((p) => decideChoice(p.id, "upgrade").catch(() => {})));
  }

  // ---- integrity checks ----
  // 1) every slot filled by at most one occupant, no slot filled by its owner
  const dblFill = await db.execute(
    sql`select id from ${slots} where status='filled' and (occupant_id is null or occupant_id = owner_id)`,
  );
  // 2) cached balance equals ledger sum for every user
  const mismatch = await db.execute(sql`
    select u.id, u.points_balance,
           coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0) as ledger
    from ${users} u
    where u.points_balance <> coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0)
  `);

  const [{ count: filledCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(slots)
    .where(eq(slots.status, "filled"));

  const ledger = await db
    .select({ type: transactions.type, total: sql<number>`sum(${transactions.points})::int`, n: sql<number>`count(*)::int` })
    .from(transactions)
    .groupBy(transactions.type);

  const balances = await db
    .select({ name: users.name, slab: users.currentSlab, status: users.status, bal: users.pointsBalance })
    .from(users)
    .orderBy(sql`${users.pointsBalance} desc`)
    .limit(8);

  console.log("Top balances:");
  for (const b of balances) console.log(`  ${b.name.padEnd(6)} slab=${b.slab} ${b.status.padEnd(9)} balance=${b.bal}`);

  console.log("\nLedger by type:");
  for (const l of ledger) console.log(`  ${l.type.padEnd(16)} n=${String(l.n).padStart(4)}  sum=${l.total}`);

  console.log(`\nSlots filled: ${filledCount}`);
  console.log(`Integrity — bad fills: ${dblFill.rows.length}, balance/ledger mismatches: ${mismatch.rows.length}`);
  console.log(dblFill.rows.length === 0 && mismatch.rows.length === 0 ? "\n✅ INTEGRITY OK" : "\n❌ INTEGRITY FAILURE");

  await pool.end();
  // the shared Redis publisher (events) keeps the loop alive — exit explicitly
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
