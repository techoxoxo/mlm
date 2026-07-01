import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Zap, ChevronRight } from "lucide-react";
import { db, schema } from "@/db";
import { memberCode } from "@/db/schema";
import { toggleAutoUpgradeAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const { users } = schema;

export default async function AutoUpgradeAdmin() {
  const [allUsers, summary] = await Promise.all([
    db
      .select({
        id: users.id,
        serialNo: users.serialNo,
        name: users.name,
        email: users.email,
        slab: users.currentSlab,
        status: users.status,
        autoUpgrade: users.autoUpgrade,
        referralCode: users.referralCode,
      })
      .from(users)
      .where(sql`role = 'user'`)
      .orderBy(desc(users.createdAt))
      .limit(500),
    db
      .select({
        total: sql<number>`count(*) filter (where role = 'user')::int`,
        enabled: sql<number>`count(*) filter (where role = 'user' and auto_upgrade = true)::int`,
      })
      .from(users),
  ]);

  const totalUsers = summary[0].total;
  const enabledCount = summary[0].enabled;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* header */}
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 40%, rgba(16,15,24,0.85) 70%)",
          border: "1px solid rgba(139,92,246,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 11,
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))",
            border: "1px solid rgba(139,92,246,0.25)",
          }}
        >
          <Zap size={20} color="#a78bfa" />
        </span>
        <div>
          <h2 style={{ fontSize: 20, margin: 0 }}>Auto Upgrade</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
            Manage which players automatically upgrade to the next tier when they complete a stage.
          </p>
        </div>
      </div>

      {/* summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total players</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>{totalUsers}</div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Auto-upgrade ON</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color: "#10b981" }}>{enabledCount}</div>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Auto-upgrade OFF</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, marginTop: 6, color: "var(--faint)" }}>{totalUsers - enabledCount}</div>
        </div>
      </div>

      {/* user list */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>All Players ({allUsers.length})</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 16px" }}>
          Toggle auto-upgrade per player. When enabled, players automatically upgrade to the next tier instead of being prompted to choose.
        </p>
        {allUsers.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>No players yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Name</th>
                <th>Tier</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Auto Upgrade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td className="mono" style={{ fontWeight: 600, color: "var(--gold-bright)" }}>
                    {memberCode(u.serialNo)}
                  </td>
                  <td>{u.name}</td>
                  <td>{u.slab || "—"}</td>
                  <td><span className="pill" style={{ textTransform: "capitalize" }}>{u.status}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <form
                      action={async () => {
                        "use server";
                        await toggleAutoUpgradeAction(u.id, !u.autoUpgrade);
                      }}
                    >
                      <button
                        type="submit"
                        className={u.autoUpgrade ? "pill pill-gold" : "pill"}
                        style={{
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                          border: u.autoUpgrade ? "1px solid rgba(248,198,23,0.4)" : "1px solid var(--border)",
                          minWidth: 70,
                        }}
                      >
                        {u.autoUpgrade ? "ON" : "OFF"}
                      </button>
                    </form>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/admin/users/${u.id}`} style={{ color: "var(--faint)" }}>
                      <ChevronRight size={16} />
                    </Link>
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
