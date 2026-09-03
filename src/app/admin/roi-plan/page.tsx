import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { memberCode } from "@/db/schema";
import { getRoiOverview, getRoiInvestorsOverview } from "@/lib/roiPlan";
import { RoiRunButton } from "@/components/RoiRunButton";
import { RoiToggleButton } from "@/components/RoiToggleButton";
import { RoiReverseButton } from "@/components/RoiReverseButton";
import { updateRoiSettingsAction, updateRoiLevelTierAction } from "@/app/actions/admin";
import { SettingsLockWrapper } from "@/components/SettingsLockWrapper";

export const dynamic = "force-dynamic";

export default async function RoiPlanAdmin() {
  const { settings, tiers } = await getRoiOverview();
  const investors = await getRoiInvestorsOverview();

  const [{ totalInvested }] = await db
    .select({ totalInvested: sql<number>`coalesce(sum(${schema.roiInvestments.amount}),0)::int` })
    .from(schema.roiInvestments)
    .where(sql`${schema.roiInvestments.active} = true`);

  const [{ investorCount }] = await db
    .select({ investorCount: sql<number>`count(distinct ${schema.roiInvestments.userId})::int` })
    .from(schema.roiInvestments);

  const [{ boostedCount }] = await db
    .select({ boostedCount: sql<number>`count(*)::int` })
    .from(schema.users)
    .where(sql`${schema.users.roiBoosted} = true`);

  const recentTx = await db
    .select()
    .from(schema.transactions)
    .where(sql`${schema.transactions.type} in ('roi_investment','roi_direct_income','roi_daily_payout','roi_level_income')`)
    .orderBy(desc(schema.transactions.createdAt))
    .limit(15);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="card" style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>ROI Plan visibility</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, maxWidth: 480 }}>
            While off, users see &quot;Coming Soon&quot; on the ROI Plan page and no investment (manual, form, or
            direct payment) is accepted anywhere in the app — enforced at the engine level, not just hidden in the UI.
          </p>
        </div>
        <RoiToggleButton enabled={settings.enabled} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Total invested</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "var(--gold-bright)" }}>
            ${totalInvested.toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Investors</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>{investorCount}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Boosted rate unlocked</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 700, color: "#6fc3f7" }}>{boostedCount}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>Invest for someone without payment</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, maxWidth: 480 }}>
            Go to <b>Admin → Users</b>, find the member (searchable), open their profile — the &quot;ROI plan&quot;
            card there has a <b>&quot;📈 Approve &amp; Invest&quot;</b> button that credits a completed manual deposit
            and invests it, exactly like a real investment (pays sponsor direct income, updates boost status).
          </p>
        </div>
        <Link href="/admin/users" className="btn btn-ghost" style={{ padding: "10px 18px", whiteSpace: "nowrap" }}>
          Go to Users →
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Run daily distribution</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px", maxWidth: 620 }}>
          Pays daily ROI on every active investment, plus the 20-level income it triggers up each sponsor chain.
          Runs automatically once a day (cron) — this button is only for manual/testing use. Safe to run any time:
          it catches up on any day that was ever missed (per investment), and re-running the same day pays nothing
          twice.
        </p>
        <RoiRunButton />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22, alignItems: "start" }}>
        <div className="card" style={{ padding: 24 }}>
          <SettingsLockWrapper title="ROI Plan Settings">
            <form action={updateRoiSettingsAction} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Min invest
                  <input name="minInvest" type="number" min={1} defaultValue={settings.minInvest} className="input" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Max invest
                  <input name="maxInvest" type="number" min={1} defaultValue={settings.maxInvest} className="input" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Step
                  <input name="investStep" type="number" min={1} defaultValue={settings.investStep} className="input" />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Base daily ROI %
                  <input
                    name="baseDailyRoiPercent"
                    type="number"
                    step="0.001"
                    min={0}
                    max={100}
                    defaultValue={settings.baseDailyRoiPercent}
                    className="input"
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Boosted daily ROI %
                  <input
                    name="boostedDailyRoiPercent"
                    type="number"
                    step="0.001"
                    min={0}
                    max={100}
                    defaultValue={settings.boostedDailyRoiPercent}
                    className="input"
                  />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Direct income %
                  <input
                    name="directIncomePercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={settings.directIncomePercent}
                    className="input"
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Boost threshold ($)
                  <input
                    name="boostThresholdUsdt"
                    type="number"
                    min={0}
                    defaultValue={settings.boostThresholdUsdt}
                    className="input"
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                  Cap multiplier (×)
                  <input
                    name="capMultiplier"
                    type="number"
                    min={1}
                    defaultValue={settings.capMultiplier}
                    className="input"
                  />
                </label>
              </div>
              <button type="submit" className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: "8px 16px" }}>
                Save settings
              </button>
            </form>
          </SettingsLockWrapper>
        </div>

        <div className="card" style={{ padding: 24, height: "100%", overflowY: "auto" }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Level income tiers</h3>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>
            % of a downline&apos;s daily ROI paid to each level of sponsor, up to 20 levels deep.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {tiers.map((t) => (
              <form
                key={t.level}
                action={updateRoiLevelTierAction}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <input type="hidden" name="level" value={t.level} />
                <span className="pill" style={{ minWidth: 46, textAlign: "center" }}>L{t.level}</span>
                <input
                  name="percent"
                  type="number"
                  step="0.001"
                  min={0}
                  max={100}
                  defaultValue={t.percent}
                  className="input"
                  style={{ width: 70 }}
                />
                <button type="submit" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }}>
                  Save
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Investors</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px" }}>
          Every user who has invested, their earnings against their cap, boost status, and how much their own directs
          have invested. Click a name for their full ledger, their individual directs&apos; performance, and to
          <b> reverse a specific investment</b> (refunds it to their wallet, requires the master password).
        </p>
        {investors.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No investors yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Account</th>
                  <th>Sponsor</th>
                  <th style={{ textAlign: "right" }}>Invested</th>
                  <th style={{ textAlign: "right" }}>USDT earned</th>
                  <th style={{ textAlign: "right" }}>Token earned</th>
                  <th style={{ textAlign: "right" }}>Cap</th>
                  <th style={{ textAlign: "right" }}>Directs&apos; invested</th>
                  <th>Rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {investors.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/admin/users/${inv.id}`} style={{ color: "var(--gold-bright)" }}>{inv.name}</Link>
                      <div className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{memberCode(inv.serialNo)}</div>
                    </td>
                    <td>
                      {inv.status === "active" ? (
                        <span className="pill" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>Active</span>
                      ) : (
                        <span
                          className="pill"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", textTransform: "capitalize" }}
                          title="Investing and all earning (direct/daily/level income) are paused while the account isn't active"
                        >
                          {inv.status}
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>
                      {inv.sponsorId ? (
                        <Link href={`/admin/users/${inv.sponsorId}`} style={{ color: "var(--muted)" }}>{inv.sponsorName}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>${inv.invested.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: "right", color: "#10b981" }}>${inv.earned.toFixed(2)}</td>
                    <td className="mono" style={{ textAlign: "right", color: "#f0b429" }}>{inv.tokenEarned.toFixed(2)}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--faint)" }}>${inv.cap.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: "right" }}>${inv.directTotal.toLocaleString()}</td>
                    <td>
                      {inv.boosted ? (
                        <span className="pill" style={{ background: "rgba(111,195,247,0.1)", color: "#6fc3f7", border: "1px solid rgba(111,195,247,0.25)" }}>Boosted</span>
                      ) : (
                        <span className="pill">Base</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {inv.activeInvestments.length === 1 ? (
                        <RoiReverseButton investmentId={inv.activeInvestments[0].id} amount={inv.activeInvestments[0].amount} />
                      ) : inv.activeInvestments.length > 1 ? (
                        <Link
                          href={`/admin/users/${inv.id}#investments`}
                          className="pill"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}
                          title={`${inv.activeInvestments.length} separate investments — pick which one to reverse`}
                        >
                          ↩️ Reverse ({inv.activeInvestments.length})…
                        </Link>
                      ) : (
                        <span style={{ color: "var(--faint)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent ROI plan activity</h3>
        {recentTx.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No activity yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>When</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th></tr>
            </thead>
            <tbody>
              {recentTx.map((t) => (
                <tr key={t.id}>
                  <td style={{ color: "var(--muted)" }}>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.type}</td>
                  <td style={{ textAlign: "right" }}>{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
