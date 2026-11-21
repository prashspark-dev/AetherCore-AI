import React from "react";
import {
  Activity,
  ThermometerSnowflake,
  Layers,
  Laptop,
  ShieldCheck,
  CreditCard,
  UserCog,
  LogOut,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
/**
 * Categorized Navigation Sidebar for AetherCore-AI.
 * Organizes all 7 dedicated feature pages into clear functional groups,
 * displays live subscription/AutoPay badge, and user profile summary.
 */
const NAV_CATEGORIES = [
  {
    category: "AI Optimization",
    items: [
      {
        id: "dashboard",
        label: "Command Center",
        subLabel: "Live Graphs & AI State",
        icon: Activity,
      },
      {
        id: "thermal",
        label: "Thermal & Power Guard",
        subLabel: "Cooling & Turbo Cap",
        icon: ThermometerSnowflake,
      },
      {
        id: "processes",
        label: "Process & RAM Optimizer",
        subLabel: "E-Core & VIP Whitelist",
        icon: Layers,
      },
    ],
  },
  {
    category: "System & Privacy",
    items: [
      {
        id: "hardware",
        label: "Hardware & OS Inspector",
        subLabel: "Win 10/11/12 & CPU Gen",
        icon: Laptop,
      },
      {
        id: "permissions",
        label: "Permissions & Privacy",
        subLabel: "Access & Legal Controls",
        icon: ShieldCheck,
      },
    ],
  },
  {
    category: "Account & Cloud",
    items: [
      {
        id: "billing",
        label: "Subscription & UPI",
        subLabel: "₹99/mo & AutoPay",
        icon: CreditCard,
      },
      {
        id: "account",
        label: "Account, MFA & Support",
        subLabel: "2FA, 30-Day Delete & Help",
        icon: UserCog,
      },
    ],
  },
];
export default function Sidebar({
  activePage,
  onSelectPage,
  user,
  subscription,
  onLogout,
}) {
  const planStatus = subscription?.status || "trial";
  const autoPayOn = !!subscription?.autoPayEnabled;
  const daysLeft = subscription?.daysRemaining ?? 7;
  return (
    <aside className="w-64 h-full glass-card border-r border-white/10 flex flex-col justify-between p-3.5 shrink-0 select-none overflow-y-auto">
      {/* Top: Categorized Navigation Links */}
      <div className="space-y-5">
        {NAV_CATEGORIES.map((group) => (
          <div key={group.category}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400/80">
              {group.category}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectPage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/25 via-cyan-500/20 to-purple-500/15 border border-cyan-400/35 text-white shadow-md shadow-cyan-500/10"
                        : "text-slate-300 hover:bg-white/5 hover:text-white border border-transparent"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-300 shadow-inner"
                          : "bg-slate-900/70 text-slate-400 group-hover:text-cyan-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.subLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Bottom: Subscription Status Card + User Profile & Logout */}
      <div className="mt-6 space-y-3 pt-3 border-t border-white/10">
        {/* Compact ₹99/mo Plan & AutoPay Pill */}
        <div
          onClick={() => onSelectPage("billing")}
          className="rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900/80 to-purple-950/70 border border-indigo-400/25 p-3 cursor-pointer hover:border-cyan-400/45 transition"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              {planStatus === "active" ? "AetherCore Pro" : "7-Day Free Trial"}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
              ₹99/mo
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-300">
            <span>{daysLeft} days remaining</span>
            <span
              className={`font-semibold ${
                autoPayOn ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              AutoPay: {autoPayOn ? "ON" : "OFF"}
            </span>
          </div>
        </div>
        {/* User Profile & Sign Out Row */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || "Aditya"}
                </p>
                {user?.mfaEnabled && (
                  <CheckCircle2
                    className="h-3 w-3 text-emerald-400 shrink-0"
                    title="2FA Protected"
                  />
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || "aditya@aethercore.ai"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Sign Out"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}