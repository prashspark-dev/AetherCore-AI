import React, { useState, useRef, useEffect } from "react";
import { ShieldAlert, Smartphone, Mail, X, ArrowRight, RefreshCw } from "lucide-react";
const API_BASE = "http://localhost:5000/api";
/**
 * Multi-Factor Authentication (2FA) Verification Modal.
 * Supports both Authenticator App (TOTP) and Email OTP codes with
 * 6-digit auto-advancing inputs and clipboard paste support.
 */
export default function MfaVerifyModal({
  isOpen,
  mfaType = "totp",
  tempMfaToken,
  userEmail = "",
  onSuccess,
  onClose,
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);
  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setError("");
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);
  if (!isOpen) return null;
  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }
    const updated = [...digits];
    updated[index] = clean[0];
    setDigits(updated);
    setError("");
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, idx) => {
      updated[idx] = char;
    });
    setDigits(updated);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const fullCode = digits.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits of your security code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/auth/mfa/verify-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempMfaToken,
          code: fullCode,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "Invalid 2FA verification code.");
        setLoading(false);
        return;
      }
      onSuccess({
        token: data.token,
        user: data.user,
        subscription: data.subscription,
      });
    } catch (err) {
      setError("Unable to reach AetherCore Cloud Server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="glass-card w-full max-w-md rounded-3xl p-7 border border-cyan-400/30 shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Icon & Title */}
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            {mfaType === "totp" ? (
              <Smartphone className="h-6 w-6 text-white" />
            ) : (
              <Mail className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">
              Multi-Factor Security
            </span>
            <h2 className="text-xl font-bold text-white">2-Step Verification</h2>
          </div>
        </div>
        <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">
          {mfaType === "totp" ? (
            <>
              Open your <strong>Authenticator App</strong> (Google Authenticator / Authy) and enter the 6-digit code
              for <strong>AetherCore-AI</strong>.
            </>
          ) : (
            <>
              We sent a 6-digit security verification code to{" "}
              <strong className="text-cyan-300">{userEmail || "your email"}</strong>. Enter it below to unlock your
              session.
            </>
          )}
        </p>
        {/* 6-Digit Code Boxes */}
        <form onSubmit={handleVerifySubmit} className="mt-6">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-13 w-12 rounded-xl bg-slate-950/80 border border-white/15 text-center text-xl font-bold font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition"
              />
            ))}
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/15 border border-red-400/30 px-3.5 py-2.5 text-xs text-red-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Verifying Security Code...</span>
              </>
            ) : (
              <>
                <span>Verify & Unlock Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}