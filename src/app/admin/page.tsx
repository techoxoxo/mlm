import { sql } from "drizzle-orm";
import { Users, UserCheck, Layers, Coins, LogOut, Trophy, Activity, BarChart2, Zap, GitBranch } from "lucide-react";
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
  const [[userAgg], [txAgg], bySlab, activeBySlab, autopoolProgress] = await Promise.all([
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
    // Autopool progress: per tier — who entered, whose slots are being filled now, progress
    db.execute(sql`
      WITH tier_stats AS (
        SELECT
          s.slab_level AS tier,
          sl.name AS tier_name,
          sl.slots AS slots_per_user,
          count(*)::int AS total_slots,
          count(*) FILTER (WHERE s.status = 'filled')::int AS filled_slots,
          count(*) FILTER (WHERE s.status = 'open')::int AS open_slots
        FROM ${slots} s
        JOIN ${schema.slabs} sl ON sl.level = s.slab_level
        GROUP BY s.slab_level, sl.name, sl.slots
      ),
      current_filling AS (
        -- The user whose open slot will be filled next (oldest open slot per tier), only if they are still at this tier
        SELECT DISTINCT ON (s.slab_level)
          s.slab_level AS tier,
          u.serial_no,
          u.name,
          s.position AS slot_position,
          (SELECT count(*)::int FROM ${slots} s2 WHERE s2.owner_id = s.owner_id AND s2.slab_level = s.slab_level AND s2.status = 'filled') AS owner_filled
        FROM ${slots} s
        JOIN ${users} u ON u.id = s.owner_id
        WHERE s.status = 'open' AND u.current_slab = s.slab_level
        ORDER BY s.slab_level, s.queue_seq
      ),
      tier_entrants AS (
        -- How many users currently have active open slots in this tier
        SELECT slab_level AS tier, count(DISTINCT owner_id)::int AS entrants
        FROM ${slots}
        WHERE status = 'open'
        GROUP BY slab_level
      ),
      tier_position AS (
        -- The queue rank of the current user being filled next (always 1 in the active FIFO queue)
        SELECT cf.tier,
          1::int AS queue_rank
        FROM current_filling cf
      )
      SELECT
        ts.*,
        cf.serial_no AS current_serial,
        cf.name AS current_name,
        cf.slot_position AS current_slot,
        cf.owner_filled AS current_owner_filled,
        te.entrants,
        tp.queue_rank
      FROM tier_stats ts
      LEFT JOIN current_filling cf ON cf.tier = ts.tier
      LEFT JOIN tier_entrants te ON te.tier = ts.tier
      LEFT JOIN tier_position tp ON tp.tier = ts.tier
      ORDER BY ts.tier
    `),
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
    // { icon: Coins, label: "Points distributed", value: distributed.toLocaleString(), color: "#f5c453" },
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

      {/* autopool progress by tier */}
      {(() => {
        const poolRows = (autopoolProgress?.rows ?? []) as {
          tier: number; tier_name: string; slots_per_user: number;
          total_slots: number; filled_slots: number; open_slots: number;
          current_serial: number | null; current_name: string | null;
          current_slot: number | null; current_owner_filled: number | null;
          entrants: number; queue_rank: number | null;
        }[];
        if (poolRows.length === 0) return null;
        return (
          <div className="card" style={{ padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <GitBranch size={17} color="var(--purple)" />
              <h3 style={{ fontSize: 17, margin: 0 }}>Autopool progress</h3>
              <span style={{ fontSize: 12, color: "var(--faint)", marginLeft: "auto" }}>Who&apos;s being filled right now</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {poolRows.map((t) => {
                const pct = t.total_slots ? Math.round((t.filled_slots / t.total_slots) * 100) : 0;
                const tierColor = TIER_COLORS[(t.tier - 1) % TIER_COLORS.length] || "var(--faint)";
                const currentCode = t.current_serial ? `APX-${String(t.current_serial).padStart(6, "0")}` : null;
                return (
                  <div
                    key={t.tier}
                    style={{
                      padding: 18,
                      borderRadius: "var(--r-md)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: tierColor, boxShadow: `0 0 6px ${tierColor}` }} />
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Tier {t.tier}</span>
                        <span style={{ color: "var(--faint)", fontSize: 12 }}>{t.tier_name}</span>
                      </div>
                      <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{t.entrants} entered</span>
                    </div>

                    {/* Currently filling — the key info */}
                    {currentCode ? (
                      <div style={{ background: `${tierColor}10`, border: `1px solid ${tierColor}30`, borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Now filling slots for</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 15, color: tierColor }}>{currentCode}</span>
                          {t.queue_rank != null && (
                            <span className="pill" style={{ fontSize: 10, padding: "2px 8px", background: `${tierColor}18`, border: `1px solid ${tierColor}30`, color: tierColor }}>
                              #{t.queue_rank} of {t.entrants} in queue
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                          Slot {t.current_owner_filled != null ? t.current_owner_filled : 0} of {t.slots_per_user} filled
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#10b981" }}>
                        All slots in this tier are filled
                      </div>
                    )}


                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
