import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ReportsManager } from "@/components/ReportsManager";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const allTxs = await db
    .select({
      id: schema.transactions.id,
      points: schema.transactions.points,
      balanceAfter: schema.transactions.balanceAfter,
      type: schema.transactions.type,
      note: schema.transactions.note,
      createdAt: schema.transactions.createdAt,
      userName: schema.users.name,
      userSerial: schema.users.serialNo,
    })
    .from(schema.transactions)
    .innerJoin(schema.users, eq(schema.users.id, schema.transactions.userId))
    .orderBy(desc(schema.transactions.createdAt))
    .limit(2000);

  return <ReportsManager initialTransactions={allTxs} />;
}
