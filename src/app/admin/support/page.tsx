import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { memberCode } from "@/db/schema";
import { Filter, MessageSquare } from "lucide-react";

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

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status || "open";

  const { supportTickets, users } = schema;

  // Fetch all tickets with user details
  const allTickets = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      category: supportTickets.category,
      status: supportTickets.status,
      updatedAt: supportTickets.updatedAt,
      userName: users.name,
      userSerial: users.serialNo,
    })
    .from(supportTickets)
    .innerJoin(users, eq(users.id, supportTickets.userId))
    .orderBy(desc(supportTickets.updatedAt));

  // Count types for filter tabs
  const counts = {
    all: allTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    answered: allTickets.filter((t) => t.status === "answered").length,
    closed: allTickets.filter((t) => t.status === "closed").length,
  };

  const filteredTickets = allTickets.filter(
    (t) => statusFilter === "all" || t.status === statusFilter
  );

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
          <h2 style={{ fontSize: 20, margin: 0 }}>Support Tickets</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
            Resolve customer issues, answer questions, and manage tickets.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border)",
          padding: 10,
          borderRadius: 14,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--muted)", marginRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={14} /> Filter Status:
        </span>
        {[
          { id: "all", label: `All (${counts.all})` },
          { id: "open", label: `Open (${counts.open})`, dot: "#ef4444" },
          { id: "answered", label: `Answered (${counts.answered})`, dot: "#10b981" },
          { id: "closed", label: `Closed (${counts.closed})` },
        ].map((btn) => {
          const active = statusFilter === btn.id;
          return (
            <Link
              key={btn.id}
              href={`/admin/support?status=${btn.id}`}
              className="btn"
              style={{
                padding: "6px 14px",
                fontSize: 12.5,
                borderRadius: 8,
                background: active ? "var(--btn-gold-bg, var(--text))" : "transparent",
                color: active ? "var(--btn-gold-text, var(--bg))" : "var(--muted)",
                border: active ? "1px solid transparent" : "1px solid var(--border)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                fontWeight: active ? 700 : 500,
              }}
            >
              {btn.dot && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: btn.dot,
                  }}
                />
              )}
              {btn.label}
            </Link>
          );
        })}
      </div>

      {/* Table grid */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filteredTickets.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✔️</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
              No support tickets found matching status &quot;{statusFilter}&quot;.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.05)" }}>
                  {["Player", "Subject", "Category", "Status", "Last Update", "Action"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 20px",
                        textAlign: i === 5 ? "right" : "left",
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
                {filteredTickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 600 }}>{t.userName}</div>
                      <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        {memberCode(t.userSerial)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 600 }}>
                      <Link href={`/admin/support/${t.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                        {t.subject}
                      </Link>
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--muted)", fontSize: 13 }}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <StatusChip status={t.status} />
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--faint)", fontSize: 12 }}>
                      {new Date(t.updatedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <Link href={`/admin/support/${t.id}`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12.5 }}>
                        Resolve
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
