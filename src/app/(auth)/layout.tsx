import Link from "next/link";
import { Logo } from "@/components/Logo";

function GoldenCoinUSDT({ x, y, r, label }: { x: number; y: number; r: number; label: string }) {
  return (
    <g style={{ animation: `float ${4 + r * 0.1}s ease-in-out infinite` }}>
      {/* Glow */}
      <circle cx={x} cy={y} r={r + 10} fill="rgba(245, 198, 23, 0.12)" filter="blur(4px)" />
      {/* Coin Base */}
      <circle cx={x} cy={y} r={r} fill="url(#goldGradient)" stroke="#d97706" strokeWidth="2" />
      {/* Inner ring */}
      <circle cx={x} cy={y} r={r - 6} fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
      {/* Symbol */}
      <text x={x} y={y + 6} textAnchor="middle" fontSize={r * 0.85} fontWeight="bold" fill="#ffffff" style={{ userSelect: "none" }}>
        {label}
      </text>
    </g>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(180deg, #0a0806 0%, #030202 100%)",
        color: "#f5f0e8",
        fontFamily: "var(--font-sans)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes starlink-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -20; }
        }
        @keyframes drift-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(12px, -8px); }
        }
        @keyframes drift-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-8px, 12px); }
        }
        @keyframes drift-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, 10px); }
        }
        .starlink-line {
          stroke: rgba(139, 92, 246, 0.25);
          stroke-width: 1.5;
          stroke-dasharray: 6 6;
          animation: starlink-flow 2.5s linear infinite;
        }
        .starlink-line-blue {
          stroke: rgba(59, 130, 246, 0.22);
          stroke-width: 1.5;
          stroke-dasharray: 6 6;
          animation: starlink-flow 2.5s linear infinite;
        }
        .starlink-line-gold {
          stroke: rgba(245, 198, 23, 0.22);
          stroke-width: 1.5;
          stroke-dasharray: 6 6;
          animation: starlink-flow 2.5s linear infinite;
        }
        .starlink-node-1 {
          animation: drift-1 8s ease-in-out infinite;
        }
        .starlink-node-2 {
          animation: drift-2 9s ease-in-out infinite;
        }
        .starlink-node-3 {
          animation: drift-3 7s ease-in-out infinite;
        }

        /* Responsive overrides */
        @media (max-width: 960px) {
          .auth-grid {
            grid-template-columns: 1fr !important;
            padding: 24px 16px !important;
            gap: 20px !important;
          }
          .hide-mobile {
            display: none !important;
          }
          .auth-header {
            padding: 16px 20px !important;
          }
          .auth-footer {
            padding: 20px 16px !important;
            flex-direction: column !important;
            gap: 12px !important;
            text-align: center;
          }
        }
      `}</style>

      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f5c453" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      {/* ─── Glowing Orbs ─── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background: `
            radial-gradient(900px 600px at 80% 20%, rgba(139, 92, 246, 0.1), transparent 60%),
            radial-gradient(700px 500px at 15% 80%, rgba(59, 130, 246, 0.08), transparent 55%),
            radial-gradient(600px 400px at 50% 50%, rgba(245, 198, 23, 0.06), transparent 60%),
            radial-gradient(500px 350px at 30% 30%, rgba(139, 92, 246, 0.06), transparent 55%)
          `,
        }}
      />

      {/* ─── Animated Moving Starlink Background Overlay ─── */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          opacity: 0.28,
        }}
      >
        <svg width="100%" height="100%" style={{ overflow: "visible" }}>
          {/* Animated Connecting Starlink Lines */}
          <line x1="12%" y1="18%" x2="35%" y2="35%" className="starlink-line" />
          <line x1="88%" y1="28%" x2="68%" y2="45%" className="starlink-line-blue" />
          <line x1="15%" y1="78%" x2="40%" y2="65%" className="starlink-line-gold" />
          <line x1="85%" y1="78%" x2="62%" y2="60%" className="starlink-line" />

          <line x1="35%" y1="35%" x2="50%" y2="15%" className="starlink-line-blue" />
          <line x1="68%" y1="45%" x2="50%" y2="15%" className="starlink-line" />
          <line x1="40%" y1="65%" x2="50%" y2="85%" className="starlink-line-gold" />
          <line x1="62%" y1="60%" x2="50%" y2="85%" className="starlink-line-blue" />

          {/* Floating Nodes & Hubs */}
          <g className="starlink-node-1">
            <circle cx="12%" cy="18%" r="18" fill="none" stroke="#a78bfa" strokeWidth="1" />
            <circle cx="12%" cy="18%" r="4" fill="#a78bfa" />
          </g>
          <g className="starlink-node-2">
            <circle cx="88%" cy="28%" r="24" fill="none" stroke="#60a5fa" strokeWidth="1" />
            <circle cx="88%" cy="28%" r="5" fill="#60a5fa" />
          </g>
          <g className="starlink-node-3">
            <circle cx="15%" cy="78%" r="20" fill="none" stroke="#f5c453" strokeWidth="1" />
            <circle cx="15%" cy="78%" r="4" fill="#f5c453" />
          </g>
          <g className="starlink-node-1">
            <circle cx="85%" cy="78%" r="22" fill="none" stroke="#a78bfa" strokeWidth="1" />
            <circle cx="85%" cy="78%" r="4" fill="#a78bfa" />
          </g>
          <g className="starlink-node-2">
            <circle cx="50%" cy="15%" r="14" fill="none" stroke="#60a5fa" strokeWidth="1" />
            <circle cx="50%" cy="15%" r="3" fill="#60a5fa" />
          </g>
          <g className="starlink-node-3">
            <circle cx="50%" cy="85%" r="14" fill="none" stroke="#f5c453" strokeWidth="1" />
            <circle cx="50%" cy="85%" r="3" fill="#f5c453" />
          </g>
        </svg>
      </div>

      {/* Header */}
      <header
        className="auth-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 40px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          position: "relative",
          zIndex: 20,
        }}
      >
        <Link href="/">
          <Logo size={22} color="#f5c453" />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#a89060", textDecoration: "none", transition: "color 0.2s" }}>
            Sign in
          </Link>
          <Link
            href="/register"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#ffffff",
              background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
              padding: "8px 20px",
              borderRadius: 99,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
            }}
          >
            Register
          </Link>
        </div>
      </header>

      {/* Main Grid Content Area */}
      <div
        className="auth-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr 1.1fr",
          alignItems: "center",
          justifyContent: "center",
          flexGrow: 1,
          padding: "40px 60px",
          gap: 40,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Left Box: Creative USDT & Matrix Nodes */}
        <aside
          className="hide-mobile"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            position: "relative",
            zIndex: 15,
          }}
        >
          <svg viewBox="0 0 240 240" width="100%" style={{ maxWidth: 220, overflow: "visible" }}>
            {/* Dashed connector grid */}
            <path d="M 30,50 L 120,120 L 210,50" fill="none" stroke="rgba(245, 198, 23, 0.15)" strokeWidth="1.5" strokeDasharray="4 6" />
            <path d="M 30,190 L 120,120 L 210,190" fill="none" stroke="rgba(245, 198, 23, 0.15)" strokeWidth="1.5" strokeDasharray="4 6" />
            <line x1="30" y1="50" x2="30" y2="190" stroke="rgba(245, 198, 23, 0.15)" strokeWidth="1.5" strokeDasharray="4 6" />
            <line x1="210" y1="50" x2="210" y2="190" stroke="rgba(245, 198, 23, 0.15)" strokeWidth="1.5" strokeDasharray="4 6" />

            {/* Glowing Golden Coins */}
            <GoldenCoinUSDT x={120} y={120} r={28} label="₮" />
            <GoldenCoinUSDT x={30} y={50} r={18} label="$" />
            <GoldenCoinUSDT x={210} y={50} r={18} label="$" />
            <GoldenCoinUSDT x={30} y={190} r={18} label="$" />
            <GoldenCoinUSDT x={210} y={190} r={18} label="$" />
          </svg>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f5c453", marginBottom: 6 }}>Queue Matrix System</h4>
            <p style={{ fontSize: 12.5, color: "#a89060", lineHeight: 1.45, margin: 0 }}>
              Automatic slot allocation and downline fills built directly on the blockchain ledger.
            </p>
          </div>
        </aside>

        {/* Center: Golden Frosted Glass Card Container */}
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            padding: "36px 32px",
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 40%, rgba(18, 16, 20, 0.95) 100%)",
            border: "1.5px solid rgba(139, 92, 246, 0.3)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75), 0 0 35px rgba(139, 92, 246, 0.12)",
            backdropFilter: "blur(20px)",
            position: "relative",
            zIndex: 15,
          }}
        >
          {/* Accent top stripe */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: 2.5,
              background: "linear-gradient(90deg, transparent, #8b5cf6, #3b82f6, #f5c453, transparent)",
            }}
          />
          {children}
        </div>

        {/* Right Box: Slabs & Success illustration */}
        <aside
          className="hide-mobile"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            position: "relative",
            zIndex: 15,
          }}
        >
          <svg viewBox="0 0 240 240" width="100%" style={{ maxWidth: 220, overflow: "visible" }}>
            {/* Rising steps in gold */}
            <rect x="30" y="170" width="35" height="40" fill="rgba(245, 198, 23, 0.08)" stroke="rgba(245, 198, 23, 0.25)" strokeWidth="1.5" />
            <rect x="75" y="140" width="35" height="70" fill="rgba(245, 198, 23, 0.12)" stroke="rgba(245, 198, 23, 0.35)" strokeWidth="1.5" />
            <rect x="120" y="110" width="35" height="100" fill="rgba(245, 198, 23, 0.16)" stroke="rgba(245, 198, 23, 0.45)" strokeWidth="1.5" />
            <rect x="165" y="80" width="35" height="130" fill="rgba(245, 198, 23, 0.2)" stroke="#f5c453" strokeWidth="2" />

            {/* Ascending success arrow */}
            <path d="M 30,150 L 85,115 L 130,85 L 182,45" fill="none" stroke="#f5c453" strokeWidth="3" strokeLinecap="round" />
            <path d="M 168,45 L 183,44 L 184,59" fill="none" stroke="#f5c453" strokeWidth="3" strokeLinecap="round" />

            {/* Floating Top Coin */}
            <GoldenCoinUSDT x={185} y={35} r={18} label="₮" />
          </svg>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "#f5c453", marginBottom: 6 }}>USDT Growth Engine</h4>
            <p style={{ fontSize: 12.5, color: "#a89060", lineHeight: 1.45, margin: 0 }}>
              Instantly settle payouts directly into your personal Web3 wallet with zero platform hold.
            </p>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer
        className="auth-footer"
        style={{
          padding: "24px 40px",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#a89060",
          position: "relative",
          zIndex: 20,
        }}
      >
        <span>Copyright @ Revolutionary Group 2026</span>
        <div style={{ display: "flex", gap: 20 }}>
          <span>Privacy Policy</span>
          <span>Terms & Conditions</span>
        </div>
      </footer>
    </main>
  );
}
