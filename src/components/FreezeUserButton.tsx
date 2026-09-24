"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Snowflake, Flame, X } from "lucide-react";
import { setUserFrozenAction } from "@/app/actions/admin";

export function FreezeUserButton({ userId, frozen }: { userId: string; frozen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setUserFrozenAction(userId, !frozen, reason || undefined);
        setOpen(false);
        setReason("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update frozen status.");
      }
    });
  };

  // Unfreezing is reversible and low-risk — no confirmation panel needed.
  if (frozen) {
    return (
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="pill pill-gold"
        style={{ border: "1px solid var(--border)", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}
      >
        {pending ? <Loader2 size={12} className="spin" /> : <Flame size={12} />} Unfreeze
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pill"
        style={{
          background: "rgba(111,195,247,0.08)",
          border: "1px solid rgba(111,195,247,0.25)",
          color: "#6fc3f7",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Snowflake size={12} /> Freeze
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(111,195,247,0.06)",
        border: "1px solid rgba(111,195,247,0.25)",
        minWidth: 260,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, color: "#6fc3f7", fontWeight: 700 }}>Freeze this account?</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setReason("");
          }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: 2 }}
        >
          <X size={13} />
        </button>
      </div>
      <p style={{ fontSize: 10.5, color: "var(--faint)", margin: 0, lineHeight: 1.4 }}>
        Blocks login immediately and stops all future benefits — main plan slot credits, referral bonuses, royalty,
        and ROI plan investing/earning. Nothing is deleted; unfreeze restores normal behavior with all history intact.
      </p>
      <input
        type="text"
        placeholder="Reason (optional, visible to other admins)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="input"
        style={{ fontSize: 12.5 }}
        disabled={pending}
      />
      {error && <p style={{ fontSize: 11, color: "#ef4444", margin: 0 }}>{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn btn-primary"
        style={{ fontSize: 12, padding: "6px 12px" }}
      >
        {pending ? <Loader2 size={13} className="spin" /> : <Snowflake size={13} />}
        Confirm freeze
      </button>
    </div>
  );
}
