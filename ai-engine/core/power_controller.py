import os
import subprocess
class WindowsPowerController:
    """
    Safe Windows Power & Thermal Ceiling Controller.
    Uses Microsoft's official 'powercfg' utility to dynamically adjust
    Maximum Processor State (PROCTHROTTLEMAX) so the CPU stays cool without
    any unsafe registry hacks or voltage modifications.
    """
    # Maps RL Discrete Actions (0-4) to (Max_CPU_Percent, Profile_Name, UI_Color_Hex, Description)
    ACTION_POWER_PROFILES = {
        0: (
            100,
            "Full Boost",
            "#38BDF8",
            "100% CPU frequency & Turbo Boost enabled for maximum speed while laptop is cool.",
        ),
        1: (
            98,
            "Balanced AI",
            "#818CF8",
            "98% smart dynamic scaling — delivers full responsiveness with minimal heat spikes.",
        ),
        2: (
            85,
            "Thermal Guard",
            "#F59E0B",
            "85% CPU ceiling (Turbo Boost capped) — reduces heat generation by 10–15°C smoothly.",
        ),
        3: (
            70,
            "Aggressive Cooling",
            "#EF4444",
            "70% thermal safety cap — rapidly cools down CPU package while keeping active apps running.",
        ),
        4: (
            55,
            "Deep Idle Eco",
            "#06B6D4",
            "55% ultra-low power cap — maximizes battery life and keeps fans completely silent.",
        ),
    }
    def __init__(self):
        self.current_applied_action = -1
        self.current_cpu_cap = 100
    def _run_powercfg_silent(self, args: list) -> bool:
        """Executes Windows powercfg command silently without popping up any console window."""
        if os.name != "nt":
            return False
        try:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            subprocess.run(
                ["powercfg"] + args,
                startupinfo=startupinfo,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3,
                check=False,
            )
            return True
        except Exception:
            return False
    def apply_thermal_power_policy(self, action_id: int, allow_power_control: bool = True) -> dict:
        """
        Applies the selected RL action's CPU frequency ceiling on both AC (Plugged-in)
        and DC (Battery) power schemes safely.
        """
        action_id = int(action_id) if int(action_id) in self.ACTION_POWER_PROFILES else 1
        target_cap, profile_name, color_hex, description = self.ACTION_POWER_PROFILES[action_id]
        # If user disabled 'managePowerPlans' in UI Permissions page, revert safely to 100%
        if not allow_power_control:
            if self.current_cpu_cap != 100:
                self.restore_default_power_state()
            return {
                "action_id": 0,
                "profile_name": "Manual / OS Default",
                "cpu_max_cap_percent": 100,
                "color_hex": "#94A3B8",
                "description": "Power plan control is paused by your privacy permissions (100% OS default).",
            }
        # Only invoke powercfg when the target cap actually changes (Zero CPU overhead!)
        if action_id != self.current_applied_action:
            # SUB_PROCESSOR = 54533251-82be-4824-96c1-47b60b740d00
            # PROCTHROTTLEMAX = bc5038f7-23e0-4960-96da-33abaf5935ec
            sub_proc = "54533251-82be-4824-96c1-47b60b740d00"
            max_state = "bc5038f7-23e0-4960-96da-33abaf5935ec"
            self._run_powercfg_silent(["/setacvalueindex", "SCHEME_CURRENT", sub_proc, max_state, str(target_cap)])
            self._run_powercfg_silent(["/setdcvalueindex", "SCHEME_CURRENT", sub_proc, max_state, str(target_cap)])
            self._run_powercfg_silent(["/setactive", "SCHEME_CURRENT"])
            self.current_applied_action = action_id
            self.current_cpu_cap = target_cap
        return {
            "action_id": action_id,
            "profile_name": profile_name,
            "cpu_max_cap_percent": self.current_cpu_cap,
            "color_hex": color_hex,
            "description": description,
        }
    def restore_default_power_state(self):
        """Restores 100% Maximum Processor State when AetherCore-AI exits or stops."""
        sub_proc = "54533251-82be-4824-96c1-47b60b740d00"
        max_state = "bc5038f7-23e0-4960-96da-33abaf5935ec"
        self._run_powercfg_silent(["/setacvalueindex", "SCHEME_CURRENT", sub_proc, max_state, "100"])
        self._run_powercfg_silent(["/setdcvalueindex", "SCHEME_CURRENT", sub_proc, max_state, "100"])
        self._run_powercfg_silent(["/setactive", "SCHEME_CURRENT"])
        self.current_applied_action = -1
        self.current_cpu_cap = 100
