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
  Gift,
  GitFork,
  BookOpen,
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
  gift: Gift,
  matrix: Network,
  tree: GitFork,
  guide: BookOpen,
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
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              color: active ? "var(--text)" : "var(--muted)",
              background: active ? "rgba(248,198,23,0.08)" : "transparent",
              border: active ? "1px solid rgba(248,198,23,0.2)" : "1px solid transparent",
              transition: "color 0.15s, background 0.15s",
            }}
          >
            {active && (
              <span style={{ position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: 99, background: "var(--green-bright)" }} />
            )}
            <Icon size={17} color={active ? "var(--green-bright)" : "currentColor"} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
