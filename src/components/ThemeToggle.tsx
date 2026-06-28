"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px 6px 10px",
        borderRadius: 999,
        border: "1px solid var(--border-2)",
        background: isDark
          ? "rgba(248,198,23,0.08)"
          : "rgba(248,198,23,0.06)",
        color: "var(--gold-soft)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        letterSpacing: "0.03em",
        transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
        outline: "none",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isDark
          ? "rgba(248,198,23,0.14)"
          : "rgba(248,198,23,0.12)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isDark
          ? "rgba(248,198,23,0.08)"
          : "rgba(248,198,23,0.06)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-2)";
      }}
    >
      {isDark ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
