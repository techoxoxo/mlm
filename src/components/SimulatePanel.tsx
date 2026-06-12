"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { simulateAction } from "@/app/actions/admin";

export function SimulatePanel() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [count, setCount] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setMsg(null);
      const fd = new FormData();
      fd.set("count", String(count));
      const res = await simulateAction(fd);
      setMsg(res.error ? res.error : `Spawned & activated ${res.created} players.`);
      router.refresh();
    });

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        <Wand2 size={17} color="var(--color-accent)" /> Simulate players
      </div>
      <p style={{ color: "var(--color-muted)", fontSize: 13, margin: "0 0 16px" }}>
        Spawn fake players, sponsor them randomly, and run them through the live queue — great for
        watching the matrix and distribution fill up.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="number"
          min={1}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="input"
          style={{ width: 110 }}
        />
        <button className="btn btn-primary" onClick={run} disabled={pending}>
          {pending ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
          Run simulation
        </button>
      </div>
      {msg && <p style={{ color: "var(--color-brand-2)", fontSize: 13, marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
