import "dotenv/config";
import { db, pool, schema } from "../src/db";
import { eq, asc, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const { users, slots, transactions, slabCompletions, cryptoTransactions, pools } = schema;

const BACKUP_DIR = __dirname;
console.log(`Backup Directory: ${BACKUP_DIR}`);

async function rebuild() {
  console.log("\n=== LOADING EVENTS TO REPLAY ===");
  
  // Read users backup to get original activation times and details (pre-11:00Z)
  const origUsers = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, "users_backup.json"), "utf8")) as any[];
  
  // Get active users from backup
  const backupActiveUsers = origUsers
    .filter((u) => u.activatedAt !== null)
    .sort((a, b) => new Date(a.activatedAt).getTime() - new Date(b.activatedAt).getTime());

  console.log(`Found ${backupActiveUsers.length} activated users from backup.`);

  console.log("\n=== RESETTING MATRIX AND POOLS TABLES ===");
  await db.transaction(async (tx) => {
    // Truncate tables
    await tx.execute(sql`TRUNCATE TABLE ${slots} CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE ${transactions} CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE ${slabCompletions} CASCADE`);

    // Reset royalty pool and reserve
    await tx
      .update(pools)
      .set({
        royaltyPool: 0,
        royaltyReserve: 0,
        updatedAt: sql`now()`,
      });

    // Reset users
    await tx
      .update(users)
      .set({
        pointsBalance: 0,
        currentSlab: 0,
        status: "registered",
        activatedAt: null,
      });
    
    // Set Administrator (serialNo 1) to active directly
    await tx
      .update(users)
      .set({ status: "active" })
      .where(eq(users.serialNo, 1));
  });

  console.log("Database and pools reset complete.");

  // Import distribution engine to run placements
  const { enterSlab, chargeRegistration, post } = await import("../src/lib/distribution");

  console.log("\n=== REPLAYING DEPOSITS FROM BACKUP ===");
  const origTxs = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, "transactions_backup.json"), "utf8")) as any[];
  const backupDeposits = origTxs
    .filter((t) => t.type === "usdt_deposit")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const dep of backupDeposits) {
    await db.transaction(async (tx) => {
      await post(tx, dep.userId, "usdt_deposit", dep.points, {
        note: dep.note || "USDT Deposit",
        idempotencyKey: dep.idempotencyKey || undefined,
      });
    });
  }
  console.log(`All ${backupDeposits.length} backup deposits credited.`);

  console.log("\n=== REPLAYING BACKUP ACTIVATIONS IN ORDER ===");
  // Replay activations from backup
  for (let idx = 0; idx < backupActiveUsers.length; idx++) {
    const u = backupActiveUsers[idx];
    console.log(`[Activation ${idx+1}/${backupActiveUsers.length}] Replaying for ${u.name} (${u.id.slice(0, 8)})`);

    await db.transaction(async (tx) => {
      await chargeRegistration(tx, u.id);
      await enterSlab(tx, u.id, 1);
    });
  }

  console.log("\n=== SCANNING AND REPLAYING NEW COMPLETED PAYMENTS ===");
  // Find completed crypto transactions not covered by backup
  const completedCrypto = await db
    .select()
    .from(cryptoTransactions)
    .where(eq(cryptoTransactions.status, "completed"))
    .orderBy(asc(cryptoTransactions.createdAt));

  for (const c of completedCrypto) {
    const [user] = await db.select().from(users).where(eq(users.id, c.userId));
    if (!user) continue;

    // If they were already activated during the backup replay, skip
    if (user.status === "active") {
      continue;
    }

    console.log(`Restoring payment & activation for ${user.name} (Serial ${user.serialNo}) - Paid: ${c.amountPoints} pts`);

    await db.transaction(async (tx) => {
      // 1. Credit their deposit
      await post(tx, user.id, "usdt_deposit", c.amountPoints, {
        note: `USDT Activation Deposit (ID: ${c.paymentId})`,
        idempotencyKey: c.paymentId || undefined,
      });

      // 2. Charge registration fee
      await chargeRegistration(tx, user.id);

      // 3. Enter slab 1
      await enterSlab(tx, user.id, 1);
    });

    console.log(`Successfully activated ${user.name}.`);
  }

  console.log("\n=== VERIFYING INTEGRITY ===");
  // Verify no user balance mismatch
  const mismatch = await db.execute(sql`
    select u.id, u.name, u.points_balance,
           coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0) as ledger
    from ${users} u
    where u.points_balance <> coalesce((select sum(points) from ${transactions} t where t.user_id = u.id),0)
  `);

  if (mismatch.rows.length > 0) {
    console.error("❌ Integrity check failed: Balance mismatch detected!");
    console.error(mismatch.rows);
    process.exit(1);
  }

  console.log("✅ INTEGRITY OK: No balance mismatches.");

  // Check royalty pool value
  const [currentPool] = await db.select().from(pools);
  console.log(`\nFinal Royalty Pool: ${currentPool.royaltyPool} points.`);
  console.log(`Final Royalty Reserve: ${currentPool.royaltyReserve} points.`);

  await pool.end();
  console.log("\n=== MATRIX REBUILD SUCCESSFULLY COMPLETED! ===");
  process.exit(0);
}

rebuild().catch((e) => {
  console.error("Rebuild failed:", e);
  process.exit(1);
});
