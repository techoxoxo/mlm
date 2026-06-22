import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import type { NavItem } from "@/components/SideNav";
import { getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const items: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" },
  { href: "/dashboard/wallet", label: "Wallet", icon: "wallet" },
  { href: "/dashboard/network", label: "My network", icon: "network" },
  { href: "/dashboard/referral", label: "Referrals", icon: "users" },
  { href: "/dashboard/matrix", label: "My matrix", icon: "tree" },
  { href: "/dashboard/royalty", label: "Royalty", icon: "gift" },
  { href: "/dashboard/transactions", label: "Transactions", icon: "receipt" },
  { href: "/dashboard/guide", label: "How to play", icon: "guide" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.uid) });
  if (!user) redirect("/logout");

  return (
    <AppShell
      items={items}
      title={`Welcome back, ${user.name.split(" ")[0]}`}
      subtitle="Here's how your matrix is growing"
      badge={<span className="pill pill-green tnum">{user.pointsBalance.toLocaleString()} pts</span>}
    >
      <LiveRefresh />
      {children}
    </AppShell>
  );
}
