import { redirect } from "next/navigation";
import { TrendingUp, Wallet, Users, Target, Clock, Coins, Layers, Percent } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getRoiOverview, getMyRoiTransactions } from "@/lib/roiPlan";
import { RoiInvestForm } from "@/components/RoiInvestForm";

export const dynamic = "force-dynamic";

const TX_LABELS: Record<string, string> = {
  roi_investment: "Investment",
  roi_direct_income: "Direct income",
  roi_daily_payout: "Daily ROI",
  roi_level_income: "Level income",
};

export default async function RoiPlanPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [{ pointsBalance, status: accountStatus }] = await db
    .select({ pointsBalance: schema.users.pointsBalance, status: schema.users.status })
    .from(schema.users)
    .where(eq(schema.users.id, session.uid));
  const accountActive = accountStatus === "active";

  const { settings, tiers, me } = await getRoiOverview(session.uid);
  const txs = await getMyRoiTransactions(session.uid);

  const invested = me?.invested ?? 0;
  const earned = me?.earned ?? 0;
  const tokenEarned = me?.tokenEarned ?? 0;
  const combinedEarned = earned + tokenEarned;
  const cap = me?.cap ?? 0;
  const capProgress = cap > 0 ? Math.min(100, Math.round((combinedEarned / cap) * 100)) : 0;
  const directRemaining = Math.max(0, settings.boostThresholdUsdt - (me?.directTotal ?? 0));

  // Feature is off and this user has no history with it — full coming-soon takeover.
  if (!settings.enabled && invested === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card" style={{ padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span
            style={{
              display: "inline-flex",
              width: 52,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              background: "rgba(111,195,247,0.12)",
              border: "1px solid rgba(111,195,247,0.25)",
            }}
          >
            <Clock size={24} color="#6fc3f7" />
          </span>
          <h2 style={{ fontSize: 22, margin: 0 }}>ROI Plan — Coming Soon</h2>
          <p style={{ color: "var(--faint)", fontSize: 14, margin: 0, maxWidth: 420 }}>
            Daily ROI, direct income, and 20-level income — independent of your matrix. We&apos;ll let you know the
            moment it opens.
          </p>
        </div>

        <div className="card" style={{ padding: 26 }}>
          <h3 style={{ fontSize: 17, margin: "0 0 16px" }}>How it&apos;ll work once it opens</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            {[
              {
                icon: Wallet,
                title: "1. Invest",
                text: `Invest $${settings.minInvest}–$${settings.maxInvest}, in multiples of $${settings.investStep}. Separate from your matrix/tier balance.`,
              },
              {
                icon: Users,
                title: "2. Earn direct income",
                text: `${settings.directIncomePercent}% of every direct referral's investment, paid to you immediately — once you've invested yourself.`,
              },
              {
                icon: TrendingUp,
                title: "3. Earn daily ROI",
                text: `${Number(settings.baseDailyRoiPercent)}%/day automatically, boosted to ${Number(settings.boostedDailyRoiPercent)}%/day once your directs' investments reach $${settings.boostThresholdUsdt} total.`,
              },
              {
                icon: Layers,
                title: "4. Earn level income",
                text: "A share of your downline's daily ROI, 20 levels deep up your sponsor chain.",
              },
              {
                icon: Coins,
                title: "5. Split 50/50",
                text: "Every payout splits 50% USDT and 50% Token.",
              },
              {
                icon: Percent,
                title: `6. ${settings.capMultiplier}× lifetime cap`,
                text: `All income combined stops once it reaches ${settings.capMultiplier}× what you invested.`,
              },
            ].map((step) => (
              <div key={step.title} style={{ display: "flex", gap: 12 }}>
                <span
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    width: 34,
                    height: 34,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 9,
                    background: "rgba(111,195,247,0.1)",
                    border: "1px solid rgba(111,195,247,0.2)",
                  }}
                >
                  <step.icon size={16} color="#6fc3f7" />
                </span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{step.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--faint)", lineHeight: 1.5 }}>{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(111,195,247,0.08) 0%, var(--surface) 70%)",
          border: "1px solid rgba(111,195,247,0.2)",
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
              background: "rgba(111,195,247,0.12)",
              border: "1px solid rgba(111,195,247,0.25)",
            }}
          >
            <TrendingUp size={19} color="#6fc3f7" />
          </span>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>ROI Plan</h2>
            <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
              Daily ROI, direct income, and 20-level income — independent of your matrix
            </p>
          </div>
        </div>
        {me?.boosted && (
          <span
            style={{
              padding: "6px 16px",
              borderRadius: 99,
              background: "rgba(111,195,247,0.15)",
              border: "1px solid rgba(111,195,247,0.35)",
              color: "#6fc3f7",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            Boosted rate unlocked
          </span>
        )}
      </div>

      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 16px" }}>How this plan works</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
          {[
            {
              icon: Wallet,
              title: "1. Invest",
              text: `Invest $${settings.minInvest}–$${settings.maxInvest}, in multiples of $${settings.investStep}. This is separate from your matrix/tier balance — it doesn't touch your existing plan at all.`,
            },
            {
              icon: Users,
              title: "2. Earn direct income",
              text: `When someone you personally refer invests, you get ${settings.directIncomePercent}% of their investment immediately — but only once you've invested yourself.`,
            },
            {
              icon: TrendingUp,
              title: "3. Earn daily ROI",
              text: `Every day, you earn ${Number(settings.baseDailyRoiPercent)}% of your investment automatically. Once your direct referrals' investments add up to $${settings.boostThresholdUsdt} total, your rate permanently jumps to ${Number(settings.boostedDailyRoiPercent)}%/day.`,
            },
            {
              icon: Layers,
              title: "4. Earn level income",
              text: "You also earn a share of the daily ROI paid to your downline — 20 levels deep, up your entire sponsor chain — as long as you've invested and are actively earning yourself.",
            },
            {
              icon: Coins,
              title: "5. Split 50/50",
              text: "Every payout — direct, daily, and level income — is split 50% USDT and 50% Token. Both count toward the same cap below.",
            },
            {
              icon: Percent,
              title: `6. ${settings.capMultiplier}× lifetime cap`,
              text: `All income combined (direct + daily + level, both currencies) stops once it reaches ${settings.capMultiplier}× what you invested. After that, that investment has paid out in full.`,
            },
          ].map((step) => (
            <div key={step.title} style={{ display: "flex", gap: 12 }}>
              <span
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  width: 34,
                  height: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 9,
                  background: "rgba(111,195,247,0.1)",
                  border: "1px solid rgba(111,195,247,0.2)",
                }}
              >
                <step.icon size={16} color="#6fc3f7" />
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{step.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--faint)", lineHeight: 1.5 }}>{step.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 22 }}>
          {[
            { label: "Wallet balance", value: `$${pointsBalance.toLocaleString()}`, icon: Wallet, color: "#6fc3f7" },
            { label: "Total invested", value: `$${invested.toLocaleString()}`, icon: TrendingUp, color: "var(--gold-bright)" },
            { label: "USDT earned", value: `$${earned.toFixed(2)}`, icon: Target, color: "#10b981" },
            { label: "Token earned", value: tokenEarned.toFixed(2), icon: Target, color: "#f0b429" },
            {
              label: "Daily rate",
              value: me ? `${me.dailyRatePercent}%/day` : "—",
              icon: TrendingUp,
              color: me?.boosted ? "#6fc3f7" : "var(--muted)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ padding: 18, borderRadius: 14, background: `${stat.color}0d`, border: `1px solid ${stat.color}25` }}
            >
              <stat.icon size={16} color={stat.color} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{stat.label}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {invested > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>
                <Target size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
                {settings.capMultiplier}× cap progress (${combinedEarned.toFixed(2)} of ${cap.toLocaleString()}, USDT + Token combined)
              </span>
              <span className="mono" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
                {capProgress}%
              </span>
            </div>
            <div style={{ height: 9, borderRadius: 99, background: "var(--bg-2)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${capProgress}%`,
                  height: "100%",
                  borderRadius: 99,
                  background: "linear-gradient(90deg, var(--gold), var(--gold-soft))",
                  boxShadow: "0 0 8px rgba(248,198,23,0.4)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 6px" }}>Invest</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          ${settings.minInvest}–${settings.maxInvest}, in multiples of ${settings.investStep}. Paid daily at{" "}
          {Number(settings.baseDailyRoiPercent)}% (boosted to {Number(settings.boostedDailyRoiPercent)}% once your
          directs&apos; investments reach ${settings.boostThresholdUsdt} total) — every direct, daily, and level
          income payout splits 50% USDT / 50% Token. All income combined (both currencies) caps at{" "}
          {settings.capMultiplier}× what you invest.
        </p>
        {!accountActive ? (
          <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--faint)", fontSize: 13, margin: 0 }}>
            <Clock size={14} /> Your account isn&apos;t active right now, so new investments and any pending daily/level
            income are paused — contact support if you believe this is wrong.
          </p>
        ) : settings.enabled ? (
          <RoiInvestForm
            minInvest={settings.minInvest}
            maxInvest={settings.maxInvest}
            investStep={settings.investStep}
            balance={pointsBalance}
          />
        ) : (
          <p style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--faint)", fontSize: 13, margin: 0 }}>
            <Clock size={14} /> New investments are paused right now — your existing investments and earnings above are unaffected.
          </p>
        )}
      </div>

      {!me?.boosted && (
        <div className="card" style={{ padding: 26 }}>
          <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>
            <Users size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
            Unlock the boosted rate
          </h3>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
            Your direct referrals have invested ${me?.directTotal ?? 0} so far. Once that reaches $
            {settings.boostThresholdUsdt} total, your daily rate permanently jumps from{" "}
            {Number(settings.baseDailyRoiPercent)}% to {Number(settings.boostedDailyRoiPercent)}% — $
            {directRemaining} to go.
          </p>
        </div>
      )}

      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>Level income — 20 levels deep</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          A share of your downline&apos;s daily ROI, paid up through your sponsor chain.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8 }}>
          {tiers.map((t) => (
            <div
              key={t.level}
              style={{ padding: "10px 8px", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center" }}
            >
              <div style={{ fontSize: 11, color: "var(--faint)" }}>Lv {t.level}</div>
              <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{Number(t.percent)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>Your ROI plan activity</h3>
        {txs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📈</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>No activity yet — make your first investment above.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Type", "Amount", "When"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 0",
                      textAlign: i === 1 ? "right" : "left",
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
              {txs.map((t) => {
                const isIncome = t.type !== "roi_investment";
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "11px 0" }}>{TX_LABELS[t.type] ?? t.type}</td>
                    <td
                      className="mono"
                      style={{ textAlign: "right", fontWeight: 700, color: t.points >= 0 ? "#10b981" : "var(--faint)" }}
                    >
                      {t.points >= 0 ? "+" : ""}
                      {Number.isInteger(t.points) ? t.points : t.points.toFixed(4)}
                      {isIncome && (
                        <div style={{ fontSize: 10.5, fontWeight: 400, color: "var(--faint)", marginTop: 2 }}>
                          {(t.points / 2).toFixed(4)} USDT + {(t.points / 2).toFixed(4)} Token
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
