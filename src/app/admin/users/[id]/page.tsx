import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserJourney } from "@/lib/queries";
import { memberCode } from "@/db/schema";
import { toggleAutoUpgradeAction, manuallyActivateUserAction, reverseExitAction, manuallyInvestRoiPlanAction } from "@/app/actions/admin";
import { getRoiSettings, getRoiDirectsPerformance, getRoiOverview } from "@/lib/roiPlan";
import { RoiReverseButton } from "@/components/RoiReverseButton";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  id_pin_fee: "ID & PIN fee",
  royalty_fee: "Royalty contribution",
  activation_fee: "Activation",
  upgrade_fee: "Upgrade fee",
  slot_credit: "Slot credit",
  referral_bonus: "Sponsor reward",
  exit_payout: "Exit payout",
  upgrade_take: "Upgrade",
  company_fee: "House cut",
  royalty_payout: "Royalty rank",
  royalty_reserve_reward: "Royalty reserve",
  adjustment: "Adjustment",
  usdt_deposit: "USDT deposit",
  usdt_withdrawal: "USDT withdrawal",
  roi_investment: "ROI investment",
  roi_direct_income: "ROI direct income",
  roi_daily_payout: "ROI daily payout",
  roi_level_income: "ROI level income",
};

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 14 }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 3, color: accent ? "var(--gold-bright)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ fontSize: 15, margin: 0 }}>{title}</h3>
      {sub && <p style={{ color: "var(--faint)", fontSize: 12.5, margin: "4px 0 0" }}>{sub}</p>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

export default async function UserJourney({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getUserJourney(id);
  if (!data) notFound();
  const { user, sponsor, totalEarned, directs, ownedSlots, completions, ledger, royalties } = data;

  const filled = ownedSlots.filter((s) => s.status === "filled").length;

  const roiSettings = await getRoiSettings();
  const roiCap = user.roiInvested * roiSettings.capMultiplier;
  const roiInvestOptions = Array.from(
    { length: Math.floor((roiSettings.maxInvest - roiSettings.minInvest) / roiSettings.investStep) + 1 },
    (_, i) => roiSettings.minInvest + i * roiSettings.investStep,
  );
  const roiDirects = await getRoiDirectsPerformance(user.id);
  const roiOverview = await getRoiOverview(user.id);
  const roiInvestments = roiOverview.me?.investments ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Link href="/admin/users" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 13 }}>
        <ArrowLeft size={15} /> Back to players
      </Link>

      {/* header */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22 }}>{user.name}</h2>
              <span className="pill pill-gold mono">{memberCode(user.serialNo)}</span>
              <span className="pill" style={{ textTransform: "capitalize" }}>{user.status}</span>

              {user.status === "registered" && (
                <form action={async () => {
                  "use server";
                  await manuallyActivateUserAction(user.id);
                }}>
                  <button
                    type="submit"
                    className="pill"
                    style={{
                      background: "rgba(0, 230, 118, 0.08)",
                      border: "1px solid rgba(0, 230, 118, 0.25)",
                      color: "#00e676",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ⚡ Mark Active
                  </button>
                </form>
              )}

              {(user.status === "exited" || user.status === "completed") && (
                <form action={async () => {
                  "use server";
                  await reverseExitAction(user.id);
                }}>
                  <button
                    type="submit"
                    className="pill"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ↩️ Reverse Exit
                  </button>
                </form>
              )}
              
              <form action={async () => {
                "use server";
                await toggleAutoUpgradeAction(user.id, !user.autoUpgrade);
              }}>
                <button type="submit" className={user.autoUpgrade ? "pill pill-gold" : "pill"} style={{ border: "1px solid var(--border)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                  {user.autoUpgrade ? "⚙️ Auto-Upgrade: ON" : "⚙️ Auto-Upgrade: OFF"}
                </button>
              </form>
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "6px 0 0" }}>{user.email}</p>
            <p style={{ color: "var(--faint)", fontSize: 12.5, margin: "4px 0 0" }}>
              Referral code <b style={{ color: "var(--text)", letterSpacing: 1 }}>{user.referralCode}</b>
              {sponsor ? (
                <> · sponsored by <Link href={`/admin/users/${sponsor.id}`} style={{ color: "var(--gold-bright)" }}>{sponsor.name} ({memberCode(sponsor.serialNo!)})</Link></>
              ) : (
                <> · direct signup (no sponsor)</>
              )}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Points balance</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>{user.pointsBalance.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginTop: 18 }}>
          <Stat label="Current tier" value={user.currentSlab ? `T${user.currentSlab}` : "—"} />
          <Stat label="Total earned" value={totalEarned.toLocaleString()} accent />
          <Stat label="Direct referrals" value={String(directs.length)} />
          <Stat label="Slots filled (cur.)" value={`${filled}/${ownedSlots.filter((s) => s.slabLevel === user.currentSlab).length || 0}`} />
          <Stat label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
        </div>
      </div>

      {/* slots / downline */}
      <Card title="Slots & downline" sub="Players placed beneath this user, by stage (who filled each slot).">
        {ownedSlots.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No slots opened yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Stage</th><th>Slot</th><th>Status</th><th>Filled by</th><th style={{ textAlign: "right" }}>When</th></tr></thead>
            <tbody>
              {ownedSlots.map((s, i) => (
                <tr key={i}>
                  <td>Tier {s.slabLevel}</td>
                  <td>#{s.position}</td>
                  <td><span className={s.status === "filled" ? "pill pill-gold" : "pill"}>{s.status}</span></td>
                  <td>{s.occName ? `${s.occName} (${memberCode(s.occSerial!)})` : "—"}</td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>{s.filledAt ? new Date(s.filledAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* direct referrals */}
      <Card title={`Direct referrals (${directs.length})`}>
        {directs.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No direct referrals.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Member</th><th>Code</th><th>Stage</th><th>Status</th><th style={{ textAlign: "right" }}>Joined</th></tr></thead>
            <tbody>
              {directs.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/admin/users/${r.id}`} style={{ color: "var(--gold-bright)" }}>{r.name}</Link></td>
                  <td className="mono" style={{ fontSize: 12 }}>{memberCode(r.serialNo)}</td>
                  <td>{r.slab || "—"}</td>
                  <td><span className="pill">{r.status}</span></td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* stage decisions */}
      <Card title="Stage history">
        {completions.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No stages completed yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Stage</th><th>Collected</th><th>Decision</th><th style={{ textAlign: "right" }}>Payout / kept</th></tr></thead>
            <tbody>
              {completions.map((c) => (
                <tr key={c.id}>
                  <td>Tier {c.slabLevel}</td>
                  <td className="mono">{c.collected}</td>
                  <td><span className="pill">{c.status}</span></td>
                  <td className="mono" style={{ textAlign: "right" }}>{c.payout ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* royalty */}
      {royalties.length > 0 && (
        <Card title="Royalty payouts">
          <table className="table">
            <thead><tr><th>Kind</th><th>Directs</th><th>Band</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {royalties.map((r) => (
                <tr key={r.id}>
                  <td>{r.kind === "rank" ? "Rank reward" : "Reserve"}</td>
                  <td>{r.directs ?? "—"}</td>
                  <td>{r.bandPercent ? `${r.bandPercent}%` : "—"}</td>
                  <td className="mono gold" style={{ textAlign: "right" }}>+{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ROI plan */}
      <Card title="ROI plan" sub="Independent of the tier/matrix system above.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 18 }}>
          <Stat label="Invested" value={`$${user.roiInvested.toLocaleString()}`} />
          <Stat label="USDT earned" value={`$${Number(user.roiEarned).toFixed(2)}`} accent />
          <Stat label="Token earned" value={Number(user.roiTokenEarned).toFixed(2)} accent />
          <Stat label={`Cap (${roiSettings.capMultiplier}×)`} value={`$${roiCap.toLocaleString()}`} />
          <Stat label="Directs' investment" value={`$${user.roiDirectTotal.toLocaleString()}`} />
          <Stat label="Rate" value={user.roiBoosted ? "Boosted" : "Base"} accent={user.roiBoosted} />
        </div>

        {user.status !== "active" && (
          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#ef4444",
              fontSize: 12.5,
              margin: "0 0 14px",
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            ⚠️ Account status is <b style={{ textTransform: "capitalize" }}>{user.status}</b>, not active — investing
            and all earning (direct/daily/level income) are paused for this user until their account is active again.
          </p>
        )}
        <form
          action={async (form: FormData) => {
            "use server";
            const amount = Number(form.get("amount"));
            await manuallyInvestRoiPlanAction(user.id, amount);
          }}
          style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Manually fund + invest:</label>
          <select name="amount" className="input" defaultValue={roiSettings.minInvest} style={{ width: 120 }}>
            {roiInvestOptions.map((a) => (
              <option key={a} value={a}>${a}</option>
            ))}
          </select>
          <button
            type="submit"
            className="pill"
            disabled={user.status !== "active"}
            style={{
              background: "rgba(111,195,247,0.08)",
              border: "1px solid rgba(111,195,247,0.25)",
              color: "#6fc3f7",
              cursor: user.status === "active" ? "pointer" : "not-allowed",
              opacity: user.status === "active" ? 1 : 0.5,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            📈 Approve & Invest
          </button>
        </form>
        <p style={{ color: "var(--faint)", fontSize: 12, margin: "8px 0 0" }}>
          Credits a completed manual deposit for the chosen amount, then invests it — pays the sponsor&apos;s direct
          income and updates their boost status exactly like a real investment would.
        </p>

        <div id="investments" style={{ marginTop: 22, scrollMarginTop: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "var(--muted)" }}>
            Investments ({roiInvestments.length})
          </h4>
          {roiInvestments.length === 0 ? (
            <p style={{ color: "var(--faint)", fontSize: 13 }}>No investments yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {roiInvestments.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    opacity: inv.active ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>${inv.amount.toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: "var(--faint)" }}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                    {!inv.active && (
                      <span className="pill" style={{ fontSize: 10.5, background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                        Reversed
                      </span>
                    )}
                  </div>
                  {inv.active && <RoiReverseButton investmentId={inv.id} amount={inv.amount} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 22 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "var(--muted)" }}>
            Directs&apos; ROI plan performance ({roiDirects.length})
          </h4>
          {roiDirects.length === 0 ? (
            <p style={{ color: "var(--faint)", fontSize: 13 }}>No direct referrals.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ textAlign: "right" }}>Invested</th>
                  <th style={{ textAlign: "right" }}>USDT earned</th>
                  <th style={{ textAlign: "right" }}>Token earned</th>
                  <th style={{ textAlign: "right" }}>Cap</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {roiDirects.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/admin/users/${d.id}`} style={{ color: "var(--gold-bright)" }}>{d.name}</Link>
                      <span className="mono" style={{ fontSize: 11, color: "var(--faint)", marginLeft: 8 }}>{memberCode(d.serialNo)}</span>
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>${d.invested.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: "right", color: "#10b981" }}>${d.earned.toFixed(2)}</td>
                    <td className="mono" style={{ textAlign: "right", color: "#f0b429" }}>{d.tokenEarned.toFixed(2)}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--faint)" }}>${d.cap.toLocaleString()}</td>
                    <td>
                      {d.invested === 0 ? (
                        <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>
                      ) : d.boosted ? (
                        <span className="pill" style={{ background: "rgba(111,195,247,0.1)", color: "#6fc3f7", border: "1px solid rgba(111,195,247,0.25)" }}>Boosted</span>
                      ) : (
                        <span className="pill">Base</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* full ledger */}
      <Card title="Full ledger" sub={`Complete transaction journey (latest ${ledger.length}).`}>
        {ledger.length === 0 ? (
          <p style={{ color: "var(--faint)", fontSize: 14 }}>No transactions.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Type</th><th>Detail</th><th style={{ textAlign: "right" }}>Points</th><th style={{ textAlign: "right" }}>Balance</th><th style={{ textAlign: "right" }}>When</th></tr></thead>
            <tbody>
              {ledger.map((t) => (
                <tr key={t.id}>
                  <td><span className="pill">{TYPE_LABEL[t.type] ?? t.type}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{t.note}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: t.points >= 0 ? "var(--gold-bright)" : "var(--muted)" }}>{t.points >= 0 ? "+" : ""}{t.points}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{t.balanceAfter}</td>
                  <td style={{ textAlign: "right", color: "var(--faint)", fontSize: 11 }}>{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
