import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import type { NavItem } from "@/components/SideNav";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const items: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/dashboard/network", label: "My network", icon: "network" },
  { href: "/dashboard/transactions", label: "Transactions", icon: "receipt" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.uid) });
  if (!user) redirect("/login");

  return (
    <AppShell
      items={items}
      title="Dashboard"
      badge={
        <span className="chip" style={{ color: "var(--color-brand-2)", borderColor: "var(--color-brand)" }}>
          {user.pointsBalance} pts
        </span>
      }
    >
      <LiveRefresh />
      {children}
    </AppShell>
  );
}
