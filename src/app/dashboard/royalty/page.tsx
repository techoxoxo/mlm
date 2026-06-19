import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getRoyaltyOverview } from "@/lib/royalty";
import { getMyRoyalty } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
  const prog = nextTier ? Math.min(100, Math.round(((directs - prevMin) / (nextTier.minDirects - prevMin)) * 100)) : 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Gift size={18} color="var(--gold-bright)" />
          <h3 style={{ fontSize: 17, margin: 0 }}>Royalty rewards</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14 }}>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Direct referrals</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>{directs}</div>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Current rank</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, color: me?.band ? "var(--gold-bright)" : "var(--faint)" }}>
              {me?.band ? `${me.band.label} · ${me.band.percent}%` : "Unranked"}
            </div>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Royalty earned</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--gold-bright)" }}>{(me?.earned ?? 0).toLocaleString()}</div>
          </div>
        </div>

        {nextTier && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Progress to {nextTier.label} ({nextTier.percent}%)</span>
              <span className="mono" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>{toNext} to go</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{ width: `${prog}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--gold), var(--gold-soft))" }} />
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>How royalty ranks work</h3>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "0 0 14px" }}>
          A share of every join feeds a shared pool, paid out 3× a month. The more players you directly refer, the bigger your rank and share.
        </p>
        <table className="table">
          <thead><tr><th>Rank</th><th>Direct referrals</th><th style={{ textAlign: "right" }}>Pool share</th></tr></thead>
          <tbody>
            {royalty.tiers.map((t) => {
              const here = me?.band?.minDirects === t.minDirects;
              return (
                <tr key={t.minDirects} style={here ? { background: "rgba(248,198,23,0.08)" } : undefined}>
                  <td style={{ fontWeight: here ? 700 : 400, color: here ? "var(--gold-bright)" : "var(--text)" }}>{t.label}{here ? " · you" : ""}</td>
                  <td>{t.minDirects}+</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{t.percent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Your royalty payouts</h3>
        {payouts.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No royalty payouts yet — refer 10+ players to reach Bronze rank.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Type</th><th>Rank</th><th style={{ textAlign: "right" }}>Amount</th><th style={{ textAlign: "right" }}>When</th></tr></thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.kind === "rank" ? "Rank reward" : "Reserve reward"}</td>
                  <td>{p.bandPercent ? `${p.bandPercent}%` : "—"}</td>
                  <td className="mono gold" style={{ textAlign: "right", color: "var(--gold-bright)" }}>+{p.amount}</td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
