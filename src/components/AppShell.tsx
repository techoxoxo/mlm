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
    <div className="app-shell" style={{ display: "grid", gridTemplateColumns: "264px 1fr", minHeight: "100vh" }}>
      <aside
        className="app-aside"
        style={{
          borderRight: "1px solid var(--border)",
          padding: "24px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          background: "var(--bg-2)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Link href="/" style={{ padding: "0 8px" }}>
          <Logo size={20} />
        </Link>
        <SideNav items={items} />
        <div style={{ marginTop: "auto" }}>
          <LogoutButton />
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "20px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(12px)",
            background: "rgba(7,6,5,0.55)",
          }}
        >
          <div>
            <h1 style={{ fontSize: 22 }}>{title}</h1>
            {subtitle && <p style={{ color: "var(--faint)", fontSize: 13, margin: "3px 0 0" }}>{subtitle}</p>}
          </div>
          {badge}
        </header>
        <main className="app-main" style={{ padding: "32px 36px", maxWidth: 1080, width: "100%" }}>{children}</main>
      </div>
    </div>
  );
}
