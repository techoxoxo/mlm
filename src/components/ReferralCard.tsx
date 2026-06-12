"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export function ReferralCard({ code, appUrl }: { code: string; appUrl: string }) {
  const link = `${appUrl}/register?ref=${code}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
        <Share2 size={16} color="var(--color-brand-2)" /> Your referral link
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input" readOnly value={link} style={{ fontSize: 13 }} />
        <button className="btn btn-ghost" onClick={copy} style={{ padding: "0 14px" }}>
          {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
        </button>
      </div>
      <p style={{ color: "var(--color-muted)", fontSize: 13, margin: "12px 0 0" }}>
        Code <b style={{ color: "var(--color-text)", letterSpacing: 1 }}>{code}</b> — share it to earn referral bonuses.
      </p>
    </div>
  );
}
