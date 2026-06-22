import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card" style={{ padding: 24 }}>{children}</div>;
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>{children}</div>;
}

export default async function Guide() {
  const [settings] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  const slabs = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const tiers = await db.select().from(schema.royaltyTiers).orderBy(asc(schema.royaltyTiers.minDirects));
  const s1 = slabs.find((s) => s.level === 1);
  const total = settings.idPinFee + (s1?.fee ?? 0) + settings.royaltyFee;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <Kicker>How to play</Kicker>
        <h2 style={{ fontSize: 26, margin: "0 0 8px" }}>Build your network, climb the matrix.</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Revolutionary Income Plan is a strategy game on a fair, first-in-first-out queue. You join once, take a position, and earn points
          as new players fill your slots. At every stage you choose: cash out, or climb higher.
        </p>
      </Card>

      <Card>
        <Kicker>1 · Joining — {total} points</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginTop: 4 }}>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 14 }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold-bright)" }}>{settings.idPinFee}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>ID &amp; PIN — {settings.sponsorReward} to your sponsor, rest to system</div>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 14 }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold-bright)" }}>{s1?.fee}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Autopool — enters you into Stage 1</div>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 14 }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold-bright)" }}>{settings.royaltyFee}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>Royalty — into the shared pool</div>
          </div>
        </div>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "12px 0 0" }}>Pay once — every upgrade afterwards is funded from your earnings, never a top-up.</p>
      </Card>

      <Card>
        <Kicker>2 · The five stages</Kicker>
        <table className="table">
          <thead><tr><th>Stage</th><th>Slots to fill</th><th>Entry</th><th style={{ textAlign: "right" }}>Pool you collect</th></tr></thead>
          <tbody>
            {slabs.map((s) => (
              <tr key={s.level}>
                <td><b>{s.level} · {s.name}</b></td>
                <td>{s.slots}</td>
                <td className="mono">{s.fee.toLocaleString()}</td>
                <td className="mono" style={{ textAlign: "right", color: "var(--gold-bright)", fontWeight: 700 }}>{(s.fee * s.slots).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "var(--faint)", fontSize: 13, margin: "12px 0 0" }}>New players drop into the oldest open slot first (FIFO). Each filled slot pays you that stage&apos;s entry fee.</p>
      </Card>

      <Card>
        <Kicker>3 · Your move at each stage</Kicker>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 16 }}>
            <b>Exit</b>
            <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
              {slabs.map((s) => (
                <li key={s.level}>{s.name}: keep <b style={{ color: "var(--text)" }}>{s.level === slabs.length ? 100 : s.exitPercent}%</b></li>
              ))}
            </ul>
          </div>
          <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 16 }}>
            <b>Upgrade</b>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
              The next stage&apos;s entry fee is taken from your earnings as a seed — you keep everything left over and
              re-enter at the bigger stage. Bigger stage → more slots → larger pool.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <Kicker>4 · Royalty rewards</Kicker>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, margin: "0 0 12px" }}>
          Refer players directly (your link) to earn a share of the royalty pool, paid 3× a month. The 5% reserve helps
          players who haven&apos;t cleared a stage in 6 months stay in the game.
        </p>
        <table className="table">
          <thead><tr><th>Rank</th><th>Direct referrals</th><th style={{ textAlign: "right" }}>Pool share</th></tr></thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.minDirects}><td>{t.label}</td><td>{t.minDirects}+</td><td style={{ textAlign: "right", fontWeight: 600 }}>{t.percent}%</td></tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p style={{ textAlign: "center", color: "var(--faint)", fontSize: 12.5, margin: "4px 0 8px" }}>
        Revolutionary Income Plan is a virtual-points game — no real money, deposits, or withdrawals.
      </p>
    </div>
  );
}
