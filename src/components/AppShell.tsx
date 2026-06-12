import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SideNav, type NavItem } from "@/components/SideNav";
import { LogoutButton } from "@/components/LogoutButton";

export function AppShell({
  items,
  title,
  badge,
  children,
}: {
  items: NavItem[];
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "248px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: "1px solid var(--color-border)",
          padding: "22px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 26,
          background: "var(--color-surface)",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Link href="/" style={{ padding: "0 6px" }}>
          <Logo size={20} />
        </Link>
        <SideNav items={items} />
        <div style={{ marginTop: "auto" }}>
          <LogoutButton />
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <header
          style={{
            borderBottom: "1px solid var(--color-border)",
            padding: "18px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h1>
          {badge}
        </header>
        <main style={{ padding: 32, maxWidth: 1100, width: "100%" }}>{children}</main>
      </div>
    </div>
  );
}
