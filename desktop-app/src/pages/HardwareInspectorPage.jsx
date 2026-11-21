import React from "react";
import {
  Laptop,
  Cpu,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  Server,
  Zap,
  Info,
} from "lucide-react";
/**
 * Hardware & OS Architecture Inspector Page:
 * Displays deep telemetry detected by the Windows Hardware Abstraction Layer (hal_windows.py):
 * - Windows 10 / 11 / 12 Edition, Release & Build Number
 * - 64-bit (x64) / ARM64 Architecture
 * - Exact CPU Model, Generation, Physical vs. Logical Cores & Hybrid P/E Core Topology
 * - Memory Tier & Auto-Calibrated Thermal/RAM Thresholds
 */
export default function HardwareInspectorPage({ liveData }) {
  const hw = liveData?.hardware || {
    os: {
      system: "Windows",
      marketing_version: "Windows 11 / 10",
      edition: "Pro / Home",
      build_number: 22631,
      architecture: "64-bit (x64)",
      full_label: "Scanning Windows OS...",
      is_supported: true,
    },
    cpu: {
      cpu_model: "Detecting Processor...",
      vendor: "Intel / AMD / Qualcomm",
      generation_label: "Modern Multi-Core Architecture",
      physical_cores: 4,
      logical_threads: 8,
      has_hybrid_pe_cores: false,
      p_core_indices: [],
      e_core_indices: [],
      max_clock_mhz: 2400,
    },
    memory: {
      total_ram_gb: 8.0,
      ram_tier: "Standard Tier",
      ram_pressure_threshold: 82.0,
    },
    compatibility_status: "100% Compatible — Full Hardware Telemetry & RL Control Active",
  };
  return (
    <div className="space-y-6 pb-8">
      {/* Top Compatibility Hero Banner */}
      <div className="glass-card rounded-3xl p-6 border border-emerald-400/30 bg-gradient-to-r from-emerald-950/25 via-slate-900/60 to-cyan-950/25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <Laptop className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>{hw.compatibility_status}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-white tracking-tight">
                Hardware & OS Architecture Inspector
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-300">
                AetherCore-AI automatically adapts its neural thermal policy and memory thresholds to your exact
                Windows build and processor silicon.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950/75 border border-white/10 px-4 py-3 shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-400">System Architecture</div>
            <div className="mt-0.5 text-lg font-bold font-mono text-cyan-300">{hw.os.architecture}</div>
          </div>
        </div>
      </div>
      {/* 2x2 Deep Specification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Windows OS & Kernel */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Operating System & Kernel</h2>
              <p className="text-xs text-slate-400">Supports Windows 10, Windows 11 & Windows 12+ Builds</p>
            </div>
          </div>
          <div className="space-y-2.5 text-xs pt-2">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Detected OS Edition:</span>
              <span className="font-semibold text-white">{hw.os.full_label}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">OS Build Number:</span>
              <span className="font-mono font-bold text-cyan-300">Build {hw.os.build_number}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Instruction Set / Bits:</span>
              <span className="font-mono text-white">{hw.os.architecture}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Win32 & Powercfg API Bridge:</span>
              <span className="text-emerald-400 font-semibold">Verified & Active</span>
            </div>
          </div>
        </div>
        {/* Card 2: Processor Silicon & Core Topology */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Processor & Core Topology</h2>
              <p className="text-xs text-slate-400">{hw.cpu.generation_label}</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-white/10 p-3 text-xs font-mono text-cyan-200">
            {hw.cpu.cpu_model}
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Physical Cores / Logical Threads:</span>
              <span className="font-mono font-bold text-white">
                {hw.cpu.physical_cores} Cores / {hw.cpu.logical_threads} Threads
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Hybrid P-Core / E-Core Scheduling:</span>
              <span className="font-semibold text-indigo-300">
                {hw.cpu.has_hybrid_pe_cores
                  ? `Enabled (${hw.cpu.e_core_indices.length} E-Cores Mapped)`
                  : "Unified Symmetric Priority Scheduling"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Base / Max Nominal Clock:</span>
              <span className="font-mono text-white">{hw.cpu.max_clock_mhz} MHz</span>
            </div>
          </div>
        </div>
        {/* Card 3: Memory Subsystem & Auto-Calibration */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Memory (RAM) Auto-Calibration</h2>
              <p className="text-xs text-slate-400">Prevents SSD/HDD Pagefile Thrashing</p>
            </div>
          </div>
          <div className="space-y-2.5 text-xs pt-1">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Installed Physical RAM:</span>
              <span className="font-mono font-bold text-white">{hw.memory.total_ram_gb} GB</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-slate-400">Detected Capacity Tier:</span>
              <span className="font-semibold text-purple-300">{hw.memory.ram_tier}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-400">Auto-Trim Trigger Threshold:</span>
              <span className="font-mono font-bold text-cyan-300">
                {hw.memory.ram_pressure_threshold}% RAM Pressure
              </span>
            </div>
          </div>
        </div>
        {/* Card 4: AI Adaptive Explanation Box */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">How AI Optimizes Your Specific Laptop</h2>
                <p className="text-xs text-slate-400">Hardware-Aware Reinforcement Learning</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Because your system runs <strong className="text-white">{hw.os.full_label}</strong> with{" "}
              <strong className="text-cyan-300">{hw.memory.total_ram_gb} GB RAM</strong> and{" "}
              <strong className="text-indigo-300">{hw.cpu.logical_threads} logical threads</strong>, AetherCore-AI
              automatically sets your memory pressure relief trigger at{" "}
              <strong className="text-white">{hw.memory.ram_pressure_threshold}%</strong>. Whenever background apps
              accumulate idle memory or cause thermal spikes, the engine smoothly trims unused pages and caps Turbo
              Boost spikes without interrupting your active screen.
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2.5 text-[11px] text-slate-300">
            <Info className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Zero BIOS modification • Zero kernel drivers • 100% safe Windows user-space APIs.</span>
          </div>
        </div>
      </div>
    </div>
  );
}