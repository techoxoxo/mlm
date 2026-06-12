"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, registerAction, type ActionState } from "@/app/actions/auth";

export function AuthForm({ mode, refCode, next }: { mode: "login" | "register"; refCode?: string; next?: string }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <div>
          <label className="label">Full name</label>
          <input name="name" className="input" placeholder="Ada Lovelace" required />
        </div>
      )}
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" className="input" placeholder="you@example.com" required />
      </div>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" className="input" placeholder="••••••••" required />
      </div>
      {mode === "register" && (
        <div>
          <label className="label">Referral code {refCode ? "" : "(optional)"}</label>
          <input name="ref" className="input" defaultValue={refCode} placeholder="ABCD1234" />
        </div>
      )}

      {state?.error && (
        <div style={{ color: "var(--color-danger)", fontSize: 13, background: "color-mix(in oklab, var(--color-danger) 12%, transparent)", padding: "9px 12px", borderRadius: 10 }}>
          {state.error}
        </div>
      )}

      <button type="submit" className="btn btn-primary" style={{ marginTop: 4, padding: "12px" }} disabled={pending}>
        {pending && <Loader2 size={16} className="spin" />}
        {mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
