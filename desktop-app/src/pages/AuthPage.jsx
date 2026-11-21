import React, { useState, useEffect } from "react";
import {
  Cpu,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  KeyRound,
  Sparkles,
} from "lucide-react";
import MfaVerifyModal from "../components/modals/MfaVerifyModal";
import { API_BASE } from "../config/apiConfig";
/**
 * Complete SaaS Authentication Page:
 * - Sign In & Sign Up (with live password strength indicator & legal consent proof)
 * - Continue with Google (OAuth 2.0)
 * - Email OTP Verification (with cooldown resend)
 * - Forgot Password & OTP Reset Flow
 * - 30-Day Deactivated Account 1-Click Recovery Flow
 */
export default function AuthPage({ legalConsent, hardwarePermissions, onAuthSuccess, onBackToLegal }) {
  // 'login' | 'signup' | 'verify_email' | 'forgot_password' | 'reset_password' | 'account_recovery'
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  // MFA Modal State
  const [mfaState, setMfaState] = useState({
    isOpen: false,
    mfaType: "totp",
    tempMfaToken: "",
  });
  // 30-Day Soft-Deleted Account Recovery State
  const [recoveryInfo, setRecoveryInfo] = useState({
    recoveryToken: "",
    deletionDate: null,
  });
  // Handle Google OAuth redirect callback query params if returning from Google login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (!status) return;
    if (status === "success") {
      const token = params.get("token");
      if (token) {
        window.history.replaceState({}, document.title, "/");
        fetchCurrentUserWithToken(token);
      }
    } else if (status === "mfa_required") {
      setMfaState({
        isOpen: true,
        mfaType: params.get("mfaType") || "totp",
        tempMfaToken: params.get("tempMfaToken") || "",
      });
      window.history.replaceState({}, document.title, "/");
    } else if (status === "deactivated") {
      setRecoveryInfo({
        recoveryToken: params.get("recoveryToken") || "",
        deletionDate: null,
      });
      setMode("account_recovery");
      window.history.replaceState({}, document.title, "/");
    } else if (status === "google_auth_failed") {
      setErrorMsg("Google Sign-In was cancelled or failed. Please try again.");
      window.history.replaceState({}, document.title, "/");
    }
  }, []);
  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);
  const fetchCurrentUserWithToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onAuthSuccess({ token, user: data.user, subscription: data.subscription });
      }
    } catch {
      setErrorMsg("Session sync failed. Please sign in again.");
    }
  };
  // Password strength calculation for Sign Up
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    return score; // 0 to 4
  };
  const pwdScore = getPasswordStrength(password);
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg("");
    setInfoMsg("");
  };
  // 1. Handle Sign Up
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    if (pwdScore < 4) {
      setErrorMsg("Password needs 8+ characters, 1 uppercase, 1 lowercase, and 1 number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          legalConsentAccepted: legalConsent?.accepted ?? true,
          policyVersion: legalConsent?.policyVersion || "v1.0-2026",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Registration failed.");
        return;
      }
      setInfoMsg(data.message);
      setResendCooldown(45);
      setMode("verify_email");
    } catch {
      setErrorMsg("Cannot connect to Cloud API (Port 5000). Ensure cloud-backend server is running.");
    } finally {
      setLoading(false);
    }
  };
  // 2. Handle Email OTP Verification
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Invalid or expired OTP code.");
        return;
      }
      // Sync first-launch hardware permissions to cloud immediately
      if (hardwarePermissions && data.token) {
        await fetch(`${API_BASE}/user/permissions`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify(hardwarePermissions),
        }).catch(() => {});
      }
      onAuthSuccess({
        token: data.token,
        user: data.user,
        subscription: data.subscription,
      });
    } catch {
      setErrorMsg("Network error while verifying email.");
    } finally {
      setLoading(false);
    }
  };
  // 3. Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "Email Verification" }),
      });
      const data = await res.json();
      setInfoMsg(data.message || "Fresh verification code sent.");
      setResendCooldown(45);
    } catch {
      setErrorMsg("Could not resend OTP.");
    }
  };
  // 4. Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      // Special Case A: Email not verified yet
      if (res.status === 403 && data.code === "EMAIL_NOT_VERIFIED") {
        setInfoMsg(data.message);
        setResendCooldown(45);
        setMode("verify_email");
        return;
      }
      // Special Case B: Deactivated Account (Within 30-day recovery window)
      if (res.status === 403 && data.code === "ACCOUNT_DEACTIVATED_RECOVERABLE") {
        setRecoveryInfo({
          recoveryToken: data.recoveryToken,
          deletionDate: data.scheduledPermanentDeletionAt,
        });
        setMode("account_recovery");
        return;
      }
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Invalid email or password.");
        return;
      }
      // Special Case C: Multi-Factor Authentication Required
      if (data.mfaRequired) {
        setMfaState({
          isOpen: true,
          mfaType: data.mfaType,
          tempMfaToken: data.tempMfaToken,
        });
        return;
      }
      onAuthSuccess({
        token: data.token,
        user: data.user,
        subscription: data.subscription,
      });
    } catch {
      setErrorMsg("Cannot reach Cloud API (Port 5000). Check that backend server is running.");
    } finally {
      setLoading(false);
    }
  };
  // 5. Handle Forgot Password Request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setInfoMsg(data.message);
      setOtp("");
      setMode("reset_password");
    } catch {
      setErrorMsg("Failed to send password reset code.");
    } finally {
      setLoading(false);
    }
  };
  // 6. Handle Reset Password Submit
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Could not reset password.");
        return;
      }
      setInfoMsg(data.message);
      setPassword("");
      setMode("login");
    } catch {
      setErrorMsg("Error resetting password.");
    } finally {
      setLoading(false);
    }
  };
  // 7. Handle 30-Day Account Reactivation
  const handleReactivateAccount = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/user/reactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recoveryToken: recoveryInfo.recoveryToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Could not restore account.");
        return;
      }
      onAuthSuccess({
        token: data.token,
        user: data.user,
        subscription: data.subscription,
      });
    } catch {
      setErrorMsg("Network error while restoring account.");
    } finally {
      setLoading(false);
    }
  };
  // 8. Continue with Google OAuth
  const handleGoogleSignIn = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 overflow-y-auto">
      <div className="glass-card w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Branding & Trust Column (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-indigo-950/60 via-slate-900/60 to-purple-950/50 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-400 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">AetherCore-AI</h1>
                <p className="text-[11px] text-cyan-300 font-medium">Autonomous Thermal Guard</p>
              </div>
            </div>
            <h2 className="mt-8 text-2xl font-bold text-white leading-snug">
              Keep Your Windows Laptop Cool, Fast & Balanced.
            </h2>
            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              Real-time Reinforcement Learning telemetry optimizes background CPU threads, E-Core pinning, and RAM
              headroom without closing your active apps.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>7-Day Full-Featured Free Trial Included</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Only ₹99/month • User-Controlled UPI AutoPay</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <KeyRound className="h-4 w-4 text-purple-400 shrink-0" />
                <span>2FA / MFA Security & 30-Day Account Recovery</span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Legal Consent Verified ✓</span>
            <button
              type="button"
              onClick={onBackToLegal}
              className="text-cyan-400 hover:underline font-medium"
            >
              Review Terms
            </button>
          </div>
        </div>
        {/* Right Interactive Auth Forms Column (7 Cols) */}
        <div className="lg:col-span-7 p-8 flex flex-col justify-center">
          {/* Status & Error Alerts */}
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-500/15 border border-red-400/30 p-3.5 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {infoMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 p-3.5 text-xs text-cyan-200">
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}
          {/* MODE 1 & 2: LOGIN OR SIGN UP */}
          {(mode === "login" || mode === "signup") && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {mode === "login" ? "Welcome Back" : "Create Your Account"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {mode === "login"
                      ? "Sign in to sync your cloud AI profile & device license."
                      : "Start your 7-day free trial with cloud backup & MFA protection."}
                  </p>
                </div>
              </div>
              {/* Continue with Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-5 w-full flex items-center justify-center gap-3 rounded-xl bg-white/95 hover:bg-white text-slate-900 font-semibold text-sm py-2.5 px-4 shadow-md transition active:scale-[0.99]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] uppercase tracking-wider text-slate-500">or with email</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Aditya"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="glass-input pl-10"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input pl-10"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">Password</label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot_password")}
                        className="text-xs text-cyan-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Live Password Strength Meter in Sign Up */}
                  {mode === "signup" && password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              pwdScore >= level
                                ? pwdScore === 4
                                  ? "bg-emerald-400"
                                  : "bg-amber-400"
                                : "bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Use 8+ chars with uppercase, lowercase & a number.
                      </p>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === "login" ? "Sign In to AetherCore-AI" : "Create Account & Start 7-Day Trial"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
              {/* Toggle Login / Sign Up */}
              <div className="mt-5 text-center text-xs text-slate-400">
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="text-cyan-400 font-semibold hover:underline"
                    >
                      Sign Up Free
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-cyan-400 font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
              {/* Local Offline UI Preview Option (Useful if MongoDB .env isn't configured yet) */}
              <div className="mt-4 pt-3 border-t border-white/5 text-center">
                <button
                  type="button"
                  onClick={() =>
                    onAuthSuccess({
                      token: "local_offline_session",
                      user: {
                        id: "local_dev",
                        name: name || "Aditya",
                        email: email || "aditya@aethercore.ai",
                        mfaEnabled: false,
                        mfaType: "none",
                        hardwarePermissions,
                      },
                      subscription: {
                        status: "trial",
                        amountINR: 99,
                        autoPayEnabled: false,
                        daysRemaining: 7,
                      },
                    })
                  }
                  className="text-[11px] text-slate-500 hover:text-cyan-300 transition"
                >
                  Continue in Local Offline Mode (Preview Live Telemetry Without Cloud DB) →
                </button>
              </div>
            </>
          )}
          {/* MODE 3: EMAIL OTP VERIFICATION */}
          {mode === "verify_email" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
              <p className="text-xs text-slate-300">
                Enter the 6-digit verification code sent to <strong className="text-cyan-300">{email}</strong>.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="glass-input text-center text-2xl font-mono tracking-[0.5em] text-cyan-300"
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Verifying..." : "Verify Email & Launch Dashboard"}
              </button>
              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-slate-400 hover:text-white"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className="text-cyan-400 hover:underline disabled:text-slate-500"
                >
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          )}
          {/* MODE 4: FORGOT PASSWORD */}
          {mode === "forgot_password" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Reset Your Password</h2>
              <p className="text-xs text-slate-300">
                Enter your registered email address and we will send a 6-digit password recovery code.
              </p>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending Recovery Code..." : "Send Reset OTP"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-2"
              >
                ← Back to Sign In
              </button>
            </form>
          )}
          {/* MODE 5: RESET PASSWORD WITH OTP */}
          {mode === "reset_password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Create New Password</h2>
              <p className="text-xs text-slate-300">
                Enter the 6-digit code sent to <strong className="text-cyan-300">{email}</strong> and choose a new
                strong password.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="6-Digit Reset Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="glass-input font-mono tracking-widest"
              />
              <input
                type="password"
                required
                placeholder="New Strong Password (8+ chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass-input"
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Updating Password..." : "Reset Password & Sign In"}
              </button>
            </form>
          )}
          {/* MODE 6: 30-DAY DEACTIVATED ACCOUNT RECOVERY */}
          {mode === "account_recovery" && (
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">Account Currently Deactivated</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your account is inside the <strong>30-day safety recovery window</strong>. All your profile settings and
                hardware preferences are still intact
                {recoveryInfo.deletionDate
                  ? ` (scheduled for permanent erasure on ${new Date(recoveryInfo.deletionDate).toDateString()})`
                  : ""}
                .
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleReactivateAccount}
                className="btn-primary w-full"
              >
                {loading ? "Restoring Account..." : "Reactivate & Restore My Account Now"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
              >
                Cancel & Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Multi-Factor Authentication Challenge Modal */}
      <MfaVerifyModal
        isOpen={mfaState.isOpen}
        mfaType={mfaState.mfaType}
        tempMfaToken={mfaState.tempMfaToken}
        userEmail={email}
        onSuccess={(authData) => {
          setMfaState({ isOpen: false, mfaType: "totp", tempMfaToken: "" });
          onAuthSuccess(authData);
        }}
        onClose={() => setMfaState({ isOpen: false, mfaType: "totp", tempMfaToken: "" })}
      />
    </div>
  );
}