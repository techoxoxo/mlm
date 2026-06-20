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

  const usdtValue = (user.pointsBalance * 1).toFixed(2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* wallet header */}
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(248,198,23,0.07) 0%, rgba(12,11,7,0.85) 70%)",
          border: "1px solid rgba(248,198,23,0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, margin: "0 0 4px" }}>Crypto Wallet</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
            Deposit USDT to buy points · Cash out points to USDT (TRC-20)
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <span className="pill pill-gold mono" style={{ fontSize: 13.5 }}>
            ≈ ${usdtValue} USDT value
          </span>
          <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
            Rate: 1 pt = 1 USDT
          </span>
        </div>
      </div>

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
