"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { sendResetPasswordOtpAction, resetPasswordAction } from "@/app/actions/password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleSendOtp = async () => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await sendResetPasswordOtpAction(cleanEmail);
      if (res.ok) {
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
      } else {
        setError(res.error || "Failed to send verification code.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
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

    setResetting(true);
    try {
      const res = await resetPasswordAction(email, cleanOtp, password);
      if (res.ok) {
        setSuccess("Password reset successfully! Redirecting you to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 99,
          background: "rgba(139, 92, 246, 0.12)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#c084fc",
          marginBottom: 16,
        }}
      >
        ✦ Security Recovery
      </div>

      <h1 style={{ fontSize: 30, margin: "0 0 6px", letterSpacing: "-0.02em", color: "#ffffff" }}>Reset Password</h1>
      <p style={{ color: "#94a3b8", fontSize: 14.5, margin: "0 0 28px", lineHeight: 1.5 }}>
        Recover access to your matrix account via email verification.
      </p>

      <form onSubmit={handleResetSubmit} className="auth-form-cyber" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <style>{`
          .auth-form-cyber input.input {
            background: rgba(18, 14, 28, 0.8) !important;
            border: 1px solid rgba(139, 92, 246, 0.2) !important;
            color: #f5f0e8 !important;
            border-radius: 12px !important;
            padding: 12px 14px !important;
            width: 100% !important;
            display: block !important;
            transition: all 0.25s ease !important;
          }
          .auth-form-cyber input.input:focus {
            border-color: #a78bfa !important;
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.4) !important;
            background: rgba(18, 14, 28, 0.95) !important;
            outline: none !important;
          }
          .auth-form-cyber label.label {
            color: #94a3b8 !important;
            font-weight: 600 !important;
            font-size: 13px !important;
            margin-bottom: 6px !important;
            display: block !important;
          }
          .auth-form-cyber .btn-primary {
            background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%) !important;
            border: none !important;
            color: #ffffff !important;
            font-weight: 800 !important;
            border-radius: 12px !important;
            width: 100% !important;
            transition: all 0.25s ease !important;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3) !important;
            cursor: pointer;
          }
          .auth-form-cyber .btn-primary:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5) !important;
            color: #ffffff !important;
          }
        `}</style>

        {!otpSent ? (
          <div>
            <label className="label">Registered Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "rgba(248,198,23,0.05)", border: "1px solid rgba(248,198,23,0.15)", borderRadius: 10, padding: 12, fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>
              We've sent a 6-digit recovery code to <b>{email}</b>.
            </div>

            <div>
              <label className="label">Verification Code (OTP)</label>
              <input
                type="text"
                pattern="[0-9]{6}"
                maxLength={6}
                className="input mono"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                style={{ textAlign: "center", fontSize: 20, letterSpacing: 6, fontWeight: 700 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Didn't receive the code?</span>
                <button
                  type="button"
                  disabled={sendingOtp || otpCooldown > 0}
                  onClick={handleSendOtp}
                  style={{
                    background: "none",
                    border: "none",
                    color: otpCooldown > 0 ? "#64748b" : "#8b5cf6",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: otpCooldown > 0 ? "not-allowed" : "pointer",
                    padding: 0,
                    textDecoration: otpCooldown > 0 ? "none" : "underline",
                  }}
                >
                  {sendingOtp ? "Sending..." : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>

            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: "var(--color-danger)", fontSize: 13, background: "color-mix(in oklab, var(--color-danger) 12%, transparent)", padding: "9px 12px", borderRadius: 10 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: "var(--color-success)", fontSize: 13, background: "rgba(0, 230, 118, 0.08)", padding: "9px 12px", borderRadius: 10 }}>
            {success}
          </div>
        )}

        {!otpSent ? (
          <button
            type="button"
            onClick={handleSendOtp}
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "12px" }}
            disabled={sendingOtp}
          >
            {sendingOtp && <Loader2 size={16} className="spin" />}
            Send Recovery Code
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "12px" }}
            disabled={resetting}
          >
            {resetting && <Loader2 size={16} className="spin" />}
            Reset Password
          </button>
        )}
      </form>

      <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 20, textAlign: "center" }}>
        Remembered password?{" "}
        <Link href="/login" style={{ color: "#a855f7", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={13} /> Back to Login
        </Link>
      </p>
    </>
  );
}
