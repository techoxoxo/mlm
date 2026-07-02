import "dotenv/config";
import { db, pool, schema } from "../src/db";
import { eq, asc, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const { users, slots, transactions, slabCompletions, cryptoTransactions } = schema;

// Setup backup path inside the script directory
const BACKUP_DIR = __dirname;
console.log(`Backup Directory: ${BACKUP_DIR}`);

async function rebuild() {
  console.log("\n=== LOADING EVENTS TO REPLAY ===");
  
  // Read users backup to get original activation times and details
  const origUsers = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, "users_backup.json"), "utf8")) as any[];
  
  // Get active users (who had activatedAt in the backup)
  const activeUsers = origUsers
    .filter((u) => u.activatedAt !== null)
    .sort((a, b) => new Date(a.activatedAt).getTime() - new Date(b.activatedAt).getTime());

  console.log(`Found ${activeUsers.length} activated users to replay.`);

  console.log("\n=== RESETTING MATRIX TABLES ===");
  await db.transaction(async (tx) => {
    // Truncate tables
    await tx.execute(sql`TRUNCATE TABLE ${slots} CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE ${transactions} CASCADE`);
    await tx.execute(sql`TRUNCATE TABLE ${slabCompletions} CASCADE`);

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

  console.log("Database reset complete.");

  // Import distribution engine to run placements
  const { enterSlab, chargeRegistration, post } = await import("../src/lib/distribution");

  console.log("\n=== REPLAYING DEPOSITS FROM BACKUP ===");
  // Re-load original deposits from backup
  const origTxs = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, "transactions_backup.json"), "utf8")) as any[];
  const deposits = origTxs
    .filter((t) => t.type === "usdt_deposit")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const dep of deposits) {
    await db.transaction(async (tx) => {
      await post(tx, dep.userId, "usdt_deposit", dep.points, {
        note: dep.note || "USDT Deposit",
        idempotencyKey: dep.idempotencyKey || undefined,
      });
    });
  }
  console.log(`All ${deposits.length} deposits credited.`);

  console.log("\n=== REPLAYING ACTIVATIONS IN ORDER ===");
  // Replay activations only. The upgrades will be triggered naturally by slot completions.
  for (let idx = 0; idx < activeUsers.length; idx++) {
    const u = activeUsers[idx];
    console.log(`[Activation ${idx+1}/${activeUsers.length}] Replaying for ${u.name} (${u.id.slice(0, 8)})`);

    await db.transaction(async (tx) => {
      // Run registration charges (debits 20 points)
      await chargeRegistration(tx, u.id);

      // Run first-time slab 1 activation (debits 30 points)
      await enterSlab(tx, u.id, 1);
    });
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

  const finalUsers = await db.select().from(users);

  console.log("\n=== BALANCE SHIFTS AUDIT ===");
  for (const ou of origUsers) {
    const fu = finalUsers.find((u) => u.id === ou.id);
    if (fu) {
      const diff = fu.pointsBalance - ou.pointsBalance;
      console.log(`User: ${ou.name.padEnd(12)} Old Balance: ${ou.pointsBalance.toString().padStart(5)} | New Balance: ${fu.pointsBalance.toString().padStart(5)} | Shift: ${diff >= 0 ? "+" + diff : diff}`);
    }
  }

  await pool.end();
  console.log("\n=== MATRIX REBUILD SUCCESSFULLY COMPLETED! ===");
  process.exit(0);
}

rebuild().catch((e) => {
  console.error("Rebuild failed:", e);
  process.exit(1);
});
