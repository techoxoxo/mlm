import { redirect } from "next/navigation";
import { Wallet, Layers, TrendingUp, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { env } from "@/lib/env";
import { ActivateButton, DecisionPanel } from "@/components/GameActions";
import { ReferralCard } from "@/components/ReferralCard";

export const dynamic = "force-dynamic";

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Wallet; label: string; value: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <Icon size={18} color="var(--color-brand-2)" />
      <div style={{ color: "var(--color-muted)", fontSize: 13, marginTop: 10 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ color: "var(--color-muted)", fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getDashboard(session.uid);
  if (!data) redirect("/login");

  const { user, currentSlab, nextSlab, mySlots, filled, collected, pending } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        <Stat icon={Wallet} label="Points balance" value={`${user.pointsBalance}`} />
        <Stat
          icon={Layers}
          label="Current slab"
          value={currentSlab ? `${currentSlab.level} · ${currentSlab.name}` : "Not active"}
          sub={user.status}
        />
        <Stat icon={TrendingUp} label="Total earned" value={`${data.totalEarned}`} sub="lifetime credits" />
        <Stat icon={Users} label="Direct referrals" value={`${data.referrals.length}`} />
      </div>

      {/* primary action area */}
      {user.currentSlab === 0 && !pending && (
        <div className="card" style={{ padding: 26 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>Activate your account</h3>
          <p style={{ color: "var(--color-muted)", fontSize: 14, margin: "0 0 18px", maxWidth: 520 }}>
            Enter Slab 1 to open your first slots in the FIFO queue. As new players activate, they fill your
            slots and you start earning.
          </p>
          <ActivateButton fee={data.allSlabs[0]?.fee ?? 30} />
        </div>
      )}

      {pending && currentSlab && (
        <DecisionPanel
          level={pending.slabLevel}
          collected={collected}
          exitPercent={currentSlab.exitPercent}
          upgradeTakePercent={currentSlab.upgradeTakePercent}
          nextName={nextSlab?.name ?? null}
          nextFee={nextSlab?.fee ?? null}
          isFinal={!nextSlab}
        />
      )}

      {/* slot progress */}
      {currentSlab && !pending && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                Slab {currentSlab.level} · {currentSlab.name}
              </h3>
              <p style={{ color: "var(--color-muted)", fontSize: 13, margin: "4px 0 0" }}>
                {filled} of {currentSlab.slots} slots filled · {collected} pts collected
              </p>
            </div>
            <span className="chip">{Math.round((filled / currentSlab.slots) * 100)}%</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(currentSlab.slots, 8)}, 1fr)`, gap: 8 }}>
            {mySlots.map((s) => (
              <div
                key={s.id}
                title={`Slot ${s.position}`}
                style={{
                  height: 46,
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background:
                    s.status === "filled"
                      ? "linear-gradient(135deg, var(--color-brand), var(--color-brand-2))"
                      : "var(--color-surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: s.status === "filled" ? "#fff" : "var(--color-muted)",
                }}
              >
                {s.position}
              </div>
            ))}
          </div>
        </div>
      )}

      <ReferralCard code={user.referralCode} appUrl={env.APP_URL} />

      {/* recent activity */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Recent activity</h3>
        {data.recentTx.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: 14 }}>No transactions yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.recentTx.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--color-border)",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "var(--color-muted)" }}>{t.note ?? t.type}</span>
                <span style={{ fontWeight: 700, color: t.points >= 0 ? "var(--color-success)" : "var(--color-muted)" }}>
                  {t.points >= 0 ? "+" : ""}
                  {t.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
