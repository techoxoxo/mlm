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
        {/* Post-payment: user returned from NOWPayments checkout */}
        {isPaymentSuccess && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
            <span style={{ display: "inline-flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
              <CheckCircle size={24} color="var(--color-success)" />
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Payment Received</h2>
            <p style={{ color: "var(--color-muted)", fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
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
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Payment Cancelled</h2>
            <p style={{ color: "var(--color-muted)", fontSize: 13.5, margin: 0 }}>
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
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Activation Invoice</h2>
                <span style={{ fontSize: 11, color: "var(--color-muted)" }}>ID: {invoice.invoiceId}</span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, background: "rgba(255, 255, 255, 0.02)", padding: 14, borderRadius: 10, border: "1px solid var(--color-border)" }}>
              Complete your payment of <b style={{ color: "var(--color-text)" }}>{invoice.amountUsdt.toFixed(2)} USDT</b> on the NOWPayments checkout page. You'll be redirected back automatically after payment.
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
