import { sql } from "drizzle-orm";
import { Users, UserCheck, Layers, Coins, LogOut, Trophy } from "lucide-react";
import { db, schema } from "@/db";
import { SimulatePanel } from "@/components/SimulatePanel";
import { ResetSystemButton } from "@/components/ResetSystemButton";

export const dynamic = "force-dynamic";

const { users, slots, transactions } = schema;

export default async function AdminOverview() {
  // one aggregate per table, in parallel — not a round-trip per stat
  const [[userAgg], [slotAgg], [txAgg], bySlab] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*) filter (where role = 'user')::int`,
        active: sql<number>`count(*) filter (where role = 'user' and status = 'active')::int`,
        exited: sql<number>`count(*) filter (where role = 'user' and status = 'exited')::int`,
        completed: sql<number>`count(*) filter (where role = 'user' and status = 'completed')::int`,
      })
      .from(users),
    db.select({ filled: sql<number>`count(*) filter (where status = 'filled')::int` }).from(slots),
    db.select({ distributed: sql<number>`coalesce(sum(points) filter (where points > 0),0)::int` }).from(transactions),
    db
      .select({ slab: users.currentSlab, n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`role = 'user'`)
      .groupBy(users.currentSlab)
      .orderBy(users.currentSlab),
  ]);

  const totalUsers = userAgg.total;
  const active = userAgg.active;
  const exited = userAgg.exited;
  const completed = userAgg.completed;
  const filledSlots = slotAgg.filled;
  const distributed = txAgg.distributed;

  const stats = [
    { icon: Users, label: "Total players", value: totalUsers },
    { icon: UserCheck, label: "Active", value: active },
    { icon: Layers, label: "Slots filled", value: filledSlots },
    { icon: Coins, label: "Points distributed", value: distributed },
    { icon: LogOut, label: "Exited", value: exited },
    { icon: Trophy, label: "Completed", value: completed },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: 18 }}>
            <s.icon size={18} color="var(--color-brand-2)" />
            <div style={{ color: "var(--color-muted)", fontSize: 13, marginTop: 10 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <SimulatePanel />

      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Players by slab</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bySlab.map((b) => {
            const pct = totalUsers ? Math.round((b.n / totalUsers) * 100) : 0;
            return (
              <div key={b.slab} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 70, fontSize: 13, color: "var(--color-muted)" }}>
                  {b.slab === 0 ? "Registered" : `Slab ${b.slab}`}
                </span>
                <div style={{ flex: 1, height: 10, background: "var(--color-surface-2)", borderRadius: 99 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--color-brand), var(--color-brand-2))" }} />
                </div>
                <span style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{b.n}</span>
              </div>
            );
          })}
        </div>
      </div>

      <ResetSystemButton />
    </div>
  );
}
