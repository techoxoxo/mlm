import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import type { NavItem } from "@/components/SideNav";
import { getSession } from "@/lib/auth";

const items: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/slabs", label: "Slabs", icon: "layers" },
  { href: "/admin/settings", label: "Distribution", icon: "settings" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/queue", label: "Queue", icon: "queue" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  return (
    <AppShell
      items={items}
      title="Admin"
      badge={<span className="chip" style={{ color: "var(--color-accent)", borderColor: "var(--color-accent)" }}>Administrator</span>}
    >
      {children}
    </AppShell>
  );
}
