"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp } from "lucide-react";
import { runRoiDistributionAction } from "@/app/actions/admin";

export function RoiRunButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () =>
    startTransition(async () => {
      setMsg(null);
      const r = await runRoiDistributionAction();
      if (!r.ok) setMsg(r.error);
      else
        setMsg(
          `✓ ${r.res.investmentsProcessed} investments checked · ${r.res.dailyRecipients} daily payouts ($${r.res.dailyPaid.toFixed(2)}) · ${r.res.levelPayouts} level payouts ($${r.res.levelPaid.toFixed(2)})`,
        );
      router.refresh();
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button className="btn btn-primary" onClick={run} disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? <Loader2 size={16} className="spin" /> : <TrendingUp size={16} />}
        Run today&apos;s ROI distribution
      </button>
      {msg && <p style={{ color: "var(--gold-bright)", fontSize: 13, margin: 0 }}>{msg}</p>}
    </div>
  );
}
