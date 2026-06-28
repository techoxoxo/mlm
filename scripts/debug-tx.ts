import "dotenv/config";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

async function main() {
  console.log("=== Database Debug Status ===");
  
  const transactions = await db
    .select()
    .from(schema.cryptoTransactions)
    .orderBy(desc(schema.cryptoTransactions.createdAt))
    .limit(5);
    
  console.log("\nRecent Crypto Transactions:");
  console.log(JSON.stringify(transactions, null, 2));

  const users = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      status: schema.users.status,
      pointsBalance: schema.users.pointsBalance
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt))
    .limit(5);

  console.log("\nRecent Users:");
  console.log(JSON.stringify(users, null, 2));
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
