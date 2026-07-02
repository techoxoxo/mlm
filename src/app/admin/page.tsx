import { sql } from "drizzle-orm";
import { Users, UserCheck, Layers, Coins, LogOut, Trophy, Activity, BarChart2, Zap } from "lucide-react";
import { db, schema } from "@/db";
import { SimulatePanel } from "@/components/SimulatePanel";
import { ResetSystemButton } from "@/components/ResetSystemButton";

export const dynamic = "force-dynamic";

const { users, slots, transactions } = schema;

const TIER_COLORS = [
  "#a0a0a0",
  "#6fc3f7",
  "#c0a060",
  "#f8c617",
  "#e88aff",
];

export default async function AdminOverview() {
  const [[userAgg], [txAgg], bySlab, activeBySlab] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*) filter (where role = 'user')::int`,
        active: sql<number>`count(*) filter (where role = 'user' and status = 'active')::int`,
        exited: sql<number>`count(*) filter (where role = 'user' and status = 'exited')::int`,
        completed: sql<number>`count(*) filter (where role = 'user' and status = 'completed')::int`,
        registered: sql<number>`count(*) filter (where role = 'user' and status = 'registered')::int`,
      })
      .from(users),
    db.select({ 
      distributed: sql<number>`coalesce(sum(points) filter (where points > 0 and type not in ('usdt_deposit')),0)::int` 
    }).from(transactions),
    db
      .select({ slab: users.currentSlab, n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`role = 'user'`)
      .groupBy(users.currentSlab)
      .orderBy(users.currentSlab),
    db
      .select({ slab: users.currentSlab, n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`role = 'user' and status = 'active'`)
      .groupBy(users.currentSlab)
      .orderBy(users.currentSlab),
  ]);

  const totalUsers = userAgg.total;
  const active = userAgg.active;
  const exited = userAgg.exited;
  const completed = userAgg.completed;
  const registered = userAgg.registered;
  const distributed = txAgg.distributed;

  const stats = [
    { icon: Users, label: "Total players", value: totalUsers, color: "#8b5cf6" },
    { icon: Activity, label: "Active", value: active, color: "#10b981" },
    { icon: Coins, label: "Points distributed", value: distributed.toLocaleString(), color: "#f5c453" },
    { icon: LogOut, label: "Exited", value: exited, color: "#f97316" },
    { icon: Trophy, label: "Completed", value: completed, color: "#a78bfa" },
  ];

  // Build a complete breakdown list of players by current active slab
  const slabTiers = [1, 2, 3, 4, 5];
  const tierBreakdown = [
    { label: "Registered (Unactivated)", count: registered, color: "var(--muted)", isRegistered: true },
    ...slabTiers.map((lvl) => {
      const match = activeBySlab.find((b) => b.slab === lvl);
      const tierIdx = lvl - 1;
      return {
        label: `Tier ${lvl}`,
        count: match ? match.n : 0,
        color: TIER_COLORS[tierIdx] || "var(--faint)",
        isRegistered: false,
      };
    })
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* admin header */}
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
          <h2 style={{ fontSize: 20, margin: 0 }}>Control Room</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
            Economy overview · Real-time stats
          </p>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 99,
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#a78bfa",
          }}
        >
          ● Live
        </div>
      </div>

      {/* stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            className="card card-hover"
            style={{ padding: 22, position: "relative", overflow: "hidden" }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${s.color}22 0%, transparent 70%)`,
              }}
            />
            <span
              style={{
                display: "inline-flex",
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: `${s.color}15`,
                border: `1px solid ${s.color}30`,
              }}
            >
              <s.icon size={17} color={s.color} />
            </span>
            <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {s.label}
            </div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color: "var(--text)" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* players by slab */}
      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <BarChart2 size={17} color="var(--gold)" />
          <h3 style={{ fontSize: 17, margin: 0 }}>Players by active tier</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tierBreakdown.map((b) => {
            const pct = totalUsers ? Math.round((b.count / totalUsers) * 100) : 0;
            return (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    width: 160,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: b.color,
                  }}
                >
                  {b.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      borderRadius: 99,
                      background: `linear-gradient(90deg, ${b.color}, ${b.color}99)`,
                      boxShadow: `0 0 6px ${b.color}55`,
                    }}
                  />
                </div>
                <span
                  className="mono"
                  style={{ width: 50, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text)" }}
                >
                  {b.count} <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 400 }}>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
