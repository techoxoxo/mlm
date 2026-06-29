import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const features = [
    { icon: "⚡", text: "Queue-backed FIFO matrix" },
    { icon: "🔐", text: "On-chain USDT payouts" },
    { icon: "📈", text: "5-tier royalty program" },
    { icon: "🛡️", text: "Append-only audit ledger" },
  ];

  return (
    <main className="auth-layout" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* left: brand panel */}
      <aside
        className="auth-aside"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 52px",
          borderRight: "1px solid var(--border)",
          background: "linear-gradient(160deg, #ffffff 0%, #fef9e7 35%, #fffdf5 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* decorative orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,198,23,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,198,23,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* logo */}
        <Link href="/">
          <Logo size={22} />
        </Link>

        {/* main brand copy */}
        <div style={{ position: "relative" }}>
          {/* logo display */}
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              height: 200,
              marginBottom: 32,
              borderRadius: 20,
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(184,134,11,0.2)",
              boxShadow: "0 4px 20px rgba(184,134,11,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/rv_mlm.png" alt="logo" style={{ width: 90, height: 90, objectFit: "contain" }} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#1a1508", letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1.2 }}>
                Revolutionary<br />Income Plan
              </span>
            </div>
          </div>

          <h2 style={{ fontSize: 32, maxWidth: 380, lineHeight: 1.2, marginBottom: 12, color: "#1a1508" }}>
            Your network is your net worth.
          </h2>
          <p style={{ color: "#6b5e2e", fontSize: 15, maxWidth: 360, lineHeight: 1.65, marginBottom: 28 }}>
            Climb five tiers on a fair, queue-backed matrix. Every slot you fill compounds your balance.
          </p>

          {/* feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {features.map((f) => (
              <div
                key={f.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 13.5,
                  color: "#3d2f06",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    background: "rgba(248,198,23,0.2)",
                    border: "1px solid rgba(248,198,23,0.35)",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "#a0845c", fontSize: 12, position: "relative" }}>
          Virtual points only · Powered by USDT crypto rails
        </p>
      </aside>

      {/* right: form */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          background: "var(--bg)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }} className="rise">
          {children}
        </div>
      </div>
    </main>
  );
}
