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
          justifyContent: "center",
          gap: 9,
          width: "100%",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 13.5,
          fontWeight: 700,
          color: "#ef4444",
          background: "rgba(239, 68, 68, 0.06)",
          border: "1px solid rgba(239, 68, 68, 0.15)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          fontFamily: "var(--font-sans)",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.color = "#ffffff";
          btn.style.background = "#ef4444";
          btn.style.borderColor = "#ef4444";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.color = "#ef4444";
          btn.style.background = "rgba(239, 68, 68, 0.06)";
          btn.style.borderColor = "rgba(239, 68, 68, 0.15)";
        }}
      >
        <LogOut size={15} />
        Log out
      </button>
    </form>
  );
}
