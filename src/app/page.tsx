import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowRight, Layers, Repeat, ShieldCheck, Users, Zap, TrendingUp } from "lucide-react";
import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const slabRows = await db.select().from(schema.slabs).orderBy(asc(schema.slabs.level));
  const session = await getSession();

  return (
    <main>
      {/* nav */}
      <nav
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "22px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Logo />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {session ? (
            <Link href={session.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-primary">
              Open dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Log in</Link>
              <Link href="/register" className="btn btn-primary">Get started</Link>
            </>
          )}
        </div>
      </nav>

      {/* hero */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "70px 24px 40px", textAlign: "center" }}>
        <span className="chip" style={{ color: "var(--color-brand-2)", borderColor: "var(--color-brand)" }}>
          <Zap size={14} /> Virtual points · No real money
        </span>
        <h1 style={{ fontSize: 56, lineHeight: 1.05, margin: "22px 0 0", fontWeight: 800, letterSpacing: -1.5 }}>
          Climb the matrix.
          <br />
          <span
            style={{
              background: "linear-gradient(120deg, var(--color-brand), var(--color-brand-2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Fill your slots. Cash out.
          </span>
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: 19, maxWidth: 620, margin: "22px auto 0", lineHeight: 1.6 }}>
          A strategy game built on a 5-slab points matrix. Refer players, fill your slots on a
          first-in-first-out queue, and choose at every level: take the exit payout or upgrade and keep climbing.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 34 }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: "13px 26px", fontSize: 15 }}>
            Play now <ArrowRight size={17} />
          </Link>
          <a href="#how" className="btn btn-ghost" style={{ padding: "13px 26px", fontSize: 15 }}>
            How it works
          </a>
        </div>
      </section>

      {/* feature row */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "30px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
          {[
            { icon: Layers, t: "5 slabs", d: "From the Starter tier up to Platinum — each needs more slots filled." },
            { icon: Users, t: "FIFO placement", d: "First to join and upgrade gets their slots filled first. Fair by design." },
            { icon: Repeat, t: "Exit or upgrade", d: "At every completed slab, cash a % or roll into the next tier." },
            { icon: ShieldCheck, t: "Provably consistent", d: "Queue-backed distribution with row-locked, append-only ledger." },
          ].map((f) => (
            <div key={f.t} className="card" style={{ padding: 22 }}>
              <f.icon size={24} color="var(--color-brand-2)" />
              <h3 style={{ margin: "14px 0 6px", fontSize: 17 }}>{f.t}</h3>
              <p style={{ color: "var(--color-muted)", fontSize: 14, margin: 0, lineHeight: 1.55 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* slabs */}
      <section id="slabs" style={{ maxWidth: 1120, margin: "0 auto", padding: "50px 24px" }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>The slabs</h2>
        <p style={{ color: "var(--color-muted)", textAlign: "center", margin: "0 0 34px" }}>
          Live configuration from the game engine.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16 }}>
          {slabRows.map((s, i) => (
            <div
              key={s.level}
              className="card"
              style={{ padding: 22, position: "relative", borderColor: i === slabRows.length - 1 ? "var(--color-brand)" : undefined }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="chip">Slab {s.level}</span>
                <TrendingUp size={18} color="var(--color-muted)" />
              </div>
              <h3 style={{ margin: "16px 0 2px", fontSize: 20 }}>{s.name}</h3>
              <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>
                {s.fee}
                <span style={{ fontSize: 14, color: "var(--color-muted)", fontWeight: 500 }}> pts</span>
              </div>
              <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-muted)", lineHeight: 1.9 }}>
                <div>{s.slots} slots to fill</div>
                <div>Exit: keep {s.exitPercent}%</div>
                <div>Upgrade: pocket {s.upgradeTakePercent}%</div>
                {s.referralBonus > 0 && <div>+{s.referralBonus} referral bonus</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 70px" }}>
        <h2 style={{ fontSize: 30, fontWeight: 700, textAlign: "center", margin: "0 0 34px" }}>How it works</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["Join", "Sign up with a referral link and pay the small join fee in points."],
            ["Activate", "Enter Slab 1. Two slots open under you in the global FIFO queue."],
            ["Fill slots", "As new players activate, they fill the oldest open slots first — you earn each time."],
            ["Decide", "When your slab fills, exit with a % of points collected, or upgrade to the next slab."],
            ["Climb", "Repeat up to Platinum (10,000 pts / 32 slots), then take the full payout."],
          ].map(([t, d], i) => (
            <div key={t} className="card" style={{ padding: "18px 22px", display: "flex", gap: 18, alignItems: "center" }}>
              <div
                style={{
                  minWidth: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "var(--color-brand-2)",
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{t}</div>
                <div style={{ color: "var(--color-muted)", fontSize: 14 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--color-border)", padding: "26px 24px", textAlign: "center", color: "var(--color-muted)", fontSize: 13 }}>
        Apex is a virtual-points strategy game. No real money, deposits, or withdrawals are involved.
      </footer>
    </main>
  );
}
