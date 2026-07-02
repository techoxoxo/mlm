"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Gift } from "lucide-react";
import { runRankRoyaltyAction, runReserveRoyaltyAction } from "@/app/actions/admin";

export function RoyaltyRunButton() {
  const router = useRouter();
  const [pendingRank, startRank] = useTransition();
  const [pendingReserve, startReserve] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const runRank = () =>
    startRank(async () => {
      setMsg(null);
      const r = await runRankRoyaltyAction();
      if (!r.ok) setMsg(r.error);
      else
        setMsg(
          `✓ Distributed ${r.res.rankDistributed} pts to ${r.res.rankRecipients} ranked players. ` +
            `Reserve fund grew by +${r.res.reserveAdded}.`
        );
      router.refresh();
    });

  const runReserve = () =>
    startReserve(async () => {
      setMsg(null);
      const r = await runReserveRoyaltyAction();
      if (!r.ok) setMsg(r.error);
      else
        setMsg(
          `✓ Distributed ${r.res.reserveDistributed} pts reserve payout to ${r.res.reserveRecipients} eligible players.`
        );
      router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button className="btn btn-primary" onClick={runRank} disabled={pendingRank || pendingReserve}>
          {pendingRank ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
          Distribute Rank Royalty (Bronze to Diamond)
        </button>

        <button className="btn btn-ghost" onClick={runReserve} disabled={pendingRank || pendingReserve} style={{ border: "1px solid var(--border)" }}>
          {pendingReserve ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
          Distribute 6-Month Reserve Payout
        </button>
      </div>
      {msg && <p style={{ color: "var(--gold-bright)", fontSize: 13, marginTop: 4 }}>{msg}</p>}
    </div>
  );
}
