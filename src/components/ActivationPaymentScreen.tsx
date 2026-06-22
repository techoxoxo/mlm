"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ShieldCheck, Lock, Gift, CheckCircle, Copy, Coins } from "lucide-react";
import { initiateActivationDepositAction } from "@/app/actions/payment";
import { Logo } from "@/components/Logo";

type ActiveDepositInfo = {
  paymentId: string;
  amountUsdt: string;
  payAddress: string;
};

export function ActivationPaymentScreen({
  userId,
  initialActiveDeposit,
}: {
  userId: string;
  initialActiveDeposit?: ActiveDepositInfo | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deposit, setDeposit] = useState<ActiveDepositInfo | null>(initialActiveDeposit || null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInitiate = () => {
    setError(null);
    startTransition(async () => {
      const res = await initiateActivationDepositAction();
      if (!res.ok || !res.data) {
        setError(res.error || "Failed to generate activation address.");
      } else {
        setDeposit({
          paymentId: res.data.paymentId,
          amountUsdt: res.data.amountUsdt.toString(),
          payAddress: res.data.payAddress,
        });
      }
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at bottom, #1b1605 0%, #0c0a05 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "var(--font-sans)",
      color: "var(--color-text)"
    }}>
      <div style={{ marginBottom: 32 }}>
        <Logo size={28} />
      </div>

      <div className="card" style={{
        maxWidth: 480,
        width: "100%",
        padding: 32,
        background: "rgba(18, 16, 12, 0.8)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(248, 198, 23, 0.15)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 50px rgba(248, 198, 23, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        {deposit ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(248, 198, 23, 0.1)", border: "1px solid rgba(248, 198, 23, 0.3)" }}>
                <Coins size={15} color="var(--color-brand)" />
              </span>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Activation Invoice</h2>
                <span style={{ fontSize: 11, color: "var(--color-muted)" }}>ID: {deposit.paymentId}</span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--color-border)" }}>
              Send exactly <b style={{ color: "var(--color-text)" }}>{Number(deposit.amountUsdt).toFixed(2)} USDT (BEP-20)</b> to the address below. Your account status and matrix slot will activate automatically once detected on-chain.
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 4 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${deposit.payAddress}`}
                alt="QR Code"
                style={{ background: "#fff", padding: 8, borderRadius: 10, border: "1px solid var(--color-border)" }}
              />
              <div style={{ width: "100%" }}>
                <span style={{ fontSize: 11, color: "var(--color-muted)" }}>BEP-20 Destination Address:</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, background: "var(--color-surface-3)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", overflow: "hidden" }}>
                  <span className="mono" style={{ fontSize: 11.5, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deposit.payAddress}</span>
                  <button type="button" onClick={() => handleCopy(deposit.payAddress)} style={{ cursor: "pointer", background: "none", border: "none", padding: 4, display: "flex", color: copied ? "var(--color-success)" : "var(--color-muted)" }}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--color-brand)", marginTop: 4, background: "rgba(248, 198, 23, 0.05)", padding: "10px 0", borderRadius: 8 }}>
              <Loader2 size={14} className="spin" />
              <span style={{ fontWeight: 600 }}>Waiting for block confirmations...</span>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "8px 0", marginTop: 4 }}
              onClick={() => setDeposit(null)}
            >
              Cancel and generate new address
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Activate Your Account</h2>
              <p style={{ color: "var(--color-muted)", fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
                To secure your position on the global FIFO matrix ladder and start earning rewards, activate your account.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--color-surface-2)", padding: 18, borderRadius: 12, border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--color-border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--color-muted)" }}>ID & PIN Fee</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>10 USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--color-border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Royalty Fee Contribution</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>10 USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--color-border)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Tier 1 (Starter) Entry Fee</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>30 USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, fontWeight: 700 }}>
                <span style={{ fontSize: 14 }}>Total Due</span>
                <span className="mono" style={{ fontSize: 16, color: "var(--color-brand)" }}>50 USDT</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "var(--color-muted)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <ShieldCheck size={14} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Account setup, security keys, and ledger creation are executed instantly upon receipt.</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Lock size={14} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Your position in the FIFO queue is guaranteed immediately on payment confirmation.</span>
              </div>
            </div>

            {error && (
              <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0, textAlign: "center" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleInitiate}
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px 0", fontSize: 14.5, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
              disabled={pending}
            >
              {pending ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <>
                  Pay Activation Fee (50 USDT)
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              onClick={() => router.push("/logout")}
              className="btn btn-ghost"
              style={{ width: "100%", padding: "10px 0", fontSize: 13 }}
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
