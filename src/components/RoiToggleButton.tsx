"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { toggleRoiPlanEnabledAction } from "@/app/actions/admin";

export function RoiToggleButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      await toggleRoiPlanEnabledAction();
      router.refresh();
    });

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        fontWeight: 700,
        background: enabled ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
        border: `1px solid ${enabled ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.25)"}`,
        color: enabled ? "#10b981" : "var(--muted)",
      }}
    >
      {pending ? <Loader2 size={16} className="spin" /> : <Power size={16} />}
      {enabled ? "Live — users can invest" : "Coming soon — investing is paused"}
    </button>
  );
}
