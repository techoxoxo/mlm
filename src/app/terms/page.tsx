import Link from "next/link";
import { Wallet, ArrowRight, ShieldCheck, Lock, AlertTriangle, Scale, HelpCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const session = await getSession();

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Local Styles for Documentation Layout */}
      <style>{`
        .doc-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 24px 80px;
        }
        .doc-header-section {
          text-align: center;
          margin-bottom: 48px;
        }
        .doc-title {
          font-family: var(--font-display);
          font-size: clamp(32px, 5vw, 44px);
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 12px;
          background: linear-gradient(135deg, var(--text) 30%, var(--gold-bright) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .doc-meta {
          font-size: 14px;
          color: var(--muted);
          font-family: var(--font-num);
        }
        .doc-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          box-shadow: var(--shadow-sm);
        }
        .doc-section {
          margin-bottom: 36px;
        }
        .doc-section:last-child {
          margin-bottom: 0;
        }
        .doc-section-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .doc-section-title svg {
          color: var(--gold);
        }
        .doc-text {
          font-size: 15.5px;
          line-height: 1.75;
          color: var(--muted);
          margin-bottom: 16px;
        }
        .doc-list {
          padding-left: 20px;
          margin-bottom: 16px;
        }
        .doc-list-item {
          font-size: 15.5px;
          line-height: 1.75;
          color: var(--muted);
          margin-bottom: 8px;
          list-style-type: square;
        }
        .doc-list-item strong {
          color: var(--text);
        }
        
        /* Nav & Footer local styles */
        .lp-nav-link { font-size:13.5px; font-weight:600; color:rgba(30,27,75,0.7); transition:color 0.2s; }
        [data-theme="dark"] .lp-nav-link { color:rgba(255,255,255,0.7); }
        .lp-nav-link:hover { color: var(--gold) !important; }
        .lp-footer { background:rgba(5,5,12,0.98); border-top:1px solid rgba(255,255,255,0.06); }
        .lp-footer-head { font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:rgba(255,255,255,0.28); margin-bottom:16px; }
        .lp-footer-link { display:block; font-size:14px; color:rgba(255,255,255,0.48); margin-bottom:10px; transition:color 0.2s; }
        .lp-footer-link:hover { color:rgba(255,255,255,0.8); }
        [data-theme="dark"] header { background:rgba(8,9,18,0.88)!important; border-bottom-color:rgba(255,255,255,0.06)!important; }
        
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

        @media(max-width:960px){
          .lp-footer-grid{grid-template-columns:1fr 1fr!important; gap: 24px !important;}
        }
        @media(max-width:640px){
          .landing-nav-links{display:none!important;}
          .lp-footer-grid{grid-template-columns:1fr!important;}
          .doc-card { padding: 24px; }
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
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 70 }}>
          <Logo size={19} />
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <nav className="landing-nav-links" style={{ display: "flex", gap: 26, alignItems: "center" }}>
              {[["How it works", "/#how"], ["The 2-Pool", "/#ladder"], ["Earnings", "/#earn"], ["FAQ", "/#faq"], ["About", "/#benefits"]].map(([l, h]) => (
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

      {/* ─── CONTENT ─── */}
      <div style={{ flex: 1 }}>
        <div className="doc-container">
          <div className="doc-header-section">
            <h1 className="doc-title">Terms of Service</h1>
            <div className="doc-meta">Last Updated: July 13, 2026</div>
          </div>

          <div className="doc-card">
            <div className="doc-section">
              <h2 className="doc-section-title">
                <Scale size={20} />
                1. Acceptance of Terms
              </h2>
              <p className="doc-text">
                By registering an account or participating in any matrix structure, queue, or auto pool on Revolutionary Group, you confirm that you have read, understood, and agreed to be bound by these Terms of Service in their entirety.
              </p>
              <p className="doc-text">
                You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to participate. If you do not agree to these terms, you are not authorized to use the platform.
              </p>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <HelpCircle size={20} />
                2. Platform & Matrix Mechanics
              </h2>
              <p className="doc-text">
                Revolutionary Group is an algorithmic matrix and queue-based auto pool platform. Slot allocations, referrals, direct slab completions, and cycles operate according to public algorithms:
              </p>
              <ul className="doc-list">
                <li className="doc-list-item">
                  <strong>Referrals & Downline:</strong> Direct referral connections are permanent and dictate line-of-completion mechanics according to matrix tier configurations.
                </li>
                <li className="doc-list-item">
                  <strong>Matrix Queueing & Pools:</strong> The speed and occurrence of auto pool advancements depend on total community velocity and slot fills. The platform does not guarantee any specific speed, payout rate, or return on slot activations.
                </li>
              </ul>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <AlertTriangle size={20} />
                3. Strictly Non-Refundable
              </h2>
              <div style={{ background: "rgba(204, 159, 14, 0.08)", borderLeft: "3.5px solid var(--gold)", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                <p className="doc-text" style={{ margin: 0, fontWeight: "500", color: "var(--text)" }}>
                  IMPORTANT NOTICE ON REFUNDS:
                </p>
                <p className="doc-text" style={{ margin: "8px 0 0", fontSize: "14.5px" }}>
                  All slot activations, package purchases, and tier advancements are final, immediate, and strictly non-refundable. Because funds are autonomously allocated to reward other members in the pool structure at the moment of activation, transactions cannot be reversed, canceled, or refunded.
                </p>
              </div>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <Lock size={20} />
                4. Wallet & Credentials Security
              </h2>
              <p className="doc-text">
                You are entirely responsible for the security of your cryptocurrency wallets and dashboard credentials. 
              </p>
              <ul className="doc-list">
                <li className="doc-list-item">
                  We are not responsible for funds lost due to compromised keys, phished passwords, or authorization failures.
                </li>
                <li className="doc-list-item">
                  Ensure you use secure passwords, activate any available multi-factor authentication, and verify all website URLs before transacting.
                </li>
              </ul>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <AlertTriangle size={20} />
                5. Risk Disclosures & Disclaimers
              </h2>
              <p className="doc-text">
                Participating in networking, matrix-fill, or auto pool structures involves risk. Velocity depends strictly on new entries, slot cycles, and community activity. 
              </p>
              <p className="doc-text">
                The platform is provided on an "as is" and "as available" basis without warranties of any kind. We do not guarantee that the platform will be error-free, uninterrupted, or that you will achieve any financial returns. You participate entirely at your own risk.
              </p>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <ShieldCheck size={20} />
                6. Code of Conduct
              </h2>
              <p className="doc-text">
                Users agree not to:
              </p>
              <ul className="doc-list">
                <li className="doc-list-item">
                  Attempt to exploit bugs, use automatic scripts to manipulate queues, or conduct sybil attacks.
                </li>
                <li className="doc-list-item">
                  Spread false, deceptive, or misleading advertising materials regarding potential earnings.
                </li>
                <li className="doc-list-item">
                  Harass support staff or other platform participants.
                </li>
              </ul>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <Scale size={20} />
                7. Limitation of Liability
              </h2>
              <p className="doc-text">
                To the maximum extent permitted by applicable law, Revolutionary Group, its operators, or developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the platform, transaction failures, or smart contract interactions.
              </p>
            </div>
          </div>
        </div>
      </div>

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
            { head: "Navigate", links: [["How it works", "/#how"], ["The 2-Pool", "/#ladder"], ["Earnings", "/#earn"], ["FAQ", "/#faq"], ["About", "/#benefits"]] },
            { head: "Account", links: [["Log in", "/login"], ["Create account", "/register"], ["My dashboard", "/dashboard"], ["My referrals", "/dashboard"], ["Support", "/login"]] },
            { head: "Resources", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Refund Policy", "#"], ["Contact Us", "#"]] },
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
