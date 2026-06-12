import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Sparkles, Network, GitFork, Repeat, ShieldCheck, Wallet } from "lucide-react";
import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import { MatrixVisual } from "@/components/MatrixVisual";
import { MascotScene, CoinField } from "@/components/HeroArt";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const slabRows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const session = await getSession();

  // live ticker — recent credits, newest first
  const ticker = await db
    .select({ name: schema.users.name, points: schema.transactions.points, slab: schema.transactions.slabLevel })
    .from(schema.transactions)
    .innerJoin(schema.users, eq(schema.users.id, schema.transactions.userId))
    .where(sql`${schema.transactions.points} > 0`)
    .orderBy(desc(schema.transactions.createdAt))
    .limit(14);

  const tickerItems =
    ticker.length >= 5
      ? ticker.map((t) => `${t.name.split(" ")[0]} earned +${t.points} pts · Tier ${t.slab ?? 1}`)
      : [
          "Maya earned +60 pts · Tier 1",
          "Devon climbed to Tier 3",
          "Aria earned +150 pts · Tier 2",
          "Noah cashed out 30%",
          "Priya activated · Tier 1",
          "Leo earned +200 pts · Tier 2",
          "Zara filled both slots · Tier 1",
        ];

  const reversed = [...slabRows].reverse();

  return (
    <main style={{ paddingBottom: 0 }}>
      {/* nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          backdropFilter: "blur(14px)",
          background: "rgba(12,11,7,0.7)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 72 }}>
          <Logo size={22} />
          <nav style={{ display: "flex", gap: 26, alignItems: "center" }}>
            <Link href="#ladder" style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>The ladder</Link>
            <Link href="#how" style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>How it works</Link>
            {session ? (
              <Link href={session.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-primary">
                <Wallet size={16} /> Dashboard
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

      {/* hero billboard row */}
      <section className="container" style={{ paddingTop: 36 }}>
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 210px", gap: 18, alignItems: "stretch" }}>
          {/* left art card */}
          <div className="card rise" style={{ padding: 16, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
            <MatrixVisual />
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--faint)", margin: "10px 0 0", fontWeight: 600 }}>
              the live matrix
            </p>
          </div>

          {/* center yellow billboard */}
          <div className="billboard rise" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", alignItems: "center", padding: "44px 12px 44px 48px", animationDelay: "0.05s" }}>
            <div>
              <h1 style={{ fontSize: 52, lineHeight: 1.04 }}>
                Welcome to<br />Apex
              </h1>
              <p style={{ fontSize: 17, fontWeight: 500, color: "#3d2f06", maxWidth: 340, margin: "16px 0 26px", lineHeight: 1.55 }}>
                Join the climb — refer, fill your slots, and grow your points through five tiers.
              </p>
              <Link href="/register" className="btn btn-white" style={{ fontSize: 16, padding: "15px 30px" }}>
                Join us now
              </Link>
            </div>
            <div style={{ minWidth: 0 }}>
              <MascotScene />
            </div>
          </div>

          {/* right coins card */}
          <div className="card rise" style={{ padding: 16, display: "flex", alignItems: "center", overflow: "hidden", animationDelay: "0.1s" }}>
            <CoinField />
          </div>
        </div>

        {/* dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 18 }}>
          <span style={{ width: 26, height: 7, borderRadius: 99, background: "var(--gold)" }} />
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--surface-3)" }} />
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--surface-3)" }} />
        </div>
      </section>

      {/* glowing center CTA with converging chevrons */}
      <section style={{ padding: "64px 24px 72px", display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
        <div className="chevron-row" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="chev chev-r" style={{ animation: `chev-pulse 1.6s ease-in-out ${i * 0.12}s infinite` }} />
          ))}
        </div>
        <Link href={session ? "/dashboard" : "/register"} className="btn glow-cta">
          <Sparkles size={19} /> {session ? "Open dashboard" : "Create account"}
        </Link>
        <div className="chevron-row" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="chev chev-l" style={{ animation: `chev-pulse 1.6s ease-in-out ${(7 - i) * 0.12}s infinite` }} />
          ))}
        </div>
      </section>

      {/* live ticker strip */}
      <div className="ticker-strip">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="ticker-item">
              <span className="coin-dot">★</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* the ladder */}
      <section id="ladder" className="container" style={{ padding: "84px 24px 40px" }}>
        <div className="section-head">
          <div>
            <span className="kicker">The ladder</span>
            <h2 style={{ fontSize: 40, marginTop: 12 }}>Five tiers. Each one steeper.</h2>
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
                style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", alignItems: "center", gap: 24, padding: "22px 28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <span className="mono" style={{ fontSize: 30, fontWeight: 700, color: isApex ? "var(--gold)" : "var(--faint)" }}>
                    {String(s.level).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>{s.slots} slots</div>
                  </div>
                </div>

                <div>
                  <div style={{ height: 9, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden", maxWidth: 430 }}>
                    <div style={{ width: `${Math.min(95, fillPct)}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--gold), var(--gold-soft))" }} />
                  </div>
                  <div style={{ display: "flex", gap: 18, marginTop: 10, fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
                    <span>Exit keeps {s.exitPercent}%</span>
                    <span>·</span>
                    <span>Upgrade pockets {s.upgradeTakePercent}%</span>
                    {s.referralBonus > 0 && <><span>·</span><span>+{s.referralBonus} referral</span></>}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 27, fontWeight: 700, color: isApex ? "var(--gold-bright)" : "var(--text)" }}>{s.fee.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>points to enter</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="container" style={{ padding: "60px 24px 40px" }}>
        <span className="kicker">How it works</span>
        <h2 style={{ fontSize: 40, marginTop: 12, marginBottom: 34 }}>From join to payout.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {[
            { icon: GitFork, t: "Join & activate", d: "Sign up with a referral link, activate into Tier 1, and open your first two slots." },
            { icon: Network, t: "Fill your slots", d: "New players drop into the oldest open slots first. Every fill credits your balance." },
            { icon: Repeat, t: "Exit or climb", d: "When a tier completes, take a percentage and leave — or pocket a cut and upgrade." },
            { icon: ShieldCheck, t: "Provably fair", d: "Queue-backed placement and a row-locked, append-only ledger keep every point honest." },
          ].map((f, i) => (
            <div key={f.t} className="card card-hover rise" style={{ padding: 24, animationDelay: `${i * 0.06}s` }}>
              <span style={{ display: "inline-flex", width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, background: "linear-gradient(180deg, rgba(255,216,77,0.2), rgba(248,198,23,0.08))", border: "1px solid var(--border-3)" }}>
                <f.icon size={21} color="var(--gold-bright)" />
              </span>
              <h3 style={{ fontSize: 18, marginTop: 16, marginBottom: 7 }}>{f.t}</h3>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA billboard */}
      <section className="container" style={{ padding: "50px 24px 90px" }}>
        <div className="billboard" style={{ padding: "56px 40px", textAlign: "center" }}>
          <h2 style={{ fontSize: 42 }}>Ready to climb?</h2>
          <p style={{ fontSize: 16, fontWeight: 500, color: "#3d2f06", maxWidth: 430, margin: "12px auto 26px" }}>
            Spin up an account, grab your referral link, and start filling your matrix in minutes.
          </p>
          <Link href="/register" className="btn btn-white" style={{ padding: "15px 32px", fontSize: 16 }}>
            Create your account <ArrowRight size={17} />
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
