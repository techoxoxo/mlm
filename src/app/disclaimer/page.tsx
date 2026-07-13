import Link from "next/link";
import { Wallet, ArrowRight, AlertTriangle, Scale, ShieldAlert, LineChart } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function DisclaimerPage() {
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
            <h1 className="doc-title">Earnings & Risk Disclaimer</h1>
            <div className="doc-meta">Last Updated: July 13, 2026</div>
          </div>

          <div className="doc-card">
            <div className="doc-section">
              <h2 className="doc-section-title">
                <AlertTriangle size={20} />
                No Guarantees of Earnings
              </h2>
              <p className="doc-text">
                Every effort has been made to accurately represent our matrix auto pool and its potential. However, there is <strong>no guarantee</strong> that you will earn any cryptocurrency or points using the techniques and ideas on this website.
              </p>
              <p className="doc-text">
                Examples, cycle estimates, and historical calculations shown on the landing page or within matrix simulation panels are for educational and illustrative purposes only. They are not to be interpreted as a promise, representation, or guarantee of actual earnings. Your level of success depends entirely on community participation, downline recruitment, and matrix activity.
              </p>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <LineChart size={20} />
                Matrix Queue Velocity Risks
              </h2>
              <p className="doc-text">
                The auto pool matrix and slab completion structures operate sequentially. Advancement velocity is non-linear and relies directly on collective pool volume and slot fills. 
              </p>
              <p className="doc-text">
                If the rate of new slot activations in the community slows down, the rate of slot completions and auto pool cycles will slow down correspondingly. There is a risk that slots may take a long time to cycle, or may not cycle at all if new network participation is insufficient.
              </p>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <ShieldAlert size={20} />
                Cryptocurrency & Volatility Disclosures
              </h2>
              <p className="doc-text">
                Cryptocurrency and token transactions carry significant volatility and regulatory risks. Values can fluctuate widely in short periods. 
              </p>
              <p className="doc-text">
                By participating in slot activations, you acknowledge that you are comfortable holding and transacting in digital assets, and that you assume all risks associated with smart contracts, payment processing networks, and blockchain ledger operations.
              </p>
            </div>

            <div className="doc-section">
              <h2 className="doc-section-title">
                <Scale size={20} />
                Not Financial or Legal Advice
              </h2>
              <p className="doc-text">
                The information provided on this website, in the whitepapers, and through support channels does not constitute investment advice, financial advice, trading advice, or legal advice. 
              </p>
              <p className="doc-text">
                We recommend that you conduct your own independent research and consult with a qualified financial or legal advisor before activating packages or participating in any matrix network.
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
            { head: "Resources", links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Refund Policy", "/refund"], ["Disclaimer", "/disclaimer"]] },
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
