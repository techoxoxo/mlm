import { redirect } from "next/navigation";
import { Gift, Star, Target, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getRoyaltyOverview } from "@/lib/royalty";
import { getMyRoyalty } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BAND_COLORS: Record<string, string> = {
  Bronze:   "#c0a060",
  Silver:   "#a0a0b0",
  Gold:     "#f8c617",
  Platinum: "#e88aff",
  Diamond:  "#6fc3f7",
};

export default async function MyRoyalty() {
  const session = await getSession();
  if (!session) redirect("/login");
  const royalty = await getRoyaltyOverview(session.uid);
  const { payouts } = await getMyRoyalty(session.uid);
  const me = royalty.me!;
  const directs = me?.directs ?? 0;
  const nextTier = royalty.tiers.find((t) => t.minDirects > directs);
  const toNext = nextTier ? nextTier.minDirects - directs : 0;
  const prevMin = royalty.me?.band?.minDirects ?? 0;
  const prog = nextTier
    ? Math.min(100, Math.round(((directs - prevMin) / (nextTier.minDirects - prevMin)) * 100))
    : 100;

  const bandColor = me?.band?.label ? (BAND_COLORS[me.band.label] ?? "var(--gold)") : "var(--faint)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* header */}
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(248,198,23,0.07) 0%, var(--surface) 70%)",
          border: "1px solid rgba(248,198,23,0.2)",
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
              background: "rgba(248,198,23,0.12)",
              border: "1px solid rgba(248,198,23,0.25)",
            }}
          >
            <Gift size={19} color="var(--gold-bright)" />
          </span>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>Royalty Program</h2>
            <p style={{ color: "var(--faint)", fontSize: 13, margin: "2px 0 0" }}>
              Earn a share of the global pool via direct referrals
            </p>
          </div>
        </div>
        {me?.band && (
          <span
            style={{
              padding: "6px 16px",
              borderRadius: 99,
              background: `${bandColor}18`,
              border: `1px solid ${bandColor}40`,
              color: bandColor,
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.05em",
            }}
          >
            <Star size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
            {me.band.label} rank · {me.band.percent}% pool share
          </span>
        )}
      </div>

      {/* stats + progress */}
      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 22 }}>
          {[
            { label: "Direct referrals", value: String(directs), icon: TrendingUp, color: "#6fc3f7" },
            {
              label: "Current rank",
              value: me?.band ? `${me.band.label} · ${me.band.percent}%` : "Unranked",
              icon: Star,
              color: bandColor,
            },
            { label: "Royalty earned", value: (me?.earned ?? 0).toLocaleString(), icon: Gift, color: "var(--gold-bright)" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: 18,
                borderRadius: 14,
                background: `${stat.color}0d`,
                border: `1px solid ${stat.color}25`,
              }}
            >
              <stat.icon size={16} color={stat.color} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{stat.label}</div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {nextTier && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>
                <Target size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }} />
                Progress to {nextTier.label} ({nextTier.percent}%)
              </span>
              <span className="mono" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
                {toNext} more to go
              </span>
            </div>
            <div
              style={{ height: 9, borderRadius: 99, background: "var(--bg-2)", overflow: "hidden" }}
            >
              <div
                style={{
                  width: `${prog}%`,
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

      {/* ranks table */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>Royalty rank tiers</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          A share of every join feeds a shared pool, paid out 3× a month.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Rank", "Directs needed", "Pool share"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 0",
                    textAlign: i === 2 ? "right" : "left",
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
            {royalty.tiers.map((t) => {
              const here = me?.band?.minDirects === t.minDirects;
              const tc = BAND_COLORS[t.label] ?? "var(--muted)";
              return (
                <tr
                  key={t.minDirects}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: here ? `${tc}0d` : "transparent",
                  }}
                >
                  <td style={{ padding: "11px 0" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: here ? tc : "var(--text)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {here && <Star size={13} color={tc} />}
                      {t.label}
                      {here && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: tc,
                            padding: "2px 7px",
                            borderRadius: 99,
                            background: `${tc}18`,
                            border: `1px solid ${tc}30`,
                          }}
                        >
                          you
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{t.minDirects}+ referrals</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: tc }} className="mono">
                    {t.percent}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* payout history */}
      <div className="card" style={{ padding: 26 }}>
        <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>Your royalty payouts</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 20px" }}>
          Historical payouts from the royalty pool.
        </p>
        {payouts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
            <p style={{ color: "var(--faint)", fontSize: 14, margin: 0 }}>
              No royalty payouts yet — refer 10+ players to reach Bronze rank.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Type", "Rank", "Amount", "When"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 0",
                      textAlign: i >= 2 ? "right" : "left",
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
              {payouts.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 0", color: "var(--text)" }}>
                    {p.kind === "rank" ? "Rank reward" : "Reserve reward"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {p.bandPercent ? `${p.bandPercent}%` : "—"}
                  </td>
                  <td
                    style={{ textAlign: "right", fontWeight: 700, color: "var(--gold-bright)" }}
                    className="mono"
                  >
                    +{p.amount.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>
                    {new Date(p.createdAt).toLocaleDateString()}
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
