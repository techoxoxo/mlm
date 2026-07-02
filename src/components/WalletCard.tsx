"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDownRight, Wallet, AlertTriangle } from "lucide-react";
import { requestWithdrawalAction } from "@/app/actions/payment";

export function WalletCard({
  pointsBalance,
  activeDeposit: _activeDeposit,
}: {
  pointsBalance: number;
  activeDeposit?: {
    id: string;
    amountUsdt: string;
    amountPoints: number;
    paymentId: string | null;
    status: string;
  } | null;
}) {
  const router = useRouter();
  const [withdrawPending, startWithdrawTransition] = useTransition();

  // Withdrawal states
  const [withdrawPoints, setWithdrawPoints] = useState<number>(10);
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Withdrawal Form Submit Handler
  const handleWithdrawalSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    startWithdrawTransition(async () => {
      const res = await requestWithdrawalAction(withdrawPoints, withdrawAddress);
      if (!res.ok || !res.data) {
        setWithdrawError(res.error || "Failed to process withdrawal request.");
      } else {
        setWithdrawSuccess(
          "Withdrawal submitted! Points deducted and USDT transfer is being processed. Check the transaction history below for status updates."
        );
        setWithdrawAddress("");
        setWithdrawPoints(10);
        router.refresh();
      }
    });
  };

  // Live Payout USDT Estimations (1 Point = 1 USDT, 5% fee)
  const feeAmount = withdrawPoints * 0.05;
  const estimatedPayout = withdrawPoints - feeAmount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Balance Hero Card */}
      <div className="card" style={{ padding: 24, background: "radial-gradient(420px 200px at 90% -10%, rgba(248,198,23,0.1), transparent), var(--color-surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "inline-flex", width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(248,198,23,0.08)" }}>
            <Wallet size={18} color="var(--color-brand)" />
          </span>
          <div>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>USDT Convertible Balance</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="mono" style={{ fontSize: 32, fontWeight: 700 }}>{pointsBalance.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>points</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, margin: "0 0 16px 0", fontWeight: 700 }}>
          <ArrowDownRight size={18} color="var(--color-brand)" />
          Request Payout
        </h3>

        <form onSubmit={handleWithdrawalSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
                Points to withdraw
              </label>
              <input
                type="number"
                min={10}
                max={pointsBalance}
                className="input"
                value={withdrawPoints}
                onChange={(e) => setWithdrawPoints(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: "100%" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
                USDT BEP-20 Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                className="input"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                style={{ width: "100%" }}
                required
              />
            </div>
          </div>

          {/* Math breakdown */}
          <div style={{ fontSize: 11.5, background: "var(--color-surface-2)", padding: 12, borderRadius: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-muted)" }}>Base Value:</span>
              <span className="mono">${(withdrawPoints * 1).toFixed(2)} USDT</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-muted)" }}>Gas Charge (5%):</span>
              <span className="mono" style={{ color: "var(--color-muted)" }}>-${feeAmount.toFixed(2)} USDT</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-border)", paddingTop: 6, fontWeight: 700 }}>
              <span>Estimated Receipt:</span>
              <span className="mono" style={{ color: "var(--color-brand)" }}>{estimatedPayout.toFixed(2)} USDT</span>
            </div>
          </div>

          {withdrawPoints >= 100 && (
            <div style={{ display: "flex", gap: 6, background: "rgba(248,198,23,0.06)", border: "1px solid rgba(248,198,23,0.15)", padding: 10, borderRadius: 8, fontSize: 11, color: "var(--color-muted)", lineHeight: 1.4 }}>
              <AlertTriangle size={14} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Large withdrawals may take a few minutes to process.</span>
            </div>
          )}

          {withdrawError && (
            <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0 }}>
              {withdrawError}
            </p>
          )}

          {withdrawSuccess && (
            <p style={{ color: "var(--color-success)", fontSize: 12.5, margin: 0, fontWeight: 500 }}>
              {withdrawSuccess}
            </p>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "12px 0" }} 
            disabled={withdrawPending || pointsBalance < withdrawPoints || pointsBalance < 10 || estimatedPayout <= 0}
          >
            {withdrawPending ? <Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> : null}
            {pointsBalance < withdrawPoints ? "Insufficient Balance" : "Withdraw USDT"}
          </button>
        </form>
      </div>
    </div>
  );
}
