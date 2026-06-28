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

const TYPE_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  slot_credit:     { bg: "rgba(248,198,23,0.1)",  border: "rgba(248,198,23,0.25)",  text: "var(--gold-bright)" },
  referral_bonus:  { bg: "rgba(111,195,247,0.1)", border: "rgba(111,195,247,0.25)", text: "#6fc3f7" },
  royalty_payout:  { bg: "rgba(232,138,255,0.1)", border: "rgba(232,138,255,0.25)", text: "#e88aff" },
  exit_payout:     { bg: "rgba(0,230,118,0.1)",   border: "rgba(0,230,118,0.25)",   text: "var(--success)" },
  upgrade_take:    { bg: "rgba(248,198,23,0.07)", border: "rgba(248,198,23,0.15)",  text: "var(--gold)" },
  join_fee:        { bg: "rgba(255,82,82,0.08)",  border: "rgba(255,82,82,0.2)",    text: "var(--danger)" },
  activation_fee:  { bg: "rgba(255,82,82,0.08)",  border: "rgba(255,82,82,0.2)",    text: "var(--danger)" },
  upgrade_fee:     { bg: "rgba(255,82,82,0.08)",  border: "rgba(255,82,82,0.2)",    text: "var(--danger)" },
  company_fee:     { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "var(--faint)" },
  adjustment:      { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "var(--muted)" },
};

function TypeChip({ type }: { type: string }) {
  const style = TYPE_COLOR[type] ?? { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)", text: "var(--muted)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        whiteSpace: "nowrap",
      }}
    >
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* summary header */}
      <div
        className="card"
        style={{
          padding: "22px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          background: "linear-gradient(135deg, rgba(248,198,23,0.05) 0%, var(--surface) 70%)",
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, margin: 0 }}>Transaction history</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: "4px 0 0" }}>
            {tx.length} records — all points in and out
          </p>
        </div>
        <div
          className="pill pill-gold mono"
          style={{ fontSize: 13, padding: "6px 16px" }}
        >
          {tx.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0).toLocaleString()} pts earned total
        </div>
      </div>

      {/* table card */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        {tx.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
              No transactions yet — activate to get started.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Type", "Detail", "Points", "Balance", "When"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 22px",
                      textAlign: i >= 2 ? "right" : "left",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--faint)",
                      background: "var(--bg-2)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tx.map((t, idx) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: idx % 2 === 0 ? "transparent" : "var(--bg-2)",
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "12px 22px" }}>
                    <TypeChip type={t.type} />
                  </td>
                  <td style={{ padding: "12px 22px", color: "var(--muted)", fontSize: 13, maxWidth: 260 }}>
                    {t.note ?? "—"}
                  </td>
                  <td
                    style={{
                      padding: "12px 22px",
                      textAlign: "right",
                      fontFamily: "var(--font-num)",
                      fontWeight: 700,
                      fontSize: 15,
                      color: t.points >= 0 ? "var(--gold-bright)" : "var(--danger)",
                    }}
                  >
                    {t.points >= 0 ? "+" : ""}
                    {t.points.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "12px 22px",
                      textAlign: "right",
                      fontFamily: "var(--font-num)",
                      fontSize: 13.5,
                      color: "var(--muted)",
                    }}
                  >
                    {t.balanceAfter.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "12px 22px",
                      textAlign: "right",
                      color: "var(--faint)",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
