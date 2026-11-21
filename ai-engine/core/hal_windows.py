import os
import re
import sys
import uuid
import hashlib
import platform
import subprocess
import psutil
# Windows-specific imports with safe fallback
if os.name == "nt":
    import winreg
    import ctypes
class WindowsHardwareAbstractionLayer:
    """
    Universal Hardware Abstraction Layer (HAL) for AetherCore-AI.
    Detects Windows 10, Windows 11, and future Windows 12 builds, CPU generations,
    32-bit/64-bit/ARM64 architecture, hybrid P/E cores, and RAM capacity so the
    optimizer adapts safely to ANY user's laptop or desktop.
    """
    def __init__(self):
        self.os_info = self._detect_windows_version()
        self.arch_info = self._detect_architecture()
        self.cpu_info = self._detect_cpu_topology()
        self.ram_info = self._detect_memory_profile()
        self.device_fingerprint = self._generate_privacy_safe_fingerprint()
    def _detect_windows_version(self) -> dict:
        """Reads Windows Registry to accurately identify Win 10, Win 11, or future Win 12."""
        if os.name != "nt":
            return {
                "os_family": platform.system(),
                "edition": platform.release(),
                "display_version": "Non-Windows",
                "build_number": 0,
                "is_supported": False,
                "support_note": "Designed natively for Windows 10, 11, and 12.",
            }
        try:
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
            )
            product_name, _ = winreg.QueryValueEx(key, "ProductName")
            current_build_str, _ = winreg.QueryValueEx(key, "CurrentBuildNumber")
            try:
                display_version, _ = winreg.QueryValueEx(key, "DisplayVersion")
            except FileNotFoundError:
                display_version = "Standard"
            winreg.CloseKey(key)
            build_num = int(current_build_str)
            # Windows Build Classification (Includes future Windows 12 readiness)
            if build_num >= 27500:
                friendly_os = "Windows 12 (Next-Gen)"
                is_supported = True
            elif build_num >= 22000:
                friendly_os = product_name.replace("Windows 10", "Windows 11")
                is_supported = True
            elif build_num >= 19041:
                friendly_os = product_name
                is_supported = True
            else:
                friendly_os = f"{product_name} (Legacy Build {build_num})"
                is_supported = False
            return {
                "os_family": "Windows",
                "edition": friendly_os,
                "display_version": display_version,
                "build_number": build_num,
                "full_label": f"{friendly_os} ({display_version}, Build {build_num})",
                "is_supported": is_supported,
                "support_note": (
                    "Full Kernel & Power API support active."
                    if is_supported
                    else "Legacy Windows build detected; running in Safe Compatibility Mode."
                ),
            }
        except Exception as e:
            return {
                "os_family": "Windows",
                "edition": f"Windows {platform.release()}",
                "display_version": "Unknown",
                "build_number": 0,
                "full_label": f"Windows {platform.release()}",
                "is_supported": True,
                "support_note": f"Registry fallback active ({str(e)})",
            }
    def _detect_architecture(self) -> dict:
        """Detects 64-bit (x64), ARM64 (Copilot+ PCs), or legacy 32-bit (x86)."""
        machine = platform.machine().lower()
        is_64bit_os = sys.maxsize > 2**32 or "64" in machine
        if "arm" in machine or "aarch64" in machine:
            arch_label = "ARM64 (64-bit)"
            arch_code = "arm64"
        elif is_64bit_os:
            arch_label = "64-bit (x64)"
            arch_code = "x64"
        else:
            arch_label = "32-bit (x86 Legacy)"
            arch_code = "x86"
        return {
            "arch_code": arch_code,
            "arch_label": arch_label,
            "is_64bit": is_64bit_os,
            "pointer_bits": 64 if is_64bit_os else 32,
        }
    def _detect_cpu_topology(self) -> dict:
        """Identifies CPU model, vendor, generation, physical/logical cores & hybrid P/E support."""
        cpu_name = platform.processor() or "Unknown Processor"
        # Query exact marketing name on Windows (e.g., "12th Gen Intel(R) Core(TM) i5-12450H")
        if os.name == "nt":
            try:
                key = winreg.OpenKey(
                    winreg.HKEY_LOCAL_MACHINE,
                    r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
                )
                reg_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                winreg.CloseKey(key)
                if reg_name:
                    cpu_name = reg_name.strip()
            except Exception:
                pass
        physical_cores = psutil.cpu_count(logical=False) or 2
        logical_threads = psutil.cpu_count(logical=True) or 4
        # Detect Vendor & Generation
        vendor = "Intel" if "intel" in cpu_name.lower() else ("AMD" if "amd" in cpu_name.lower() else "ARM/Other")
        generation = "Standard Generation"
        has_hybrid_pe_cores = False
        if vendor == "Intel":
            gen_match = re.search(r"(\d{1,2})(?:th|nd|rd|st)\s+Gen", cpu_name, re.IGNORECASE)
            if "core ultra" in cpu_name.lower():
                generation = "Intel Core Ultra (AI Hybrid)"
                has_hybrid_pe_cores = True
            elif gen_match:
                gen_num = int(gen_match.group(1))
                generation = f"Intel {gen_num}th Generation"
                if gen_num >= 12:
                    has_hybrid_pe_cores = True
        elif vendor == "AMD":
            ryzen_match = re.search(r"Ryzen\s+\d\s+(\d)\d{3}", cpu_name, re.IGNORECASE)
            if "ryzen ai" in cpu_name.lower():
                generation = "AMD Ryzen AI Series"
                has_hybrid_pe_cores = True
            elif ryzen_match:
                series = ryzen_match.group(1)
                generation = f"AMD Ryzen {series}000 Series"
        # Estimate Efficiency Core indices (usually last N threads on Intel 12th+ hybrid CPUs)
        e_core_indices = []
        if has_hybrid_pe_cores and logical_threads >= 8:
            e_core_start = max(4, logical_threads // 2)
            e_core_indices = list(range(e_core_start, logical_threads))
        return {
            "cpu_model": cpu_name,
            "vendor": vendor,
            "generation": generation,
            "physical_cores": physical_cores,
            "logical_threads": logical_threads,
            "has_hybrid_pe_cores": has_hybrid_pe_cores,
            "e_core_indices": e_core_indices,
            "optimization_strategy": (
                "Hybrid P/E-Core Affinity Pinning + Dynamic Thermal Cap"
                if has_hybrid_pe_cores
                else "Dynamic Thread Priority Balancing + Smart Turbo Control"
            ),
        }
    def _detect_memory_profile(self) -> dict:
        """Detects RAM size and classifies memory tier (4GB/8GB/16GB+)."""
        mem = psutil.virtual_memory()
        total_gb = round(mem.total / (1024**3), 1)
        if total_gb <= 4.5:
            tier = "Low RAM (4GB Tier) - Aggressive Background Trim Active"
            ram_pressure_threshold = 75.0
        elif total_gb <= 8.5:
            tier = "Standard RAM (8GB Tier) - Balanced Smart Caching Active"
            ram_pressure_threshold = 82.0
        else:
            tier = f"High RAM ({int(round(total_gb))}GB Tier) - Performance Priority Active"
            ram_pressure_threshold = 88.0
        return {
            "total_gb": total_gb,
            "tier_description": tier,
            "ram_pressure_threshold": ram_pressure_threshold,
        }
    def _generate_privacy_safe_fingerprint(self) -> str:
        """Creates a one-way SHA-256 hardware fingerprint for cloud license sync."""
        raw_id = f"{platform.node()}-{uuid.getnode()}-{self.cpu_info['cpu_model']}"
        return hashlib.sha256(raw_id.encode("utf-8")).hexdigest()[:32]
    def get_full_hardware_report(self) -> dict:
        """Returns complete structured report for Hardware Inspector UI & Cloud Sync."""
        return {
            "device_fingerprint": self.device_fingerprint,
            "device_name": platform.node() or "Windows Laptop",
            "os": self.os_info,
            "architecture": self.arch_info,
            "cpu": self.cpu_info,
            "memory": self.ram_info,
            "compatibility_score": 98 if self.os_info["is_supported"] and self.arch_info["is_64bit"] else 82,
        }
if __name__ == "__main__":
    import json
    hal = WindowsHardwareAbstractionLayer()
    print(json.dumps(hal.get_full_hardware_report(), indent=2))
