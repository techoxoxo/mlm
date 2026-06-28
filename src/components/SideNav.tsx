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
  Wallet,
  type LucideIcon,
} from "lucide-react";

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
  wallet: Wallet,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
              gap: 11,
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--gold-soft)" : "var(--muted)",
              background: active
                ? "linear-gradient(90deg, rgba(248,198,23,0.13) 0%, rgba(248,198,23,0.04) 100%)"
                : "transparent",
              border: active
                ? "1px solid rgba(248,198,23,0.22)"
                : "1px solid transparent",
              transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
              overflow: "hidden",
            }}
          >
            {/* shimmer on active */}
            {active && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(105deg, transparent 35%, rgba(255,220,80,0.06) 50%, transparent 65%)",
                  backgroundSize: "200% 100%",
                  animation: "nav-shimmer 3s ease-in-out infinite",
                }}
              />
            )}
            {/* active left bar */}
            {active && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "18%",
                  bottom: "18%",
                  width: 3,
                  borderRadius: 99,
                  background: "linear-gradient(180deg, var(--gold-bright), var(--gold))",
                  boxShadow: "0 0 8px var(--gold)",
                }}
              />
            )}
            <span
              style={{
                display: "inline-flex",
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                background: active
                  ? "rgba(248,198,23,0.15)"
                  : "var(--bg-2)",
                border: active
                  ? "1px solid rgba(248,198,23,0.25)"
                  : "1px solid var(--border)",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              <Icon
                size={15}
                color={active ? "var(--gold-bright)" : "currentColor"}
              />
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
