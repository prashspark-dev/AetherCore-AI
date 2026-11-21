import React, { useState } from "react";
import {
  ShieldCheck,
  Thermometer,
  Cpu,
  Zap,
  HardDrive,
  Power,
  Lock,
  FileText,
  Shield,
  Copyright,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { API_BASE } from "../config/apiConfig";
const PERMISSION_CONTROLS = [
  {
    key: "readThermalSensors",
    title: "Hardware Thermal & Load Telemetry",
    badge: "Core Telemetry (Locked ON)",
    icon: Thermometer,
    description:
      "Reads live CPU temperature, per-core load, RAM pressure, and battery power state via Windows WMI/ACPI.",
  },
  {
    key: "adjustProcessPriority",
    title: "Background Process Priority & E-Core Pinning",
    badge: "Active Optimization",
    icon: Cpu,
    description:
      "Smoothly lowers priority of idle background apps while keeping your foreground window and auto-learned VIP apps at 100%.",
  },
  {
    key: "managePowerPlans",
    title: "Windows Thermal Ceiling & Turbo Boost Control",
    badge: "Thermal Protection",
    icon: Zap,
    description:
      "Dynamically caps Windows PROCTHROTTLEMAX when temperatures rise so your laptop stays cool and fans stay quiet.",
  },
  {
    key: "ramOptimization",
    title: "Safe Idle RAM Working-Set Trim",
    badge: "Memory Relief",
    icon: HardDrive,
    description:
      "Releases unused cached memory pages from inactive background apps when physical RAM crosses 82%.",
  },
  {
    key: "autoStartWithWindows",
    title: "Silent Background Launch at Windows Startup",
    badge: "Auto-Protection",
    icon: Power,
    description:
      "Starts AetherCore-AI silently in the system tray when Windows boots so thermal spikes are prevented from Day 1.",
  },
];
/**
 * Permissions & Privacy Control Center Page:
 * Allows real-time toggling of Windows OS permissions (synced instantly to both
 * Local Python Engine and Cloud MongoDB) plus full Terms, Privacy & Copyright docs.
 */
export default function PermissionsPage({
  permissions,
  onUpdatePermissions,
  authToken,
  legalConsent,
}) {
  const [savingKey, setSavingKey] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [legalTab, setLegalTab] = useState("privacy"); // 'terms' | 'privacy' | 'copyright'
  const handleTogglePermission = async (key) => {
    if (key === "readThermalSensors") return;
    const updated = {
      ...permissions,
      [key]: !permissions[key],
    };
    setSavingKey(key);
    setSyncStatus("");
    // 1. Sync immediately to Local Python AI Engine + App State
    await onUpdatePermissions(updated);
    // 2. Sync to Cloud Backend if authenticated online
    if (authToken && authToken !== "local_offline_session") {
      try {
        await fetch(`${API_BASE}/user/permissions`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updated),
        });
      } catch {
        // Local engine already updated; cloud will sync next time online
      }
    }
    setSavingKey("");
    setSyncStatus("Permission updated & applied to local AI engine immediately.");
    setTimeout(() => setSyncStatus(""), 3000);
  };
  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Permissions, Privacy & Legal Center
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              You hold 100% authority over every Windows system API AetherCore-AI uses. Revoke or re-enable any
              access below in real time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-2.5 text-xs text-emerald-300 shrink-0">
          <Lock className="h-4 w-4 shrink-0" />
          <span>Personal Files & Browser Data: Never Accessed</span>
        </div>
      </div>
      {syncStatus && (
        <div className="rounded-2xl bg-cyan-500/15 border border-cyan-400/35 px-4 py-3 text-xs text-cyan-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}
      {/* Granular OS Permission Switches */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-3.5">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-base font-bold text-white">Active Windows OS Access Controls</h2>
          <span className="text-[11px] text-slate-400">Changes take effect within 1.5 seconds</span>
        </div>
        {PERMISSION_CONTROLS.map((item) => {
          const Icon = item.icon;
          const isEnabled = !!permissions?.[item.key];
          const isLocked = item.key === "readThermalSensors";
          return (
            <div
              key={item.key}
              onClick={() => handleTogglePermission(item.key)}
              className={`flex items-center justify-between gap-4 rounded-2xl p-4 border transition-all ${
                isEnabled
                  ? "bg-slate-900/65 border-cyan-400/25"
                  : "bg-slate-950/45 border-white/5 opacity-75 hover:opacity-100"
              } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isEnabled ? "bg-cyan-500/15 text-cyan-300" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savingKey === item.key && <RefreshCw className="h-3.5 w-3.5 text-cyan-400 animate-spin" />}
                <button
                  type="button"
                  disabled={isLocked}
                  aria-label={`Toggle ${item.title}`}
                  className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 ${
                    isEnabled ? "bg-cyan-500" : "bg-slate-700"
                  } ${isLocked ? "opacity-75 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Built-In Legal, Privacy & Copyright Reference Viewer */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white">Legal Agreements & Copyright Notice</h2>
            <p className="text-xs text-slate-400">
              Accepted Policy Version:{" "}
              <strong className="text-cyan-300">{legalConsent?.policyVersion || "v1.0-2026"}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-white/10">
            {[
              { id: "privacy", label: "Privacy Policy", icon: Shield },
              { id: "terms", label: "Terms of Use", icon: FileText },
              { id: "copyright", label: "Copyright", icon: Copyright },
            ].map((t) => {
              const TabIcon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLegalTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    legalTab === t.id
                      ? "bg-indigo-500/30 text-white border border-indigo-400/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-300 space-y-2.5 leading-relaxed">
          {legalTab === "privacy" && (
            <>
              <p>
                <strong className="text-white">Zero Personal Data Collection:</strong> AetherCore-AI never reads,
                uploads, or scans personal folders, photos, documents, or browser history.
              </p>
              <p>
                <strong className="text-white">30-Day Account Soft-Delete Guarantee:</strong> Deleting your account
                places it in a 30-day recovery state and immediately stops any active subscription or AutoPay mandate.
                After 30 days, all cloud data is permanently erased.
              </p>
            </>
          )}
          {legalTab === "terms" && (
            <>
              <p>
                <strong className="text-white">Subscription & Billing Transparency:</strong> Every new account starts
                with a 7-day free trial. Continued cloud AI sync costs <strong>₹99/month</strong> via UPI. UPI
                AutoPay is strictly opt-in (OFF by default).
              </p>
              <p>
                <strong className="text-white">Safe User-Space Operation:</strong> All optimizations use documented
                Windows user-space APIs without modifying BIOS settings or hardware voltages.
              </p>
            </>
          )}
          {legalTab === "copyright" && (
            <>
              <p>
                <strong className="text-white">Copyright © 2026 AetherCore-AI. All Rights Reserved.</strong>
              </p>
              <p>
                The AetherCore-AI desktop application, Reinforcement Learning thermal models, UI mesh design, and
                cloud services are proprietary intellectual property protected under international copyright laws.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}