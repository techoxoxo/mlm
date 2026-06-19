"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { resetSystemAction } from "@/app/actions/admin";

export function ResetSystemButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reset = () =>
    start(async () => {
      await resetSystemAction();
      setArmed(false);
      setMsg("System reset — back to 0 players.");
      router.refresh();
    });

  return (
    <div className="card" style={{ padding: 22, borderColor: "var(--danger)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        <AlertTriangle size={17} color="var(--danger)" /> Danger zone
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 16px", maxWidth: 620 }}>
        Permanently delete <b>all players</b>, their balances, slots, stage history, royalty data, and the pool —
        resetting the system to 0 users. Slabs, royalty tiers, settings and the admin account are kept.
      </p>
      {!armed ? (
        <button className="btn btn-ghost" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => setArmed(true)}>
          Reset system…
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>This can&apos;t be undone.</span>
          <button
            className="btn"
            style={{ background: "var(--danger)", color: "#fff" }}
            disabled={pending}
            onClick={reset}
          >
            {pending && <Loader2 size={15} className="spin" />} Yes, wipe everything
          </button>
          <button className="btn btn-ghost" disabled={pending} onClick={() => setArmed(false)}>Cancel</button>
        </div>
      )}
      {msg && <p style={{ color: "var(--gold-bright)", fontSize: 13, marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
