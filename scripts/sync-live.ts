import "dotenv/config";
import { execSync } from "child_process";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

// Live DB Connection string
const LIVE_DATABASE_URL = "postgresql://mlm_user:mlm@369@31.97.78.225:5432/mlm";

async function run() {
  console.log("=========================================");
  console.log("🚀 STARTING LIVE DB SCHEMA SYNC...");
  console.log("=========================================");

  try {
    // 1. Sync the schema using drizzle-kit push
    console.log("\n1. Running Drizzle Kit schema sync...");
    execSync(`DATABASE_URL="${LIVE_DATABASE_URL}" npx drizzle-kit push`, {
      stdio: "inherit",
    });
    console.log("✅ Live database schema synced successfully!");

    // 2. Setup connection for live data manipulation if needed
    console.log("\n2. Connecting to live database for data scripting...");
    const pool = new Pool({
      connectionString: LIVE_DATABASE_URL,
      max: 1,
    });
    const liveDb = drizzle(pool, { schema });

    console.log("✅ Connected to live database successfully!");

    // =========================================================================
    // WRITE YOUR CUSTOM LIVE DATA MANIPULATION SCRIPTS BELOW THIS LINE
    // Example:
    // await liveDb.update(schema.users).set({ status: 'active' }).where(eq(schema.users.id, '...'))
    // =========================================================================
    
    console.log("\nRunning custom data migrations...");
    // [Add any direct data fixes here if needed]
    console.log("✅ Data migrations complete!");

    await pool.end();
    console.log("\n=========================================");
    console.log("🎉 ALL TASKS COMPLETED SUCCESSFULLY!");
    console.log("=========================================");
  } catch (error) {
    console.error("\n❌ Error during sync/migration execution:", error);
    process.exit(1);
  }
}

run();
