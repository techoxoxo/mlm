import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getRoyaltyOverview } from "@/lib/royalty";
import { RoyaltyRunButton } from "@/components/RoyaltyRunButton";
import { updateRoyaltyTierAction } from "@/app/actions/admin";
import { SettingsLockWrapper } from "@/components/SettingsLockWrapper";

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
          then pays the accumulated reserve to players inactive for 6+ months. Intended to run twice a month, on the 1st and 16th.
        </p>
        <RoyaltyRunButton />
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 640 }}>
        <SettingsLockWrapper title="Rank Tiers Config">
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "12px 0 16px" }}>
            Editable pool-share bands by direct-referral count. The reserve hold-back % is set on the Distribution page.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tiers.map((t) => (
              <form key={t.minDirects} action={updateRoyaltyTierAction} style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 90px", gap: 10, alignItems: "center" }}>
                <input type="hidden" name="minDirects" value={t.minDirects} />
                <span className="pill" style={{ textAlign: "center" }}>{t.minDirects}+ refs</span>
                <input name="label" defaultValue={t.label} className="input" />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input name="percent" type="number" min={0} max={100} defaultValue={t.percent} className="input" style={{ width: 70 }} />
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>%</span>
                </div>
                <button type="submit" className="btn btn-ghost" style={{ padding: "8px 12px", fontSize: 13 }}>Save</button>
              </form>
            ))}
          </div>
        </SettingsLockWrapper>
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
