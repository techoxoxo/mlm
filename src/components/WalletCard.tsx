"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDownRight, Wallet, HelpCircle, AlertTriangle } from "lucide-react";
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
  const [withdrawPoints, setWithdrawPoints] = useState<number>(20);
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
          res.data.status === "pending_admin_approval"
            ? "Withdrawal requested successfully! It is queued for admin manual approval."
            : "Withdrawal processed successfully! Points deducted and enqueued for USDT transfer."
        );
        setWithdrawAddress("");
        setWithdrawPoints(20);
        router.refresh();
      }
    });
  };

  // Live Payout USDT Estimations (1 Point = 1 USDT, minus 2% conversion buffer, minus 2 USDT network gas fee)
  const estimatedPayout = Math.max(0, withdrawPoints * 1 * 0.98 - 2);

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
              <span style={{ fontSize: 14, color: "var(--color-muted)" }}>points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid for forms */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Buy Points (Deposit USDT) — temporarily hidden */}
        {/* <div className="card" style={{ padding: 22 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, margin: "0 0 14px" }}>
            <ArrowUpRight size={18} color="var(--color-success)" />
            Buy Points (USDT Deposit)
          </h3>
          ...deposit form...
        </div> */}

        {/* Cash Out Points (USDT Withdrawal) */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, margin: "0 0 14px" }}>
            <ArrowDownRight size={18} color="var(--color-brand)" />
            Cash Out Points (USDT Payout)
          </h3>

          <form onSubmit={handleWithdrawalSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-muted)", marginBottom: 6 }}>
                Points to Cash Out (Min: 20 pts)
              </label>
              <input
                type="number"
                min="20"
                step="1"
                className="input"
                value={withdrawPoints}
                onChange={(e) => setWithdrawPoints(Number(e.target.value))}
                style={{ width: "100%" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-muted)", marginBottom: 6 }}>
                Destination USDT (BEP-20) Address
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

            {/* Math breakdown */}
            <div style={{ fontSize: 11.5, background: "var(--color-surface-2)", padding: 12, borderRadius: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted)" }}>Base Value:</span>
                <span className="mono">${(withdrawPoints * 1).toFixed(2)} USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted)" }}>Conversion Buffer (2%):</span>
                <span className="mono" style={{ color: "var(--color-muted)" }}>-${(withdrawPoints * 1 * 0.02).toFixed(2)} USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted)" }}>Network Gas Surcharge:</span>
                <span className="mono" style={{ color: "var(--color-muted)" }}>-$2.00 USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-border)", paddingTop: 6, fontWeight: 700 }}>
                <span>Estimated Receipt:</span>
                <span className="mono" style={{ color: "var(--color-brand)" }}>{estimatedPayout.toFixed(2)} USDT</span>
              </div>
            </div>

            {withdrawPoints >= 100 && (
              <div style={{ display: "flex", gap: 6, background: "rgba(248,198,23,0.06)", border: "1px solid rgba(248,198,23,0.15)", padding: 10, borderRadius: 8, fontSize: 11, color: "var(--color-muted)", lineHeight: 1.4 }}>
                <AlertTriangle size={14} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Large withdrawals (≥ 100 points / $100) are flagged for manual review and will process within 24 hours.</span>
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

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px 0" }} disabled={withdrawPending || estimatedPayout <= 0}>
              {withdrawPending ? <Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> : null}
              Withdraw USDT
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
