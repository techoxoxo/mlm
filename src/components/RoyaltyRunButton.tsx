"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Gift } from "lucide-react";
import { runRoyaltyAction } from "@/app/actions/admin";

export function RoyaltyRunButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setMsg(null);
      const r = await runRoyaltyAction();
      if (!r.ok) setMsg(r.error);
      else
        setMsg(
          `Distributed ${r.res.rankDistributed} pts to ${r.res.rankRecipients} ranked players, ` +
            `${r.res.reserveDistributed} reserve to ${r.res.reserveRecipients}. ` +
            `Reserve fund +${r.res.reserveAdded}.`,
        );
      router.refresh();
    });

  return (
    <div>
      <button className="btn btn-primary" onClick={run} disabled={pending}>
        {pending ? <Loader2 size={16} className="spin" /> : <Gift size={16} />}
        Run royalty distribution
      </button>
      {msg && <p style={{ color: "var(--gold-bright)", fontSize: 13, marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
