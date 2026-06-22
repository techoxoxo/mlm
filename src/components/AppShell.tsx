import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SideNav, type NavItem } from "@/components/SideNav";
import { LogoutButton } from "@/components/LogoutButton";

export function AppShell({
  items,
  title,
  subtitle,
  badge,
  children,
}: {
  items: NavItem[];
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell" style={{ display: "grid", gridTemplateColumns: "272px 1fr", minHeight: "100vh" }}>
      <aside
        className="app-aside"
        style={{
          borderRight: "1px solid var(--border)",
          padding: "28px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background:
            "linear-gradient(180deg, rgba(20,17,34,0.97) 0%, rgba(14,12,26,0.98) 100%)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* sidebar glow orb */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -80,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,198,23,0.18) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 40,
            right: -80,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(248,198,23,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <Link href="/" style={{ padding: "0 10px", marginBottom: 16, display: "block" }}>
          <Logo size={20} />
        </Link>

        <SideNav items={items} />

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          {/* version pill */}
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--faint)",
              padding: "0 10px",
              marginBottom: 10,
            }}
          >
            Revolutionary Income Plan
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "0 40px",
            height: 68,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(16px) saturate(180%)",
            background:
              "linear-gradient(90deg, rgba(16,14,28,0.88) 0%, rgba(20,18,36,0.75) 100%)",
            boxShadow: "0 1px 0 var(--border)",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 20,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p style={{ color: "var(--faint)", fontSize: 12.5, margin: "2px 0 0" }}>
                {subtitle}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {badge}
          </div>
        </header>
        <main className="app-main" style={{ padding: "36px 40px", maxWidth: 1100, width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
