"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, ArrowUpCircle, Gift } from "lucide-react";

type Toast = { id: number; text: string; icon: "slot" | "complete" | "referral" };

const LABEL: Record<string, { text: string; icon: Toast["icon"] }> = {
  slot_filled: { text: "A slot under you was filled!", icon: "slot" },
  slab_complete: { text: "Your slab is complete — make your move!", icon: "complete" },
  referral: { text: "Referral bonus earned!", icon: "referral" },
};

export function LiveRefresh() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/events");
    let counter = 0;

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type: string };
        const meta = LABEL[ev.type];
        if (meta) {
          const id = ++counter;
          setToasts((t) => [...t, { id, text: meta.text, icon: meta.icon }]);
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
        }
        router.refresh();
      } catch {
        /* ignore non-JSON pings */
      }
    };
    es.onerror = () => {
      /* EventSource auto-reconnects */
    };
    return () => es.close();
  }, [router]);

  return (
    <div style={{ position: "fixed", top: 18, right: 18, display: "flex", flexDirection: "column", gap: 10, zIndex: 50 }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card"
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--color-surface-2)",
            minWidth: 240,
            animation: "slidein 0.2s ease",
          }}
        >
          {t.icon === "slot" && <CheckCircle2 size={18} color="var(--color-brand-2)" />}
          {t.icon === "complete" && <ArrowUpCircle size={18} color="var(--color-accent)" />}
          {t.icon === "referral" && <Gift size={18} color="var(--color-success)" />}
          <span style={{ fontSize: 14 }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
