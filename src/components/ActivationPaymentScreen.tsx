"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, ShieldCheck, Lock, Coins, CheckCircle, XCircle, ExternalLink, Terminal, Play } from "lucide-react";
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

  // Mock checkout page query params
  const isMockInvoice = searchParams.get("mock_invoice") === "true";
  const mockInvoiceId = searchParams.get("invoice_id") || "";
  const mockAmount = Number(searchParams.get("amount")) || 50;
  const mockOrderId = searchParams.get("order_id") || "";

  // Mock simulation states
  const [selectedCase, setSelectedCase] = useState<"success" | "partially_paid" | "failed" | "expired">("success");
  const [simStatus, setSimStatus] = useState<"idle" | "waiting" | "confirming" | "confirmed" | "finished" | "partially_paid" | "failed" | "expired">("idle");
  const [simLog, setSimLog] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  // Poll until activation completes when an invoice is pending or redirect success is active
  useEffect(() => {
    if (!invoice && !isPaymentSuccess) return;

    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type: string; status?: string };
        if (ev.type === "payment_update") {
          router.refresh();
        }
      } catch { /* ignore pings */ }
    };

    // Fallback: poll via router.refresh every 6s
    const interval = setInterval(() => router.refresh(), 6000);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [invoice, isPaymentSuccess, router]);

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

  const runSimulation = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimStatus("waiting");
    const log = (msg: string) => setSimLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setSimLog([]);

    const sendWebhook = async (status: string, paidAmount: number) => {
      const payload = {
        payment_id: mockInvoiceId,
        status: status,
        amount: mockAmount.toString(),
        currency: "USDT",
        actually_paid: paidAmount.toString(),
        custom_data: { orderId: mockOrderId }
      };
      
      const res = await fetch("/api/webhooks/razcrypto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razcrypto-signature": "mock_ipn_sig"
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error(`Webhook IPN callback failed (${res.status}): ${res.statusText}`);
      }
    };

    try {
      if (selectedCase === "success") {
        log("🔄 Emulating waiting phase ('pending')...");
        await sendWebhook("pending", 0);
        setSimStatus("waiting");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        log("✅ Payment finished successfully ('completed')!");
        await sendWebhook("completed", mockAmount);
        setSimStatus("finished");
        log("🎉 Simulation finished. Redirecting to success page...");
        
        setTimeout(() => {
          router.replace("/dashboard?payment=success");
        }, 1500);

      } else if (selectedCase === "partially_paid") {
        log("🔄 Emulating waiting phase ('pending')...");
        await sendWebhook("pending", 0);
        setSimStatus("waiting");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        log("⚠️ Simulation: Partially paid transaction ('pending')");
        await sendWebhook("pending", Math.floor(mockAmount / 2));
        setSimStatus("partially_paid");
        log("❌ Transaction marked as partially paid.");

      } else if (selectedCase === "failed") {
        log("🔄 Emulating waiting phase ('pending')...");
        await sendWebhook("pending", 0);
        setSimStatus("waiting");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        log("❌ Simulation: Blockchain failure ('expired')");
        await sendWebhook("expired", 0);
        setSimStatus("failed");
        log("❌ Webhook status updated to failed.");

      } else if (selectedCase === "expired") {
        log("🔄 Emulating waiting phase ('pending')...");
        await sendWebhook("pending", 0);
        setSimStatus("waiting");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        log("⏳ Simulation: Session expired ('expired')");
        await sendWebhook("expired", 0);
        setSimStatus("expired");
        log("❌ Webhook status updated to expired.");
      }
    } catch (err) {
      log(`🔴 Connection error: ${(err as Error).message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (isMockInvoice) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-sans)",
        color: "#f8fafc"
      }}>
        <div style={{ marginBottom: 32 }}>
          <Logo size={28} color="#f8fafc" />
        </div>

        <div style={{
          maxWidth: 580,
          width: "100%",
          padding: 32,
          background: "#1e293b",
          borderRadius: 20,
          border: "1px solid rgba(245,198,23,0.3)",
          boxShadow: "0 0 25px rgba(245,198,23,0.1), 0 20px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}>
          <div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 99,
              background: "rgba(245,198,23,0.1)",
              border: "1px solid rgba(245,198,23,0.3)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gold-soft)",
              marginBottom: 12
            }}>
              ⚙️ Sandbox Emulation Page
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>RazCrypto Mock Sandbox</h2>
            <p style={{ color: "#94a3b8", fontSize: 13.5, margin: "6px 0 0", lineHeight: 1.5 }}>
              Choose a checkout test case and click pay to emulate webhook IPN delivery.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Order ID</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{mockOrderId}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Invoice ID</div>
              <div className="mono" style={{ fontSize: 13, color: "#94a3b8" }}>{mockInvoiceId}</div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Amount Due</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: "var(--gold-bright)" }}>{mockAmount.toFixed(2)} USDT</div>
            </div>
          </div>

          <div>
            <label className="label" style={{ color: "#f8fafc", marginBottom: 10, display: "block" }}>Select Test Case</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { value: "success", label: "🟢 success — Emulates a perfectly completed transaction. Moves through waiting → confirming → confirmed → finished." },
                { value: "partially_paid", label: "⚠️ partially_paid — Simulates the user sending less crypto than required." },
                { value: "failed", label: "❌ failed — Simulates a transaction failure or error on the blockchain." },
                { value: "expired", label: "⏳ expired — Simulates letting the 24-hour checkout session window run out." }
              ].map((item) => (
                <label key={item.value} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: selectedCase === item.value ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)", border: `1px solid ${selectedCase === item.value ? "rgba(245,198,23,0.4)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.2s" }}>
                  <input
                    type="radio"
                    name="mock_case"
                    value={item.value}
                    checked={selectedCase === item.value}
                    onChange={() => setSelectedCase(item.value as any)}
                    disabled={simulating}
                    style={{ marginTop: 3, accentColor: "var(--gold)" }}
                  />
                  <span style={{ fontSize: 13, color: selectedCase === item.value ? "#f8fafc" : "#94a3b8", lineHeight: 1.4 }}>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {simLog.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                <Terminal size={12} /> Execution Log
              </div>
              <div style={{
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10,
                padding: 14,
                fontFamily: "var(--font-num)",
                fontSize: 12,
                color: "#10b981",
                height: 120,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}>
                {simLog.map((line, idx) => <div key={idx}>{line}</div>)}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={runSimulation}
              className="btn btn-primary"
              style={{ flex: 1, padding: "14px 0", fontSize: 14.5, fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}
              disabled={simulating}
            >
              {simulating ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Simulating status: {simStatus}...
                </>
              ) : (
                <>
                  <Play size={15} />
                  Confirm & Simulate Payment
                </>
              )}
            </button>
            
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "0 20px", fontSize: 13, borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
              onClick={() => router.replace("/dashboard?payment=cancelled")}
              disabled={simulating}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      <style>{`
        [data-theme="dark"] .pay-container {
          background: #12100d !important;
          border-color: rgba(248,198,23,0.2) !important;
        }
        [data-theme="dark"] .pay-title { color: #f5f0e8 !important; }
        [data-theme="dark"] .pay-text { color: #a89060 !important; }
        [data-theme="dark"] .pay-table { border-color: rgba(255,255,255,0.06) !important; }
        [data-theme="dark"] .pay-row { background: #191612 !important; border-bottom-color: rgba(255,255,255,0.04) !important; color: #a89060 !important; }
        [data-theme="dark"] .pay-row:nth-child(even) { background: #12100d !important; }
        [data-theme="dark"] .pay-total { background: rgba(248,198,23,0.08) !important; color: #f5f0e8 !important; }
        [data-theme="dark"] .pay-total span { color: var(--gold-bright) !important; }
        [data-theme="dark"] .pay-badge { background: rgba(248,198,23,0.04) !important; border-color: rgba(248,198,23,0.15) !important; color: #a89060 !important; }
      `}</style>
      <div style={{ marginBottom: 32 }}>
        <Logo size={28} />
      </div>

      <div className="pay-container" style={{
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
            <h2 className="pay-title" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1a1508" }}>Payment Received</h2>
            <p className="pay-text" style={{ color: "#6b5e2e", fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
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
            <h2 className="pay-title" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1a1508" }}>Payment Cancelled</h2>
            <p className="pay-text" style={{ color: "#6b5e2e", fontSize: 13.5, margin: 0 }}>
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
                <h2 className="pay-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#1a1508" }}>Activation Invoice</h2>
                <span className="pay-text" style={{ fontSize: 11, color: "#6b5e2e" }}>ID: {invoice.invoiceId}</span>
              </div>
            </div>

            <div className="pay-text" style={{ fontSize: 13, color: "#6b5e2e", lineHeight: 1.5, background: "rgba(0,0,0,0.02)", padding: 14, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)" }}>
              Complete your payment of <b className="pay-title" style={{ color: "#1a1508" }}>{invoice.amountUsdt.toFixed(2)} USDT</b> on the RazCrypto checkout page. You'll be redirected back automatically after payment.
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifySelf: "center", alignSelf: "center", gap: 8, fontSize: 13, color: "var(--color-brand)", background: "rgba(248, 198, 23, 0.05)", padding: "10px 24px", borderRadius: 8 }}>
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
              <h2 className="pay-title" style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em", color: "#1a1508" }}>Activate Your Account</h2>
              <p className="pay-text" style={{ color: "#6b5e2e", fontSize: 13, margin: 0, lineHeight: 1.6, maxWidth: 340, marginInline: "auto" }}>
                Secure your position on the global FIFO matrix ladder and start earning rewards.
              </p>
            </div>

            {/* Fee breakdown */}
            <div className="pay-table" style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
              {[
                { label: "ID & PIN Fee", amount: "10 USDT" },
                { label: "Royalty Fee Contribution", amount: "10 USDT" },
                { label: "Tier 1 (Starter) Entry Fee", amount: "30 USDT" },
              ].map((row, i) => (
                <div key={i} className="pay-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", background: i % 2 === 0 ? "#fafafa" : "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "#1a1508" }}>
                  <span style={{ fontSize: 13 }}>{row.label}</span>
                  <span className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{row.amount}</span>
                </div>
              ))}
              <div className="pay-total" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 18px", background: "rgba(248,198,23,0.12)", color: "#1a1508" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total Due</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>50 USDT</span>
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: <ShieldCheck size={13} color="#b8860b" />, text: "Account setup, security keys, and ledger creation are executed instantly upon receipt." },
                { icon: <Lock size={13} color="#b8860b" />, text: "Your position in the FIFO queue is guaranteed immediately on payment confirmation." },
              ].map((item, i) => (
                <div key={i} className="pay-badge" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 14px", borderRadius: 10, background: "rgba(248,198,23,0.07)", border: "1px solid rgba(248,198,23,0.2)", color: "#6b5e2e" }}>
                  <span style={{ marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, lineHeight: 1.55 }}>{item.text}</span>
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
