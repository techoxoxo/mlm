import { redirect } from "next/navigation";
import { Wallet, Layers, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Zap, Star, Crown, Target } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { env } from "@/lib/env";
import { Gift } from "lucide-react";
import { ActivateButton, DecisionPanel } from "@/components/GameActions";
import { ReferralCard } from "@/components/ReferralCard";
import { getRoyaltyOverview } from "@/lib/royalty";
import { memberCode } from "@/db/schema";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  slot_credit: "Slot credits",
  referral_bonus: "Sponsor rewards",
  royalty_payout: "Royalty rank",
  royalty_reserve_reward: "Royalty reserve",
};

const TIER_COLORS = [
  { color: "#a0a0a0", glow: "rgba(160,160,160,0.2)", label: "Starter" },
  { color: "#6fc3f7", glow: "rgba(111,195,247,0.2)", label: "Bronze" },
  { color: "#c0a060", glow: "rgba(192,160,96,0.2)", label: "Silver" },
  { color: "#f8c617", glow: "rgba(248,198,23,0.25)", label: "Gold" },
  { color: "#e88aff", glow: "rgba(232,138,255,0.2)", label: "Platinum" },
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  color,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  color?: string;
}) {
  const c = color ?? "var(--gold)";
  return (
    <div
      className="card card-hover"
      style={{
        padding: 22,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* corner glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -24,
          right: -24,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c}30 0%, transparent 70%)`,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span
          style={{
            display: "inline-flex",
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: `linear-gradient(135deg, ${c}25, ${c}10)`,
            border: `1px solid ${c}35`,
            boxShadow: accent ? `0 0 14px ${c}30` : "none",
          }}
        >
          <Icon size={17} color={c} />
        </span>
      </div>
      <div className="mono" style={{ fontSize: 34, fontWeight: 700, marginTop: 14, letterSpacing: "-0.03em", color: "var(--text)" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RadialProgress({ pct, label }: { pct: number; label: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={104} height={104} viewBox="0 0 104 104">
        <circle cx={52} cy={52} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
        <circle
          cx={52}
          cy={52}
          r={r}
          fill="none"
          stroke="url(#prog-grad)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={0}
          transform="rotate(-90 52 52)"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
        <defs>
          <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffdd66" />
            <stop offset="100%" stopColor="#f8c617" />
          </linearGradient>
        </defs>
        <text x={52} y={56} textAnchor="middle" fill="var(--gold-bright)" fontSize={18} fontWeight={700} fontFamily="var(--font-num)">
          {pct}%
        </text>
      </svg>
      <span style={{ fontSize: 12, color: "var(--faint)" }}>{label}</span>
    </div>
  );
}

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  const data = await getDashboard(session.uid);
  if (!data) redirect("/logout");

  const { user, currentSlab, nextSlab, mySlots, filled, collected, pending } = data;
  const pct = currentSlab ? Math.round((filled / currentSlab.slots) * 100) : 0;
  const royalty = await getRoyaltyOverview(session.uid);
  const nextTier = royalty.tiers.find((t) => t.minDirects > (royalty.me?.directs ?? 0));
  const tierColor = TIER_COLORS[(user.currentSlab ?? 1) - 1] ?? TIER_COLORS[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── hero balance ─────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
          background: `linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(248,198,23,0.04) 40%, var(--surface) 70%)`,
          borderColor: "rgba(139,92,246,0.2)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* background aurora */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -40,
            left: -20,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          }}
        />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              className="kicker"
              style={{
                background: "linear-gradient(90deg, rgba(248,198,23,0.15), rgba(248,198,23,0.05))",
                border: "1px solid rgba(248,198,23,0.2)",
                borderRadius: 99,
                padding: "4px 12px",
              }}
            >
              <Zap size={11} />
              Live balance
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
            <span
              className="mono"
              style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}
            >
              {user.pointsBalance.toLocaleString()}
            </span>
            <span style={{ color: "var(--faint)", fontSize: 17, fontWeight: 600 }}>pts</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span
              className="pill pill-gold mono"
              style={{
                background: "rgba(248,198,23,0.1)",
                border: "1px solid rgba(248,198,23,0.3)",
                fontSize: 12,
              }}
            >
              <Crown size={10} />
              {memberCode(user.serialNo)}
            </span>
            {currentSlab ? (
              <span
                className="pill"
                style={{
                  background: `${tierColor.glow}`,
                  border: `1px solid ${tierColor.color}40`,
                  color: tierColor.color,
                }}
              >
                <Star size={10} />
                Tier {currentSlab.level} · {currentSlab.name}
              </span>
            ) : (
              <span className="pill">Not activated</span>
            )}
            <span className="pill" style={{ textTransform: "capitalize" }}>
              {user.status}
            </span>
          </div>
        </div>

        {currentSlab && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <RadialProgress pct={pct} label={`${filled} / ${currentSlab.slots} slots`} />
          </div>
        )}
      </div>

      {/* ── stats ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14 }}>
        <StatCard icon={TrendingUp} label="Total earned" value={data.totalEarned.toLocaleString()} sub="all-time points" color="#8b5cf6" />
        <StatCard icon={Layers} label="Collected this tier" value={collected.toLocaleString()} sub="current slab" color="#3b82f6" />
        <StatCard icon={Users} label="Direct referrals" value={String(data.referrals.length)} sub="active members" color="#a78bfa" />
        <StatCard icon={Wallet} label="Convertible balance" value={user.pointsBalance.toLocaleString()} sub={`≈ $${(user.pointsBalance * 1).toFixed(2)} USDT`} accent color="#f5c453" />
      </div>

      {/* ── primary action ────────────────────────────── */}
      {user.currentSlab === 0 && !pending && (
        <div
          className="card"
          style={{
            padding: 32,
            background:
              "linear-gradient(135deg, rgba(248,198,23,0.1) 0%, var(--surface) 70%)",
            borderColor: "rgba(248,198,23,0.35)",
            boxShadow: "0 0 0 1px rgba(248,198,23,0.12), 0 0 40px rgba(248,198,23,0.1)",
          }}
        >
          <span className="kicker">
            <Zap size={11} />
            Get started
          </span>
          <h3 style={{ fontSize: 22, margin: "12px 0 10px" }}>Activate your account</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px", maxWidth: 560, lineHeight: 1.65 }}>
            Enter Tier 1 to open your first slots in the FIFO queue. As new players activate, they fill your
            slots and your balance starts to grow.
          </p>
          <ActivateButton fee={data.allSlabs[0]?.fee ?? 30} />
        </div>
      )}

      {pending && currentSlab && (
        <DecisionPanel
          level={pending.slabLevel}
          collected={collected}
          exitPercent={currentSlab.exitPercent}
          nextName={nextSlab?.name ?? null}
          nextFee={nextSlab?.fee ?? null}
          isFinal={!nextSlab}
        />
      )}

      {/* ── slot grid ─────────────────────────────────── */}
      {currentSlab && !pending && (
        <div className="card" style={{ padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 17 }}>Your slots · Tier {currentSlab.level}</h3>
              <p style={{ color: "var(--faint)", fontSize: 13, margin: "4px 0 0" }}>
                Fill all {currentSlab.slots} to unlock your exit-or-climb decision.
              </p>
            </div>
            <span
              className="pill pill-gold"
              style={{ fontSize: 12.5, padding: "5px 14px", boxShadow: "0 0 12px rgba(248,198,23,0.15)" }}
            >
              {collected.toLocaleString()} pts collected
            </span>
          </div>
          <div
            className="slot-grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(currentSlab.slots, 8)}, 1fr)`,
              gap: 10,
            }}
          >
            {mySlots.map((s) => (
              <div
                key={s.id}
                title={`Slot ${s.position} · ${s.status}`}
                style={{
                  height: 60,
                  borderRadius: 12,
                  border: `1px solid ${s.status === "filled" ? "rgba(248,198,23,0.45)" : "var(--border-2)"}`,
                  background:
                    s.status === "filled"
                      ? "linear-gradient(160deg, rgba(248,198,23,0.22), rgba(248,198,23,0.06))"
                      : "var(--bg-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: s.status === "filled" ? "var(--gold-bright)" : "var(--faint)",
                  boxShadow:
                    s.status === "filled"
                      ? "0 0 12px rgba(248,198,23,0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
                      : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {s.status === "filled" ? "✦" : s.position}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── tier ladder ────────────────────────────────── */}
      <div className="card" style={{ padding: 26 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 17 }}>Your climb</h3>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: "4px 0 0" }}>
            Five stages from Starter to Platinum. Bigger stages, bigger pools.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.allSlabs.map((s, i) => {
            const done = user.currentSlab > s.level;
            const current = user.currentSlab === s.level;
            const prog = current ? Math.round((filled / s.slots) * 100) : done ? 100 : 0;
            const tc = TIER_COLORS[i] ?? TIER_COLORS[0];
            return (
              <div
                key={s.level}
                className="tier-ladder-item"
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 130px",
                  alignItems: "center",
                  gap: 18,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: `1px solid ${current ? tc.color + "40" : "var(--border)"}`,
                  background: current
                    ? `linear-gradient(90deg, ${tc.glow} 0%, var(--surface) 100%)`
                    : "transparent",
                  opacity: !done && !current ? 0.55 : 1,
                  transition: "all 0.2s ease",
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
                      background: current ? `${tc.glow}` : "var(--bg-2)",
                      border: `1px solid ${current ? tc.color + "40" : "var(--border)"}`,
                      fontSize: 16,
                      fontWeight: 800,
                      fontFamily: "var(--font-num)",
                      color: current ? tc.color : done ? "var(--gold)" : "var(--faint)",
                    }}
                  >
                    {String(s.level).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--faint)" }}>
                      {s.slots} slots · {s.fee} entry
                    </div>
                  </div>
                </div>

                <div className="tier-ladder-progress">
                  <div
                    style={{
                      height: 7,
                      borderRadius: 99,
                      background: "var(--bg-2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${prog}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: current
                          ? `linear-gradient(90deg, ${tc.color}, ${tc.color}99)`
                          : "linear-gradient(90deg, var(--gold), var(--gold-soft))",
                        boxShadow: current ? `0 0 6px ${tc.color}` : "none",
                        transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {done ? (
                    <span className="pill pill-gold" style={{ fontSize: 11 }}>
                      ✓ cleared
                    </span>
                  ) : current ? (
                    <span className="pill" style={{ fontSize: 11 }}>
                      {filled}/{s.slots} · {pct}%
                    </span>
                  ) : (
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--faint)" }}>
                      pool {(s.fee * s.slots).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ReferralCard code={user.referralCode} appUrl={env.APP_URL} />

      {/* ── royalty program ──────────────────────────── */}
      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span
            style={{
              display: "inline-flex",
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.08))",
              border: "1px solid rgba(139,92,246,0.25)",
            }}
          >
            <Gift size={17} color="#a78bfa" />
          </span>
          <div>
            <h3 style={{ fontSize: 17 }}>Royalty program</h3>
            <p style={{ fontSize: 12.5, color: "var(--faint)", margin: "2px 0 0" }}>
              Earn a share of the global royalty pool via direct referrals
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
          {[
            {
              label: "Direct referrals",
              value: String(royalty.me?.directs ?? 0),
              accent: false,
            },
            {
              label: "Current rank",
              value: royalty.me?.band
                ? `${royalty.me.band.label} · ${royalty.me.band.percent}%`
                : "Unranked",
              accent: !!royalty.me?.band,
            },
            {
              label: "Royalty earned",
              value: (royalty.me?.earned ?? 0).toLocaleString(),
              accent: true,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: stat.accent
                  ? "linear-gradient(135deg, rgba(248,198,23,0.08), var(--surface))"
                  : "var(--bg-2)",
                border: `1px solid ${stat.accent ? "rgba(248,198,23,0.2)" : "var(--border)"}`,
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{stat.label}</div>
              <div
                className="mono"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: stat.accent ? "var(--gold-bright)" : "var(--text)",
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
        {nextTier && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(248,198,23,0.04)",
              border: "1px solid rgba(248,198,23,0.12)",
              fontSize: 13.5,
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Target size={14} color="var(--gold)" style={{ flexShrink: 0 }} />
            <span>
              {nextTier.minDirects - (royalty.me?.directs ?? 0)} more direct referrals to reach{" "}
              <b style={{ color: "var(--gold-bright)" }}>{nextTier.label}</b> ({nextTier.percent}% share).
            </span>
          </div>
        )}
      </div>

      {/* ── earnings + leaderboard ──────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        {/* earnings breakdown */}
        <div className="card" style={{ padding: 26 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18 }}>Earnings breakdown</h3>
          {data.earningsByType.length === 0 ? (
            <p style={{ color: "var(--faint)", fontSize: 14 }}>No earnings yet — fill your slots to start.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(() => {
                const max = Math.max(...data.earningsByType.map((e) => e.total), 1);
                return data.earningsByType
                  .sort((a, b) => b.total - a.total)
                  .map((e) => (
                    <div key={e.type}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}>
                        <span style={{ color: "var(--muted)" }}>{SOURCE_LABEL[e.type] ?? e.type}</span>
                        <span className="mono" style={{ fontWeight: 700, color: "#a78bfa" }}>
                          +{e.total.toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 99,
                          background: "rgba(255,255,255,0.04)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round((e.total / max) * 100)}%`,
                            height: "100%",
                            borderRadius: 99,
                            background: "linear-gradient(90deg, #8b5cf6, #3b82f6, var(--gold-soft))",
                          }}
                        />
                      </div>
                    </div>
                  ));
              })()}
            </div>
          )}
        </div>

        {/* leaderboard */}
        <div className="card" style={{ padding: 26 }}>
          <h3 style={{ fontSize: 17, marginBottom: 18 }}>Top players</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.leaderboard.map((p, i) => {
              const me = p.serialNo === user.serialNo;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div
                  key={p.serialNo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: me
                      ? "linear-gradient(90deg, rgba(248,198,23,0.1), rgba(248,198,23,0.04))"
                      : "transparent",
                    border: me
                      ? "1px solid rgba(248,198,23,0.2)"
                      : "1px solid transparent",
                  }}
                >
                  <span style={{ width: 22, fontSize: i < 3 ? 16 : 13, textAlign: "center" }}>
                    {i < 3 ? medals[i] : <span className="mono" style={{ color: "var(--faint)", fontWeight: 700 }}>{i + 1}</span>}
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: me ? 700 : 400, color: me ? "var(--text)" : "var(--muted)" }}>
                    {me ? "You" : p.name}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
                    {memberCode(p.serialNo)}
                  </span>
                  <span className="mono" style={{ fontWeight: 700, color: i === 0 ? "var(--gold-bright)" : "var(--text)", fontSize: 14 }}>
                    {p.earned.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── recent activity ─────────────────────────── */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, marginBottom: 18 }}>Recent activity</h3>
        {data.recentTx.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No transactions yet — activate to get started.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.recentTx.map((t) => {
              const positive = t.points >= 0;
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "13px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        width: 34,
                        height: 34,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 9,
                        background: positive
                          ? "rgba(248,198,23,0.1)"
                          : "rgba(255,82,82,0.08)",
                        border: positive
                          ? "1px solid rgba(248,198,23,0.2)"
                          : "1px solid rgba(255,82,82,0.15)",
                      }}
                    >
                      {positive ? (
                        <ArrowUpRight size={15} color="var(--gold-bright)" />
                      ) : (
                        <ArrowDownRight size={15} color="var(--danger)" />
                      )}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{t.note ?? t.type}</span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: positive ? "var(--gold-bright)" : "var(--muted)",
                    }}
                  >
                    {positive ? "+" : ""}
                    {t.points.toLocaleString()}
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
