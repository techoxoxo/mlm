import Link from "next/link";
import { unstable_cache } from "next/cache";
import { asc, desc, eq, sql } from "drizzle-orm";
import {
  ArrowRight, ShieldCheck, Wallet, Users, Zap,
  Star, CheckCircle, ChevronDown, TrendingUp, Lock,
  BarChart3, Network, Globe, Bot, Repeat, GitFork, Clock,
} from "lucide-react";
import { db, schema } from "@/db";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EarningsCalculator } from "@/components/EarningsCalculator";
import { LiveMatrixSimulator } from "@/components/LiveMatrixSimulator";
import { RoyaltyExplorer } from "@/components/RoyaltyExplorer";

export const dynamic = "force-dynamic";

const getLandingData = unstable_cache(
  async () => {
    const [slabRows, ticker, statsRow, settingsRow, royaltyTiers] = await Promise.all([
      db.select().from(schema.slabs).orderBy(asc(schema.slabs.level)),
      db
        .select({ serialNo: schema.users.serialNo, points: schema.transactions.points, slab: schema.transactions.slabLevel })
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
          newMembers24h: sql<number>`coalesce(count(distinct ${schema.users.id}) filter (where ${schema.users.createdAt} >= now() - interval '24 hours'), 0)::int`,
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

/* ── Person icon in pure SVG (no foreignObject) ── */
function PersonIcon({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const headR = r * 0.28;
  const bodyW = r * 0.44;
  return (
    <g>
      <circle cx={x} cy={y - r * 0.18} r={headR} fill={color} opacity="0.85" />
      <path
        d={`M ${x - bodyW} ${y + r * 0.42} Q ${x} ${y + r * 0.08} ${x + bodyW} ${y + r * 0.42}`}
        fill="none" stroke={color} strokeWidth={r * 0.12} strokeLinecap="round" opacity="0.75"
      />
    </g>
  );
}

/* ── Robot mascot SVG ── */
function RobotMascot() {
  const nodes: [number, number, number, string][] = [
    [38, 88, 22, "#7c3aed"],
    [316, 62, 18, "#f59e0b"],
    [18, 230, 18, "#f59e0b"],
    [328, 210, 22, "#7c3aed"],
    [55, 330, 16, "#7c3aed"],
  ];
  const coins: [number, number, number, number][] = [
    [180, 375, 90, 20],
    [180, 350, 74, 16],
    [180, 328, 58, 13],
  ];
  const sparkles: [number, number][] = [[82, 44], [272, 40], [44, 164], [318, 176], [184, 26]];

  return (
    <svg viewBox="0 0 368 430" width="100%" style={{ display: "block", overflow: "visible", maxWidth: 380 }} aria-hidden>
      <defs>
        <radialGradient id="pglow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(120,70,255,0.55)" />
          <stop offset="65%" stopColor="rgba(100,50,220,0.2)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="cg2" cx="35%" cy="28%">
          <stop offset="0%" stopColor="#fff0a0" />
          <stop offset="55%" stopColor="#f5c617" />
          <stop offset="100%" stopColor="#c8980a" />
        </radialGradient>
        <radialGradient id="rb" cx="28%" cy="22%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d8e2ee" />
        </radialGradient>
        <radialGradient id="eyeGrad" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </radialGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="coinShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(180,130,0,0.3)" />
        </filter>
      </defs>

      {/* platform glow ring */}
      <ellipse cx="184" cy="392" rx="140" ry="30" fill="url(#pglow)" />
      <ellipse cx="184" cy="384" rx="95" ry="14" fill="rgba(110,60,230,0.28)" />

      {/* coin stack */}
      {coins.map(([cx, cy, rx, ry], i) => (
        <g key={i} filter="url(#coinShadow)">
          <rect x={cx - rx} y={cy - ry + 4} width={rx * 2} height={ry + 14} rx={ry} fill="#a07608" />
          <ellipse cx={cx} cy={cy - ry + 5} rx={rx} ry={ry} fill="url(#cg2)" stroke="#8a6a05" strokeWidth="2.5" />
          <text x={cx} y={cy - ry + 11} textAnchor="middle" fontFamily="serif" fontWeight="900" fontSize={ry * 0.85} fill="#7a5c02">★</text>
          {/* coin shine */}
          <ellipse cx={cx - rx * 0.28} cy={cy - ry - 1} rx={rx * 0.28} ry={ry * 0.35} fill="rgba(255,255,220,0.45)" />
        </g>
      ))}

      {/* floating node circles with SVG person icons */}
      {nodes.map(([x, y, r, c], i) => (
        <g key={i} style={{ animation: `floaty ${3.2 + i * 0.55}s ease-in-out ${i * 0.38}s infinite` }}>
          {/* circle bg */}
          <circle cx={x} cy={y} r={r} fill={c === "‌#7c3aed" ? "rgba(124,58,237,0.12)" : "rgba(245,158,11,0.1)"}
            stroke={c} strokeWidth="1.8" opacity="0.9"
          />
          {/* person icon drawn in pure SVG */}
          <PersonIcon x={x} y={y} r={r} color={c} />
          {/* dashed connector line */}
          <line x1={x} y1={y} x2="184" y2="220"
            stroke={c} strokeWidth="1" strokeDasharray="4 7" opacity="0.22"
          />
        </g>
      ))}

      {/* sparkle dots */}
      {sparkles.map(([x, y], i) => (
        <g key={i} style={{ animation: `pulse-node ${1.9 + i * 0.35}s ease-in-out ${i * 0.22}s infinite` }}>
          <circle cx={x} cy={y} r={3} fill="#f5c617" opacity="0.85" />
          <circle cx={x} cy={y} r={6} fill="#f5c617" opacity="0.18" />
        </g>
      ))}

      {/* ── ROBOT BODY ── */}
      {/* legs */}
      <rect x="153" y="282" width="30" height="52" rx="15" fill="url(#rb)" stroke="#b8c4d0" strokeWidth="2" />
      <rect x="191" y="282" width="30" height="52" rx="15" fill="url(#rb)" stroke="#b8c4d0" strokeWidth="2" />
      {/* feet */}
      <rect x="144" y="322" width="42" height="18" rx="9" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />
      <rect x="186" y="322" width="42" height="18" rx="9" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />

      {/* body */}
      <rect x="128" y="190" width="112" height="104" rx="28" fill="url(#rb)" stroke="#b8c4d0" strokeWidth="2" />

      {/* chest window */}
      <rect x="148" y="208" width="72" height="48" rx="12" fill="rgba(109,40,217,0.07)" stroke="rgba(109,40,217,0.3)" strokeWidth="1.5" />
      <circle cx="164" cy="226" r="7" fill="#7c3aed" opacity="0.8" />
      <circle cx="184" cy="226" r="7" fill="#f59e0b" opacity="0.8" />
      <circle cx="204" cy="226" r="7" fill="#10b981" opacity="0.8" />
      <rect x="148" y="240" width="72" height="2" fill="rgba(109,40,217,0.18)" rx="1" />
      <rect x="148" y="246" width="50" height="2" fill="rgba(109,40,217,0.12)" rx="1" />

      {/* left arm */}
      <rect x="90" y="196" width="40" height="72" rx="20" fill="url(#rb)" stroke="#b8c4d0" strokeWidth="2" />
      <rect x="84" y="256" width="48" height="22" rx="11" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />

      {/* right arm */}
      <rect x="238" y="196" width="40" height="68" rx="20" fill="url(#rb)" stroke="#b8c4d0" strokeWidth="2" />
      <rect x="236" y="252" width="48" height="22" rx="11" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />
      {/* wand */}
      <line x1="264" y1="198" x2="310" y2="136" stroke="#f5c617" strokeWidth="4" strokeLinecap="round" filter="url(#glow)" />
      <circle cx="312" cy="132" r="14" fill="rgba(245,198,23,0.2)" />
      <path d="M312 118 l4 8.5 l9 1.2 l-6.5 6.2 l1.6 9 l-8.1-4.2 l-8.1 4.2 l1.6-9 l-6.5-6.2 l9-1.2 Z" fill="#f5c617" filter="url(#glow)" />

      {/* neck */}
      <rect x="168" y="173" width="38" height="20" rx="7" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />

      {/* head */}
      <rect x="116" y="88" width="136" height="94" rx="38" fill="url(#rb)" stroke="#b8c4d0" strokeWidth="2" />

      {/* ear nubs */}
      <rect x="108" y="114" width="12" height="28" rx="6" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />
      <rect x="248" y="114" width="12" height="28" rx="6" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1.5" />

      {/* eye sockets */}
      <rect x="136" y="110" width="40" height="32" rx="12" fill="#0e1220" />
      <rect x="192" y="110" width="40" height="32" rx="12" fill="#0e1220" />
      {/* glowing eyes */}
      <rect x="139" y="113" width="34" height="26" rx="9" fill="url(#eyeGrad)" />
      <rect x="195" y="113" width="34" height="26" rx="9" fill="url(#eyeGrad)" />
      {/* eye highlights */}
      <circle cx="148" cy="121" r="6" fill="white" opacity="0.95" />
      <circle cx="204" cy="121" r="6" fill="white" opacity="0.95" />
      <circle cx="160" cy="130" r="3" fill="white" opacity="0.45" />
      <circle cx="216" cy="130" r="3" fill="white" opacity="0.45" />

      {/* mouth */}
      <rect x="152" y="156" width="64" height="12" rx="6" fill="#cdd6e0" stroke="#b8c4d0" strokeWidth="1" />
      <rect x="157" y="158" width="54" height="8" rx="4" fill="rgba(109,40,217,0.5)" />

      {/* antenna */}
      <rect x="178" y="60" width="12" height="30" rx="6" fill="#b8c4d0" />
      <circle cx="184" cy="55" r="14" fill="#7c3aed" filter="url(#glow)" />
      <circle cx="184" cy="55" r="8" fill="#a78bfa" />
      <circle cx="180" cy="51" r="3" fill="white" opacity="0.75" />
    </svg>
  );
}

function MiniChart() {
  return (
    <svg viewBox="0 0 140 46" width="140" height="40" style={{ display: "block" }}>
      <defs>
        <linearGradient id="chartFill2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points="0,38 18,30 36,33 54,20 72,24 90,10 108,16 126,6" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="0,46 0,38 18,30 36,33 54,20 72,24 90,10 108,16 126,6 126,46" fill="url(#chartFill2)" />
    </svg>
  );
}

const FAQ_ITEMS = [
  { q: "How can I understand and deposit a processed?", a: "All transactions are processed in USDT (BEP-20) via secure smart checkouts and automated payouts." },
  { q: "What happens when the cycle starts?", a: "Every partner who joins opens slots at their tier. New joiners fill the oldest open slot first — globally, across all members. This is enforced at the database level with row locks." },
  { q: "Where does my royalty pool come from?", a: "10 points from every member's registration flow into the shared royalty pool. It's distributed twice a month (1st and 16th) to partners with 10+ direct referrals, split by rank band." },
  { q: "Can I participate without a referral code?", a: "No. To maintain the system structure, every member must register using a valid referral code or sponsor link. If you do not have one, you can contact support to get one." },
  { q: "Is the auto pool fazed?", a: "No. The auto pool runs continuously. Once your slots are active, your balance starts building without any manual intervention." },
  { q: "Can I purchase a higher tier slot directly?", a: "No. The system uses a strict sequential progression. You cannot buy or bypass to a higher slot (e.g. Bronze, Silver, Gold) directly. You must clear your current active slot level first before you are allowed to upgrade to the next tier." },
];

const TESTIMONIALS = [
  { name: "Michael T.", role: "Verified Member", quote: "This system changed the way I think about passive income.", initials: "MT", color: "#7c3aed" },
  { name: "Sarah K.", role: "Verified Member", quote: "Simple, transparent, and the payouts are super fast!", initials: "SK", color: "#2563eb" },
  { name: "Daniel R.", role: "Verified Member", quote: "Finally, a system that rewards effort and community.", initials: "DR", color: "#059669" },
];

const TRUST_BADGES = [
  { icon: Bot, title: "AI Verification System", desc: "Smart & secure member verification", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", color: "#3b82f6" },
  { icon: Clock, title: "Powerful Re-entry Rule", desc: "Keep the system in balance, ensuring fair member positions", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)", color: "#9061f9" },
  { icon: BarChart3, title: "100% Transparent Ledger", desc: "All transactions recorded on secure blockchain", bg: "rgba(245,198,23,0.08)", border: "rgba(245,198,23,0.2)", color: "var(--gold)" },
  { icon: Zap, title: "Fully Automated Payouts", desc: "Payments are automatic, fast and reliable", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", color: "#3b82f6" },
  { icon: ShieldCheck, title: "Anti-Fraud Protection", desc: "Advanced AI protection for a safe environment", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)", color: "#9061f9" },
  { icon: Globe, title: "Global Community", desc: "A worldwide movement of like-minded people", bg: "rgba(245,198,23,0.08)", border: "rgba(245,198,23,0.2)", color: "var(--gold)" },
];

const SLOT_ICONS = ["🟢", "🔵", "🟤", "⚪", "🟡", "💎", "🔷", "💠"];

export default async function Landing() {
  const [{ slabRows, ticker, stats, settings: cfg, royaltyTiers }, session] = await Promise.all([
    getLandingData(), getSession(),
  ]);

  const tickerItems =
    ticker.length >= 5
      ? ticker.map((t) => `RV-${String(t.serialNo).padStart(6, "0")} earned +${t.points} pts · Tier ${t.slab ?? 1}`)
      : [
        "RV-000042 earned +60 pts · Tier 1", "RV-000018 climbed to Tier 3",
        "RV-000088 earned +150 pts · Tier 2", "RV-000094 cashed out 30%",
        "RV-000102 activated · Tier 1", "RV-000067 earned +200 pts · Tier 2",
      ];

  const totalMembers = Math.max(stats?.totalMembers ?? 0, 10000);
  const totalPts = Math.max(stats?.totalPointsPaid ?? 0, 2430850);
  const sponsorReward = cfg?.sponsorReward ?? 5;
  const minRoyaltyPct = royaltyTiers[0]?.percent ?? 10;
  const maxRoyaltyPct = royaltyTiers[royaltyTiers.length - 1]?.percent ?? 30;
  const s1 = slabRows.find((s) => s.level === 1);
  const calcEst = ((s1?.fee ?? 30) * (s1?.slots ?? 2));

  return (
    <main style={{ paddingBottom: 0 }}>
      <style>{`
        /* ── Hero: dark mode dark navy, light mode lavender ── */
        .lp-hero {
          position: relative; overflow: hidden;
          background: linear-gradient(160deg, #f8f5ff 0%, #efe8ff 30%, #e8eeff 65%, #f4f0ff 100%);
        }
        [data-theme="dark"] .lp-hero {
          background: linear-gradient(160deg, #06080f 0%, #090c1a 40%, #070914 100%);
        }
        .lp-hero::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(700px 480px at 72% 35%, rgba(124,58,237,0.11), transparent 60%),
            radial-gradient(500px 320px at 5% 75%, rgba(168,85,247,0.06), transparent 55%),
            radial-gradient(400px 300px at 85% 85%, rgba(245,198,23,0.05), transparent 60%);
        }
        [data-theme="dark"] .lp-hero::before {
          background:
            radial-gradient(900px 600px at 68% 38%, rgba(100,55,220,0.16), transparent 62%),
            radial-gradient(600px 400px at 12% 68%, rgba(245,198,23,0.06), transparent 58%),
            radial-gradient(400px 300px at 50% 100%, rgba(90,40,200,0.08), transparent 60%);
        }

        /* Hero text: purple accent on light, gold on dark */
        .lp-h1-accent { color: #7c3aed; -webkit-text-fill-color: #7c3aed; background: none; }
        [data-theme="dark"] .lp-h1-accent { color: #f5c617; -webkit-text-fill-color: #f5c617; }

        /* Hero h1: light says "Build today. Benefit forever.", dark says "Take full control of your future." */
        .lp-h1-light { display:block; }
        .lp-h1-dark  { display:none;  }
        [data-theme="dark"] .lp-h1-light { display:none;  }
        [data-theme="dark"] .lp-h1-dark  { display:block; }

        /* Hero text color */
        .lp-hero-text { color: #1e1b4b; }
        [data-theme="dark"] .lp-hero-text { color: white; }
        .lp-hero-sub { color: rgba(30,27,75,0.65); }
        [data-theme="dark"] .lp-hero-sub { color: rgba(255,255,255,0.6); }

        /* Badge */
        .lp-badge {
          display:inline-flex; align-items:center; gap:8px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.25);
          border-radius:999px; padding:6px 16px; font-size:11px; font-weight:700;
          letter-spacing:0.18em; color:#7c3aed; text-transform:uppercase;
        }
        [data-theme="dark"] .lp-badge {
          background:rgba(245,198,23,0.08); border-color:rgba(245,198,23,0.3); color:#f5c617;
        }

        /* Stats card */
        .lp-stats-card {
          background: rgba(255,255,255,0.85); border:1px solid rgba(124,58,237,0.15);
          border-radius:20px; backdrop-filter:blur(16px); padding:20px 24px;
          box-shadow: 0 8px 32px rgba(124,58,237,0.1);
        }
        [data-theme="dark"] .lp-stats-card {
          background: rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .lp-stats-label { font-size:11px; font-weight:600; letter-spacing:0.08em; color:rgba(30,27,75,0.5); margin-bottom:4px; }
        [data-theme="dark"] .lp-stats-label { color:rgba(255,255,255,0.5); }
        .lp-stats-val { font-size:24px; font-weight:800; color:#1e1b4b; font-family:var(--font-num); margin-bottom:8px; }
        [data-theme="dark"] .lp-stats-val { color:white; }

        /* Feature tags */
        .lp-ftag { display:inline-flex; align-items:center; gap:7px; font-size:14px; font-weight:600; color:rgba(30,27,75,0.75); }
        [data-theme="dark"] .lp-ftag { color:rgba(255,255,255,0.75); }
        .lp-fdot { width:8px; height:8px; border-radius:50%; background:#7c3aed; }
        [data-theme="dark"] .lp-fdot { background:#f5c617; }

        /* Outline button in hero */
        .lp-hero-outline {
          display:inline-flex; align-items:center; gap:8px; font-size:15px; font-weight:600;
          color:rgba(30,27,75,0.8); padding:14px 22px; border:1.5px solid rgba(30,27,75,0.2);
          border-radius:999px; transition:all 0.2s ease; backdrop-filter:blur(8px);
          background: rgba(255,255,255,0.4);
        }
        [data-theme="dark"] .lp-hero-outline {
          color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.04);
        }

        /* Avatars */
        .lp-avatar-txt { font-size:14px; font-weight:700; color:rgba(30,27,75,0.9); }
        [data-theme="dark"] .lp-avatar-txt { color:white; }
        .lp-avatar-sub { font-weight:400; color:rgba(30,27,75,0.5); font-size:13px; }
        [data-theme="dark"] .lp-avatar-sub { color:rgba(255,255,255,0.5); }

        /* Nav text */
        .lp-nav-link { font-size:13.5px; font-weight:600; color:rgba(30,27,75,0.7); transition:color 0.2s; }
        [data-theme="dark"] .lp-nav-link { color:rgba(255,255,255,0.7); }

        /* ── Layout ── */
        .lp-hero-grid { display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:center; padding:80px 0 64px; }
        .lp-hl-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .lp-pools-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:20px; align-items:center; }
        .lp-pool-connector { display:flex; align-items:center; justify-content:center; z-index:2; }
        .lp-steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        .lp-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .lp-trust-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:1px; background:rgba(0,0,0,0.06); }
        [data-theme="dark"] .lp-trust-grid { background:rgba(255,255,255,0.06); }
        .lp-trust-item { background:var(--bg); padding:28px 16px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; }

        /* Matrix/Pool cards */
        .lp-matrix-card { background:linear-gradient(150deg,#3d1fcc 0%,#5b2ef5 55%,#6c3af8 100%); border-radius:24px; padding:28px; border:1px solid rgba(255,255,255,0.15); display:flex; flex-direction:column; justify-content:space-between; height:100%; }
        .lp-pool-card   { background:linear-gradient(150deg,#1a3a8c 0%,#1d4ed8 55%,#2563eb 100%); border-radius:24px; padding:28px; border:1px solid rgba(255,255,255,0.15); display:flex; flex-direction:column; justify-content:space-between; height:100%; }

        /* Pool tier cards */
        .lp-pool-tier { background:var(--surface); border:1.5px solid var(--border-2); border-radius:20px; padding:32px 28px; position:relative; overflow:hidden; }

        /* Slot row */
        .lp-slots-row { display:flex; gap:10px; overflow-x:auto; padding-bottom:8px; justify-content:center; }
        .lp-slot-card { flex:1 1 0; min-width:100px; max-width:140px; background:var(--surface); border:1.5px solid var(--border-2); border-radius:18px; padding:18px 10px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:4px; transition:all 0.22s ease; }
        .lp-slot-card:hover { border-color:var(--border-3); transform:translateY(-3px); box-shadow:var(--shadow-md); }

        /* Calculator */
        .lp-calc-section { background:linear-gradient(135deg,rgba(124,58,237,0.06) 0%,rgba(245,198,23,0.04) 100%); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .calc-select { background:var(--surface-2); border:1px solid var(--border-2); border-radius:12px; padding:11px 16px; font-size:14px; font-weight:600; color:var(--text); cursor:pointer; font-family:var(--font-sans); outline:none; width:100%; }

        /* CTA section */
        .lp-cta-card {
          background: #2d1b5c url('/images/cta_mountain_peak.png') no-repeat right center / cover;
          border-radius:22px; overflow:hidden; position:relative; padding:40px 36px;
        }
        .lp-cta-card::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background:radial-gradient(500px 350px at 80% 50%,rgba(245,198,23,0.15),transparent 60%);
        }

        /* Onboarding Step Cards - Premium Redesign */
        .lp-step-card-dynamic {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 280px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          position: relative;
          overflow: hidden;
          text-align: left;
          backdrop-filter: blur(10px);
        }
        .lp-step-card-dynamic .step-watermark {
          position: absolute;
          top: -10px;
          right: 8px;
          font-size: 80px;
          font-weight: 800;
          font-family: var(--font-num);
          line-height: 1;
          opacity: 0.04;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
          pointer-events: none;
        }
        .lp-step-card-dynamic:hover .step-watermark {
          opacity: 0.12;
          transform: scale(1.1) translateY(6px);
        }
        .lp-step-card-dynamic .step-icon-container {
          display: inline-flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          margin-bottom: 20px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .lp-step-card-dynamic:hover .step-icon-container {
          transform: scale(1.08) translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }
        .lp-step-card-dynamic .step-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(245, 198, 23, 0.05);
          border: 1px solid rgba(245, 198, 23, 0.12);
          border-radius: 999px;
          padding: 4px 12px;
          transition: all 0.3s ease;
          width: fit-content;
        }
        .lp-step-card-dynamic:hover .step-badge {
          background: rgba(245, 198, 23, 0.1);
          border-color: rgba(245, 198, 23, 0.25);
          transform: translateX(4px);
        }

        .lp-step-card-dynamic.step-blue { background: linear-gradient(135deg, rgba(59,130,246,0.02) 0%, rgba(255,255,255,0.005) 100%); }
        .lp-step-card-dynamic.step-purple { background: linear-gradient(135deg, rgba(124,58,237,0.02) 0%, rgba(255,255,255,0.005) 100%); }
        .lp-step-card-dynamic.step-gold { background: linear-gradient(135deg, rgba(245,198,23,0.02) 0%, rgba(255,255,255,0.005) 100%); }
        .lp-step-card-dynamic.step-white { background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%); }

        .lp-step-card-dynamic:hover {
          background: rgba(255, 255, 255, 0.035);
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45);
        }
        .lp-step-card-dynamic.step-blue:hover { border-color: rgba(59,130,246,0.45); box-shadow: 0 0 25px rgba(59,130,246,0.12), 0 15px 40px rgba(0,0,0,0.45); }
        .lp-step-card-dynamic.step-purple:hover { border-color: rgba(124,58,237,0.45); box-shadow: 0 0 25px rgba(124,58,237,0.12), 0 15px 40px rgba(0,0,0,0.45); }
        .lp-step-card-dynamic.step-gold:hover { border-color: rgba(245,198,23,0.45); box-shadow: 0 0 25px rgba(245,198,23,0.12), 0 15px 40px rgba(0,0,0,0.45); }
        .lp-step-card-dynamic.step-white:hover { border-color: rgba(255,255,255,0.45); box-shadow: 0 0 20px rgba(255,255,255,0.08), 0 15px 40px rgba(0,0,0,0.45); }

        /* Core Benefits Grid & Cards - Premium Redesign */
        .lp-benefits-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .lp-benefit-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          gap: 20px;
          align-items: flex-start;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }
        .lp-benefit-card:hover {
          background: rgba(255, 255, 255, 0.035);
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
        }
        .lp-benefit-card .icon-wrapper {
          display: inline-flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        }
        .lp-benefit-card:hover .icon-wrapper {
          transform: scale(1.08) rotate(4deg);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
        }
        .lp-benefit-card.card-blue:hover { border-color: rgba(59,130,246,0.45); box-shadow: 0 0 20px rgba(59,130,246,0.1), 0 16px 36px rgba(0, 0, 0, 0.45); }
        .lp-benefit-card.card-purple:hover { border-color: rgba(124,58,237,0.45); box-shadow: 0 0 20px rgba(124,58,237,0.1), 0 16px 36px rgba(0, 0, 0, 0.45); }
        .lp-benefit-card.card-gold:hover { border-color: rgba(245,198,23,0.45); box-shadow: 0 0 20px rgba(245,198,23,0.1), 0 16px 36px rgba(0, 0, 0, 0.45); }

        /* Testimonial */
        .lp-testi-card { background:var(--surface); border:1px solid var(--border); border-radius:20px; padding:24px; }

        /* Login button custom glow */
        .lp-login-btn {
          background: transparent !important;
          border: 1.5px solid rgba(245, 198, 23, 0.35) !important;
          color: var(--gold-bright) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .lp-login-btn:hover {
          border-color: var(--gold) !important;
          box-shadow: 0 0 16px rgba(245, 198, 23, 0.35) !important;
          color: var(--gold-soft) !important;
          background: rgba(245, 198, 23, 0.05) !important;
          transform: translateY(-1px);
        }

        /* FAQ */
        .faq-item { border-radius:16px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.025); overflow:hidden; transition:border-color 0.2s,background 0.2s; }
        :root .faq-item { background:rgba(0,0,0,0.02); border-color:rgba(0,0,0,0.06); }
        .faq-item+.faq-item { margin-top:8px; }
        .faq-item:hover { border-color:rgba(124,58,237,0.22); background:rgba(124,58,237,0.02); }
        [data-theme="dark"] .faq-item:hover { border-color:rgba(248,198,23,0.22); background:rgba(248,198,23,0.03); }
        .faq-item[open] { border-color:rgba(124,58,237,0.32); background:rgba(124,58,237,0.04); }
        [data-theme="dark"] .faq-item[open] { border-color:rgba(248,198,23,0.32); background:rgba(248,198,23,0.055); }
        .faq-item summary { list-style:none; }
        .faq-item summary::-webkit-details-marker { display:none; }
        .faq-chevron { transition:transform 0.25s; flex-shrink:0; }
        .faq-item[open] .faq-chevron { transform:rotate(180deg); }
        .faq-divider { height:1px; background:rgba(124,58,237,0.12); margin:0 20px; display:none; }
        [data-theme="dark"] .faq-divider { background:rgba(248,198,23,0.12); }
        .faq-item[open] .faq-divider { display:block; }

        /* Footer dark always */
        .lp-footer { background:rgba(5,5,12,0.98); border-top:1px solid rgba(255,255,255,0.06); }
        .lp-footer-head { font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:rgba(255,255,255,0.28); margin-bottom:16px; }
        .lp-footer-link { display:block; font-size:14px; color:rgba(255,255,255,0.48); margin-bottom:10px; transition:color 0.2s; }
        .lp-footer-link:hover { color:rgba(255,255,255,0.8); }

        /* Ticker */
        .ticker-strip { border-top:1px solid var(--border-2); border-bottom:1px solid var(--border); background:rgba(18,16,30,0.95); overflow:hidden; padding:14px 0; }
        .ticker-track { display:flex; width:max-content; animation:marquee 30s linear infinite; }
        .ticker-item { display:inline-flex; align-items:center; gap:9px; padding:0 30px; font-family:var(--font-num); font-size:13.5px; font-weight:500; color:rgba(255,255,255,0.85); white-space:nowrap; }
        .coin-dot { display:inline-flex; width:18px; height:18px; border-radius:999px; background:linear-gradient(180deg,#ffe27a,#eeb705); border:1.5px solid #8a6a05; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#5c4603; }

        /* Responsive */
        @media(max-width:960px){
          .lp-hero-grid{grid-template-columns:1fr!important;gap:24px!important;padding:48px 0 32px!important;}
          .lp-hero-right{display:none!important;}
          .lp-trust-grid{grid-template-columns:repeat(3,1fr)!important;}
          .lp-steps-grid{grid-template-columns:repeat(2,1fr)!important;}
          .lp-benefits-grid{grid-template-columns:repeat(2,1fr)!important;}
          .lp-hl-grid{grid-template-columns:1fr!important;}
          .lp-pools-grid{grid-template-columns:1fr!important;}
          .lp-pool-connector{display:none!important;}
          .lp-calc-inner{grid-template-columns:1fr!important;}
          .lp-faq-row{grid-template-columns:1fr!important;}
        }
        @media(max-width:640px){
          .lp-trust-grid{grid-template-columns:repeat(2,1fr)!important;}
          .lp-steps-grid{grid-template-columns:1fr!important;}
          .lp-benefits-grid{grid-template-columns:1fr!important;}
          .lp-testi-grid{grid-template-columns:1fr!important;}
          .landing-nav-links{display:none!important;}
          .lp-footer-grid{grid-template-columns:1fr 1fr!important;}
        }
        @media(max-width:500px){
          .lp-login-btn, .landing-nav-auth-btn {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* ─── NAV ─── */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(16px)", background: "rgba(255,255,255,0.85)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <style>{`[data-theme="dark"] header{background:rgba(8,9,18,0.88)!important;border-bottom-color:rgba(255,255,255,0.06)!important;}`}</style>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 70 }}>
          <Logo size={19} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <nav className="landing-nav-links" style={{ display: "flex", gap: 26, alignItems: "center" }}>
              {[["How it works", "#how"], ["The 2-Pool", "#ladder"], ["Earnings", "#earn"], ["FAQ", "#faq"], ["About", "#benefits"]].map(([l, h]) => (
                <Link key={l} href={h} className="lp-nav-link">{l}</Link>
              ))}
            </nav>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ThemeToggle />
              {session ? (
                <Link href={session.role === "admin" ? "/admin" : "/dashboard"} className="btn btn-primary landing-nav-auth-btn" style={{ padding: "8px 16px", fontSize: 13.5 }}>
                  <Wallet size={15} /> Dashboard
                </Link>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Link href="/login" className="btn lp-login-btn" style={{ padding: "8px 16px", fontSize: 13.5, fontWeight: 700 }}>Log in</Link>
                  <Link href="/register" className="btn btn-primary landing-nav-auth-btn" style={{ padding: "8px 16px", fontSize: 13.5 }}>Get started</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="lp-hero">
        <div className="container">
          <div className="lp-hero-grid">
            {/* Left */}
            <div>
              <div className="lp-badge" style={{ marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                AI-Powered. Smart. Secure.
              </div>

              {/* Light mode heading */}
              <h1 className="lp-h1-light lp-hero-text" style={{ fontSize: "clamp(38px,5vw,60px)", lineHeight: 1.08, marginBottom: 0, background: "none", WebkitTextFillColor: "unset", color: "#1e1b4b" }}>
                Build today.<br />
                Benefit{" "}
                <span className="lp-h1-accent">forever.</span>
              </h1>
              {/* Dark mode heading */}
              <h1 className="lp-h1-dark lp-hero-text" style={{ fontSize: "clamp(38px,5vw,60px)", lineHeight: 1.08, marginBottom: 0, background: "none", WebkitTextFillColor: "white", color: "white" }}>
                Take full control<br />
                of your{" "}
                <span className="lp-h1-accent">future.</span>
              </h1>

              <p className="lp-hero-sub" style={{ fontSize: 16, maxWidth: 420, margin: "20px 0 32px", lineHeight: 1.65, fontWeight: 400 }}>
                A dual matrix + auto pool system that puts you in control of your income, your time, and your family&apos;s future.
              </p>

              {/* Feature tags */}
              <div style={{ display: "flex", gap: 18, marginBottom: 28, flexWrap: "wrap" }}>
                {["Secure", "Autonomous", "High-Velocity"].map((f) => (
                  <div key={f} className="lp-ftag">
                    <span className="lp-fdot" />{f}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
                <Link href="/register" className="btn btn-primary" style={{ padding: "14px 26px", fontSize: 15 }}>
                  Create your account <ArrowRight size={16} />
                </Link>
                <Link href="#how" className="lp-hero-outline">
                  See how it works <ArrowRight size={15} />
                </Link>
              </div>

              {/* Social proof */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex" }}>
                  {["#7c3aed", "#2563eb", "#059669", "#d97706"].map((c, i) => (
                    <div key={i} style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: "2px solid white", marginLeft: i > 0 ? -10 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
                      {["A", "B", "C", "D"][i]}
                    </div>
                  ))}
                </div>
                <div className="lp-avatar-txt">
                  {totalMembers >= 10000 ? "10K+" : totalMembers + "+"}
                  <span className="lp-avatar-sub"> Active members worldwide</span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="lp-hero-right" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Stats card */}
              <div className="lp-stats-card" style={{ position: "absolute", top: 10, right: 0, zIndex: 2, minWidth: 195 }}>
                <div className="lp-stats-label">Total Payouts</div>
                <div className="lp-stats-val">${totalPts.toLocaleString()}+</div>
                <MiniChart />
                <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginTop: 4 }}>+18.6% this month</div>
              </div>
              {/* Robot */}
              <div style={{ width: "100%", maxWidth: 360, marginTop: 20 }}>
                <RobotMascot />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SMART AUTO POOLS ─── */}
      <section className="container" style={{ padding: "72px 24px 20px", textAlign: "center" }}>
        <div className="kicker" style={{ justifyContent: "center", marginBottom: 14 }}>
          <span>Smart</span>
          <span style={{ color: "var(--border-3)", margin: "0 8px" }}>•</span>
          <span>Auto Pools</span>
          <span style={{ color: "var(--border-3)", margin: "0 8px" }}>•</span>
          <span>System</span>
        </div>
        <h2 style={{ fontSize: "clamp(26px,4vw,44px)", marginBottom: 14 }}>Secure. Autonomous. High-Velocity.</h2>
        <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.7, maxWidth: 680, margin: "0 auto 48px" }}>
          Backed by smart AI-powered automation and two powerful pools — the 1×2 matrix and global auto pool. Guided by clear upgrade options and a value algorithm. The system is secure, self-sustaining, and built to create ongoing value, every cycle.
        </p>
        <div className="lp-hl-grid">
          {/* Matrix Pool Card */}
          <div className="lp-matrix-card" style={{ textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.45)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Matrix Pool (1×2)</span>
            </div>
            <h3 style={{ fontSize: 23, color: "white", background: "none", WebkitTextFillColor: "white", marginBottom: 12 }}>Matrix Slot Engine</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, marginBottom: 20 }}>
              A structured 1×2 matrix system that rewards quick positioning and smart execution.
            </p>
            {/* Tree visual */}
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 16px", marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: 220 }}>
              <svg viewBox="0 0 300 180" style={{ width: "100%", maxWidth: 300, display: "block", overflow: "visible" }}>
                {/* Connector lines (Root to Level 2) */}
                <line x1={150} y1={28} x2={85} y2={85} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
                <line x1={150} y1={28} x2={215} y2={85} stroke="rgba(255,255,255,0.3)" strokeWidth={2} />

                {/* Connector lines (Level 2 to Level 3) */}
                <line x1={85} y1={85} x2={50} y2={140} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
                <line x1={85} y1={85} x2={120} y2={140} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
                <line x1={215} y1={85} x2={180} y2={140} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
                <line x1={215} y1={85} x2={250} y2={140} stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />

                {/* Root node circle */}
                <circle cx={150} cy={28} r={18} fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
                <PersonIcon x={150} y={28} r={18} color="white" />

                {/* Level 2 circles */}
                <circle cx={85} cy={85} r={15} fill="rgba(245,198,23,0.22)" stroke="rgba(245,198,23,0.55)" strokeWidth={2} />
                <PersonIcon x={85} y={85} r={15} color="#f5c617" />

                <circle cx={215} cy={85} r={15} fill="rgba(245,198,23,0.22)" stroke="rgba(245,198,23,0.55)" strokeWidth={2} />
                <PersonIcon x={215} y={85} r={15} color="#f5c617" />

                {/* Level 3 circles */}
                <circle cx={50} cy={140} r={12} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                <PersonIcon x={50} y={140} r={12} color="rgba(255,255,255,0.6)" />

                <circle cx={120} cy={140} r={12} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                <PersonIcon x={120} y={140} r={12} color="rgba(255,255,255,0.6)" />

                <circle cx={180} cy={140} r={12} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                <PersonIcon x={180} y={140} r={12} color="rgba(255,255,255,0.6)" />

                <circle cx={250} cy={140} r={12} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                <PersonIcon x={250} y={140} r={12} color="rgba(255,255,255,0.6)" />
              </svg>
              <div style={{ textAlign: "center", marginTop: 10, fontSize: 22, fontWeight: 800, color: "white" }}>1×2</div>
            </div>
            {["100% Automated Placement", "Level-based carry forward", "Exit or upgrade upon completion", "Fast cycling & powerful leverage"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle size={14} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.82)" }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Auto Pool Card */}
          <div className="lp-pool-card" style={{ textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.45)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Auto Pool (Global)</span>
            </div>
            <h3 style={{ fontSize: 23, color: "white", background: "none", WebkitTextFillColor: "white", marginBottom: 12 }}>Auto Pool Automation</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, marginBottom: 20 }}>
              Powered by the smart AI + blockchain logic that fills your matrix globally.
            </p>
            {/* Globe visual */}
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 16px", marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: 220 }}>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <div style={{ width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%,#60a5fa,#1d4ed8 60%,#1e3a8a)", border: "3px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 50px rgba(59,130,246,0.45)" }}>
                  <Globe size={60} color="rgba(255,255,255,0.8)" />
                </div>
                {([[18, 24], [110, 18], [118, 88], [24, 90]] as [number, number][]).map(([x, y], i) => (
                  <div key={i} style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: "#f5c617", left: x, top: y, boxShadow: "0 0 8px #f5c617", animation: `pulse-node ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
            {["Global placement", "Continuous activity", "No need to invite", "Sustainable long-term system"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle size={14} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.82)" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48 }}>
          <LiveMatrixSimulator />
        </div>

        <div style={{ marginTop: 48 }}>
          <RoyaltyExplorer />
        </div>
      </section>

      {/* ─── NEXT 2 POOLS ─── */}
      <section className="container" style={{ padding: "64px 24px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="kicker" style={{ color: "var(--gold)", display: "block", marginBottom: 10 }}>Ecosystem Expansion</span>
          <h2 style={{ fontSize: "clamp(26px,4vw,40px)" }}>Upcoming Premium Pools</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 540, margin: "12px auto 0", lineHeight: 1.65 }}>
            Launch phase details for our upcoming high-tier matrix pools currently on the roadmap.
          </p>
        </div>
        <div className="lp-pools-grid">
          {/* Sapphire */}
          <div className="lp-pool-tier">
            <div style={{ position: "absolute", top: 18, left: 20 }}>
              <span style={{ background: "rgba(245,198,23,0.1)", color: "var(--gold)", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(245,198,23,0.3)", letterSpacing: "0.08em" }}>ROADMAP</span>
            </div>
            <div style={{ textAlign: "center", paddingTop: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 10 }}>💎</div>
              <h3 style={{ fontSize: 22, marginBottom: 10, color: "#7c3aed", background: "none", WebkitTextFillColor: "#7c3aed" }}>Tier 6: Sapphire</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, marginBottom: 24, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
                Designed for high-yield slot satisfies, featuring global royalty multipliers and auto re-entries.
              </p>
              <span className="pill" style={{ padding: "10px 24px", fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--muted)" }}>Coming soon</span>
            </div>
          </div>

          {/* Lightning Bolt Connector */}
          <div className="lp-pool-connector">
            <div style={{
              display: "flex",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ffe27a, #f8c617)",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(248,198,23,0.35)",
              border: "2px solid #ffffff"
            }}>
              <Zap size={22} color="#141002" fill="#141002" />
            </div>
          </div>

          {/* Apex Diamond */}
          <div className="lp-pool-tier">
            <div style={{ position: "absolute", top: 18, right: 20 }}>
              <span style={{ background: "rgba(245,198,23,0.1)", color: "var(--gold)", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(245,198,23,0.3)", letterSpacing: "0.08em" }}>ROADMAP</span>
            </div>
            <div style={{ textAlign: "center", paddingTop: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 10 }}>👑</div>
              <h3 style={{ fontSize: 22, marginBottom: 10, color: "var(--gold-bright)", background: "none", WebkitTextFillColor: "var(--gold-bright)" }}>Tier 7: Apex Diamond</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, marginBottom: 24, maxWidth: 260, marginLeft: "auto", marginRight: "auto" }}>
                The ultimate tier. Offers double-fill queue priority overrides and direct cuts of global fee collections.
              </p>
              <span className="pill pill-gold" style={{ padding: "10px 24px", fontSize: 13 }}>Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BADGES ─── */}
      <section style={{ padding: "64px 0 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", marginTop: 64 }}>
        <div className="lp-trust-grid">
          {TRUST_BADGES.map((b) => (
            <div key={b.title} className="lp-trust-item">
              <div style={{ width: 50, height: 50, borderRadius: 14, background: b.bg, border: `1.5px solid ${b.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <b.icon size={22} color={b.color} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TICKER ─── */}
      <div className="ticker-strip">
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <span key={i} className="ticker-item">
              <span className="coin-dot">★</span>{t}
            </span>
          ))}
        </div>
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="container" style={{ padding: "72px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="kicker" style={{ justifyContent: "center", marginBottom: 12 }}>How it works</span>
          <h2 style={{ fontSize: "clamp(26px,4vw,42px)" }}>From zero to apex — four moves.</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 400, margin: "14px auto 0", lineHeight: 1.65 }}>
            One code. Four steps. Achievement starts with a decision.
          </p>
        </div>
        <div className="lp-steps-grid">
          {[
            { step: "01", icon: Users, title: "Register & activate", body: "Join in 30 seconds. Choose your package.", detail: "50 pts total", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", color: "#3b82f6", iconBg: "rgba(59,130,246,0.08)", iconBorder: "rgba(59,130,246,0.2)" },
            { step: "02", icon: Network, title: "Wait slots open", body: "You'll enter the queue. Our AI prepares your position.", detail: "FIFO queue", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)", color: "#9061f9", iconBg: "rgba(124,58,237,0.08)", iconBorder: "rgba(124,58,237,0.2)" },
            { step: "03", icon: BarChart3, title: "Slots fill, balance grows", body: "Once your slots are active, your balance starts building.", detail: "+USDT per fill", bg: "rgba(245,198,23,0.1)", border: "rgba(245,198,23,0.3)", color: "var(--gold)", iconBg: "rgba(245,198,23,0.08)", iconBorder: "rgba(245,198,23,0.2)" },
            { step: "04", icon: Star, title: "Auto earnings begin", body: "Watch compounding deposits as your matrix cycles.", detail: "Your call", bg: "rgba(255,255,255,0.1)", border: "rgba(255,255,255,0.3)", color: "#ffffff", iconBg: "rgba(255,255,255,0.08)", iconBorder: "rgba(255,255,255,0.2)" },
          ].map((f, i) => (
            <div key={f.step} className={`lp-step-card-dynamic ${i === 0 ? 'step-blue' : i === 1 ? 'step-purple' : i === 2 ? 'step-gold' : 'step-white'}`}>
              <div className="step-watermark" style={{ color: f.color }}>
                {f.step}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div className="step-icon-container" style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}` }}>
                  <f.icon size={20} color={f.color} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>{f.title}</h3>
                <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px", lineHeight: 1.6 }}>{f.body}</p>
              </div>
              <div className="step-badge">
                <Zap size={11} color="var(--gold)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{f.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── EARNINGS CALCULATOR ─── */}
      <section id="earn" className="lp-calc-section" style={{ padding: "60px 0" }}>
        <div className="container">
          <EarningsCalculator slabs={slabRows} />
        </div>
      </section>

      {/* ─── GLOBAL MATRIX SLOTS ─── */}
      <section id="ladder" className="container" style={{ padding: "72px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <span className="kicker" style={{ justifyContent: "center", marginBottom: 10 }}>Activated globally. Born in data. Payouts on the blockchain.</span>
          <h2 style={{ fontSize: "clamp(26px,4vw,42px)" }}>Global Matrix Slots</h2>
        </div>
        <div className="lp-slots-row">
          {slabRows.map((s, idx) => (
            <div key={s.level} className="lp-slot-card">
              <div style={{ fontSize: 22, marginBottom: 4 }}>{SLOT_ICONS[idx] ?? "🔵"}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 2 }}>{s.slots}×{s.slots}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-num)", color: "var(--text)" }}>${s.fee}</div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-num)", color: "#22c55e" }}>${s.fee}</div>
            </div>
          ))}
          {slabRows.length === 0 && (
            [{ name: "Starter", fee: 30 }, { name: "Basic", fee: 50 }, { name: "Bronze", fee: 150 }, { name: "Silver", fee: 300 }, { name: "Gold", fee: 1000 }, { name: "Platinum", fee: 10000 }].map((s, idx) => (
              <div key={s.name} className="lp-slot-card">
                <div style={{ fontSize: 22, marginBottom: 4 }}>{SLOT_ICONS[idx]}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 2 }}>1×2</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-num)", color: "var(--text)" }}>${s.fee.toLocaleString()}</div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-num)", color: "#22c55e" }}>${s.fee.toLocaleString()}</div>
              </div>
            ))
          )}
          {[{ name: "Sponsor Slot" }, { name: "Apex Diamond" }].map((s, idx) => (
            <div key={s.name} className="lp-slot-card" style={{ opacity: 0.65, borderStyle: "dashed" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{SLOT_ICONS[6 + idx]}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.3 }}>{s.name}</div>
              <div style={{ fontSize: 14, color: "var(--gold)", fontWeight: 700, marginTop: 12 }}>Ask us</div>
              <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>Ask us</div>
            </div>
          ))}
        </div>

        {/* Sequential Progression Warning Notice */}
        <div style={{
          marginTop: 32,
          padding: "20px 24px",
          background: "rgba(245, 198, 23, 0.04)",
          border: "1px solid rgba(245, 198, 23, 0.2)",
          borderRadius: 16,
          maxWidth: 780,
          marginInline: "auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
          textAlign: "left"
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Sequential Autopool Progression Rule</h4>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
              To ensure structural fairness and stable velocity for all members, <b>there is no buying of higher tier slots/slabs directly</b>. You must successfully complete your active slab level before upgrading and entering the next slot in the ladder.
            </p>
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ─── */}
      <section id="benefits" style={{ background: "linear-gradient(180deg,var(--bg-2) 0%,var(--bg) 100%)", padding: "60px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <span className="kicker" style={{ justifyContent: "center", marginBottom: 12 }}>Core Advantages</span>
            <h2 style={{ fontSize: "clamp(26px,4vw,40px)" }}>Built for Security &amp; Fairness</h2>
            <p style={{ color: "var(--muted)", maxWidth: 520, margin: "14px auto 0", fontSize: 15, lineHeight: 1.65 }}>
              Unlike traditional systems, the matrix runs on a fixed mathematical algorithm with zero manual bias, full database integrity, and instant settlements.
            </p>
          </div>
          <div className="lp-benefits-grid">
            {[
              { icon: ShieldCheck, title: "Autonomous System", desc: "The matrix runs entirely on fixed code logic. Parameters cannot be altered by anyone once launched.", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
              { icon: Lock, title: "Provably Fair FIFO", desc: "Slots are claimed in strict order using database row-level locking. No one can skip the queue.", color: "#9061f9", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)" },
              { icon: BarChart3, title: "100% Transparent Ledger", desc: "Every point transaction is recorded to an append-only database audit log. Publicly verifiable.", color: "var(--gold)", bg: "rgba(245,198,23,0.08)", border: "rgba(245,198,23,0.2)" },
              { icon: Zap, title: "Fully Automated Payouts", desc: "No human approval required. Payouts process instantly to your USDT wallet.", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
              { icon: Star, title: "Royalty Rewards", desc: `Earn royalty pool rewards ${minRoyaltyPct}–${maxRoyaltyPct}% distributed twice a month (1st and 16th) to top partners.`, color: "#9061f9", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)" },
              { icon: GitFork, title: "Open Strategy", desc: "No lock-in. Every tier completion is your decision — cash out or upgrade with earnings.", color: "var(--gold)", bg: "rgba(245,198,23,0.08)", border: "rgba(245,198,23,0.2)" },
            ].map((b, i) => (
              <div key={i} className={`lp-benefit-card ${i % 3 === 0 ? 'card-blue' : i % 3 === 1 ? 'card-purple' : 'card-gold'}`}>
                <div className="icon-wrapper" style={{ background: b.bg, border: `1px solid ${b.border}` }}>
                  <b.icon size={20} color={b.color} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <h3 style={{ fontSize: 16, margin: 0, fontWeight: 700, color: "var(--text)" }}>{b.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ─── WHY JOIN US ─── */}
      <section className="container" style={{ padding: "60px 24px" }}>
        <div style={{
          background: "linear-gradient(135deg, #f5c617 0%, #e0b010 100%)",
          border: "2px solid rgba(255, 255, 255, 0.4)",
          boxShadow: "0 10px 40px rgba(245, 198, 23, 0.3)",
          borderRadius: 28,
          padding: "48px 36px",
          maxWidth: 960,
          margin: "0 auto",
          textAlign: "center"
        }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 12px",
            borderRadius: 99,
            background: "rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.15)",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#191508",
            marginBottom: 14
          }}>
            ✦ Why Choose Us ✦
          </span>
          <h2 style={{
            fontSize: "clamp(26px,4vw,40px)",
            fontWeight: 800,
            color: "#191508",
            background: "none",
            WebkitTextFillColor: "#191508",
            WebkitBackgroundClip: "initial",
            marginBottom: 16,
            letterSpacing: "-0.02em"
          }}>
            Why Join Revolutionary Group?
          </h2>
          <p style={{
            color: "#28200b",
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 740,
            margin: "0 auto 36px",
            fontWeight: 700
          }}>
            Revolutionary Group is redefining the mechanics of decentralized passive rewards. By marrying on-chain checkout velocity with provably fair database-level sequencing, we create a secure ecosystem where everyone plays by the exact same mathematical rules.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            marginTop: 12
          }}>
            {[
              {
                title: "Mathematical Integrity",
                desc: "Every single slot placement is ordered via strict database-level row locks. There are no admin backdoors, no queue skipping, and no manually manipulated waitlists."
              },
              {
                title: "Aligned Incentive Loop",
                desc: "A shared royalty pool contribution of 10 points feeds directly into a pool paid twice a month to top partners. Active sponsor rewards drive continuous network momentum."
              },
              {
                title: "Instant Global Payouts",
                desc: "Earned virtual points can be cashed out instantly to your BEP-20 USDT wallet. Zero processing wait times, zero human authorization loops."
              }
            ].map((item, idx) => (
              <div key={idx} style={{
                background: "rgba(255, 255, 255, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderRadius: 20,
                padding: 24,
                textAlign: "left",
                boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
                transition: "all 0.3s ease",
              }}>
                <div style={{
                  display: "inline-flex",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#191508",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 850,
                  color: "#f5c617",
                  marginBottom: 16
                }}>
                  {idx + 1}
                </div>
                <h4 style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "#191508",
                  background: "none",
                  WebkitTextFillColor: "#191508",
                  WebkitBackgroundClip: "initial",
                  margin: "0 0 8px"
                }}>
                  {item.title}
                </h4>
                <p style={{
                  fontSize: 13.5,
                  color: "#28200b",
                  margin: 0,
                  lineHeight: 1.6,
                  fontWeight: 700
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ + CTA side by side ─── */}
      <section id="faq" className="container" style={{ padding: "20px 24px 80px" }}>
        <div className="lp-faq-row" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 32, alignItems: "start" }}>
          {/* FAQ side */}
          <div>
            <div style={{ marginBottom: 32 }}>
              <span className="kicker" style={{ marginBottom: 10, display: "block" }}>Got questions?</span>
              <h2 style={{ fontSize: "clamp(26px,4vw,38px)", marginBottom: 10 }}>We&apos;ve got answers.</h2>
              {/* Chat bubble icon */}
              <div style={{ display: "inline-flex", gap: 6, marginTop: 10, marginBottom: 24 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {["💬", "❓", "✅"][i]}
                  </div>
                ))}
              </div>
              <Link href="#faq" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
                View all FAQs <ArrowRight size={14} />
              </Link>
            </div>
            {FAQ_ITEMS.map((f) => {
              let answer = f.a;
              if (f.q === "Where does my royalty pool come from?") {
                answer = `${cfg?.royaltyFee ?? 10} points from every member's registration flow into the shared royalty pool. It's distributed twice a month (1st and 16th) to partners with ${royaltyTiers[0]?.minDirects ?? 10}+ direct referrals, split by rank band.`;
              }
              return (
                <details key={f.q} className="faq-item">
                  <summary style={{ display: "flex", alignItems: "center", gap: 14, padding: "17px 20px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5 }}>{f.q}</span>
                    <ChevronDown size={15} color="var(--gold)" className="faq-chevron" />
                  </summary>
                  <div className="faq-divider" />
                  <div style={{ padding: "14px 20px 20px", color: "var(--muted)", fontSize: 14, lineHeight: 1.75 }}>{answer}</div>
                </details>
              );
            })}
          </div>

          {/* CTA side */}
          <div style={{ position: "sticky", top: 90 }}>
            <div className="lp-cta-card">
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: "clamp(24px,3vw,36px)", color: "white", background: "none", WebkitTextFillColor: "white", lineHeight: 1.15, marginBottom: 14 }}>
                  Ready to<br />start climbing?
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", margin: "0 0 28px", lineHeight: 1.6 }}>
                  Secure your future. Build your legacy.<br />The system is ready. Are you?
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                  <Link href="/register" className="btn btn-primary" style={{ padding: "13px 24px", fontSize: 14 }}>
                    Create your account <ArrowRight size={15} />
                  </Link>
                </div>
                <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Log in</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PDF WHITE-PAPER VIEWER ─── */}
      <section id="whitepaper" className="container" style={{ padding: "60px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="kicker" style={{ justifyContent: "center", marginBottom: 12 }}>Official Documentation</span>
          <h2 style={{ fontSize: "clamp(26px,4vw,38px)" }}>Revolution Plan Whitepaper</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 540, margin: "12px auto 0", lineHeight: 1.65 }}>
            Read or download the complete business layout, multi-slab progression formula, and reward tiers.
          </p>
        </div>

        <div style={{
          background: "rgba(15, 23, 42, 0.4)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 24,
          padding: 24,
          maxWidth: 960,
          margin: "0 auto",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(12px)"
        }}>
          {/* Controls toolbar */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>revolution_plan_white.pdf</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <a
                href="/revolution plan White.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: "6px 14px", fontSize: 13, borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Open Fullscreen
              </a>
              <a
                href="/revolution plan White.pdf"
                download="revolution_plan_white.pdf"
                className="btn btn-primary"
                style={{ padding: "6px 14px", fontSize: 13, borderRadius: 10, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Download PDF
              </a>
            </div>
          </div>

          {/* IFrame Viewer */}
          <div style={{
            borderRadius: 16,
            overflow: "hidden",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.05)",
            position: "relative",
            width: "100%",
            height: "550px"
          }}>
            <iframe
              src="/revolution plan White.pdf#toolbar=0"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 16
              }}
              title="Revolution Plan Whitepaper Viewer"
            />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="lp-footer">
        <div className="container lp-footer-grid" style={{ padding: "52px 24px 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.2fr", gap: 28 }}>
          <div>
            <Logo size={18} color="rgba(255,255,255,0.88)" />
            <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 13, marginTop: 14, lineHeight: 1.7, maxWidth: 200 }}>
              A global matrix + auto pool platform based on fair algorithms. Built to create long-term value for everyone.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {[
                { l: "𝕏", c: "#1d9bf0" },
                { l: "f", c: "#1877f2" },
                { l: "in", c: "#e1306c" },
                { l: "▶", c: "#ff0000" },
              ].map((s, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: "50%", background: s.c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white", cursor: "pointer", fontWeight: 700 }}>
                  {s.l}
                </div>
              ))}
            </div>
          </div>
          {[
            { head: "Navigate", links: [["How it works", "#how"], ["The 2-Pool", "#ladder"], ["Earnings", "#earn"], ["FAQ", "#faq"], ["About", "#benefits"]] },
            { head: "Account", links: [["Log in", "/login"], ["Create account", "/register"], ["My dashboard", "/dashboard"], ["My referrals", "/dashboard"], ["Support", "/login"]] },
            { head: "Resources", links: [["Privacy Policy", "#"], ["Terms of Service", "#"], ["Refund Policy", "#"], ["Contact Us", "#"]] },
          ].map((col) => (
            <div key={col.head}>
              <div className="lp-footer-head">{col.head}</div>
              {col.links.map(([label, href]) => (
                <Link key={label} href={href} className="lp-footer-link">{label}</Link>
              ))}
            </div>
          ))}
          <div>
            <div className="lp-footer-head">Stay connected</div>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              <input
                placeholder="Your email"
                style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "none", padding: "10px 14px", color: "white", fontSize: 13, outline: "none", minWidth: 0 }}
              />
              <button style={{ background: "var(--gold)", border: "none", padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <ArrowRight size={16} color="#0a0a0a" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 10, lineHeight: 1.6 }}>
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
        <div className="container" style={{ padding: "0 24px 28px" }}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 12 }}>© {new Date().getFullYear()} Revolutionary Group. All rights reserved.</span>
            <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 12 }}>Secure • Autonomous • High-Velocity</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
