import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const { users } = schema;

export default async function UsersAdmin() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      slab: users.currentSlab,
      status: users.status,
      balance: users.pointsBalance,
      code: users.referralCode,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`role = 'user'`)
    .orderBy(desc(users.createdAt))
    .limit(300);

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Players ({rows.length})</h3>
      {rows.length === 0 ? (
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No players yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ color: "var(--color-muted)", textAlign: "left", fontSize: 12 }}>
              <th style={{ padding: "6px 0" }}>Name</th>
              <th>Email</th>
              <th>Code</th>
              <th>Slab</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={{ padding: "10px 0" }}>{r.name}</td>
                <td style={{ color: "var(--color-muted)" }}>{r.email}</td>
                <td style={{ letterSpacing: 1 }}>{r.code}</td>
                <td>{r.slab || "—"}</td>
                <td><span className="chip">{r.status}</span></td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{r.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
