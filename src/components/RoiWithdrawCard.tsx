"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDownRight } from "lucide-react";
import { requestRoiWithdrawalAction } from "@/app/actions/payment";
import { sendUserOtpAction } from "@/app/actions/auth";

export function RoiWithdrawCard({ withdrawableBalance }: { withdrawableBalance: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number>(Math.min(10, withdrawableBalance));
  const [address, setAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    setOtpLoading(true);
    try {
      const res = await sendUserOtpAction();
      if (!res.ok) {
        setError(res.error || "Failed to send verification code.");
      } else {
        setOtpSent(true);
        setOtpCooldown(60);
        const t = setInterval(() => {
          setOtpCooldown((p) => {
            if (p <= 1) {
              clearInterval(t);
              return 0;
            }
            return p - 1;
          });
        }, 1000);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const submit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await requestRoiWithdrawalAction(amount, address, otp);
      if (!res.ok || !res.data) {
        setError(res.error || "Failed to submit withdrawal.");
        return;
      }
      setSuccess(`✓ Withdrawal submitted — ${res.data.amountUsdt.toFixed(2)} USDT is on its way.`);
      setAddress("");
      setOtp("");
      setOtpSent(false);
      router.refresh();
    });
  };

  const fee = amount * 0.05;
  const net = amount - fee;

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          Amount to withdraw
          <input
            type="number"
            min={10}
            max={withdrawableBalance}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value))))}
            className="input"
            required
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          USDT BEP-20 wallet address
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input"
            required
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="6-digit verification code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="input"
          style={{ flex: 1 }}
          required
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={sendOtp}
          disabled={otpLoading || otpCooldown > 0}
          style={{ minWidth: 100, whiteSpace: "nowrap" }}
        >
          {otpLoading ? <Loader2 size={14} className="spin" /> : otpCooldown > 0 ? `${otpCooldown}s` : otpSent ? "Resend" : "Send code"}
        </button>
      </div>

      <div style={{ fontSize: 11.5, background: "var(--bg-2)", padding: 10, borderRadius: 8, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--faint)" }}>Base value</span>
          <span className="mono">${amount.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--faint)" }}>Fee (5%)</span>
          <span className="mono" style={{ color: "var(--faint)" }}>-${fee.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 4, fontWeight: 700 }}>
          <span>You&apos;ll receive</span>
          <span className="mono" style={{ color: "#10b981" }}>${net.toFixed(2)}</span>
        </div>
      </div>

      {error && <p style={{ color: "#ef4444", fontSize: 12.5, margin: 0 }}>{error}</p>}
      {success && <p style={{ color: "#10b981", fontSize: 12.5, margin: 0 }}>{success}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || withdrawableBalance < 10 || amount > withdrawableBalance || amount < 10}
        style={{ alignSelf: "flex-start" }}
      >
        {pending ? <Loader2 size={16} className="spin" /> : <ArrowDownRight size={16} />}
        {withdrawableBalance < 10 ? "Balance below $10 minimum" : `Withdraw $${amount}`}
      </button>
    </form>
  );
}
