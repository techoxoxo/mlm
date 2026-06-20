"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet, HelpCircle, Coins, CheckCircle, Copy, AlertTriangle } from "lucide-react";
import { initiateDepositAction, requestWithdrawalAction } from "@/app/actions/payment";

type ActiveDepositInfo = {
  paymentId: string;
  amountUsdt: string;
  amountPoints: number;
  payAddress: string | null;
  status: string;
};

export function WalletCard({
  pointsBalance,
  activeDeposit: initialActiveDeposit,
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
  const [depositPending, startDepositTransition] = useTransition();
  const [withdrawPending, startWithdrawTransition] = useTransition();

  // Deposit states
  const [depositAmount, setDepositAmount] = useState<number>(10);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<ActiveDepositInfo | null>(
    initialActiveDeposit
      ? {
          paymentId: initialActiveDeposit.paymentId || "",
          amountUsdt: initialActiveDeposit.amountUsdt,
          amountPoints: initialActiveDeposit.amountPoints,
          payAddress: null, // fetched or will load
          status: initialActiveDeposit.status,
        }
      : null
  );

  // Withdrawal states
  const [withdrawPoints, setWithdrawPoints] = useState<number>(200);
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  
  // Dynamic deposit address checking (if address was not fetched in SSR)
  useEffect(() => {
    if (initialActiveDeposit && !depositSuccess?.payAddress) {
      // Set initial values from SSR
      setDepositSuccess({
        paymentId: initialActiveDeposit.paymentId || "",
        amountUsdt: initialActiveDeposit.amountUsdt,
        amountPoints: initialActiveDeposit.amountPoints,
        payAddress: "Address will be provided upon first generation. Please initiate a new deposit if you need a new address.",
        status: initialActiveDeposit.status,
      });
    }
  }, [initialActiveDeposit]);

  // Handle Copy To Clipboard helper
  const [copied, setCopied] = useState(false);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Deposit Form Submit Handler
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);

    startDepositTransition(async () => {
      const res = await initiateDepositAction(depositAmount);
      if (!res.ok || !res.data) {
        setDepositError(res.error || "Failed to generate deposit address.");
      } else {
        setDepositSuccess({
          paymentId: res.data.paymentId,
          amountUsdt: res.data.amountUsdt.toString(),
          amountPoints: res.data.amountPoints,
          payAddress: res.data.payAddress,
          status: "pending",
        });
        router.refresh();
      }
    });
  };

  // Withdrawal Form Submit Handler
  const handleWithdrawalSubmit = (e: React.FormEvent) => {
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
        setWithdrawPoints(200);
        router.refresh();
      }
    });
  };

  // Live Payout USDT Estimations (10 Points = 1 USDT, minus 2% conversion buffer, minus 2 USDT network gas fee)
  const estimatedPayout = Math.max(0, (withdrawPoints / 10) * 0.98 - 2);

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
        {/* Buy Points (Deposit USDT) */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, margin: "0 0 14px" }}>
            <ArrowUpRight size={18} color="var(--color-success)" />
            Buy Points (USDT Deposit)
          </h3>

          {depositSuccess ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "var(--color-surface-2)", padding: 16, borderRadius: 12, border: "1px dashed var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color="var(--color-success)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Active Deposit Invoice Generated</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.4 }}>
                Send exactly <b style={{ color: "var(--color-text)" }}>{Number(depositSuccess.amountUsdt).toFixed(2)} USDT (TRC-20)</b> to the address below. Your balance will credit <b style={{ color: "var(--color-success)" }}>+{depositSuccess.amountPoints} points</b> automatically upon confirmation.
              </div>

              {depositSuccess.payAddress && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 4 }}>
                  {/* Dynamic QR Code */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${depositSuccess.payAddress}`}
                    alt="QR Code"
                    style={{ background: "#fff", padding: 6, borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                  <div style={{ width: "100%" }}>
                    <span style={{ fontSize: 11, color: "var(--color-muted)" }}>TRC-20 Destination Address:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, background: "var(--color-surface-3)", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", overflow: "hidden" }}>
                      <span className="mono" style={{ fontSize: 11, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{depositSuccess.payAddress}</span>
                      <button type="button" onClick={() => handleCopy(depositSuccess.payAddress!)} style={{ cursor: "pointer", background: "none", border: "none", padding: 4, display: "flex", color: copied ? "var(--color-success)" : "var(--color-muted)" }}>
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-brand)" }}>
                <Loader2 size={13} className="spin" />
                <span>Waiting for payment detection...</span>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: "100%", fontSize: 12, padding: "8px 0" }}
                onClick={() => setDepositSuccess(null)}
              >
                Create another deposit request
              </button>
            </div>
          ) : (
            <form onSubmit={handleDepositSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-muted)", marginBottom: 6 }}>
                  USDT Amount to Spend (TRC-20)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    className="input"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    style={{ flex: 1 }}
                    required
                  />
                  <span className="mono" style={{ fontSize: 14 }}>USDT</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--color-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Coins size={12} color="var(--color-brand)" />
                  <span>You will receive: <b>{Math.floor(depositAmount * 10 * 0.98)} points</b> (includes 2% buffer)</span>
                </div>
              </div>

              {depositError && (
                <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0 }}>
                  {depositError}
                </p>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px 0" }} disabled={depositPending}>
                {depositPending ? <Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> : null}
                Generate Deposit Address
              </button>
            </form>
          )}
        </div>

        {/* Cash Out Points (USDT Withdrawal) */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, margin: "0 0 14px" }}>
            <ArrowDownRight size={18} color="var(--color-brand)" />
            Cash Out Points (USDT Payout)
          </h3>

          <form onSubmit={handleWithdrawalSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-muted)", marginBottom: 6 }}>
                Points to Cash Out (Min: 200 pts)
              </label>
              <input
                type="number"
                min="200"
                step="10"
                className="input"
                value={withdrawPoints}
                onChange={(e) => setWithdrawPoints(Number(e.target.value))}
                style={{ width: "100%" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-muted)", marginBottom: 6 }}>
                Destination USDT (TRC-20) Address
              </label>
              <input
                type="text"
                placeholder="T..."
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
                <span className="mono">${(withdrawPoints / 10).toFixed(2)} USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-muted)" }}>Conversion Buffer (2%):</span>
                <span className="mono" style={{ color: "var(--color-muted)" }}>-${((withdrawPoints / 10) * 0.02).toFixed(2)} USDT</span>
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

            {withdrawPoints >= 1000 && (
              <div style={{ display: "flex", gap: 6, background: "rgba(248,198,23,0.06)", border: "1px solid rgba(248,198,23,0.15)", padding: 10, borderRadius: 8, fontSize: 11, color: "var(--color-muted)", lineHeight: 1.4 }}>
                <AlertTriangle size={14} color="var(--color-brand)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Large withdrawals ($\ge$ 1,000 points / $100) are flagged for manual review and will process within 24 hours.</span>
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
