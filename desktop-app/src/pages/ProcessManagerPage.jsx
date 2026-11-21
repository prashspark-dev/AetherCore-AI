import React, { useState, useMemo } from "react";
import {
  Layers,
  ShieldCheck,
  Search,
  Plus,
  X,
  Star,
  RefreshCw,
  Cpu,
  HardDrive,
  Lock,
} from "lucide-react";
/**
 * Process & RAM Optimizer Page:
 * - Displays live running processes streamed from Python AI Engine with color-coded
 *   status badges & plain-English AI action explanations.
 * - Lets users add/remove apps in their custom VIP Whitelist so critical work apps
 *   always receive 100% CPU priority and are never throttled.
 */
const QUICK_SUGGESTIONS = ["Code.exe", "chrome.exe", "msedge.exe", "obs64.exe", "vlc.exe", "Postman.exe"];
export default function ProcessManagerPage({ liveData, engineConnected, onSendCommand }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'protected' | 'balanced' | 'high_ram'
  const [vipApps, setVipApps] = useState(["code.exe", "obs64.exe", "vlc.exe", "zoom.exe", "teams.exe"]);
  const [newVipInput, setNewVipInput] = useState("");
  const [optimizingRam, setOptimizingRam] = useState(false);
  const processManager = liveData?.process_manager || {
    optimized_process_count: 0,
    ram_trimmed_processes: 0,
    recent_actions: [],
    processes: [],
  };
  const metrics = liveData?.telemetry?.metrics || {
    ram_percent: 0,
    ram_used_gb: 0,
    ram_total_gb: 8,
  };
  // Sync updated VIP whitelist directly to Python AI Engine
  const syncVipListToEngine = async (updatedList) => {
    setVipApps(updatedList);
    await onSendCommand({
      type: "UPDATE_VIP_WHITELIST",
      apps: updatedList,
    });
  };
  const handleAddVip = async (appNameRaw) => {
    const clean = appNameRaw.trim().toLowerCase();
    if (!clean) return;
    const formatted = clean.endsWith(".exe") ? clean : `${clean}.exe`;
    if (!vipApps.includes(formatted)) {
      await syncVipListToEngine([...vipApps, formatted]);
    }
    setNewVipInput("");
  };
  const handleRemoveVip = async (appName) => {
    const updated = vipApps.filter((item) => item !== appName.toLowerCase());
    await syncVipListToEngine(updated);
  };
  const handleToggleRowVip = async (procName) => {
    const lower = procName.toLowerCase();
    if (vipApps.includes(lower)) {
      await handleRemoveVip(lower);
    } else {
      await handleAddVip(lower);
    }
  };
  const handleTriggerRamTrim = async () => {
    setOptimizingRam(true);
    await onSendCommand({ type: "FORCE_RAM_OPTIMIZE" });
    setTimeout(() => setOptimizingRam(false), 600);
  };
  // Filter & search running processes
  const filteredProcesses = useMemo(() => {
    return (processManager.processes || []).filter((proc) => {
      const matchesSearch =
        proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(proc.pid).includes(searchQuery);
      if (!matchesSearch) return false;
      if (filterTab === "protected") return proc.is_protected || proc.is_foreground;
      if (filterTab === "balanced")
        return proc.status_label.includes("Throttled") || proc.status_label.includes("Balanced");
      if (filterTab === "high_ram") return proc.memory_mb >= 120;
      return true;
    });
  }, [processManager.processes, searchQuery, filterTab]);
  return (
    <div className="space-y-6 pb-8">
      {/* Header Card */}
      <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Process & RAM Optimizer</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Active foreground windows and your VIP apps stay at 100% power while idle background tasks are smoothly
              balanced—never force-closed.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!engineConnected || optimizingRam}
          onClick={handleTriggerRamTrim}
          className="btn-primary shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${optimizingRam ? "animate-spin" : ""}`} />
          <span>{optimizingRam ? "Trimming Idle Cache..." : "Release Idle RAM Now"}</span>
        </button>
      </div>
      {/* Top 3 Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Physical Memory Load</p>
            <p className="mt-1 text-2xl font-bold font-mono text-white">
              {metrics.ram_percent}%{" "}
              <span className="text-xs font-normal text-slate-400">
                ({metrics.ram_used_gb}/{metrics.ram_total_gb} GB)
              </span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
            <HardDrive className="h-5 w-5" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Background Tasks Balanced</p>
            <p className="mt-1 text-2xl font-bold font-mono text-cyan-300">
              {processManager.optimized_process_count} Apps
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
            <Cpu className="h-5 w-5" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Custom VIP Protected Apps</p>
            <p className="mt-1 text-2xl font-bold font-mono text-emerald-300">{vipApps.length} VIPs</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>
      {/* Custom User VIP Whitelist Manager */}
      <div className="glass-card rounded-3xl p-6 border border-cyan-400/25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              <h2 className="text-base font-bold text-white">Your VIP Priority Whitelist</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Apps listed here are permanently immune to background throttling and E-Core pinning even when minimized.
            </p>
          </div>
          {/* Add New VIP Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddVip(newVipInput);
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              placeholder="e.g. Code.exe or game.exe"
              value={newVipInput}
              onChange={(e) => setNewVipInput(e.target.value)}
              className="glass-input py-2 text-xs md:w-56"
            />
            <button type="submit" className="btn-primary py-2 px-3.5 text-xs shrink-0">
              <Plus className="h-4 w-4" />
              <span>Add VIP</span>
            </button>
          </form>
        </div>
        {/* Active VIP Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {vipApps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-xs font-mono text-cyan-200"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>{app}</span>
              <button
                type="button"
                onClick={() => handleRemoveVip(app)}
                title="Remove from VIP"
                className="text-slate-400 hover:text-red-400 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        {/* Quick-Add Preset Chips */}
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span>Quick Add:</span>
          {QUICK_SUGGESTIONS.filter((s) => !vipApps.includes(s.toLowerCase())).map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => handleAddVip(sug)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition"
            >
              + {sug}
            </button>
          ))}
        </div>
      </div>
      {/* Live Process Inspector Table */}
      <div className="glass-card rounded-3xl p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search process name or PID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-10 py-2 text-xs"
            />
          </div>
          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-white/10">
            {[
              { id: "all", label: "All Active" },
              { id: "protected", label: "Protected / VIP" },
              { id: "balanced", label: "AI Balanced" },
              { id: "high_ram", label: "Heavy RAM (>120MB)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterTab === tab.id
                    ? "bg-indigo-500/30 text-white border border-indigo-400/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">Application / Process</th>
                <th className="py-3 px-3">PID</th>
                <th className="py-3 px-3">CPU</th>
                <th className="py-3 px-3">Memory</th>
                <th className="py-3 px-3">AI Optimization Status</th>
                <th className="py-3 px-3 text-right">VIP Shield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredProcesses.length > 0 ? (
                filteredProcesses.map((proc) => {
                  const isOsKernel = proc.status_label === "OS Kernel Shield";
                  const isVip = vipApps.includes(proc.name.toLowerCase());
                  return (
                    <tr key={proc.pid} className="hover:bg-white/[0.03] transition">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white font-mono">{proc.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-md truncate">
                          {proc.status_detail}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-400">{proc.pid}</td>
                      <td className="py-3.5 px-3 font-mono font-semibold text-slate-200">
                        {proc.cpu_percent}%
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-200">{proc.memory_mb} MB</td>
                      <td className="py-3.5 px-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                          style={{
                            color: proc.status_color,
                            backgroundColor: `${proc.status_color}18`,
                            borderColor: `${proc.status_color}40`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: proc.status_color }}
                          />
                          {proc.status_label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {isOsKernel ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-sky-400/80">
                            <Lock className="h-3 w-3" />
                            <span>OS Locked</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleRowVip(proc.name)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              isVip
                                ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200 hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-200"
                                : "bg-white/5 border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300"
                            }`}
                          >
                            {isVip ? "VIP Active" : "+ Pin VIP"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {engineConnected
                      ? "No processes match your current search or filter."
                      : "Start Python AI Engine (main_service.py) to inspect live Windows processes."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}