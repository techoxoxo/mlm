import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getRoyaltyOverview } from "@/lib/royalty";
import { RoyaltyRunButton } from "@/components/RoyaltyRunButton";

export const dynamic = "force-dynamic";

export default async function RoyaltyAdmin() {
  const { pool, tiers } = await getRoyaltyOverview();
  const runs = await db.select().from(schema.royaltyRuns).orderBy(desc(schema.royaltyRuns.createdAt)).limit(10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Royalty pool</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--gold-bright)" }}>{pool.royaltyPool.toLocaleString()}</div>
          <div style={{ color: "var(--faint)", fontSize: 12 }}>collected, awaiting distribution</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Reserve fund (5%)</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>{pool.royaltyReserve.toLocaleString()}</div>
          <div style={{ color: "var(--faint)", fontSize: 12 }}>for 6-month non-achievers</div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Distribute royalty</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px", maxWidth: 620 }}>
          Splits the pool into per-rank sub-pools (shared by each band&apos;s members), holds back 5% for the reserve,
          then pays the accumulated reserve to players inactive for 6+ months. Intended to run ~3×/month on fixed dates.
        </p>
        <RoyaltyRunButton />
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Rank tiers</h3>
        <table className="table">
          <thead>
            <tr><th>Rank</th><th>Direct referrals</th><th style={{ textAlign: "right" }}>Pool share</th></tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.minDirects}>
                <td>{t.label}</td>
                <td>{t.minDirects}+</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{t.percent}%</td>
              </tr>
            ))}
            <tr>
              <td style={{ color: "var(--muted)" }}>Reserve</td>
              <td style={{ color: "var(--muted)" }}>inactive 6 mo</td>
              <td style={{ textAlign: "right", fontWeight: 600, color: "var(--muted)" }}>5%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent distributions</h3>
        {runs.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No distributions yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>When</th><th>Pool</th><th>Rank paid</th><th>Reserve paid</th><th style={{ textAlign: "right" }}>Recipients</th></tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.poolBefore}</td>
                  <td>{r.rankDistributed}</td>
                  <td>{r.reserveDistributed}</td>
                  <td style={{ textAlign: "right" }}>{r.rankRecipients + r.reserveRecipients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
