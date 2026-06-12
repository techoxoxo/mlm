"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  ReceiptText,
  Layers,
  Settings,
  Users,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

// Icons are resolved by name on the client — components can't cross the
// server→client boundary as props.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  network: Network,
  receipt: ReceiptText,
  layers: Layers,
  settings: Settings,
  users: Users,
  queue: ListChecks,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = ICONS[it.icon] ?? LayoutDashboard;
        return (
          <Link
            key={it.href}
            href={it.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "10px 13px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              color: active ? "var(--color-text)" : "var(--color-muted)",
              background: active ? "var(--color-surface-2)" : "transparent",
              border: active ? "1px solid var(--color-border)" : "1px solid transparent",
            }}
          >
            <Icon size={17} color={active ? "var(--color-brand-2)" : "currentColor"} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
