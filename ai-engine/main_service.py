import os
import sys
import json
import time
import signal
import asyncio
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
# Ensure local modules resolve cleanly whether run as .py or compiled .exe
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
import psutil
from core.hal_windows import WindowsHardwareAbstractionLayer
from core.sensor_reader import SystemSensorReader
from core.process_optimizer import SafeProcessOptimizer
from core.power_controller import WindowsPowerController
from ml_brain.inference_engine import ThermalPolicyInferenceEngine
# Optional WebSockets library (if installed)
try:
    import websockets
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
class AetherCoreDaemonService:
    """
    Main Background Daemon for AetherCore-AI.
    Coordinates Hardware Detection, Live Sensors, 60-Point Graph Series,
    RL Policy Brain, Safe Process/E-Core Optimizer, and Windows Power Controller.
    Exposes real-time state over WebSocket (8765) & Local HTTP REST (8766).
    """
    def __init__(self):
        print("[INIT] Scanning Windows OS, CPU Generation & Architecture...")
        self.hal = WindowsHardwareAbstractionLayer()
        self.hardware_report = self.hal.get_full_hardware_report()
        self.sensors = SystemSensorReader(history_size=60)
        self.process_opt = SafeProcessOptimizer(
            hal_report=self.hardware_report,
            whitelist_path=os.path.join(BASE_DIR, "config", "whitelist.json"),
        )
        self.power_ctrl = WindowsPowerController()
        self.ai_brain = ThermalPolicyInferenceEngine(
            onnx_model_path=os.path.join(BASE_DIR, "ml_brain", "thermal_guard_agent.onnx")
        )
        # User-controlled runtime permissions (Synced from Desktop UI)
        self.permissions = {
            "readThermalSensors": True,
            "adjustProcessPriority": True,
            "managePowerPlans": True,
            "ramOptimization": True,
            "autoStartWithWindows": True,
        }
        self.is_running = True
        self.latest_state_payload = {}
        self.connected_ws_clients = set()
        # Prime psutil CPU baseline reading
        psutil.cpu_percent(interval=None)
    def handle_ui_command(self, cmd_data: dict) -> dict:
        """Processes interactive control commands sent by the Electron/React Desktop UI."""
        cmd_type = cmd_data.get("type")
        if cmd_type == "SET_COOLING_MODE":
            mode = cmd_data.get("mode", "auto_pilot")
            self.ai_brain.set_user_mode(mode)
            return {"status": "ok", "message": f"Cooling mode switched to '{mode}'."}
        elif cmd_type == "UPDATE_PERMISSIONS":
            perms = cmd_data.get("permissions", {})
            for k, v in perms.items():
                if k in self.permissions and isinstance(v, bool):
                    self.permissions[k] = v
            return {"status": "ok", "permissions": self.permissions}
        elif cmd_type == "UPDATE_VIP_WHITELIST":
            apps = cmd_data.get("apps", [])
            self.process_opt.update_user_vip_whitelist(apps)
            return {"status": "ok", "vip_apps": list(self.process_opt.user_vip_whitelist)}
        elif cmd_type == "FORCE_RAM_OPTIMIZE":
            res = self.process_opt.optimize_system_processes(
                action_id=3, ram_percent=95.0, permissions=self.permissions
            )
            return {"status": "ok", "trimmed_count": res["ram_trimmed_processes"]}
        return {"status": "unknown_command"}
    def run_single_optimization_cycle(self) -> dict:
        """Executes one complete telemetry -> AI decision -> safe hardware optimization step."""
        # 1. Read Live Hardware Sensors & 60-Point Graph History
        telemetry = self.sensors.collect_telemetry(
            active_action_name=self.ai_brain.ACTION_NAMES[self.ai_brain.last_action]
        )
        metrics = telemetry["metrics"]
        # 2. RL Policy Decision
        ai_decision = self.ai_brain.predict_optimal_action(
            metrics=metrics,
            current_cpu_cap=self.power_ctrl.current_cpu_cap,
        )
        action_id = ai_decision["action_id"]
        # 3. Apply Windows CPU Power Ceiling Safely
        power_status = self.power_ctrl.apply_thermal_power_policy(
            action_id=action_id,
            allow_power_control=self.permissions.get("managePowerPlans", True),
        )
        # 4. Optimize Background Processes, E-Cores & RAM Working Sets
        process_status = self.process_opt.optimize_system_processes(
            action_id=action_id,
            ram_percent=metrics["ram_percent"],
            permissions=self.permissions,
        )
        # 5. Assemble Unified Real-Time Payload for Desktop UI (Dashboard, Graphs, Inspector)
        self.latest_state_payload = {
            "service_status": "active",
            "hardware": self.hardware_report,
            "telemetry": telemetry,
            "ai_decision": ai_decision,
            "power_profile": power_status,
            "process_manager": process_status,
            "permissions": self.permissions,
        }
        return self.latest_state_payload
    def start_http_fallback_server(self, port: int = 8766):
        """
        Zero-dependency local HTTP REST server (127.0.0.1:8766) so the Desktop UI
        can always read live graphs & send commands even if websockets is unavailable.
        """
        daemon_ref = self
        class LocalApiHandler(BaseHTTPRequestHandler):
            def _set_headers(self, code=200):
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.end_headers()
            def do_OPTIONS(self):
                self._set_headers(200)
            def do_GET(self):
                if self.path == "/api/live-state":
                    self._set_headers(200)
                    self.wfile.write(json.dumps(daemon_ref.latest_state_payload).encode("utf-8"))
                else:
                    self._set_headers(404)
                    self.wfile.write(b'{"error":"Not Found"}')
            def do_POST(self):
                if self.path == "/api/command":
                    length = int(self.headers.get("Content-Length", 0))
                    raw = self.rfile.read(length).decode("utf-8") if length else "{}"
                    try:
                        cmd = json.loads(raw)
                        resp = daemon_ref.handle_ui_command(cmd)
                        self._set_headers(200)
                        self.wfile.write(json.dumps(resp).encode("utf-8"))
                    except Exception as e:
                        self._set_headers(400)
                        self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            def log_message(self, format, *args):
                pass  # Keep console clean (zero log spam)
        server = ThreadingHTTPServer(("127.0.0.1", port), LocalApiHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        print(f"[HTTP BRIDGE] Local Telemetry & Control API active on http://127.0.0.1:{port}/api/live-state")
    async def _ws_handler(self, websocket):
        """Handles bidirectional real-time WebSocket stream with Desktop UI."""
        self.connected_ws_clients.add(websocket)
        try:
            # Send immediate initial snapshot upon UI connection
            if self.latest_state_payload:
                await websocket.send(json.dumps(self.latest_state_payload))
            async for message in websocket:
                try:
                    cmd = json.loads(message)
                    ack = self.handle_ui_command(cmd)
                    await websocket.send(json.dumps({"ack": ack}))
                except Exception:
                    pass
        except Exception:
            pass
        finally:
            self.connected_ws_clients.discard(websocket)
    async def run_forever(self):
        """Main Async Daemon Loop."""
        self.start_http_fallback_server(port=8766)
        ws_server = None
        if WEBSOCKETS_AVAILABLE:
            ws_server = await websockets.serve(self._ws_handler, "127.0.0.1", 8765)
            print("[WEBSOCKET] Real-Time UI Stream active on ws://127.0.0.1:8765")
        else:
            print("[INFO] 'websockets' package not installed; running via Local HTTP Bridge (127.0.0.1:8766).")
        print(f"[SYSTEM READY] Detected: {self.hardware_report['os']['full_label']} | {self.hardware_report['cpu']['cpu_model']}")
        print("[RUNNING] AetherCore-AI Autonomous Thermal & Performance Engine started.\n")
        cycle_count = 0
        try:
            while self.is_running:
                payload = self.run_single_optimization_cycle()
                cycle_count += 1
                # Print concise status summary every 5 cycles (~7.5 sec)
                if cycle_count == 1 or cycle_count % 5 == 0:
                    m = payload["telemetry"]["metrics"]
                    d = payload["telemetry"]["diagnostics"]
                    p = payload["power_profile"]
                    print(
                        f"[{d['badge_label']}] Temp: {m['temp_celsius']}°C | "
                        f"CPU: {m['cpu_percent']}% (Cap: {p['cpu_max_cap_percent']}%) | "
                        f"RAM: {m['ram_percent']}% | Graph Pts: {len(payload['telemetry']['graph_series'])}"
                    )
                # Broadcast live JSON to any connected Desktop UI clients
                if self.connected_ws_clients:
                    msg = json.dumps(payload)
                    await asyncio.gather(
                        *[client.send(msg) for client in list(self.connected_ws_clients)],
                        return_exceptions=True,
                    )
                await asyncio.sleep(1.5)
        finally:
            if ws_server:
                ws_server.close()
            self.shutdown()
    def shutdown(self):
        """Safely restores default Windows CPU power settings before exiting."""
        self.is_running = False
        self.power_ctrl.restore_default_power_state()
        print("\n[SAFE SHUTDOWN] Windows CPU power limits restored to 100%. Goodbye!")
if __name__ == "__main__":
    service = AetherCoreDaemonService()
    def handle_sigint(sig, frame):
        service.is_running = False
    signal.signal(signal.SIGINT, handle_sigint)
    asyncio.run(service.run_forever())
