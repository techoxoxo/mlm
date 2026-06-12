import { redirect } from "next/navigation";
import { and, eq, desc, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { getDashboard, getDownlineTree } from "@/lib/queries";
import { DownlineTree } from "@/components/DownlineTree";

export const dynamic = "force-dynamic";

const { slots, users } = schema;

export default async function NetworkPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getDashboard(session.uid);
  if (!data) redirect("/login");

  // who has filled my slots (matrix downline)
  const placed = await db
    .select({
      slab: slots.slabLevel,
      position: slots.position,
      filledAt: slots.filledAt,
      name: users.name,
      status: users.status,
    })
    .from(slots)
    .innerJoin(users, eq(users.id, slots.occupantId))
    .where(and(eq(slots.ownerId, session.uid), isNotNull(slots.occupantId)))
    .orderBy(desc(slots.filledAt));

  const tree = await getDownlineTree(session.uid);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Downline tree</h3>
        <p style={{ color: "var(--color-muted)", fontSize: 13, margin: "0 0 16px" }}>
          Your referral network, up to 6 levels deep. Click a node to expand.
        </p>
        <DownlineTree root={tree} />
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Direct referrals ({data.referrals.length})</h3>
        <p style={{ color: "var(--color-muted)", fontSize: 13, margin: "0 0 16px" }}>People who joined with your code.</p>
        {data.referrals.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No referrals yet. Share your link!</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ color: "var(--color-muted)", textAlign: "left", fontSize: 12 }}>
                <th style={{ padding: "6px 0" }}>Name</th>
                <th>Slab</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.referrals.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 0" }}>{r.name}</td>
                  <td>{r.slab || "—"}</td>
                  <td><span className="chip">{r.status}</span></td>
                  <td style={{ textAlign: "right", color: "var(--color-muted)" }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Filled slots ({placed.length})</h3>
        <p style={{ color: "var(--color-muted)", fontSize: 13, margin: "0 0 16px" }}>
          Players placed under you via the FIFO queue — each one earned you the slab fee.
        </p>
        {placed.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No slots filled yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ color: "var(--color-muted)", textAlign: "left", fontSize: 12 }}>
                <th style={{ padding: "6px 0" }}>Player</th>
                <th>Slab</th>
                <th>Slot</th>
                <th style={{ textAlign: "right" }}>Filled</th>
              </tr>
            </thead>
            <tbody>
              {placed.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 0" }}>{p.name}</td>
                  <td>{p.slab}</td>
                  <td>#{p.position}</td>
                  <td style={{ textAlign: "right", color: "var(--color-muted)" }}>
                    {p.filledAt ? new Date(p.filledAt).toLocaleString() : "—"}
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
