"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2, X } from "lucide-react";
import { reverseRoiInvestmentAction } from "@/app/actions/admin";

export function RoiReverseButton({ investmentId, amount }: { investmentId: string; amount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await reverseRoiInvestmentAction(investmentId, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setPassword("");
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pill"
        style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#ef4444",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Undo2 size={12} /> Reverse
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
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.25)",
        minWidth: 240,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 700 }}>
          Reverse ${amount} investment?
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setPassword("");
          }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: 2 }}
        >
          <X size={13} />
        </button>
      </div>
      <p style={{ fontSize: 10.5, color: "var(--faint)", margin: 0, lineHeight: 1.4 }}>
        Refunds ${amount} to their withdrawable wallet and stops it earning. Already-paid direct/daily/level income
        (to them or their upline) is not clawed back.
      </p>
      <input
        type="password"
        placeholder="Master password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input"
        style={{ fontSize: 12.5 }}
        disabled={pending}
      />
      {error && <p style={{ fontSize: 11, color: "#ef4444", margin: 0 }}>{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || !password}
        className="btn btn-primary"
        style={{ fontSize: 12, padding: "6px 12px" }}
      >
        {pending ? <Loader2 size={13} className="spin" /> : <Undo2 size={13} />}
        Confirm reversal
      </button>
    </div>
  );
}
