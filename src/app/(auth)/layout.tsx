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
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* left: brand panel */}
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 52px",
          borderRight: "1px solid var(--border)",
          background:
            "linear-gradient(160deg, rgba(248,198,23,0.12) 0%, rgba(18,15,32,0.97) 40%), var(--bg-2)",
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
            background: "radial-gradient(circle, rgba(248,198,23,0.12) 0%, transparent 70%)",
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
            background: "radial-gradient(circle, rgba(248,198,23,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* logo */}
        <Link href="/">
          <Logo size={22} />
        </Link>

        {/* main brand copy */}
        <div style={{ position: "relative" }}>
          {/* mesh grid visual */}
          <div
            aria-hidden
            style={{
              width: "100%",
              maxWidth: 380,
              height: 200,
              marginBottom: 32,
              borderRadius: 20,
              background:
                "radial-gradient(rgba(248,198,23,0.12) 1.5px, transparent 1.5px)",
              backgroundSize: "22px 22px",
              border: "1px solid rgba(248,198,23,0.1)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* abstract network lines */}
            <svg width="100%" height="100%" viewBox="0 0 380 200" style={{ position: "absolute", inset: 0 }}>
              {/* nodes */}
              {[
                [190, 100], [90, 50], [290, 50], [90, 150], [290, 150],
                [40, 100], [340, 100], [190, 30], [190, 170],
              ].map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={i === 0 ? 8 : 5}
                  fill={i === 0 ? "var(--gold)" : "rgba(248,198,23,0.4)"}
                  style={{ animation: `pulse-node ${1.5 + i * 0.3}s ease-in-out infinite` }}
                />
              ))}
              {/* lines */}
              {[
                [190,100,90,50], [190,100,290,50], [190,100,90,150], [190,100,290,150],
                [90,50,40,100], [290,50,340,100], [90,150,40,100], [290,150,340,100],
                [190,100,190,30], [190,100,190,170],
              ].map(([x1,y1,x2,y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(248,198,23,0.2)" strokeWidth={1} />
              ))}
            </svg>
          </div>

          <h2 style={{ fontSize: 32, maxWidth: 380, lineHeight: 1.2, marginBottom: 12 }}>
            Your network is your net worth.
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 360, lineHeight: 1.65, marginBottom: 28 }}>
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
                  color: "var(--muted)",
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
                    background: "rgba(248,198,23,0.08)",
                    border: "1px solid rgba(248,198,23,0.15)",
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

        <p style={{ color: "var(--faint)", fontSize: 12, position: "relative" }}>
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
          background: "rgba(14,12,24,0.65)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }} className="rise">
          {children}
        </div>
      </div>
    </main>
  );
}
