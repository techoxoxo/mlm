import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, Network, GitFork, Repeat, ShieldCheck } from "lucide-react";
import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import { MatrixVisual } from "@/components/MatrixVisual";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const slabRows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const session = await getSession();

  // live ticker — recent earnings, newest first
  const ticker = await db
    .select({ name: schema.users.name, points: schema.transactions.points, slab: schema.transactions.slabLevel })
    .from(schema.transactions)
    .innerJoin(schema.users, eq(schema.users.id, schema.transactions.userId))
    .where(sql`${schema.transactions.points} > 0`)
    .orderBy(desc(schema.transactions.createdAt))
    .limit(12);

  const tickerItems =
    ticker.length >= 4
      ? ticker.map((t) => `${t.name} earned +${t.points} pts at Tier ${t.slab ?? 1}`)
      : [
          "Maya filled both Starter slots",
          "Devon climbed to Tier 3 · Silver",
          "Aria earned +150 pts",
          "Noah cashed out at 30%",
          "Priya activated · Tier 1",
          "Leo upgraded to Gold",
        ];

  const reversed = [...slabRows].reverse(); // apex first

  return (
    <main>
      {/* nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backdropFilter: "blur(14px)",
          background: "rgba(7,6,5,0.6)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 68 }}>
          <Logo size={21} />
          <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <Link href="#ladder" style={{ fontSize: 14, color: "var(--muted)" }}>The ladder</Link>
            <Link href="#how" style={{ fontSize: 14, color: "var(--muted)" }}>How it works</Link>
            {session ? (
              <Link href={session.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-primary">
                Dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/login" className="btn btn-ghost">Log in</Link>
                <Link href="/register" className="btn btn-primary">Start climbing</Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="container" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center", padding: "76px 24px 40px" }}>
        <div className="rise">
          <span className="kicker"><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--green-bright)", display: "inline-block" }} />Virtual points · five tiers · zero real money</span>
          <h1 style={{ fontSize: 64, marginTop: 22, marginBottom: 0 }}>
            Build your network.
            <br />
            <span style={{ background: "linear-gradient(100deg, var(--green-bright), var(--lime))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Watch it compound.
            </span>
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 18, maxWidth: 480, marginTop: 22, lineHeight: 1.65 }}>
            Apex is a strategy game played on a living matrix. Refer players, fill your slots on a
            first-in-first-out queue, and at every tier make the call — take the payout or climb higher.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
            <Link href="/register" className="btn btn-primary" style={{ padding: "14px 26px", fontSize: 15 }}>
              Start climbing <ArrowUpRight size={17} />
            </Link>
            <Link href="#ladder" className="btn btn-ghost" style={{ padding: "14px 26px", fontSize: 15 }}>
              See the tiers
            </Link>
          </div>
          <div style={{ display: "flex", gap: 36, marginTop: 44 }}>
            {[["5", "tiers to climb"], ["62", "slots to the top"], ["FIFO", "fair placement"]].map(([n, l]) => (
              <div key={l}>
                <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{n}</div>
                <div style={{ fontSize: 13, color: "var(--faint)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rise" style={{ animationDelay: "0.1s" }}>
          <div className="card" style={{ padding: 28, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="pill pill-green"><Network size={13} /> Your matrix</span>
              <span style={{ fontSize: 12, color: "var(--faint)" }}>live</span>
            </div>
            <MatrixVisual />
          </div>
        </div>
      </section>

      {/* live ticker */}
      <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", overflow: "hidden", padding: "13px 0", background: "rgba(255,255,255,0.012)" }}>
        <div style={{ display: "flex", width: "max-content", animation: "marquee 32s linear infinite", gap: 0 }}>
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0 28px", fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--green)" }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* the ladder */}
      <section id="ladder" className="container" style={{ padding: "80px 24px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 40 }}>
          <div>
            <span className="kicker">The ladder</span>
            <h2 style={{ fontSize: 38, marginTop: 14 }}>Five tiers. Each one steeper.</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 360, fontSize: 15 }}>
            More slots to fill, bigger pools to collect. Climb from Starter to the Apex tier — or step off with your payout at any rung.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reversed.map((s, idx) => {
            const isApex = idx === 0;
            const fillPct = 30 + (reversed.length - 1 - idx) * (60 / Math.max(1, reversed.length - 1));
            return (
              <div
                key={s.level}
                className={`card card-hover ${isApex ? "card-feature" : ""}`}
                style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", alignItems: "center", gap: 24, padding: "22px 26px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="mono" style={{ fontSize: 30, fontWeight: 600, color: isApex ? "var(--gold)" : "var(--faint)" }}>
                    {String(s.level).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--faint)" }}>{s.slots} slots</div>
                  </div>
                </div>

                <div>
                  <div style={{ height: 8, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden", maxWidth: 420 }}>
                    <div style={{ width: `${Math.min(95, fillPct)}%`, height: "100%", borderRadius: 99, background: isApex ? "linear-gradient(90deg, #f0c478, var(--gold))" : "linear-gradient(90deg, var(--green), var(--lime))" }} />
                  </div>
                  <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
                    <span>Exit keeps {s.exitPercent}%</span>
                    <span>·</span>
                    <span>Upgrade pockets {s.upgradeTakePercent}%</span>
                    {s.referralBonus > 0 && <><span>·</span><span>+{s.referralBonus} referral</span></>}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>{s.fee.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)" }}>points to enter</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="container" style={{ padding: "60px 24px 40px" }}>
        <span className="kicker">How it works</span>
        <h2 style={{ fontSize: 38, marginTop: 14, marginBottom: 36 }}>From join to payout.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {[
            { icon: GitFork, t: "Join & activate", d: "Sign up with a referral link, activate into Tier 1, and open your first two slots." },
            { icon: Network, t: "Fill your slots", d: "New players drop into the oldest open slots first. Every fill credits your balance." },
            { icon: Repeat, t: "Exit or climb", d: "When a tier completes, take a percentage and leave — or pocket a cut and upgrade." },
            { icon: ShieldCheck, t: "Provably fair", d: "Queue-backed placement and a row-locked, append-only ledger keep every point honest." },
          ].map((f, i) => (
            <div key={f.t} className="card card-hover rise" style={{ padding: 24, animationDelay: `${i * 0.06}s` }}>
              <span style={{ display: "inline-flex", width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)" }}>
                <f.icon size={20} color="var(--green-bright)" />
              </span>
              <h3 style={{ fontSize: 17, marginTop: 16, marginBottom: 7 }}>{f.t}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container" style={{ padding: "50px 24px 90px" }}>
        <div className="card" style={{ padding: "56px 40px", textAlign: "center", overflow: "hidden", borderColor: "rgba(212,175,55,0.22)", background: "radial-gradient(600px 240px at 50% 0%, rgba(212,175,55,0.12), transparent 70%), var(--surface)" }}>
          <h2 style={{ fontSize: 40 }}>Ready to climb?</h2>
          <p style={{ color: "var(--muted)", fontSize: 16, maxWidth: 420, margin: "14px auto 28px" }}>
            Spin up an account, grab your referral link, and start filling your matrix in minutes.
          </p>
          <Link href="/register" className="btn btn-primary" style={{ padding: "14px 30px", fontSize: 15 }}>
            Create your account <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, padding: "28px 24px" }}>
          <Logo size={18} />
          <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
            A virtual-points strategy game. No real money, deposits, or withdrawals.
          </p>
        </div>
      </footer>
    </main>
  );
}
