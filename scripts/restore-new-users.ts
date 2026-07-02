import "dotenv/config";
import { db, pool, schema } from "../src/db";
import { eq, asc, and, sql } from "drizzle-orm";

const { users, slots, transactions, slabCompletions, cryptoTransactions } = schema;

async function restore() {
  console.log("=== SCANNING FOR COMPLETED CRYPTO TRANSACTIONS ===");
  const completedCrypto = await db
    .select()
    .from(cryptoTransactions)
    .where(eq(cryptoTransactions.status, "completed"))
    .orderBy(asc(cryptoTransactions.createdAt));

  console.log(`Found ${completedCrypto.length} completed payments.`);

  const { enterSlab, chargeRegistration, post } = await import("../src/lib/distribution");

  for (const c of completedCrypto) {
    const [user] = await db.select().from(users).where(eq(users.id, c.userId));
    if (!user) {
      console.log(`Warning: User ${c.userId} not found.`);
      continue;
    }

    // Check if they are already active
    if (user.status === "active") {
      console.log(`User ${user.name} (Serial ${user.serialNo}) is already active.`);
      continue;
    }

    console.log(`Restoring activation for ${user.name} (Serial ${user.serialNo}) - Paid: ${c.amountPoints} pts at ${c.createdAt}`);

    await db.transaction(async (tx) => {
      // 1. Credit their deposit transaction first
      await post(tx, user.id, "usdt_deposit", c.amountPoints, {
        note: `USDT Activation Deposit (ID: ${c.paymentId})`,
        idempotencyKey: c.paymentId || undefined,
      });

      // 2. Run registration charges (debits 20 points)
      await chargeRegistration(tx, user.id);

      // 3. Run first-time slab 1 activation (debits 30 points)
      await enterSlab(tx, user.id, 1);
    });

    console.log(`Successfully activated ${user.name}.`);
  }

  // Final verification check
  const mismatch = await db.execute(sql`
    select u.id, u.name, u.points_balance,
           coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0) as ledger
    from ${users} u
    where u.points_balance <> coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0)
  `);

  if (mismatch.rows.length > 0) {
    console.error("❌ Integrity check failed: Balance mismatch detected!");
    console.error(mismatch.rows);
  } else {
    console.log("✅ INTEGRITY CHECK PASSED: All user balances match their transaction logs.");
  }

  await pool.end();
  process.exit(0);
}

restore().catch(console.error);
