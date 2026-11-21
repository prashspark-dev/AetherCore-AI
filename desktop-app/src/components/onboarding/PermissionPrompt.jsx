import React, { useState } from "react";
import {
  ShieldCheck,
  Cpu,
  Thermometer,
  Zap,
  HardDrive,
  Power,
  Lock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
/**
 * First-Launch Granular Hardware & Windows OS Access Permission Gate.
 * Gives users full transparency and toggle control over what hardware APIs
 * AetherCore-AI can access before entering the app.
 */
const PERMISSION_ITEMS = [
  {
    key: "readThermalSensors",
    title: "Hardware Thermal & Load Telemetry",
    badge: "Required Core",
    badgeColor: "text-cyan-300 bg-cyan-500/15 border-cyan-400/30",
    icon: Thermometer,
    description:
      "Reads real-time CPU temperature, core utilization, RAM pressure, and battery state via official Windows WMI/ACPI sensors.",
  },
  {
    key: "adjustProcessPriority",
    title: "Background Process Priority & E-Core Pinning",
    badge: "Recommended",
    badgeColor: "text-indigo-300 bg-indigo-500/15 border-indigo-400/30",
    icon: Cpu,
    description:
      "Lowers CPU priority of idle background tasks and pins them to Efficiency Cores without ever closing or killing your open apps.",
  },
  {
    key: "managePowerPlans",
    title: "Dynamic Windows Thermal Ceiling (Turbo Control)",
    badge: "Recommended",
    badgeColor: "text-indigo-300 bg-indigo-500/15 border-indigo-400/30",
    icon: Zap,
    description:
      "Adjusts Windows Processor Power Management (PROCTHROTTLEMAX) to prevent overheating and reduce fan noise automatically.",
  },
  {
    key: "ramOptimization",
    title: "Safe Idle RAM Working-Set Trim",
    badge: "Optional",
    badgeColor: "text-purple-300 bg-purple-500/15 border-purple-400/30",
    icon: HardDrive,
    description:
      "Releases unused cached memory pages from inactive background apps when RAM exceeds 82% to prevent system lag.",
  },
  {
    key: "autoStartWithWindows",
    title: "Run Silently in Background at Windows Startup",
    badge: "Optional",
    badgeColor: "text-purple-300 bg-purple-500/15 border-purple-400/30",
    icon: Power,
    description:
      "Keeps your laptop protected from thermal spikes automatically from the moment Windows boots up.",
  },
];
export default function PermissionPrompt({ initialPermissions, onConfirmPermissions }) {
  const [permissions, setPermissions] = useState(
    initialPermissions || {
      readThermalSensors: true,
      adjustProcessPriority: true,
      managePowerPlans: true,
      ramOptimization: true,
      autoStartWithWindows: true,
    }
  );
  const handleToggle = (key) => {
    // Keep core thermal telemetry enabled so graphs and safety alerts function properly
    if (key === "readThermalSensors") return;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 overflow-y-auto">
      <div className="glass-card w-full max-w-3xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Step 1 of 2 • System Access Control
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Windows Hardware & OS Permissions
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-400/25 px-3.5 py-2 text-xs text-emerald-300">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Zero Personal File Access</span>
          </div>
        </div>
        {/* Intro Note */}
        <p className="mt-4 text-sm text-slate-300 leading-relaxed">
          To keep your Windows laptop cool, balanced, and lag-free without harming hardware or closing active work,{" "}
          <strong className="text-white">AetherCore-AI</strong> uses official Microsoft Win32 & Power APIs. You have
          complete control to allow or revoke any capability below at any time:
        </p>
        {/* Granular Permission Switches */}
        <div className="mt-5 space-y-3 max-h-[340px] overflow-y-auto pr-1">
          {PERMISSION_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isEnabled = !!permissions[item.key];
            const isLockedCore = item.key === "readThermalSensors";
            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`flex items-start justify-between gap-4 rounded-2xl p-4 border transition-all cursor-pointer ${
                  isEnabled
                    ? "bg-slate-900/65 border-cyan-400/30 shadow-sm"
                    : "bg-slate-950/40 border-white/5 opacity-75 hover:opacity-100"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isEnabled ? "bg-cyan-500/15 text-cyan-300" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>
                </div>
                {/* Toggle Switch */}
                <button
                  type="button"
                  disabled={isLockedCore}
                  aria-label={`Toggle ${item.title}`}
                  className={`mt-1 relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    isEnabled ? "bg-cyan-500" : "bg-slate-700"
                  } ${isLockedCore ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
        {/* Footer Action Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>All settings are reversible anytime from the Sidebar Permissions tab.</span>
          </div>
          <button
            type="button"
            onClick={() => onConfirmPermissions(permissions)}
            className="btn-primary w-full sm:w-auto"
          >
            <span>Grant Selected Access & Continue</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}