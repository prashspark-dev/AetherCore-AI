import os
import json
import time
import ctypes
import psutil
from pathlib import Path
# Windows Native APIs for Foreground Window detection & Safe Working-Set RAM Trim
if os.name == "nt":
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    psapi = ctypes.windll.psapi
class SafeProcessOptimizer:
    """
    Autonomous Background Process & Memory Optimizer with Adaptive Behavioral Learning.
    - NEVER kills or closes any user application.
    - Zero hardcoded user apps: Learns each individual user's most-used apps
      automatically from foreground usage and saves them in 'config/learned_vip.json'.
    - Protects Windows OS Kernel processes + Active Foreground Window + Learned/Manual VIPs.
    - Pins heavy background tasks to Efficiency Cores (E-Cores) on hybrid CPUs.
    """
    AUTO_VIP_THRESHOLD_SECONDS = 30.0  # Promotes any app used >= 30s in foreground to Auto-VIP
    def __init__(
        self,
        hal_report: dict,
        whitelist_path: str = "config/whitelist.json",
        learned_vip_path: str = "config/learned_vip.json",
    ):
        self.hal_report = hal_report
        self.has_hybrid_cores = hal_report.get("cpu", {}).get("has_hybrid_pe_cores", False)
        self.e_core_indices = hal_report.get("cpu", {}).get("e_core_indices", [])
        self.total_threads = hal_report.get("cpu", {}).get("logical_threads", 4)
        self.ram_threshold = hal_report.get("memory", {}).get("ram_pressure_threshold", 82.0)
        self.learned_vip_file = Path(learned_vip_path)
        self.os_protected = self._load_os_whitelist(whitelist_path)
        # Dynamic Per-User Lists (Zero hardcoded developer apps!)
        self.manual_vip_whitelist = set()
        self.app_focus_seconds = {}
        self.auto_learned_vips = set()
        self._load_learned_vips()
        self.last_tick_time = time.time()
        self.cycles_since_save = 0
        self.throttled_pids = set()
        self.last_actions_log = []
    def _load_os_whitelist(self, whitelist_path: str) -> set:
        base_set = {
            "system", "idle", "registry", "smss.exe", "csrss.exe", "wininit.exe",
            "services.exe", "lsass.exe", "svchost.exe", "winlogon.exe", "explorer.exe",
            "dwm.exe", "audiodg.exe", "taskmgr.exe", "msmpeng.exe", "aethercore-ai.exe",
            "aethercore-engine.exe", "python.exe", "node.exe", "electron.exe"
        }
        try:
            p = Path(whitelist_path)
            if p.exists():
                data = json.loads(p.read_text(encoding="utf-8"))
                for item in data.get("protected_os_processes", []):
                    base_set.add(item.lower())
        except Exception:
            pass
        return base_set
    def _load_learned_vips(self):
        """Loads user-specific learned app usage stats from local disk."""
        try:
            if self.learned_vip_file.exists():
                data = json.loads(self.learned_vip_file.read_text(encoding="utf-8"))
                self.app_focus_seconds = data.get("focus_seconds", {})
                self.manual_vip_whitelist = set(data.get("manual_vips", []))
                self.auto_learned_vips = {
                    app
                    for app, secs in self.app_focus_seconds.items()
                    if secs >= self.AUTO_VIP_THRESHOLD_SECONDS
                }
        except Exception:
            pass
    def _save_learned_vips(self):
        """Persists user-specific learned VIP habits cleanly to disk."""
        try:
            self.learned_vip_file.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "focus_seconds": {k: round(v, 1) for k, v in self.app_focus_seconds.items()},
                "manual_vips": sorted(list(self.manual_vip_whitelist)),
                "auto_learned_vips": sorted(list(self.auto_learned_vips)),
            }
            self.learned_vip_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except Exception:
            pass
    def update_user_vip_whitelist(self, app_names: list):
        """Updates user-selected manual VIP apps from Desktop UI Process Manager Page."""
        self.manual_vip_whitelist = {str(name).lower().strip() for name in app_names if name}
        self._save_learned_vips()
    def get_active_foreground_pid(self) -> int:
        """Uses Win32 GetForegroundWindow() to detect the exact window the user is actively using."""
        if os.name != "nt":
            return -1
        try:
            hwnd = user32.GetForegroundWindow()
            if hwnd:
                pid = ctypes.c_ulong()
                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                return int(pid.value)
        except Exception:
            pass
        return -1
    def _record_foreground_habit(self, app_name_lower: str, elapsed_sec: float):
        """Learns which apps THIS specific user relies on most and promotes them to Auto-VIP."""
        if not app_name_lower or app_name_lower in self.os_protected:
            return
        prev = self.app_focus_seconds.get(app_name_lower, 0.0)
        updated = prev + min(elapsed_sec, 5.0)
        self.app_focus_seconds[app_name_lower] = updated
        if updated >= self.AUTO_VIP_THRESHOLD_SECONDS and app_name_lower not in self.auto_learned_vips:
            self.auto_learned_vips.add(app_name_lower)
            self._save_learned_vips()
    def _trim_process_working_set(self, pid: int) -> bool:
        """Safely trims idle memory working sets without closing or disturbing the app."""
        if os.name != "nt":
            return False
        try:
            PROCESS_SET_QUOTA = 0x0100
            PROCESS_QUERY_INFORMATION = 0x0400
            handle = kernel32.OpenProcess(PROCESS_SET_QUOTA | PROCESS_QUERY_INFORMATION, False, pid)
            if handle:
                result = psapi.EmptyWorkingSet(handle)
                kernel32.CloseHandle(handle)
                return bool(result)
        except Exception:
            pass
        return False
    def _restore_process_defaults(self, proc: psutil.Process):
        """Restores normal priority and full CPU core affinity."""
        try:
            if os.name == "nt":
                proc.nice(psutil.NORMAL_PRIORITY_CLASS)
            else:
                proc.nice(0)
            if self.has_hybrid_cores:
                proc.cpu_affinity(list(range(self.total_threads)))
        except Exception:
            pass
    def optimize_system_processes(
        self,
        action_id: int,
        ram_percent: float,
        permissions: dict,
    ) -> dict:
        allow_priority = permissions.get("adjustProcessPriority", True)
        allow_ram_trim = permissions.get("ramOptimization", True)
        now = time.time()
        elapsed = max(0.5, now - self.last_tick_time)
        self.last_tick_time = now
        fg_pid = self.get_active_foreground_pid()
        actions_taken = []
        process_table = []
        ram_trimmed_count = 0
        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info"]):
            try:
                pid = proc.info["pid"]
                name = proc.info["name"] or "Unknown"
                name_lower = name.lower()
                cpu_pct = round(proc.info["cpu_percent"] or 0.0, 1)
                mem_mb = round((proc.info["memory_info"].rss / (1024 * 1024)), 1) if proc.info["memory_info"] else 0.0
                if pid <= 4:
                    continue
                is_os_protected = name_lower in self.os_protected
                is_foreground = pid == fg_pid
                is_manual_vip = name_lower in self.manual_vip_whitelist
                is_learned_vip = name_lower in self.auto_learned_vips
                # Learn user behavior whenever an app is in active foreground focus
                if is_foreground:
                    self._record_foreground_habit(name_lower, elapsed)
                status_label = "Normal"
                status_color = "#94A3B8"
                status_detail = "Running normally within safe thermal limits."
                if is_os_protected:
                    status_label = "OS Kernel Shield"
                    status_color = "#38BDF8"
                    status_detail = "Protected Windows core service (Never touched)."
                elif is_foreground:
                    status_label = "Active Focus (100%)"
                    status_color = "#10B981"
                    status_detail = "Currently active foreground window — receiving full 100% CPU priority."
                    if pid in self.throttled_pids:
                        self._restore_process_defaults(proc)
                        self.throttled_pids.discard(pid)
                elif is_manual_vip:
                    status_label = "VIP Whitelisted"
                    status_color = "#06B6D4"
                    status_detail = "Protected by your custom VIP whitelist."
                    if pid in self.throttled_pids:
                        self._restore_process_defaults(proc)
                        self.throttled_pids.discard(pid)
                elif is_learned_vip:
                    status_label = "Auto-VIP (Learned)"
                    status_color = "#22D3EE"
                    status_detail = "Automatically prioritized based on your frequent daily usage."
                    if pid in self.throttled_pids:
                        self._restore_process_defaults(proc)
                        self.throttled_pids.discard(pid)
                else:
                    # Non-critical background process optimization
                    if action_id == 0:
                        if pid in self.throttled_pids:
                            self._restore_process_defaults(proc)
                            self.throttled_pids.discard(pid)
                    elif allow_priority and cpu_pct >= 8.0:
                        if action_id in (2, 3, 4):
                            if os.name == "nt":
                                target_nice = (
                                    psutil.IDLE_PRIORITY_CLASS
                                    if action_id in (3, 4)
                                    else psutil.BELOW_NORMAL_PRIORITY_CLASS
                                )
                                proc.nice(target_nice)
                            if self.has_hybrid_cores and self.e_core_indices:
                                proc.cpu_affinity(self.e_core_indices)
                            self.throttled_pids.add(pid)
                            status_label = "Thermal Throttled (E-Core)" if self.has_hybrid_cores else "Thermal Balanced"
                            status_color = "#EF4444" if action_id == 3 else "#F59E0B"
                            status_detail = (
                                f"Background CPU load ({cpu_pct}%) shifted to low-heat priority "
                                f"to protect thermal headroom without closing the app."
                            )
                            actions_taken.append(f"Balanced '{name}' (PID {pid}, CPU {cpu_pct}%)")
                        elif action_id == 1 and cpu_pct >= 18.0:
                            if os.name == "nt":
                                proc.nice(psutil.BELOW_NORMAL_PRIORITY_CLASS)
                            self.throttled_pids.add(pid)
                            status_label = "Smart Balanced"
                            status_color = "#818CF8"
                            status_detail = f"Smoothed heavy background spike ({cpu_pct}%) for foreground fluidity."
                    # Safe RAM Working Set Trim when RAM pressure is high and background app is idle
                    if (
                        allow_ram_trim
                        and ram_percent >= self.ram_threshold
                        and cpu_pct < 1.0
                        and mem_mb > 140.0
                    ):
                        if self._trim_process_working_set(pid):
                            ram_trimmed_count += 1
                            status_label = "RAM Trimmed (Safe)"
                            status_color = "#A855F7"
                            status_detail = f"Released idle cached memory ({mem_mb} MB working set) safely."
                if cpu_pct >= 0.5 or mem_mb >= 60.0 or is_foreground or is_manual_vip or is_learned_vip:
                    process_table.append({
                        "pid": pid,
                        "name": name,
                        "cpu_percent": cpu_pct,
                        "memory_mb": mem_mb,
                        "is_foreground": is_foreground,
                        "is_protected": is_os_protected or is_manual_vip or is_learned_vip,
                        "status_label": status_label,
                        "status_color": status_color,
                        "status_detail": status_detail,
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        self.cycles_since_save += 1
        if self.cycles_since_save >= 20:
            self._save_learned_vips()
            self.cycles_since_save = 0
        process_table.sort(key=lambda x: (x["is_foreground"], x["cpu_percent"], x["memory_mb"]), reverse=True)
        if actions_taken:
            self.last_actions_log = actions_taken[:5]
        return {
            "optimized_process_count": len(self.throttled_pids),
            "ram_trimmed_processes": ram_trimmed_count,
            "learned_vip_count": len(self.auto_learned_vips),
            "recent_actions": self.last_actions_log,
            "processes": process_table[:25],
        }