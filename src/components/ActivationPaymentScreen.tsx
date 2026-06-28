"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, ShieldCheck, Lock, Coins, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { initiateActivationDepositAction } from "@/app/actions/payment";
import { Logo } from "@/components/Logo";

type InvoiceInfo = {
  invoiceId: string;
  invoiceUrl: string;
  amountUsdt: number;
};

export function ActivationPaymentScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentResult = searchParams.get("payment");
  const isPaymentSuccess = paymentResult === "success";
  const isPaymentCancelled = paymentResult === "cancelled";

  // If NOWPayments redirected back with ?payment=success, poll until activation completes
  useEffect(() => {
    if (!isPaymentSuccess) return;

    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type: string; status?: string };
        if (ev.type === "payment_update") {
          router.refresh();
        }
      } catch { /* ignore non-JSON pings */ }
    };

    // Fallback: poll via router.refresh every 10s in case SSE misses it
    const interval = setInterval(() => router.refresh(), 10_000);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [isPaymentSuccess, router]);

  const handleInitiate = () => {
    setError(null);
    startTransition(async () => {
      const res = await initiateActivationDepositAction();
      if (!res.ok || !res.data) {
        setError(res.error || "Failed to create payment invoice.");
      } else {
        setInvoice({
          invoiceId: res.data.invoiceId,
          invoiceUrl: res.data.invoiceUrl,
          amountUsdt: res.data.amountUsdt,
        });
        // Redirect to NOWPayments hosted checkout
        window.open(res.data.invoiceUrl, "_blank");
      }
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #ffffff 0%, #fdf4d0 50%, #ffffff 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "var(--font-sans)",
      color: "#1a1508"
    }}>
      <div style={{ marginBottom: 32 }}>
        <Logo size={28} />
      </div>

      <div style={{
        maxWidth: 480,
        width: "100%",
        padding: 32,
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid rgba(248,198,23,0.3)",
        boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 20px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(248,198,23,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        {/* Post-payment: user returned from NOWPayments checkout */}
        {isPaymentSuccess && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
            <span style={{ display: "inline-flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
              <CheckCircle size={24} color="var(--color-success)" />
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1a1508" }}>Payment Received</h2>
            <p style={{ color: "#6b5e2e", fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
              Your payment is being confirmed on-chain. Your account will activate automatically — this usually takes 1–3 minutes.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-brand)", background: "rgba(248, 198, 23, 0.05)", padding: "10px 20px", borderRadius: 8 }}>
              <Loader2 size={14} className="spin" />
              <span style={{ fontWeight: 600 }}>Waiting for blockchain confirmation...</span>
            </div>
          </div>
        )}

        {isPaymentCancelled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
            <span style={{ display: "inline-flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              <XCircle size={24} color="var(--color-danger, #ef4444)" />
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1a1508" }}>Payment Cancelled</h2>
            <p style={{ color: "#6b5e2e", fontSize: 13.5, margin: 0 }}>
              No worries — you can try again when you're ready.
            </p>
            <button
              onClick={() => router.replace("/dashboard")}
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px 0", fontSize: 14.5, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
            >
              Try Again
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Invoice created, waiting for user to complete payment */}
        {!paymentResult && invoice && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(248, 198, 23, 0.1)", border: "1px solid rgba(248, 198, 23, 0.3)" }}>
                <Coins size={15} color="var(--color-brand)" />
              </span>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#1a1508" }}>Activation Invoice</h2>
                <span style={{ fontSize: 11, color: "#6b5e2e" }}>ID: {invoice.invoiceId}</span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#6b5e2e", lineHeight: 1.5, background: "#fafaf7", padding: 14, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)" }}>
              Complete your payment of <b style={{ color: "#1a1508" }}>{invoice.amountUsdt.toFixed(2)} USDT</b> on the NOWPayments checkout page. You'll be redirected back automatically after payment.
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--color-brand)", background: "rgba(248, 198, 23, 0.05)", padding: "10px 0", borderRadius: 8 }}>
              <Loader2 size={14} className="spin" />
              <span style={{ fontWeight: 600 }}>Waiting for payment completion...</span>
            </div>

            <a
              href={invoice.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px 0", fontSize: 14.5, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, textDecoration: "none" }}
            >
              Open Payment Page
              <ExternalLink size={15} />
            </a>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: "8px 0" }}
              onClick={() => setInvoice(null)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Initial state: show fee breakdown and pay button */}
        {!paymentResult && !invoice && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: "rgba(248,198,23,0.1)", border: "1px solid rgba(248,198,23,0.25)", marginBottom: 14 }}>
                <Coins size={20} color="var(--color-brand)" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em", color: "#1a1508" }}>Activate Your Account</h2>
              <p style={{ color: "#6b5e2e", fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 340, marginInline: "auto" }}>
                Secure your position on the global FIFO matrix ladder and start earning rewards.
              </p>
            </div>

            {/* Fee breakdown */}
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
              {[
                { label: "ID & PIN Fee", amount: "10 USDT" },
                { label: "Royalty Fee Contribution", amount: "10 USDT" },
                { label: "Tier 1 (Starter) Entry Fee", amount: "30 USDT" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", background: i % 2 === 0 ? "#fafafa" : "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <span style={{ fontSize: 13, color: "#6b5e2e" }}>{row.label}</span>
                  <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1508" }}>{row.amount}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 18px", background: "rgba(248,198,23,0.12)" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1508" }}>Total Due</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: "#b8860b", letterSpacing: "-0.02em" }}>50 USDT</span>
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: <ShieldCheck size={13} color="#b8860b" />, text: "Account setup, security keys, and ledger creation are executed instantly upon receipt." },
                { icon: <Lock size={13} color="#b8860b" />, text: "Your position in the FIFO queue is guaranteed immediately on payment confirmation." },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", borderRadius: 10, background: "rgba(248,198,23,0.07)", border: "1px solid rgba(248,198,23,0.2)" }}>
                  <span style={{ marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: "#6b5e2e", lineHeight: 1.55 }}>{item.text}</span>
                </div>
              ))}
            </div>

            {error && (
              <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0, textAlign: "center" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleInitiate}
              className="btn btn-primary"
              style={{ width: "100%", padding: "15px 0", fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
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
              style={{ width: "100%", padding: "10px 0", fontSize: 13, opacity: 0.65 }}
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
