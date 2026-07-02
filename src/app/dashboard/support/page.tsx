import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { CreateTicketForm } from "@/components/CreateTicketForm";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  payment: "Payment / Wallet",
  matrix: "Matrix & Placement",
  bug: "Technical Bug",
  other: "General Help",
};

function StatusChip({ status }: { status: string }) {
  let bg = "rgba(255,255,255,0.04)";
  let border = "rgba(255,255,255,0.1)";
  let text = "var(--muted)";

  if (status === "open") {
    bg = "rgba(239, 68, 68, 0.12)";
    border = "rgba(239, 68, 68, 0.25)";
    text = "#ef4444";
  } else if (status === "answered") {
    bg = "rgba(16, 185, 129, 0.12)";
    border = "rgba(16, 185, 129, 0.25)";
    text = "#10b981";
  } else if (status === "closed") {
    bg = "rgba(255,255,255,0.04)";
    border = "rgba(255,255,255,0.08)";
    text = "var(--faint)";
  }

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
        background: bg,
        border: `1px solid ${border}`,
        color: text,
      }}
    >
      {status}
    </span>
  );
}

export default async function SupportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const tickets = await db
    .select()
    .from(schema.supportTickets)
    .where(eq(schema.supportTickets.userId, session.uid))
    .orderBy(desc(schema.supportTickets.updatedAt));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, var(--surface) 70%)",
          border: "1px solid rgba(139,92,246,0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, margin: 0 }}>Support Center</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: "4px 0 0" }}>
            Got questions or issues? Create a ticket and our administration will assist you.
          </p>
        </div>
      </div>

      {/* Ticket creation component */}
      <CreateTicketForm />

      {/* Tickets List */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 17 }}>Your Support Tickets</h3>
        {tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
              You don&apos;t have any support tickets yet. Click the button above to open one.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Subject", "Category", "Status", "Last Update", "Action"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: i === 4 ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--faint)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      <Link href={`/dashboard/support/${t.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                        {t.subject}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13 }}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusChip status={t.status} />
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--faint)", fontSize: 12 }}>
                      {new Date(t.updatedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link href={`/dashboard/support/${t.id}`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12.5 }}>
                        View Conversation
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
