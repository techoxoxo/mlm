import { redirect } from "next/navigation";
import { and, eq, desc, isNotNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { getDashboard, getDownlineTree } from "@/lib/queries";
import { DownlineTree } from "@/components/DownlineTree";
import { Network, Users, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

const { slots, users } = schema;

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  active: { bg: "rgba(0,230,118,0.1)", border: "rgba(0,230,118,0.25)", text: "#00e676" },
  inactive: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "var(--faint)" },
  exited: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", text: "#f97316" },
  completed: { bg: "rgba(232,138,255,0.1)", border: "rgba(232,138,255,0.2)", text: "#e88aff" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? STATUS_COLOR.inactive;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: "0.04em",
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
      }}
    >
      {status}
    </span>
  );
}

export default async function NetworkPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getDashboard(session.uid);
  if (!data) redirect("/logout");

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* header */}
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(111,195,247,0.06) 0%, rgba(16,15,18,0.85) 70%)",
          border: "1px solid rgba(111,195,247,0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "rgba(111,195,247,0.1)",
              border: "1px solid rgba(111,195,247,0.2)",
            }}
          >
            <Network size={19} color="#6fc3f7" />
          </span>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>My Network</h2>
            <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
              Your referral tree · downline up to 6 levels
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="pill" style={{ fontSize: 12.5 }}>
            <Users size={12} /> {data.referrals.length} direct refs
          </span>
          <span className="pill" style={{ fontSize: 12.5 }}>
            <Layers size={12} /> {placed.length} slots filled
          </span>
        </div>
      </div>

      {/* downline tree */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>Downline tree</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          Your referral network, up to 6 levels deep. Click a node to expand.
        </p>
        <DownlineTree root={tree} />
      </div>

      {/* direct referrals table */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>
          Direct referrals ({data.referrals.length})
        </h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          People who joined with your referral code.
        </p>
        {data.referrals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🌐</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
              No referrals yet. Share your link to grow your network!
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Name", "Tier", "Status", "Joined"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 0",
                      textAlign: i === 3 ? "right" : "left",
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
              {data.referrals.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 0", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{r.slab ? `Tier ${r.slab}` : "—"}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* filled slots table */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>Filled slots ({placed.length})</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          Players placed under you via the FIFO queue — each one earned you the slab fee.
        </p>
        {placed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
              No slots filled yet — activate to open your queue position.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Player", "Tier", "Slot", "Filled"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 0",
                      textAlign: i === 3 ? "right" : "left",
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
              {placed.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 0", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>Tier {p.slab}</td>
                  <td>
                    <span
                      className="mono"
                      style={{
                        display: "inline-flex",
                        width: 30,
                        height: 30,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        background: "rgba(248,198,23,0.08)",
                        border: "1px solid rgba(248,198,23,0.18)",
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: "var(--gold-bright)",
                      }}
                    >
                      #{p.position}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>
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
