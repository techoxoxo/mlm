import "dotenv/config";
import { db, pool, schema } from "../src/db";
import { eq, asc, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const { users, slots, transactions, slabCompletions, cryptoTransactions } = schema;

// Setup backup path inside the script directory
const BACKUP_DIR = __dirname;
console.log(`Backup Directory: ${BACKUP_DIR}`);

async function backup() {
  console.log("=== CREATING DATABASE BACKUPS ===");
  const uData = await db.select().from(users);
  const sData = await db.select().from(slots);
  const tData = await db.select().from(transactions);
  const cData = await db.select().from(slabCompletions);
  const crData = await db.select().from(cryptoTransactions);

  fs.writeFileSync(path.join(BACKUP_DIR, "users_backup.json"), JSON.stringify(uData, null, 2));
  fs.writeFileSync(path.join(BACKUP_DIR, "slots_backup.json"), JSON.stringify(sData, null, 2));
  fs.writeFileSync(path.join(BACKUP_DIR, "transactions_backup.json"), JSON.stringify(tData, null, 2));
  fs.writeFileSync(path.join(BACKUP_DIR, "slabCompletions_backup.json"), JSON.stringify(cData, null, 2));
  fs.writeFileSync(path.join(BACKUP_DIR, "cryptoTransactions_backup.json"), JSON.stringify(crData, null, 2));
  console.log("Backup complete.");
}

async function rebuild() {
  await backup();

  console.log("\n=== LOADING EVENTS TO REPLAY ===");
  
  // 1. Get all users who have activated, ordered by activatedAt
  const activeUsers = await db
    .select()
    .from(users)
    .where(sql`${users.activatedAt} is not null`)
    .orderBy(asc(users.activatedAt));

  console.log(`Found ${activeUsers.length} activated users.`);

  // 2. Get all upgrade events from transactions
  const upgrades = await db
    .select()
    .from(transactions)
    .where(eq(transactions.type, "upgrade_fee"))
    .orderBy(asc(transactions.createdAt));

  console.log(`Found ${upgrades.length} upgrade events.`);

  // Combine events into a chronologically ordered array
  type MatrixEvent = 
    | { type: "activate"; userId: string; email: string; timestamp: Date }
    | { type: "upgrade"; userId: string; level: number; timestamp: Date };

  const events: MatrixEvent[] = [];

  for (const u of activeUsers) {
    if (u.activatedAt) {
      events.push({
        type: "activate",
        userId: u.id,
        email: u.email,
        timestamp: new Date(u.activatedAt),
      });
    }
  }

  for (const up of upgrades) {
    if (up.slabLevel) {
      events.push({
        type: "upgrade",
        userId: up.userId,
        level: up.slabLevel,
        timestamp: new Date(up.createdAt),
      });
    }
  }

  // Sort all events by timestamp
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  console.log(`Total events to replay: ${events.length}`);

  // Fetch all deposits to credit later
  const deposits = await db
    .select()
    .from(transactions)
    .where(eq(transactions.type, "usdt_deposit"))
    .orderBy(asc(transactions.createdAt));
  console.log(`Found ${deposits.length} deposits to credit.`);

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
    
    // Set Administrator (serialNo 1) to active directly if they do not have activatedAt
    await tx
      .update(users)
      .set({ status: "active" })
      .where(eq(users.serialNo, 1));
  });

  console.log("Database reset complete.");

  // Import distribution engine to run placements
  const { enterSlab, chargeRegistration, post } = await import("../src/lib/distribution");

  console.log("\n=== REPLAYING LEDGER & MATRIX IN ORDER ===");

  // Replay deposits first so users have balance to pay fees
  for (const dep of deposits) {
    await db.transaction(async (tx) => {
      await post(tx, dep.userId, "usdt_deposit", dep.points, {
        note: dep.note || "USDT Deposit",
        idempotencyKey: dep.idempotencyKey || undefined,
      });
    });
  }
  console.log("All deposits credited.");

  // Replay activations and upgrades
  for (let idx = 0; idx < events.length; idx++) {
    const ev = events[idx];
    console.log(`[Event ${idx+1}/${events.length}] Replaying ${ev.type} for ${ev.userId.slice(0, 8)} (${ev.type === "upgrade" ? "Slab " + ev.level : "Activation"})`);

    await db.transaction(async (tx) => {
      if (ev.type === "activate") {
        // Run registration charges (debits 20 points)
        await chargeRegistration(tx, ev.userId);

        // Run first-time slab 1 activation (debits 30 points)
        await enterSlab(tx, ev.userId, 1);
      } else {
        // Upgrade
        await enterSlab(tx, ev.userId, ev.level);
      }
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

  // Load original balances to compare
  const origUsers = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, "users_backup.json"), "utf8")) as any[];
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
