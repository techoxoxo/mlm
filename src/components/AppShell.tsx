"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SideNav, type NavItem } from "@/components/SideNav";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, LayoutDashboard, Network, ReceiptText, Layers, Settings, Users, ListChecks, Gift, GitFork, BookOpen, Wallet, Zap } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { usePathname } from "next/navigation";

const ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  network: Network,
  receipt: ReceiptText,
  layers: Layers,
  settings: Settings,
  users: Users,
  queue: ListChecks,
  gift: Gift,
  matrix: Network,
  tree: GitFork,
  guide: BookOpen,
  wallet: Wallet,
  zap: Zap,
};

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
  const pathname = usePathname();

  return (
    <div className="app-shell" style={{ display: "grid", gridTemplateColumns: "272px 1fr", minHeight: "100vh" }}>
      <style>{`
        /* Responsive Show/Hide helpers */
        @media (min-width: 821px) {
          .desktop-only { display: flex !important; }
          .desktop-only-block { display: block !important; }
          .mobile-only { display: none !important; }
        }
        @media (max-width: 820px) {
          .desktop-only { display: none !important; }
          .desktop-only-block { display: none !important; }
          .mobile-only { display: flex !important; }
          
          /* Adjust grid columns for mobile layout */
          .app-shell {
            grid-template-columns: 1fr !important;
          }
          
          /* desktop sidebar gets hidden completely */
          .app-aside-desktop {
            display: none !important;
          }
          
          /* main padding adjustments to prevent bottom-nav overlap */
          .app-main {
            padding: 24px 16px 86px !important;
          }
        }
      `}</style>

      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className="app-aside-desktop desktop-only"
        style={{
          borderRight: "1px solid var(--border)",
          padding: "28px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background:
            "linear-gradient(180deg, var(--app-aside-bg-from, rgba(20,17,34,0.97)) 0%, var(--app-aside-bg-to, rgba(14,12,26,0.98)) 100%)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* sidebar glow orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -80,
            left: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "40%",
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
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
            background: "radial-gradient(circle, rgba(248,198,23,0.08) 0%, transparent 70%)",
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
            Revolutionary Group
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ─── MAIN WRAPPER ─── */}
      <div className="app-main-wrapper" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Sticky Header */}
        <header
          className="app-header"
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "0 24px",
            height: 68,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 990,
            backdropFilter: "blur(16px) saturate(180%)",
            background: "var(--app-header-bg)",
            boxShadow: "0 1px 0 var(--border)",
          }}
        >
          {/* Left info or Logo on mobile */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="mobile-only" style={{ marginRight: 4 }}>
              <Link href="/">
                <Logo size={16} />
              </Link>
            </div>
            <div>
              <h1
                style={{
                  fontSize: 18,
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="desktop-only-block" style={{ color: "var(--faint)", fontSize: 12.5, margin: "2px 0 0" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right actions: Theme, Badge, and mobile Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            {badge}

            {/* Logout button in header for mobile */}
            <form action={logoutAction} className="mobile-only">
              <button
                type="submit"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255, 82, 82, 0.08)",
                  border: "1px solid rgba(255, 82, 82, 0.15)",
                  color: "#ef4444",
                  cursor: "pointer",
                }}
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </header>

        {/* Content Area */}
        <main className="app-main" style={{ padding: "36px 40px", maxWidth: 1100, width: "100%" }}>
          {children}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAVIGATION BAR ─── */}
      <nav
        className="mobile-only"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          background: "rgba(10, 8, 6, 0.94)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          zIndex: 999,
          padding: "0 10px",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        {items.map((it) => {
          const active = pathname === it.href;
          const Icon = ICONS[it.icon] ?? LayoutDashboard;
          return (
            <Link
              key={it.href}
              href={it.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                textDecoration: "none",
                color: active ? "var(--gold-bright)" : "var(--muted)",
                flexGrow: 1,
                minWidth: 50,
                height: "100%",
                transition: "color 0.2s ease",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  width: 32,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  background: active ? "rgba(248, 198, 23, 0.12)" : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={18} />
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "-0.01em" }}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
