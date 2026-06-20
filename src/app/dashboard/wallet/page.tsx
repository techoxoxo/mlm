import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { WalletCard } from "@/components/WalletCard";
import { WalletTransactionsTable } from "@/components/WalletTransactionsTable";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Query fresh user points balance
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.uid),
  });
  if (!user) redirect("/logout");

  // Fetch recent crypto transactions
  const txs = await db
    .select()
    .from(schema.cryptoTransactions)
    .where(eq(schema.cryptoTransactions.userId, session.uid))
    .orderBy(desc(schema.cryptoTransactions.createdAt))
    .limit(100);

  // Identify any active pending deposit to preserve UI state (dynamic deposit address/QR)
  const activeDeposit = txs.find(
    (t) => t.type === "deposit" && t.status === "pending"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Interactive Actions Panel */}
      <WalletCard
        pointsBalance={user.pointsBalance}
        activeDeposit={activeDeposit}
      />

      {/* Transaction History Log */}
      <WalletTransactionsTable transactions={txs} />
    </div>
  );
}
