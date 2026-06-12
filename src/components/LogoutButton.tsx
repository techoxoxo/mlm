"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
        <LogOut size={15} /> Log out
      </button>
    </form>
  );
}
