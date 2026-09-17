"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp } from "lucide-react";
import { runRoiDistributionAction } from "@/app/actions/admin";

export function RoiRunButton({ upToDate, label }: { upToDate?: string; label?: string } = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setMsg(null);
      const r = await runRoiDistributionAction(upToDate);
      if (!r.ok) setMsg(r.error);
      else
        setMsg(
          `✓ ${r.res.investmentsProcessed} investments, ${r.res.daysProcessed} investment-days checked (catches up on any missed days) · ${r.res.dailyRecipients} daily payouts ($${r.res.dailyPaid.toFixed(2)}) · ${r.res.levelPayouts} level payouts ($${r.res.levelPaid.toFixed(2)})`,
        );
      router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        className={upToDate ? "btn btn-outline" : "btn btn-primary"}
        onClick={run}
        disabled={pending}
        style={{ alignSelf: "flex-start", fontSize: upToDate ? 12.5 : undefined, padding: upToDate ? "6px 12px" : undefined }}
      >
        {pending ? <Loader2 size={upToDate ? 12 : 16} className="spin" /> : <TrendingUp size={upToDate ? 12 : 16} />}
        {label ?? "Run today's ROI distribution"}
      </button>
      {msg && <p style={{ color: "var(--gold-bright)", fontSize: 13, margin: 0 }}>{msg}</p>}
    </div>
  );
}
