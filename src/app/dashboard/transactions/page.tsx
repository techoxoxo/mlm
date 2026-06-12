import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  join_fee: "Join fee",
  activation_fee: "Activation",
  upgrade_fee: "Upgrade fee",
  slot_credit: "Slot credit",
  referral_bonus: "Referral bonus",
  exit_payout: "Exit payout",
  upgrade_take: "Upgrade take",
  company_fee: "House cut",
  adjustment: "Adjustment",
};

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tx = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, session.uid))
    .orderBy(desc(schema.transactions.createdAt))
    .limit(200);

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Transaction history</h3>
      {tx.length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No transactions yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ color: "var(--color-muted)", textAlign: "left", fontSize: 12 }}>
              <th style={{ padding: "6px 0" }}>Type</th>
              <th>Detail</th>
              <th style={{ textAlign: "right" }}>Points</th>
              <th style={{ textAlign: "right" }}>Balance</th>
              <th style={{ textAlign: "right" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {tx.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={{ padding: "10px 0" }}>
                  <span className="chip">{TYPE_LABEL[t.type] ?? t.type}</span>
                </td>
                <td style={{ color: "var(--color-muted)" }}>{t.note}</td>
                <td style={{ textAlign: "right", fontWeight: 700, color: t.points >= 0 ? "var(--color-success)" : "var(--color-muted)" }}>
                  {t.points >= 0 ? "+" : ""}
                  {t.points}
                </td>
                <td style={{ textAlign: "right" }}>{t.balanceAfter}</td>
                <td style={{ textAlign: "right", color: "var(--color-muted)", fontSize: 12 }}>
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
