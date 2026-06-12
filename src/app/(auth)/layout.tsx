import Link from "next/link";
import { Logo } from "@/components/Logo";
import { MatrixVisual } from "@/components/MatrixVisual";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* left: brand panel */}
      <aside
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px 48px",
          borderRight: "1px solid var(--border)",
          background: "radial-gradient(600px 400px at 30% 10%, rgba(24,200,132,0.1), transparent 60%), var(--bg-2)",
        }}
      >
        <Link href="/"><Logo size={22} /></Link>
        <div>
          <div style={{ maxWidth: 380, marginBottom: 28 }}>
            <MatrixVisual />
          </div>
          <h2 style={{ fontSize: 30, maxWidth: 380 }}>Your network is your net worth.</h2>
          <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 360, marginTop: 12 }}>
            Climb five tiers on a fair, queue-backed matrix. Every slot you fill compounds.
          </p>
        </div>
        <p style={{ color: "var(--faint)", fontSize: 12 }}>Virtual points only · no real money involved</p>
      </aside>

      {/* right: form */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 380 }} className="rise">
          {children}
        </div>
      </div>
    </main>
  );
}
