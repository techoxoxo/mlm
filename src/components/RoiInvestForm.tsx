"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, CreditCard } from "lucide-react";
import { investInRoiPlanAction } from "@/app/actions/roiPlan";
import { initiateRoiInvestDepositAction } from "@/app/actions/payment";

export function RoiInvestForm({
  minInvest,
  maxInvest,
  investStep,
  balance,
  investableFromWallet,
}: {
  minInvest: number;
  maxInvest: number;
  investStep: number;
  balance: number;
  investableFromWallet: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(minInvest);
  const [pending, startTransition] = useTransition();
  const [payPending, startPayTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  const submit = () => {
    setMsg(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("amount", String(amount));
      const res = await investInRoiPlanAction(form);
      if (!res.ok) setMsg({ ok: false, text: res.error });
      else
        setMsg({
          ok: true,
          text:
            res.directPaid > 0
              ? `✓ Invested ${amount}. Your sponsor was paid ${res.directPaid.toFixed(2)} direct income (split 50/50 USDT/Token).`
              : `✓ Invested ${amount}.`,
        });
      router.refresh();
    });
  };

  const payViaUsdt = () => {
    setMsg(null);
    startPayTransition(async () => {
      const res = await initiateRoiInvestDepositAction(amount);
      if (!res.ok || !res.data) {
        setMsg({ ok: false, text: res.error || "Failed to create payment invoice." });
        return;
      }
      window.open(res.data.invoiceUrl, "_blank");
      setAwaitingPayment(true);
    });
  };

  // While waiting for a USDT payment to confirm, listen for the live payment
  // event and fall back to polling — same pattern as activation.
  useEffect(() => {
    if (!awaitingPayment) return;

    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type: string; status?: string };
        if (ev.type === "payment_update") {
          if (ev.status === "completed") {
            setAwaitingPayment(false);
            setMsg({ ok: true, text: `✓ Payment received — invested $${amount}.` });
          }
          router.refresh();
        }
      } catch {
        // ignore keep-alive pings
      }
    };

    const interval = setInterval(() => router.refresh(), 6000);
    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [awaitingPayment, amount, router]);

  const steps = Math.floor((maxInvest - minInvest) / investStep) + 1;
  const shortfall = amount > investableFromWallet;
  const dueToEarnedMoney = shortfall && amount <= balance;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="range"
          min={minInvest}
          max={maxInvest}
          step={investStep}
          value={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value));
            setAwaitingPayment(false);
          }}
          style={{ flex: 1 }}
        />
        <span className="mono" style={{ fontSize: 18, fontWeight: 700, minWidth: 80, textAlign: "right" }}>
          ${amount}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--faint)" }}>
        <span>${minInvest}</span>
        <span>{steps} steps of ${investStep}</span>
        <span>${maxInvest}</span>
      </div>

      {!shortfall ? (
        <button className="btn btn-primary" onClick={submit} disabled={pending} style={{ alignSelf: "flex-start" }}>
          {pending ? <Loader2 size={16} className="spin" /> : <TrendingUp size={16} />}
          Invest ${amount}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <button
            className="btn btn-primary"
            onClick={payViaUsdt}
            disabled={payPending || awaitingPayment}
            style={{ alignSelf: "flex-start" }}
          >
            {payPending ? (
              <Loader2 size={16} className="spin" />
            ) : awaitingPayment ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <CreditCard size={16} />
            )}
            {awaitingPayment ? "Waiting for payment…" : `Pay $${amount} via USDT`}
          </button>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>
            {dueToEarnedMoney
              ? `$${investableFromWallet} of your $${balance} wallet balance is eligible to fund an investment — the rest is money already earned from this plan, which can't be reinvested from your wallet.`
              : `Wallet balance ($${balance}) is below this amount.`}{" "}
            Pay the full ${amount} directly and it&apos;ll be invested automatically once confirmed. Your existing
            balance stays untouched.
          </p>
        </div>
      )}

      {msg && (
        <p style={{ color: msg.ok ? "var(--gold-bright)" : "#ef4444", fontSize: 13, margin: 0 }}>{msg.text}</p>
      )}
    </div>
  );
}
