import React from "react";
import {
  Cpu,
  Minus,
  Copy,
  X,
  DownloadCloud,
  Wifi,
  WifiOff,
  ShieldCheck,
} from "lucide-react";
/**
 * Custom Frameless Windows TitleBar for AetherCore-AI.
 * Supports double-click header maximize/restore, live AI thermal state pill,
 * OTA update badge, and native Electron window controls.
 */
export default function TitleBar({
  engineConnected = false,
  diagnostics = null,
  currentTemp = null,
  updateAvailable = false,
  onTriggerUpdate,
}) {
  const accentHex = diagnostics?.primary_hex || "#06B6D4";
  const badgeLabel = diagnostics?.badge_label || "Initializing AI";
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };
  const handleMaximizeToggle = () => {
    window.electronAPI?.maximizeWindow?.();
  };
  const handleCloseToTray = () => {
    window.electronAPI?.closeWindow?.();
  };
  return (
    <header
      onDoubleClick={handleMaximizeToggle}
      className="h-11 w-full bg-slate-950/75 backdrop-blur-xl border-b border-white/10 px-4 flex items-center justify-between select-none z-40 shrink-0"
      style={{ WebkitAppRegion: "drag" }}
    >
      {/* Left: Brand Identity & Build Version */}
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 via-cyan-400 to-purple-600 flex items-center justify-center shadow-sm shadow-cyan-500/30">
          <Cpu className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs font-bold tracking-wide text-white">
          AetherCore<span className="text-cyan-400">-AI</span>
        </span>
        <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
          v1.0.0 • Win x64/ARM
        </span>
      </div>
      {/* Center: Live Telemetry & AI Thermal State Pill */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-slate-900/80 border border-white/10 shadow-inner"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        {engineConnected ? (
          <>
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: accentHex, boxShadow: `0 0 8px ${accentHex}` }}
            />
            <span className="text-[11px] font-semibold text-slate-200">{badgeLabel}</span>
            {currentTemp !== null && (
              <span
                className="text-[11px] font-mono font-bold pl-1.5 border-l border-white/10"
                style={{ color: accentHex }}
              >
                {currentTemp}°C
              </span>
            )}
            <Wifi className="h-3 w-3 text-emerald-400 ml-0.5" title="Local AI Engine Connected" />
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] text-amber-300 font-medium">
              Waiting for AI Engine (Port 8766)...
            </span>
            <WifiOff className="h-3 w-3 text-amber-400" />
          </>
        )}
      </div>
      {/* Right: OTA Update Trigger, Security Shield & Window Controls */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" }}>
        {updateAvailable && (
          <button
            type="button"
            onClick={onTriggerUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-[11px] font-semibold text-indigo-200 transition mr-1"
          >
            <DownloadCloud className="h-3.5 w-3.5 text-cyan-400" />
            <span>Update Ready</span>
          </button>
        )}
        <div
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 mr-1.5"
          title="Kernel Whitelist & Thermal Guard Active"
        >
          <ShieldCheck className="h-3 w-3" />
          <span>Protected</span>
        </div>
        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimize"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        {/* Maximize / Restore Down */}
        <button
          type="button"
          onClick={handleMaximizeToggle}
          title="Maximize / Restore Down"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
        >
          <Copy className="h-3 w-3" />
        </button>
        {/* Close to System Tray */}
        <button
          type="button"
          onClick={handleCloseToTray}
          title="Hide to System Tray (AI keeps running in background)"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/80 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}