import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  ThermometerSnowflake,
  Sparkles,
  Leaf,
  Gauge,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Cpu,
} from "lucide-react";
/**
 * Thermal & Power Guard Page:
 * Allows users to switch between 4 intelligent cooling profiles
 * (AI Auto-Pilot, Silent Eco, Balanced Flow, Max Performance) and
 * inspects live CPU Thermal Ceiling (PROCTHROTTLEMAX) & temperature trend.
 */
const COOLING_PROFILES = [
  {
    id: "auto_pilot",
    title: "AI Auto-Pilot (Recommended)",
    badge: "Autonomous RL",
    accentHex: "#06B6D4",
    icon: Sparkles,
    capRange: "55% – 100% Dynamic",
    summary:
      "Reinforcement Learning continuously predicts thermal spikes and automatically balances foreground speed with cool temperatures.",
  },
  {
    id: "silent_eco",
    title: "Silent Eco & Ultra-Cool",
    badge: "Max Battery & Quiet Fans",
    accentHex: "#10B981",
    icon: Leaf,
    capRange: "55% – 85% (Turbo Off)",
    summary:
      "Disables aggressive CPU Turbo Boost spikes to drop laptop surface heat by 10–15°C and keep cooling fans whisper-quiet.",
  },
  {
    id: "balanced",
    title: "Balanced Daily Flow",
    badge: "Smooth Multitasking",
    accentHex: "#818CF8",
    icon: Gauge,
    capRange: "70% – 98% Smoothed",
    summary:
      "Maintains snappy responsiveness for coding, browsing, and office work while smoothing background update bursts.",
  },
  {
    id: "max_performance",
    title: "Max Performance Boost",
    badge: "Heavy Compile / Gaming",
    accentHex: "#F59E0B",
    icon: Flame,
    capRange: "Up to 100% (86°C Safety Guard)",
    summary:
      "Unlocks full CPU clock frequencies for demanding workloads while keeping the 86°C hardware overheat shield active.",
  },
];
export default function ThermalGuardPage({ liveData, engineConnected, onSendCommand }) {
  const [switchingMode, setSwitchingMode] = useState(false);
  const activeUserMode = liveData?.ai_decision?.user_mode || "auto_pilot";
  const powerProfile = liveData?.power_profile || {
    action_id: 1,
    profile_name: "Balanced AI",
    cpu_max_cap_percent: 98,
    color_hex: "#818CF8",
    description: "98% smart dynamic scaling — delivers full responsiveness with minimal heat spikes.",
  };
  const metrics = liveData?.telemetry?.metrics || {
    temp_celsius: 48.0,
    est_power_watts: 10.2,
    on_battery: false,
    power_source: "AC Charger Plugged In",
  };
  const safetyOverride = liveData?.ai_decision?.safety_override || false;
  const graphSeries = liveData?.telemetry?.graph_series || [];
  const handleSelectMode = async (modeId) => {
    setSwitchingMode(true);
    await onSendCommand({ type: "SET_COOLING_MODE", mode: modeId });
    setTimeout(() => setSwitchingMode(false), 300);
  };
  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <ThermometerSnowflake className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Thermal & Power Guard</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Control how AetherCore-AI regulates CPU Turbo Boost ceilings, heat dissipation, and battery thermals.
            </p>
          </div>
        </div>
        {/* Live CPU Thermal Cap Pill */}
        <div className="rounded-2xl bg-slate-950/70 border border-cyan-400/30 px-4 py-3 text-right shrink-0">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">Active CPU Thermal Ceiling</div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {powerProfile.cpu_max_cap_percent}%{" "}
            <span className="text-xs font-sans font-normal text-slate-400">Max State</span>
          </div>
        </div>
      </div>
      {/* Safety Override Alert Banner (If CPU crossed 78°C/86°C) */}
      {safetyOverride && (
        <div className="rounded-2xl bg-red-500/15 border border-red-400/40 p-4 flex items-center gap-3 text-xs text-red-200">
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
          <span>
            <strong>Hardware Thermal Shield Active:</strong> CPU temperature elevated ({metrics.temp_celsius}°C).
            AetherCore-AI temporarily capped Turbo Boost to protect your processor until temperatures stabilize.
          </span>
        </div>
      )}
      {/* 4 Cooling Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COOLING_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const isSelected = activeUserMode === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              disabled={!engineConnected || switchingMode}
              onClick={() => handleSelectMode(profile.id)}
              className={`text-left rounded-3xl p-6 border transition-all duration-300 ${
                isSelected
                  ? "bg-slate-900/80 shadow-xl scale-[1.01]"
                  : "glass-card hover:bg-slate-900/60 border-white/10 opacity-85 hover:opacity-100"
              }`}
              style={{
                borderColor: isSelected ? profile.accentHex : undefined,
                boxShadow: isSelected ? `0 10px 30px ${profile.accentHex}22` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${profile.accentHex}20`,
                      color: profile.accentHex,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{profile.title}</h3>
                    <span
                      className="inline-block mt-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border"
                      style={{
                        color: profile.accentHex,
                        backgroundColor: `${profile.accentHex}15`,
                        borderColor: `${profile.accentHex}40`,
                      }}
                    >
                      {profile.badge}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: profile.accentHex }} />
                )}
              </div>
              <p className="mt-3.5 text-xs text-slate-300 leading-relaxed">{profile.summary}</p>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Processor Frequency Envelope:</span>
                <span className="font-mono font-semibold text-white">{profile.capRange}</span>
              </div>
            </button>
          );
        })}
      </div>
      {/* Live Thermal Curve + Active Windows Power Policy Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Temperature Curve with Safety Threshold Line (8 Cols) */}
        <div className="lg:col-span-8 glass-card rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Live Temperature Trajectory (°C)</h3>
              <p className="text-xs text-slate-400">
                Dashed amber line marks the 78°C Preventive Thermal Guard threshold.
              </p>
            </div>
            <span className="text-sm font-mono font-bold text-cyan-300">{metrics.temp_celsius}°C</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphSeries} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="time" tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} />
                <YAxis domain={[30, 100]} tick={{ fill: "#94A3B8", fontSize: 11 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(9, 14, 28, 0.92)",
                    borderColor: "rgba(56, 189, 248, 0.35)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={78}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: "Guard (78°C)", fill: "#F59E0B", fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  name="CPU Temp (°C)"
                  stroke={powerProfile.color_hex || "#06B6D4"}
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Active Windows Powercfg Policy Card (4 Cols) */}
        <div className="lg:col-span-4 glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Cpu className="h-4 w-4" />
              <span>Active Kernel Power State</span>
            </div>
            <h3 className="mt-3 text-xl font-bold text-white">{powerProfile.profile_name}</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">{powerProfile.description}</p>
            <div className="mt-5 space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-400">Power Source:</span>
                <span className="font-semibold text-white">{metrics.power_source}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-400">PROCTHROTTLEMAX:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {powerProfile.cpu_max_cap_percent}%
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <span className="text-slate-400">Turbo Boost Status:</span>
                <span className="font-semibold text-emerald-300">
                  {powerProfile.cpu_max_cap_percent >= 95 ? "Enabled" : "Thermal Capped (Cool)"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Est. Package Draw:</span>
                <span className="font-mono text-white">{metrics.est_power_watts} W</span>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-400/25 p-3 text-[11px] text-indigo-200">
            Safe API Guarantee: Closing or exiting AetherCore-AI automatically restores 100% Windows default processor
            state.
          </div>
        </div>
      </div>
    </div>
  );
}