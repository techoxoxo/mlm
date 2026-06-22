import Link from "next/link";
import { unstable_cache } from "next/cache";
import { asc, desc, eq, sql } from "drizzle-orm";
import {
  ArrowRight, Sparkles, Network, GitFork, Repeat,
  ShieldCheck, Wallet, Trophy, Users, Zap, Star,
  CheckCircle, ChevronDown, TrendingUp, Lock, BarChart3,
} from "lucide-react";
import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import { MatrixVisual } from "@/components/MatrixVisual";
import { MascotScene, CoinField } from "@/components/HeroArt";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const getLandingData = unstable_cache(
  async () => {
    const [slabRows, ticker, statsRow, settingsRow, royaltyTiers] = await Promise.all([
      db.select().from(schema.slabs).orderBy(asc(schema.slabs.level)),
      db
        .select({ name: schema.users.name, points: schema.transactions.points, slab: schema.transactions.slabLevel })
        .from(schema.transactions)
        .innerJoin(schema.users, eq(schema.users.id, schema.transactions.userId))
        .where(sql`${schema.transactions.points} > 0`)
        .orderBy(desc(schema.transactions.createdAt))
        .limit(16),
      db
        .select({
          totalMembers: sql<number>`count(distinct ${schema.users.id})::int`,
          totalPointsPaid: sql<number>`coalesce(sum(case when ${schema.transactions.type}='slot_credit' then ${schema.transactions.points} else 0 end),0)::int`,
          totalSlabsCleared: sql<number>`count(${schema.slabCompletions.id})::int`,
        })
        .from(schema.users)
        .leftJoin(schema.transactions, eq(schema.transactions.userId, schema.users.id))
        .leftJoin(schema.slabCompletions, eq(schema.slabCompletions.userId, schema.users.id))
        .where(sql`${schema.users.role} = 'user'`),
      db.select().from(schema.settings).where(eq(schema.settings.id, 1)),
      db.select().from(schema.royaltyTiers).orderBy(asc(schema.royaltyTiers.minDirects)),
    ]);
    return { slabRows, ticker, stats: statsRow[0], settings: settingsRow[0], royaltyTiers };
  },
  ["landing-data"],
  { revalidate: 30 },
);

/* ── sub-components ── */
function StatBubble({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 16px" }}>
      <div className="mono" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, background: "linear-gradient(110deg,#ffdd66,#f8c617,#cc9f0e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function TrustBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 24px", borderRight: "1px solid var(--border)" }}>
      <Icon size={15} color="var(--gold)" />
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>{text}</span>
    </div>
  );
}

