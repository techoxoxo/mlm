"use client";

import { useState } from "react";
import { Copy, Check, Share2, Link2, Key } from "lucide-react";

export function ReferralCard({ code, appUrl }: { code: string; appUrl: string }) {
  const link = `${appUrl}/register?ref=${code}`;
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div
      className="card"
      style={{
        padding: 26,
        background: "linear-gradient(135deg, rgba(248,198,23,0.06) 0%, rgba(16,15,18,0.85) 70%)",
        borderColor: "rgba(248,198,23,0.2)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* deco orb */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(248,198,23,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <span
          style={{
            display: "inline-flex",
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: "linear-gradient(135deg, rgba(248,198,23,0.2), rgba(248,198,23,0.06))",
            border: "1px solid rgba(248,198,23,0.25)",
          }}
        >
          <Share2 size={17} color="var(--gold-bright)" />
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Invite Your Network</div>
          <div style={{ fontSize: 12.5, color: "var(--faint)" }}>
            Share your referral code or link to build your team and earn direct rewards
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Referral Code Row */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", marginBottom: 6, letterSpacing: "0.05em" }}>
            Referral Code
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 14px",
                height: 44,
                borderRadius: 10,
                background: "rgba(248,198,23,0.08)",
                border: "1px solid rgba(248,198,23,0.25)",
              }}
            >
              <Key size={13} color="var(--gold)" style={{ flexShrink: 0 }} />
              <span
                className="mono"
                style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", color: "var(--gold-bright)", flex: 1 }}
              >
                {code}
              </span>
            </div>

            <button
              onClick={copyCode}
              className="btn btn-primary"
              style={{ padding: "0 18px", height: 44, flexShrink: 0, borderRadius: 10, fontSize: 13, minWidth: 100 }}
            >
              {copiedCode ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Referral Link Row */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", marginBottom: 6, letterSpacing: "0.05em" }}>
            Referral Link
          </label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 14px",
                height: 44,
                borderRadius: 10,
                background: "rgba(12,11,14,0.7)",
                border: "1px solid var(--border-2)",
                overflow: "hidden",
              }}
            >
              <Link2 size={13} color="var(--faint)" style={{ flexShrink: 0 }} />
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {link}
              </span>
            </div>

            <button
              onClick={copyLink}
              className="btn btn-primary"
              style={{ padding: "0 18px", height: 44, flexShrink: 0, borderRadius: 10, fontSize: 13, minWidth: 100 }}
            >
              {copiedLink ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
