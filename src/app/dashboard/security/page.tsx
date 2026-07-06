"use client";

import { useState } from "react";
import { Loader2, Key, ShieldAlert } from "lucide-react";
import { sendUserOtpAction } from "@/app/actions/auth";
import { changePasswordAction } from "@/app/actions/password";

export default function SecurityPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const handleSendOtp = async () => {
    setError(null);
    setOtpLoading(true);
    try {
      const res = await sendUserOtpAction();
      if (!res.ok) {
        setError(res.error || "Failed to send verification code.");
      } else {
        setOtpSent(true);
        setOtpCooldown(60);
        const timer = setInterval(() => {
          setOtpCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setError("Failed to trigger verification code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError("Verification code is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setChanging(true);
    try {
      const res = await changePasswordAction(cleanOtp, password);
      if (res.ok) {
        setSuccess("Password updated successfully!");
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        setOtpSent(false);
      } else {
        setError(res.error || "Failed to update password.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 580 }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Key size={12} />
          Account Security
        </div>
        <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>Change password</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
          To update your password, we require email verification via a one-time passcode (OTP) sent to your registered email address.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
              Email Verification
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                className="input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ flex: 1 }}
                required={otpSent}
                disabled={!otpSent}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={otpLoading || otpCooldown > 0}
                onClick={handleSendOtp}
                style={{ minWidth: 100, padding: "0 12px", height: "42px" }}
              >
                {otpLoading ? (
                  <Loader2 size={14} className="spin" />
                ) : otpCooldown > 0 ? (
                  `${otpCooldown}s`
                ) : otpSent ? (
                  "Resend"
                ) : (
                  "Send OTP"
                )}
              </button>
            </div>
            {otpSent && (
              <span style={{ display: "block", fontSize: 11.5, color: "var(--color-muted)", marginTop: 5 }}>
                Verification code was emailed to your inbox.
              </span>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--color-danger)", fontSize: 12.5, margin: 0 }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ color: "var(--color-success)", fontSize: 12.5, margin: 0, fontWeight: 500 }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={changing || !otpSent}
            style={{ width: "100%", padding: "12px 0", marginTop: 4 }}
          >
            {changing && <Loader2 size={16} className="spin" />}
            Update Password
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 8, background: "rgba(248,198,23,0.04)", border: "1px solid rgba(248,198,23,0.1)", padding: 14, borderRadius: 12, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        <ShieldAlert size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>For security reasons, changing your password will invalidate your existing login session tokens on other devices. Never share your recovery passcode with anyone.</span>
      </div>
    </div>
  );
}
