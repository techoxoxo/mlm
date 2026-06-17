import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserJourney } from "@/lib/queries";
import { memberCode } from "@/db/schema";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Link href="/admin/users" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 13 }}>
        <ArrowLeft size={15} /> Back to players
      </Link>

      {/* header */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 style={{ fontSize: 22 }}>{user.name}</h2>
              <span className="pill pill-gold mono">{memberCode(user.serialNo)}</span>
              <span className="pill" style={{ textTransform: "capitalize" }}>{user.status}</span>
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
          <Stat label="Current stage" value={user.currentSlab ? `Tier ${user.currentSlab}` : "—"} />
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
