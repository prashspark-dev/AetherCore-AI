import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import UpiCheckoutModal from "../components/modals/UpiCheckoutModal";
import { API_BASE } from "../config/apiConfig";
/**
 * Subscription & UPI Billing Page:
 * - Shows 7-Day Free Trial or Active ₹99/month Pro Plan status.
 * - Features a dedicated, user-controlled UPI AutoPay ON/OFF toggle switch
 *   (strictly OFF by default — never auto-charges unless user turns it ON).
 * - Displays complete invoice & payment history.
 */
export default function BillingPage({ subscription, authToken, onSubscriptionUpdated }) {
  const [autoPayEnabled, setAutoPayEnabled] = useState(!!subscription?.autoPayEnabled);
  const [togglingAutoPay, setTogglingAutoPay] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  useEffect(() => {
    setAutoPayEnabled(!!subscription?.autoPayEnabled);
  }, [subscription]);
  useEffect(() => {
    fetchBillingHistory();
  }, [authToken]);
  const fetchBillingHistory = async () => {
    if (!authToken || authToken === "local_offline_session") return;
    try {
      const res = await fetch(`${API_BASE}/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(data.invoices || []);
        if (data.subscription) {
          onSubscriptionUpdated(data.subscription);
        }
      }
    } catch {
      // Ignore offline fetch error
    }
  };
  const handleToggleAutoPay = async () => {
    const nextVal = !autoPayEnabled;
    setTogglingAutoPay(true);
    setAutoPayEnabled(nextVal);
    setToastMsg("");
    try {
      if (authToken && authToken !== "local_offline_session") {
        const res = await fetch(`${API_BASE}/billing/autopay-toggle`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ autoPayEnabled: nextVal }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          onSubscriptionUpdated({ ...subscription, autoPayEnabled: nextVal });
          setToastMsg(data.message);
        }
      } else {
        onSubscriptionUpdated({ ...subscription, autoPayEnabled: nextVal });
        setToastMsg(
          nextVal
            ? "UPI AutoPay turned ON. Future renewals will occur smoothly unless switched OFF."
            : "UPI AutoPay turned OFF. You will NEVER be charged automatically."
        );
      }
    } catch {
      setToastMsg("Updated local AutoPay preference.");
    } finally {
      setTogglingAutoPay(false);
      setTimeout(() => setToastMsg(""), 4000);
    }
  };
  const planStatus = subscription?.status || "trial";
  const daysLeft = subscription?.daysRemaining ?? 7;
  return (
    <div className="space-y-6 pb-8">
      {/* Top Plan Overview Hero */}
      <div className="glass-card rounded-3xl p-6 border border-cyan-400/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-xs font-bold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {planStatus === "active"
                  ? "AetherCore-AI Pro Active"
                  : planStatus === "trial"
                  ? "7-Day Full Free Trial Active"
                  : "Plan Expired — Renew to Sync Cloud"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Simple, Honest Pricing: <span className="text-cyan-300">₹99</span>{" "}
              <span className="text-sm font-normal text-slate-300">/ month (All Features Included)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Full autonomous Reinforcement Learning thermal guard, real-time telemetry graphs, custom VIP process
              whitelist, cloud sync, and OTA updates for Windows 10, 11 & 12.
            </p>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="btn-primary py-3 px-6 text-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span>{planStatus === "active" ? "Extend Plan (+30 Days • ₹99)" : "Upgrade via UPI (₹99/mo)"}</span>
            </button>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span>{daysLeft} days remaining in current period</span>
            </span>
          </div>
        </div>
      </div>
      {toastMsg && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/35 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
      {/* User-Controlled UPI AutoPay Settings Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">UPI AutoPay Control (User-Owned Mandate)</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            By default, UPI AutoPay is <strong className="text-white">OFF</strong>. When OFF, you will{" "}
            <strong className="text-emerald-300">never be charged automatically</strong>—you only pay ₹99 when you
            manually choose to renew. Turn it ON only if you prefer hands-free monthly renewal.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 bg-slate-950/70 border border-white/10 px-4 py-3 rounded-2xl">
          <div className="text-right">
            <div className="text-xs font-bold text-white">
              AutoPay is {autoPayEnabled ? "ON" : "OFF"}
            </div>
            <div className="text-[10px] text-slate-400">
              {autoPayEnabled ? "Auto-renews ₹99/mo" : "Manual renewal only"}
            </div>
          </div>
          <button
            type="button"
            disabled={togglingAutoPay}
            onClick={handleToggleAutoPay}
            aria-label="Toggle UPI AutoPay"
            className={`relative inline-flex h-7 w-12 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${
              autoPayEnabled ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ${
                autoPayEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
      {/* Billing & Invoice History Table */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white">Payment & Invoice History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Order / UTR Reference</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.length > 0 ? (
                invoices.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(inv.paidAt || inv.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-300">
                      {inv.upiTransactionRef || inv.orderId}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      UPI {inv.isAutoPayMandate ? "(AutoPay)" : "(One-Time)"}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white">₹{inv.amountINR}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No paid UPI invoices yet — you are enjoying your 7-Day Free Trial!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* UPI Checkout Modal */}
      <UpiCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        authToken={authToken}
        enableAutoPay={autoPayEnabled}
        onPaymentSuccess={(updatedSub) => {
          onSubscriptionUpdated(updatedSub);
          fetchBillingHistory();
          setToastMsg("Payment verified! AetherCore-AI Pro (₹99/mo) is now active.");
          setTimeout(() => setToastMsg(""), 5000);
        }}
      />
    </div>
  );
}