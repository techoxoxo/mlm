"use client";

import { useActionState, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { loginAction, registerAction, sendOtpAction, type ActionState } from "@/app/actions/auth";

export function AuthForm({ mode, refCode, next }: { mode: "login" | "register"; refCode?: string; next?: string }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [refInput, setRefInput] = useState(refCode || "");
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setClientError(null);
    if (!emailInput || !emailInput.includes("@")) {
      setClientError("Please enter a valid email address first.");
      return;
    }
    if (mode === "register" && !nameInput.trim()) {
      setClientError("Please enter your full name.");
      return;
    }
    if (mode === "register" && passwordInput.length < 8) {
      setClientError("Password must be at least 8 characters long.");
      return;
    }
    if (mode === "register" && passwordInput !== confirmPasswordInput) {
      setClientError("Passwords do not match.");
      return;
    }
    if (mode === "register" && !refInput.trim()) {
      setClientError("Referral code is required. You cannot register without a valid referral code.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await sendOtpAction(emailInput);
      if (res.ok) {
        setOtpSent(true);
      } else {
        setClientError(res.error || "Failed to send verification code.");
      }
    } catch {
      setClientError("An unexpected error occurred. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const errorMessage = clientError || state?.error;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {next && <input type="hidden" name="next" value={next} />}
      
      {/* Step 1 Form Fields */}
      <div style={{ display: otpSent ? "none" : "flex", flexDirection: "column", gap: 14 }}>
        {mode === "register" && (
          <div>
            <label className="label">Full name</label>
            <input 
              name="name" 
              className="input" 
              placeholder="Ada Lovelace" 
              value={nameInput} 
              onChange={(e) => setNameInput(e.target.value)}
              required={!otpSent} 
            />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input 
            name="email" 
            type="email" 
            className="input" 
            placeholder="you@example.com" 
            value={emailInput} 
            onChange={(e) => setEmailInput(e.target.value)}
            required 
          />
        </div>
        <div>
          <label className="label">Password</label>
          <div style={{ position: "relative" }}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              className="input"
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: 0, display: "flex", alignItems: "center" }}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        {mode === "register" && (
          <div>
            <label className="label">Confirm password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="input"
                placeholder="••••••••"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                required={!otpSent}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--faint)", padding: 0, display: "flex", alignItems: "center" }}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        )}
        {mode === "register" && (
          <div>
            <label className="label">Referral code</label>
            <input 
              name="ref" 
              className="input" 
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="ABCD1234" 
              required
            />
          </div>
        )}
      </div>

      {/* Step 2 Form Fields (Only visible after OTP dispatch) */}
      {mode === "register" && otpSent && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Hidden inputs to preserve values on submit */}
          <input type="hidden" name="name" value={nameInput} />
          <input type="hidden" name="email" value={emailInput} />
          <input type="hidden" name="password" value={passwordInput} />
          <input type="hidden" name="ref" value={refInput} />

          <div style={{ background: "rgba(248,198,23,0.05)", border: "1px solid rgba(248,198,23,0.15)", borderRadius: 10, padding: 12, fontSize: 13.5, color: "var(--muted)", textAlign: "center" }}>
            We've sent a 6-digit verification code to <b>{emailInput}</b>. Please enter it below.
          </div>
          <div>
            <label className="label">Verification Code (OTP)</label>
            <input 
              name="otp" 
              type="text" 
              pattern="[0-9]{6}" 
              maxLength={6} 
              className="input mono" 
              placeholder="123456" 
              required 
              style={{ textAlign: "center", fontSize: 20, letterSpacing: 6, fontWeight: 700 }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div style={{ color: "var(--color-danger)", fontSize: 13, background: "color-mix(in oklab, var(--color-danger) 12%, transparent)", padding: "9px 12px", borderRadius: 10 }}>
          {errorMessage}
        </div>
      )}

      {mode === "register" && !otpSent ? (
        <button 
          type="button" 
          onClick={handleSendOtp} 
          className="btn btn-primary" 
          style={{ marginTop: 4, padding: "12px" }} 
          disabled={sendingOtp}
        >
          {sendingOtp && <Loader2 size={16} className="spin" />}
          Send Verification Code
        </button>
      ) : (
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ marginTop: 4, padding: "12px" }} 
          disabled={pending}
        >
          {pending && <Loader2 size={16} className="spin" />}
          {mode === "login" ? "Log in" : "Verify & Create account"}
        </button>
      )}
    </form>
  );
}
