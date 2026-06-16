"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket, LogOut, ArrowUpCircle } from "lucide-react";
import { activateAction, decideAction } from "@/app/actions/game";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  return { run, pending, error };
}

export function ActivateButton({ fee }: { fee: number }) {
  const { run, pending, error } = useRun();
  return (
    <div>
      <button className="btn btn-primary" style={{ padding: "12px 22px" }} disabled={pending} onClick={() => run(activateAction)}>
        {pending ? <Loader2 size={16} className="spin" /> : <Rocket size={16} />}
        Activate Slab 1 ({fee} pts)
      </button>
      {error && <p style={{ color: "var(--color-danger)", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

export function DecisionPanel({
  level,
  collected,
  exitPercent,
  nextName,
  nextFee,
  isFinal,
}: {
  level: number;
  collected: number;
  exitPercent: number;
  nextName: string | null;
  nextFee: number | null;
  isFinal: boolean;
}) {
  const { run, pending, error } = useRun();
  const exitPayout = Math.floor((collected * exitPercent) / 100);
  // upgrade keeps everything beyond the next level's entry fee (the "seed")
  const upgradeKeep = Math.max(0, collected - (nextFee ?? 0));

  return (
    <div className="card" style={{ padding: 22, borderColor: "var(--color-brand)" }}>
      <div className="chip" style={{ color: "var(--color-accent)", borderColor: "var(--color-accent)" }}>
        Slab {level} complete!
      </div>
      <h3 style={{ margin: "14px 0 4px", fontSize: 18 }}>Make your move</h3>
      <p style={{ color: "var(--color-muted)", fontSize: 14, margin: "0 0 18px" }}>
        You collected <b style={{ color: "var(--color-text)" }}>{collected} pts</b> at this slab.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: isFinal ? "1fr" : "1fr 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 16, background: "var(--color-surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
            <LogOut size={16} color="var(--color-brand-2)" /> {isFinal ? "Full payout" : "Exit now"}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, margin: "10px 0 2px" }}>
            {isFinal ? collected : exitPayout} pts
          </div>
          <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
            {isFinal ? "Keep 100% and finish" : `Keep ${exitPercent}% and leave the game`}
          </div>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 12 }}
            disabled={pending}
            onClick={() => run(() => decideAction("exit"))}
          >
            {pending ? <Loader2 size={15} className="spin" /> : null} {isFinal ? "Cash out" : "Take exit"}
          </button>
        </div>

        {!isFinal && (
          <div className="card" style={{ padding: 16, background: "var(--color-surface-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <ArrowUpCircle size={16} color="var(--color-accent)" /> Upgrade to {nextName}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, margin: "10px 0 2px" }}>keep {upgradeKeep} pts</div>
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
              Pay the {nextName} entry ({nextFee} pts) from your earnings, keep the rest
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 12 }}
              disabled={pending}
              onClick={() => run(() => decideAction("upgrade"))}
            >
              {pending ? <Loader2 size={15} className="spin" /> : null} Upgrade & climb
            </button>
          </div>
        )}
      </div>
      {error && <p style={{ color: "var(--color-danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}
    </div>
  );
}
