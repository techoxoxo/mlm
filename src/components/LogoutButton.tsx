"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          width: "100%",
          padding: "9px 14px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          color: "var(--faint)",
          background: "transparent",
          border: "1px solid transparent",
          cursor: "pointer",
          transition: "all 0.2s ease",
          fontFamily: "var(--font-sans)",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.color = "var(--danger)";
          btn.style.background = "rgba(255,82,82,0.07)";
          btn.style.borderColor = "rgba(255,82,82,0.2)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.color = "var(--faint)";
          btn.style.background = "transparent";
          btn.style.borderColor = "transparent";
        }}
      >
        <LogOut size={14} />
        Log out
      </button>
    </form>
  );
}