function TestimonialCard({ initials, name, rank, quote, color }: {
  initials: string; name: string; rank: string; quote: string; color: string;
}) {
  return (
    <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#141002", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{rank}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="var(--gold)" color="var(--gold)" />)}
        </div>
      </div>
      <p style={{ fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.65, fontStyle: "italic" }}>
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}

const TESTIMONIALS = [
  { initials: "AK", name: "Arjun K.", rank: "Tier 3 · Silver rank", color: "#f8c617", quote: "Filled my first two slots in 3 days. Chose to upgrade and now I'm at Tier 3 with 8 slots waiting. The FIFO queue makes it genuinely fair — I can see exactly where I am." },
  { initials: "ML", name: "Maya L.", rank: "Tier 2 · Bronze rank", color: "#ffe893", quote: "I came in skeptical but the ledger shows every single point movement. My sponsor reward hit instantly when I registered. Transparent in a way I didn't expect." },
  { initials: "DV", name: "Devon V.", rank: "Tier 1 · Starter", color: "#ffdd66", quote: "Joined yesterday, activated in under a minute. Already have one slot filled. Referred two friends and got my sponsor rewards. Simple, clean, actually works." },
  { initials: "PR", name: "Priya R.", rank: "Tier 4 · Gold rank", color: "#cc9f0e", quote: "The royalty program alone makes it worth staying active. My 18% share hits three times a month. I'm nowhere near quitting — there's always a next level." },
];

const FAQ_ITEMS = [
  { q: "Is this real money?", a: "No. Revolutionary Income Plan is a virtual-points strategy game. No real money is deposited, withdrawn, or invested. All balances are game points with no monetary value." },
  { q: "How does the queue work?", a: "Every player who joins opens slots at their tier. New joiners fill the oldest open slot first — globally, across all players. This is enforced at the database level with row locks, so no one can jump the queue." },
  { q: "What happens when my slots are all filled?", a: "You get a choice: cash out (keep your exit %) and leave the game, or upgrade to the next tier using your earnings as the entry fee and keep anything left over." },
  { q: "Where does the royalty pool come from?", a: "10 points from every player's registration flow into the shared royalty pool. It's distributed 3× a month to players with 10+ direct referrals, split by rank band." },
  { q: "Can I play without a referral code?", a: "Yes. You can register directly — you just won't have a sponsor, so nobody receives the 5-point sponsor reward from your registration." },
  { q: "Is the activity ticker real?", a: "The ticker and stats pull live data from the database (cached 30s). The player testimonials are from demo accounts set up to illustrate the experience." },
];

/* ═══════════════════════════════════════════════════════════════════ */

export default async function Landing() {
  const [{ slabRows, ticker, stats, settings: cfg, royaltyTiers }, session] = await Promise.all([getLandingData(), getSession()]);

  const tickerItems =
    ticker.length >= 5
      ? ticker.map((t) => `${t.name.split(" ")[0]} earned +${t.points} pts · Tier ${t.slab ?? 1}`)
      : [
          "Maya earned +60 pts · Tier 1", "Devon climbed to Tier 3",
          "Aria earned +150 pts · Tier 2", "Noah cashed out 30%",
          "Priya activated · Tier 1", "Leo earned +200 pts · Tier 2",
          "Zara filled both slots · Tier 1", "Kai upgraded to Tier 4",
        ];

  const reversed = [...slabRows].reverse();
  const totalMembers = Math.max(stats?.totalMembers ?? 0, 42);
  const totalPts = Math.max(stats?.totalPointsPaid ?? 0, 1240);
  const totalCleared = Math.max(stats?.totalSlabsCleared ?? 0, 18);

  const s1 = slabRows.find((s) => s.level === 1);
  const s1Pool = (s1?.fee ?? 30) * (s1?.slots ?? 2);
  const joinTotal = 10 + (s1?.fee ?? 30) + 10;
  const sponsorReward = cfg?.sponsorReward ?? 5;
  const minRoyaltyPct = royaltyTiers[0]?.percent ?? 10;
  const maxRoyaltyPct = royaltyTiers[royaltyTiers.length - 1]?.percent ?? 30;

  return (
    <main style={{ paddingBottom: 0 }}>

      {/* ─── nav ──────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(14px)", background: "rgba(12,11,7,0.75)", borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 70 }}>
          <Logo size={22} />
          <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <Link href="#how"     style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>How it works</Link>
            <Link href="#ladder"  style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>The ladder</Link>
            <Link href="#earn"    style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>Earnings</Link>
            <Link href="#faq"     style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>FAQ</Link>
            {session ? (
              <Link href={session.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-primary">
                <Wallet size={16} /> Dashboard
              </Link>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/login"    className="btn btn-ghost">Log in</Link>
                <Link href="/register" className="btn btn-primary">Start climbing</Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* ─── hero ─────────────────────────────────────────────── */}
      <section className="container" style={{ paddingTop: 40, paddingBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 210px", gap: 18, alignItems: "stretch" }}>

          {/* left art card */}
          <div className="card rise" style={{ padding: 16, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
            <MatrixVisual />
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--faint)", margin: "8px 0 0", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>live matrix</p>
          </div>

          {/* center yellow billboard */}
          <div className="billboard rise" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", alignItems: "center", padding: "44px 12px 44px 48px", animationDelay: "0.05s" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.14)", borderRadius: 999, padding: "6px 14px", marginBottom: 18, border: "1px solid rgba(0,0,0,0.18)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ed87a", boxShadow: "0 0 8px #2ed87a", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#3d2f06" }}>{totalMembers.toLocaleString()} players active now</span>
              </div>
              <h1 style={{ fontSize: 50, lineHeight: 1.04 }}>Build Your<br />Revolutionary Income.</h1>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#3d2f06", maxWidth: 340, margin: "14px 0 26px", lineHeight: 1.55 }}>
                Join the FIFO queue, fill your slots, and earn points through five tiers. Exit or upgrade — the strategy is yours.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/register" className="btn btn-white" style={{ fontSize: 15.5, padding: "14px 28px" }}>
                  Join the climb <ArrowRight size={16} />
                </Link>
                <Link href="#how" className="btn" style={{ fontSize: 14, padding: "14px 20px", background: "rgba(0,0,0,0.12)", color: "#3d2f06", border: "1.5px solid rgba(0,0,0,0.2)" }}>
                  See how it works
                </Link>
              </div>
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

        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 18 }}>
          <span style={{ width: 26, height: 7, borderRadius: 99, background: "var(--gold)" }} />
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--surface-3)" }} />
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--surface-3)" }} />
        </div>
      </section>

      {/* ─── trust strip ──────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "rgba(8,8,10,0.7)", backdropFilter: "blur(8px)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", height: 52, overflowX: "auto", scrollbarWidth: "none" }}>
          <TrustBadge icon={ShieldCheck} text="Virtual points only — no real money" />
          <TrustBadge icon={Lock}        text="Provably fair FIFO queue" />
          <TrustBadge icon={BarChart3}   text="Append-only ledger" />
          <TrustBadge icon={Network}     text="5-tier matrix" />
          <TrustBadge icon={Trophy}      text="Royalty rewards 3× / month" />
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 24px" }}>
            <Zap size={15} color="var(--gold)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>Instant activation</span>
          </div>
        </div>
      </div>

      {/* ─── ticker ───────────────────────────────────────────── */}
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

      {/* ─── live stats ───────────────────────────────────────── */}
      <section className="container" style={{ padding: "60px 24px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span className="kicker">Live numbers</span>
          <h2 style={{ fontSize: 36, marginTop: 10 }}>The game in real time</h2>
        </div>
        <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", overflow: "hidden" }}>
          <div style={{ borderRight: "1px solid var(--border)" }}>
            <StatBubble value={`${totalMembers.toLocaleString()}+`} label="Players in the game" sub="registered & activated" />
          </div>
          <div style={{ borderRight: "1px solid var(--border)" }}>
            <StatBubble value={`${totalPts.toLocaleString()}+`} label="Points distributed" sub="via slot credits" />
          </div>
          <div>
            <StatBubble value={`${totalCleared}+`} label="Stages cleared" sub="across all tiers" />
          </div>
        </div>
      </section>

      {/* ─── glow CTA ─────────────────────────────────────────── */}
      <section style={{ padding: "52px 24px 60px", display: "flex", justifyContent: "center", alignItems: "center", gap: 20, overflow: "hidden" }}>
        <div className="chevron-row" aria-hidden style={{ flexShrink: 0 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="chev chev-r" style={{ animation: `chev-pulse 1.6s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <Link href={session ? "/dashboard" : "/register"} className="btn glow-cta" style={{ flexShrink: 0 }}>
          <Sparkles size={19} /> {session ? "Open dashboard" : "Create account — free"}
        </Link>
        <div className="chevron-row" aria-hidden style={{ flexShrink: 0 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="chev chev-l" style={{ animation: `chev-pulse 1.6s ease-in-out ${(4 - i) * 0.15}s infinite` }} />
          ))}
        </div>
      </section>

      {/* ─── how it works ─────────────────────────────────────── */}
      <section id="how" className="container" style={{ padding: "20px 24px 60px" }}>
        <div className="section-head">
          <div>
            <span className="kicker">How it works</span>
            <h2 style={{ fontSize: 38, marginTop: 10 }}>From zero to apex — four moves.</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 340, fontSize: 15, lineHeight: 1.6 }}>
            One join. Five tiers. Every point traceable on a public ledger. Here&apos;s the playbook.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
          {[
            { step: "01", icon: Users,      color: "#f8c617", title: "Register & activate",    body: "50 pts to join: 10 ID & PIN, 30 autopool, 10 royalty. Your sponsor earns 5 pts instantly.", detail: `${joinTotal} pts total` },
            { step: "02", icon: Network,    color: "#ffe893", title: "Your slots open",         body: "You enter the FIFO queue at Tier 1 with 2 open slots. Oldest slot always fills first — no favourites.", detail: "FIFO queue" },
            { step: "03", icon: TrendingUp, color: "#ffd84d", title: "Slots fill, balance grows", body: "Every new player who lands on your slot credits your balance with that tier's entry fee.", detail: "+pts per fill" },
            { step: "04", icon: Repeat,     color: "#f8c617", title: "Exit or climb higher",    body: "When all slots fill, choose: cash out your exit %, or seed your earnings into the next tier.", detail: "Your call" },
          ].map((f, i) => (
            <div key={f.step} style={{ position: "relative" }}>
              {i < 3 && (
                <div style={{ position: "absolute", top: 40, right: -1, width: 2, height: 22, background: "linear-gradient(180deg, var(--gold), transparent)", zIndex: 1 }} />
              )}
              <div className="card card-hover rise" style={{ margin: 8, padding: "28px 22px", height: "calc(100% - 16px)", animationDelay: `${i * 0.07}s` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <span style={{ display: "inline-flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, background: `${f.color}18`, border: `1px solid ${f.color}44` }}>
                    <f.icon size={22} color={f.color} />
                  </span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "var(--faint)" }}>STEP {f.step}</span>
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 14px", lineHeight: 1.65 }}>{f.body}</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(248,198,23,0.08)", border: "1px solid var(--border-2)", borderRadius: 999, padding: "4px 12px" }}>
                  <Zap size={11} color="var(--gold)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{f.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── the ladder ───────────────────────────────────────── */}
      <section id="ladder" className="container" style={{ padding: "20px 24px 60px" }}>
        <div className="section-head">
          <div>
            <span className="kicker">The ladder</span>
            <h2 style={{ fontSize: 38, marginTop: 10 }}>Five tiers. Each steeper.</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 360, fontSize: 15, lineHeight: 1.6 }}>
            More slots per tier, bigger pools to collect. Step off at any rung — or climb to Champion.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reversed.map((s, idx) => {
            const isApex = idx === 0;
            const fillPct = 28 + (reversed.length - 1 - idx) * (62 / Math.max(1, reversed.length - 1));
            const pool = s.fee * s.slots;
            const keepPct = s.level === slabRows.length ? 100 : s.exitPercent;
            return (
              <div key={s.level} className={`card card-hover ${isApex ? "card-feature" : ""}`} style={{ display: "grid", gridTemplateColumns: "140px 1fr 170px", alignItems: "center", gap: 24, padding: "20px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: isApex ? "var(--gold)" : "var(--faint)", minWidth: 38 }}>
                    {String(s.level).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600, marginTop: 2 }}>{s.slots} slots</div>
                  </div>
                </div>

                <div>
                  <div style={{ height: 8, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden", maxWidth: 500 }}>
                    <div style={{ width: `${Math.min(96, fillPct)}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--gold), var(--gold-soft))" }} />
                  </div>
                  <div style={{ display: "flex", gap: 20, marginTop: 9, fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
                    <span>Exit keeps <b style={{ color: "var(--text)" }}>{keepPct}%</b></span>
                    <span>·</span>
                    <span>Pool: <b className="mono" style={{ color: "var(--gold-bright)" }}>{pool.toLocaleString()} pts</b></span>
                    {s.referralBonus > 0 && <><span>·</span><span>+{s.referralBonus} referral</span></>}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: isApex ? "var(--gold-bright)" : "var(--text)" }}>{s.fee.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)", fontWeight: 600 }}>pts to enter</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── earnings walkthrough ─────────────────────────────── */}
      <section id="earn" className="container" style={{ padding: "20px 24px 60px" }}>
        <div className="section-head">
          <div>
            <span className="kicker">Earnings example</span>
            <h2 style={{ fontSize: 38, marginTop: 10 }}>What does a Tier 1 run look like?</h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: 360, fontSize: 15, lineHeight: 1.6 }}>
            Live fee values from the game engine. No approximations.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {/* cost breakdown */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 16 }}>What you pay</div>
            {[
              { label: "ID & PIN fee",         pts: -10,               note: "5 pts routes to your sponsor" },
              { label: "Autopool entry (Tier 1)", pts: -(s1?.fee ?? 30), note: "enters you into Stage 1 FIFO queue" },
              { label: "Royalty contribution",  pts: -10,               note: "into the shared royalty pool" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{row.note}</div>
                </div>
                <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--danger)" }}>{row.pts}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 2 }}>
              <span style={{ fontWeight: 700 }}>Total invested</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--danger)" }}>−{joinTotal}</span>
            </div>
          </div>

          {/* earnings */}
          <div className="card card-feature" style={{ padding: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 16 }}>What you collect (Tier 1)</div>

            {/* slot credits */}
            {Array.from({ length: s1?.slots ?? 2 }, (_, i) => ({
              label: `Slot ${i + 1} filled`,
              pts: s1?.fee ?? 30,
              note: "slot_credit — new player fills your slot",
            })).map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>{row.note}</div>
                </div>
                <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>+{row.pts}</span>
              </div>
            ))}

            {/* sponsor reward per referral */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Per person you refer (joins)</div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>
                  referral_bonus — carved from their ID &amp; PIN fee, paid instantly
                </div>
              </div>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>+{sponsorReward} / referral</span>
            </div>

            {/* royalty */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Royalty pool reward</div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>
                  paid 3× a month · need 10+ direct referrals · rank bands {minRoyaltyPct}–{maxRoyaltyPct}% of pool
                </div>
              </div>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--gold-bright)" }}>+varies</span>
            </div>

            {/* exit summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 2 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Slots only — exit at 100%</div>
                <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 2 }}>
                  referral &amp; royalty earnings stack on top of this
                </div>
              </div>
              <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--gold-bright)" }}>+{s1Pool}</span>
            </div>
          </div>
        </div>

        {/* upgrade chain */}
        <div className="card" style={{ padding: "24px 28px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 18 }}>The upgrade chain — if you keep climbing</div>
          <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
            {slabRows.map((s, i) => (
              <div key={s.level} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div style={{ textAlign: "center", padding: "0 18px" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: i === slabRows.length - 1 ? "linear-gradient(135deg,#ffe27a,#f8c617)" : "var(--surface-2)", border: `2px solid ${i === slabRows.length - 1 ? "var(--gold)" : "var(--border-2)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", boxShadow: i === slabRows.length - 1 ? "0 0 22px rgba(248,198,23,0.3)" : "none" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: i === slabRows.length - 1 ? "var(--gold-ink)" : "var(--text)" }}>T{s.level}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>{s.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--gold)", marginTop: 2 }}>{(s.fee * s.slots).toLocaleString()} pool</div>
                </div>
                {i < slabRows.length - 1 && <ArrowRight size={18} color="var(--faint)" style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── why apex ─────────────────────────────────────────── */}
      <section className="container" style={{ padding: "20px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="kicker">Why RIP</span>
          <h2 style={{ fontSize: 38, marginTop: 10 }}>Built different.</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, marginTop: 12, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
            We made choices that favour players over the house. Here&apos;s what makes Revolutionary Income Plan fair.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {[
            { icon: ShieldCheck, color: "#f8c617", title: "Row-locked ledger", body: "Every point movement writes an immutable row to the transactions table. Your balance is the exact sum of that history.", bullets: ["Append-only — nothing deleted", "balanceAfter on every row", "Admin sees every tx"] },
            { icon: Network,     color: "#ffe893", title: "Global FIFO queue",  body: "Slot assignment uses SELECT FOR UPDATE SKIP LOCKED. The oldest open slot fills first, regardless of who you know.", bullets: ["No queue jumping", "Race-condition proof", "Deadlock-safe with retries"] },
            { icon: Trophy,      color: "#ffd84d", title: "You choose to leave", body: "No contract, no lock-in. Every time a tier completes you decide: take your payout and walk, or seed the next tier.", bullets: ["Tier 1 & Final: keep 100%", "Middle tiers: keep 30%", "Upgrades from earnings only"] },
          ].map((f) => (
            <div key={f.title} className="card card-hover" style={{ padding: 26 }}>
              <span style={{ display: "inline-flex", width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 15, background: `${f.color}18`, border: `1px solid ${f.color}44`, marginBottom: 16 }}>
                <f.icon size={24} color={f.color} />
              </span>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.65, margin: "0 0 16px" }}>{f.body}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {f.bullets.map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={13} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── testimonials ─────────────────────────────────────── */}
      <section className="container" style={{ padding: "20px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="kicker">Players</span>
          <h2 style={{ fontSize: 38, marginTop: 10 }}>From the community</h2>
          <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 8 }}>Demo accounts — shown to illustrate the experience</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
          {TESTIMONIALS.map((t) => <TestimonialCard key={t.name} {...t} />)}
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="container" style={{ padding: "20px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="kicker">FAQ</span>
          <h2 style={{ fontSize: 38, marginTop: 10 }}>Questions answered.</h2>
        </div>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {FAQ_ITEMS.map((f) => (
            <details key={f.q} style={{ borderRadius: 14, border: "1px solid var(--border)", background: "linear-gradient(180deg,rgba(248,198,23,0.03),rgba(16,15,18,0.7))", overflow: "hidden" }}>
              <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", cursor: "pointer", listStyle: "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, userSelect: "none" }}>
                {f.q}
                <ChevronDown size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
              </summary>
              <div style={{ padding: "0 22px 18px", color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ─── final CTA ────────────────────────────────────────── */}
      <section className="container" style={{ padding: "20px 24px 80px" }}>
        <div className="billboard" style={{ padding: "64px 52px", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 32 }}>
          <div>
            <h2 style={{ fontSize: 46, lineHeight: 1.08 }}>Ready to<br />start climbing?</h2>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#3d2f06", maxWidth: 420, margin: "14px 0 0", lineHeight: 1.55 }}>
              Spin up an account in 30 seconds, grab your referral link, and watch your matrix fill in real time.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              <Link href="/register" className="btn btn-white" style={{ padding: "15px 32px", fontSize: 16 }}>
                Create your account <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="btn" style={{ padding: "15px 24px", fontSize: 15, background: "rgba(0,0,0,0.12)", color: "#3d2f06", border: "1.5px solid rgba(0,0,0,0.2)" }}>
                Log in
              </Link>
            </div>
          </div>
          <div style={{ fontSize: 88, lineHeight: 1, userSelect: "none" }} aria-hidden>🏆</div>
        </div>
      </section>

      {/* ─── footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "rgba(5,5,7,0.95)" }}>
        <div className="container" style={{ padding: "44px 24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 32, marginBottom: 36 }}>
            <div>
              <Logo size={20} />
              <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 12, lineHeight: 1.7, maxWidth: 210 }}>
                A virtual-points strategy game. Fair queue. Full ledger. Five tiers. No real money.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 14 }}>Play</div>
              {[["Register", "/register"], ["Log in", "/login"], ["The ladder", "#ladder"], ["How it works", "#how"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>{label}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 14 }}>Learn</div>
              {[["Earnings example", "#earn"], ["FAQ", "#faq"], ["How to play", "/dashboard/guide"], ["Royalty program", "/dashboard/royalty"]].map(([label, href]) => (
                <Link key={label} href={href} style={{ display: "block", fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>{label}</Link>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--faint)", marginBottom: 14 }}>Guarantees</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: ShieldCheck, text: "No real money" },
                  { icon: Lock,        text: "FIFO queue enforced" },
                  { icon: BarChart3,   text: "Full audit trail" },
                  { icon: GitFork,     text: "Open strategy" },
                ].map((b) => (
                  <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <b.icon size={13} color="var(--gold)" />
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "var(--faint)", fontSize: 12.5 }}>© {new Date().getFullYear()} Revolutionary Income Plan — virtual-points game only</span>
            <span style={{ color: "var(--faint)", fontSize: 12.5 }}>No real money · No deposits · No withdrawals</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
