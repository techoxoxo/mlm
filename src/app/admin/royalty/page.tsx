import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getRoyaltyOverview, getRoyaltyEligibleUsers } from "@/lib/royalty";
import { RoyaltyRunButton } from "@/components/RoyaltyRunButton";
import { updateRoyaltyTierAction } from "@/app/actions/admin";
import { SettingsLockWrapper } from "@/components/SettingsLockWrapper";
import { memberCode } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function RoyaltyAdmin() {
  const { pool, tiers } = await getRoyaltyOverview();
  const runs = await db.select().from(schema.royaltyRuns).orderBy(desc(schema.royaltyRuns.createdAt)).limit(10);
  const eligibleUsers = await getRoyaltyEligibleUsers();

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22, alignItems: "start" }}>
        <div className="card" style={{ padding: 24 }}>
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

        <div className="card" style={{ padding: 24, height: "100%", overflowY: "auto" }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Eligible Royalty Members</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
            Current active users categorized by their highest qualifying royalty rank tier based on active direct referrals.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {eligibleUsers.map((t) => (
              <div key={t.minDirects} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{t.label}</h4>
                  <span className="pill pill-gold" style={{ fontSize: 11 }}>{t.percent}% Share</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginBottom: 10 }}>Threshold: {t.minDirects}+ directs</div>
                
                {t.members.length === 0 ? (
                  <div style={{ color: "var(--faint)", fontSize: 13, padding: "8px 0" }}>No members qualify.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {t.members.map((m) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.02)" }}>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{m.name}</div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{memberCode(m.serialNo)}</div>
                        </div>
                        <span className="pill" style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                          {m.directsCount} directs
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
