import { redirect } from "next/navigation";
import { Wallet, Layers, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { env } from "@/lib/env";
import { ActivateButton, DecisionPanel } from "@/components/GameActions";
import { ReferralCard } from "@/components/ReferralCard";

export const dynamic = "force-dynamic";

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Wallet; label: string; value: string; accent?: boolean }) {
  return (
    <div className="card card-hover" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{label}</span>
        <span style={{ display: "inline-flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 9, background: accent ? "rgba(248,198,23,0.12)" : "rgba(248,198,23,0.1)", border: `1px solid ${accent ? "rgba(248,198,23,0.25)" : "rgba(248,198,23,0.22)"}` }}>
          <Icon size={16} color={accent ? "var(--gold)" : "var(--green-bright)"} />
        </span>
      </div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 14, letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getDashboard(session.uid);
  if (!data) redirect("/login");

  const { user, currentSlab, nextSlab, mySlots, filled, collected, pending } = data;
  const pct = currentSlab ? Math.round((filled / currentSlab.slots) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* hero balance */}
      <div className="card" style={{ padding: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, background: "radial-gradient(520px 200px at 90% -20%, rgba(248,198,23,0.1), transparent 70%), var(--surface)" }}>
        <div>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Points balance</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em" }}>{user.pointsBalance.toLocaleString()}</span>
            <span style={{ color: "var(--faint)", fontSize: 15 }}>pts</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <span className={currentSlab ? "pill pill-green" : "pill"}>
              {currentSlab ? `Tier ${currentSlab.level} · ${currentSlab.name}` : "Not activated"}
            </span>
            <span className="pill" style={{ textTransform: "capitalize" }}>{user.status}</span>
          </div>
        </div>
        {currentSlab && (
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Tier progress</span>
            <div className="mono" style={{ fontSize: 34, fontWeight: 600, color: "var(--green-bright)" }}>{pct}%</div>
            <span style={{ fontSize: 12, color: "var(--faint)" }}>{filled} / {currentSlab.slots} slots filled</span>
          </div>
        )}
      </div>

      {/* stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        <Stat icon={TrendingUp} label="Total earned" value={data.totalEarned.toLocaleString()} />
        <Stat icon={Layers} label="Collected this tier" value={collected.toLocaleString()} />
        <Stat icon={Users} label="Direct referrals" value={String(data.referrals.length)} />
        <Stat icon={Wallet} label="Lifetime balance" value={user.pointsBalance.toLocaleString()} accent={!nextSlab} />
      </div>

      {/* primary action */}
      {user.currentSlab === 0 && !pending && (
        <div className="card card-feature" style={{ padding: 28 }}>
          <span className="kicker">Get started</span>
          <h3 style={{ fontSize: 20, margin: "12px 0 8px" }}>Activate your account</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 20px", maxWidth: 540 }}>
            Enter Tier 1 to open your first slots in the FIFO queue. As new players activate, they fill your slots and your balance starts to grow.
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

      {/* slot grid */}
      {currentSlab && !pending && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 16 }}>Your slots · Tier {currentSlab.level}</h3>
              <p style={{ color: "var(--faint)", fontSize: 13, margin: "4px 0 0" }}>
                Fill all {currentSlab.slots} to unlock your exit-or-climb decision.
              </p>
            </div>
            <span className="pill pill-green">{collected.toLocaleString()} pts collected</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(currentSlab.slots, 8)}, 1fr)`, gap: 10 }}>
            {mySlots.map((s) => (
              <div
                key={s.id}
                title={`Slot ${s.position} · ${s.status}`}
                style={{
                  height: 56,
                  borderRadius: 12,
                  border: `1px solid ${s.status === "filled" ? "rgba(248,198,23,0.4)" : "var(--border-2)"}`,
                  background:
                    s.status === "filled"
                      ? "linear-gradient(160deg, rgba(248,198,23,0.22), rgba(248,198,23,0.08))"
                      : "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: s.status === "filled" ? "var(--green-bright)" : "var(--faint)",
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
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Recent activity</h3>
        {data.recentTx.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No transactions yet — activate to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.recentTx.map((t) => {
              const positive = t.points >= 0;
              return (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ display: "inline-flex", width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 8, background: positive ? "rgba(248,198,23,0.1)" : "rgba(255,255,255,0.04)" }}>
                      {positive ? <ArrowUpRight size={15} color="var(--green-bright)" /> : <ArrowDownRight size={15} color="var(--faint)" />}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{t.note ?? t.type}</span>
                  </div>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 15, color: positive ? "var(--green-bright)" : "var(--muted)" }}>
                    {positive ? "+" : ""}{t.points.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
