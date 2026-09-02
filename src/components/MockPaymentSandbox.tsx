"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Terminal, Play } from "lucide-react";
import { Logo } from "@/components/Logo";

/**
 * Local sandbox UI for RazCrypto mock invoices (PAYMENT_GATEWAY_MODE=mock).
 * Any checkout_page built in mock mode points back at
 * `${NEXT_PUBLIC_APP_URL}/dashboard?mock_invoice=true&...` — this renders
 * whenever those params are present, regardless of which flow created the
 * invoice (activation, wallet deposit, ROI investment, ...), since the
 * webhook it posts to already routes by the orderId prefix generically.
 */
export function MockPaymentSandbox() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mockInvoiceId = searchParams.get("invoice_id") || "";
  const mockAmount = Number(searchParams.get("amount")) || 0;
  const mockOrderId = searchParams.get("order_id") || "";

  const [selectedCase, setSelectedCase] = useState<"success" | "partially_paid" | "failed" | "expired">("success");
  const [simStatus, setSimStatus] = useState<"idle" | "waiting" | "confirming" | "confirmed" | "finished" | "partially_paid" | "failed" | "expired">("idle");
  const [simLog, setSimLog] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  const runSimulation = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimStatus("waiting");
    const log = (msg: string) => setSimLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setSimLog([]);

    const sendWebhook = async (status: string, paidAmount: number) => {
      const payload = {
        payment_id: mockInvoiceId,
        status,
        amount: mockAmount.toString(),
        currency: "USDT",
        actually_paid: paidAmount.toString(),
        custom_data: { orderId: mockOrderId },
      };

      const res = await fetch("/api/webhooks/razcrypto", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razcrypto-signature": "mock_ipn_sig" },
        body: JSON.stringify(payload),
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
        log("🎉 Simulation finished. Redirecting...");

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "var(--font-sans)",
        color: "#f8fafc",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <Logo size={28} color="#f8fafc" />
      </div>

      <div
        style={{
          maxWidth: 580,
          width: "100%",
          padding: 32,
          background: "#1e293b",
          borderRadius: 20,
          border: "1px solid rgba(245,198,23,0.3)",
          boxShadow: "0 0 25px rgba(245,198,23,0.1), 0 20px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <span
            style={{
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
              marginBottom: 12,
            }}
          >
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
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, wordBreak: "break-all" }}>{mockOrderId}</div>
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
              { value: "expired", label: "⏳ expired — Simulates letting the 24-hour checkout session window run out." },
            ].map((item) => (
              <label
                key={item.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  background: selectedCase === item.value ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)",
                  border: `1px solid ${selectedCase === item.value ? "rgba(245,198,23,0.4)" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="radio"
                  name="mock_case"
                  value={item.value}
                  checked={selectedCase === item.value}
                  onChange={() => setSelectedCase(item.value as typeof selectedCase)}
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
            <div
              style={{
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
                gap: 4,
              }}
            >
              {simLog.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
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
