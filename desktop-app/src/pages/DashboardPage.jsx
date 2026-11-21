import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Thermometer,
  Cpu,
  HardDrive,
  Zap,
  Sparkles,
  ShieldCheck,
  Activity,
  RefreshCw,
  Layers,
  BatteryCharging,
  Plug,
} from "lucide-react";
/**
 * Command Center (Main Dashboard) for AetherCore-AI.
 * Renders real-time color-coded Recharts graphs (Temperature, CPU, RAM, Power),
 * plain-language AI diagnostic explanations, per-core CPU bars, and quick actions.
 */
export default function DashboardPage({ liveData, engineConnected, onSendCommand }) {
  // 'combined' | 'temp' | 'cpu' | 'ram'
  const [chartTab, setChartTab] = useState("combined");
  const [trimmingRam, setTrimmingRam] = useState(false);
  const [quickToast, setQuickToast] = useState("");
  // Extract live telemetry safely with clean defaults while connecting
  const metrics = liveData?.telemetry?.metrics || {
    cpu_percent: 0,
    per_core_percent: [0, 0, 0, 0],
    ram_percent: 0,
    ram_used_gb: 0,
    ram_total_gb: 8,
    temp_celsius: 45.0,
    sensor_source: "Initializing Sensor...",
    est_power_watts: 8.5,
    battery_percent: 100,
    on_battery: false,
    power_source: "Detecting Power...",
    heat_saved_celsius: 0.0,
  };
  const diagnostics = liveData?.telemetry?.diagnostics || {
    state_code: "INITIALIZING",
    badge_label: "Scanning System",
    primary_hex: "#06B6D4",
    secondary_hex: "#818CF8",
    graph_stroke: "#38BDF8",
    headline: "Connecting to AetherCore-AI Background Engine...",
    detailed_explanation:
      "Start 'python main_service.py' inside ai-engine to stream real-time thermal curves, CPU load, and autonomous optimization actions.",
  };
  const aiDecision = liveData?.ai_decision || {
    action_name: "Balanced AI",
    engine_backend: "Neural Policy v1.0",
    safety_override: false,
    decision_reason: "Standing by for live hardware telemetry stream.",
  };
  const powerProfile = liveData?.power_profile || {
    cpu_max_cap_percent: 100,
    profile_name: "Balanced AI",
  };
  const processSummary = liveData?.process_manager || {
    optimized_process_count: 0,
    ram_trimmed_processes: 0,
    recent_actions: [],
  };
  const graphSeries = liveData?.telemetry?.graph_series || [];
  const handleQuickRamClean = async () => {
    setTrimmingRam(true);
    setQuickToast("");
    await onSendCommand({ type: "FORCE_RAM_OPTIMIZE" });
    setQuickToast("Safe RAM working-set trim executed without closing any active apps!");
    setTimeout(() => {
      setTrimmingRam(false);
      setQuickToast("");
    }, 3500);
  };
  // Dynamic color selection based on current thermal/load state
  const dynamicStroke = diagnostics.graph_stroke || "#38BDF8";
  const primaryHex = diagnostics.primary_hex || "#06B6D4";
  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner: AI Written Diagnostic Status + Quick Action */}
      <div
        className="glass-card rounded-3xl p-6 border transition-all duration-500"
        style={{ borderColor: `${primaryHex}45` }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                style={{
                  color: primaryHex,
                  backgroundColor: `${primaryHex}18`,
                  borderColor: `${primaryHex}45`,
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {diagnostics.badge_label}
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                Policy: {aiDecision.action_name} (CPU Cap: {powerProfile.cpu_max_cap_percent}%)
              </span>
              {metrics.heat_saved_celsius > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                  Est. Heat Saved: -{metrics.heat_saved_celsius}°C
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {diagnostics.headline}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {diagnostics.detailed_explanation}
            </p>
          </div>
          {/* Right Quick Control Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              disabled={!engineConnected || trimmingRam}
              onClick={handleQuickRamClean}
              className="btn-primary text-xs py-2.5 px-4"
            >
              <RefreshCw className={`h-4 w-4 ${trimmingRam ? "animate-spin" : ""}`} />
              <span>{trimmingRam ? "Optimizing RAM..." : "Smart RAM Trim Now"}</span>
            </button>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/5">
              {metrics.on_battery ? (
                <BatteryCharging className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Plug className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>
                {metrics.power_source} ({metrics.battery_percent}%)
              </span>
            </div>
          </div>
        </div>
        {quickToast && (
          <div className="mt-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-4 py-2 text-xs text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{quickToast}</span>
          </div>
        )}
      </div>
      {/* 4 Live Hardware Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Thermal Sensor */}
        <div className="glass-card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">CPU Package Temp</span>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryHex}20`, color: primaryHex }}
            >
              <Thermometer className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.temp_celsius}°C
            </span>
            <span className="text-[11px] text-slate-400 truncate">{metrics.sensor_source}</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(10, ((metrics.temp_celsius - 30) / 70) * 100))}%`,
                backgroundColor: primaryHex,
              }}
            />
          </div>
        </div>
        {/* Card 2: CPU Load & Frequency Ceiling */}
        <div className="glass-card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">CPU Utilization</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.cpu_percent}%
            </span>
            <span className="text-[11px] font-mono text-indigo-300">
              Max Cap: {powerProfile.cpu_max_cap_percent}%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.cpu_percent)}%` }}
            />
          </div>
        </div>
        {/* Card 3: RAM Pressure */}
        <div className="glass-card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Memory (RAM) Load</span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.ram_percent}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {metrics.ram_used_gb} / {metrics.ram_total_gb} GB
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.ram_percent)}%` }}
            />
          </div>
        </div>
        {/* Card 4: Power & Active Optimization */}
        <div className="glass-card-hover rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Est. Package Power</span>
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.est_power_watts}W
            </span>
            <span className="text-[11px] text-cyan-300">
              {processSummary.optimized_process_count} BG Balanced
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (metrics.est_power_watts / 45) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      {/* LIVE REAL-TIME MULTI-METRIC GRAPH SECTION */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                Real-Time Thermal & Resource Telemetry Graph
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live 60-sample rolling curve showing temperature stability, CPU demand, and memory balance.
            </p>
          </div>
          {/* Interactive Graph View Switcher */}
          <div className="flex flex-wrap gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-white/10">
            {[
              { id: "combined", label: "All Metrics" },
              { id: "temp", label: "Thermal (°C)" },
              { id: "cpu", label: "CPU & Power" },
              { id: "ram", label: "RAM (%)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChartTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  chartTab === tab.id
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Color Legend & Written Graph Interpretation */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          {(chartTab === "combined" || chartTab === "temp") && (
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: dynamicStroke }}
              />
              <span className="text-slate-300">
                CPU Temperature (<strong className="text-white">{metrics.temp_celsius}°C</strong>)
              </span>
            </div>
          )}
          {(chartTab === "combined" || chartTab === "cpu") && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-indigo-400" />
              <span className="text-slate-300">
                CPU Load (<strong className="text-white">{metrics.cpu_percent}%</strong>)
              </span>
            </div>
          )}
          {(chartTab === "combined" || chartTab === "ram") && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-purple-400" />
              <span className="text-slate-300">
                RAM Usage (<strong className="text-white">{metrics.ram_percent}%</strong>)
              </span>
            </div>
          )}
        </div>
        {/* Recharts AreaChart Container */}
        <div className="h-72 w-full">
          {graphSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphSeries} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dynamicStroke} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={dynamicStroke} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C084FC" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C084FC" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  domain={[0, 105]}
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(9, 14, 28, 0.92)",
                    borderColor: "rgba(56, 189, 248, 0.35)",
                    borderRadius: "14px",
                    fontSize: "12px",
                    color: "#F8FAFC",
                  }}
                />
                {(chartTab === "combined" || chartTab === "temp") && (
                  <Area
                    type="monotone"
                    dataKey="temp"
                    name="Temp (°C)"
                    stroke={dynamicStroke}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#tempGrad)"
                    isAnimationActive={false}
                  />
                )}
                {(chartTab === "combined" || chartTab === "cpu") && (
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU (%)"
                    stroke="#818CF8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpuGrad)"
                    isAnimationActive={false}
                  />
                )}
                {(chartTab === "combined" || chartTab === "ram") && (
                  <Area
                    type="monotone"
                    dataKey="ram"
                    name="RAM (%)"
                    stroke="#C084FC"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ramGrad)"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col items-center justify-center text-center p-6">
              <Activity className="h-8 w-8 text-cyan-400 animate-pulse mb-2" />
              <p className="text-sm font-semibold text-white">Waiting for Live Graph Stream...</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Run <code className="text-cyan-300">python main_service.py</code> in your terminal to begin plotting
                live CPU temperature, memory pressure, and power curves.
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Bottom Grid: Per-Core CPU Utilization + Live AI Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Per-Core CPU Load Visualizer (7 Cols) */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Logical CPU Core Distribution</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {metrics.per_core_percent.length} Threads Active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.per_core_percent.map((coreVal, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-950/60 border border-white/5 p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Core #{idx}</span>
                  <span className="font-mono font-bold text-cyan-300">{coreVal}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, coreVal)}%`,
                      backgroundColor: coreVal > 80 ? "#EF4444" : coreVal > 50 ? "#F59E0B" : "#06B6D4",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* AI Decision & Recent Autonomous Actions Log (5 Cols) */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>AI Autonomous Decision Log</span>
            </h3>
            <p className="mt-2 text-xs text-slate-300 bg-slate-950/60 border border-white/10 rounded-xl p-3 leading-relaxed">
              <strong className="text-cyan-300">Current Reasoning:</strong> {aiDecision.decision_reason}
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Recent Background Optimizations
              </p>
              {processSummary.recent_actions && processSummary.recent_actions.length > 0 ? (
                processSummary.recent_actions.map((act, i) => (
                  <div
                    key={i}
                    className="text-xs text-slate-200 bg-white/5 border border-white/5 rounded-lg px-3 py-2 flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate">{act}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">
                  System is currently balanced — no background throttling needed right now.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Engine: {aiDecision.engine_backend}</span>
            <span className="text-emerald-400 font-medium">Zero-Crash Guard ON</span>
          </div>
        </div>
      </div>
    </div>
  );
}