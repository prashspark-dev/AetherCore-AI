import React, { useState, useEffect, useCallback, useRef } from "react";
import MeshBackground from "./components/layout/MeshBackground";
import TitleBar from "./components/layout/TitleBar";
import Sidebar from "./components/layout/Sidebar";
import PermissionPrompt from "./components/onboarding/PermissionPrompt";
import LegalConsentModal from "./components/onboarding/LegalConsentModal";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ThermalGuardPage from "./pages/ThermalGuardPage";
import ProcessManagerPage from "./pages/ProcessManagerPage";
import HardwareInspectorPage from "./pages/HardwareInspectorPage";
import PermissionsPage from "./pages/PermissionsPage";
import BillingPage from "./pages/BillingPage";
import AccountSupportPage from "./pages/AccountSupportPage";
const LOCAL_ENGINE_HTTP = "http://127.0.0.1:8766";
const LOCAL_ENGINE_WS = "ws://127.0.0.1:8765";
/**
 * Root Application Shell for AetherCore-AI Desktop Client:
 * 1. Enforces First-Launch OS Permission Gate -> Legal Consent Gate -> Auth/MFA Flow.
 * 2. Maintains a resilient dual-channel real-time bridge (WebSocket + HTTP Fallback)
 *    with the Python AI & Hardware Optimization Engine.
 * 3. Orchestrates all 7 categorized Sidebar Pages over the 3-Color Overlapping Mesh.
 */
export default function App() {
  // Onboarding & Auth Persistent State
  const [permissionsConfirmed, setPermissionsConfirmed] = useState(() => {
    return localStorage.getItem("aethercore_perm_done") === "true";
  });
  const [hardwarePermissions, setHardwarePermissions] = useState(() => {
    try {
      const saved = localStorage.getItem("aethercore_permissions");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      readThermalSensors: true,
      adjustProcessPriority: true,
      managePowerPlans: true,
      ramOptimization: true,
      autoStartWithWindows: true,
    };
  });
  const [legalConsent, setLegalConsent] = useState(() => {
    try {
      const saved = localStorage.getItem("aethercore_legal");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem("aethercore_token") || "";
  });
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("aethercore_user");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [subscription, setSubscription] = useState(() => {
    try {
      const saved = localStorage.getItem("aethercore_sub");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      status: "trial",
      amountINR: 99,
      autoPayEnabled: false,
      daysRemaining: 7,
    };
  });
  // Active Navigation Tab ('dashboard' | 'thermal' | 'processes' | 'hardware' | 'permissions' | 'billing' | 'account')
  const [activePage, setActivePage] = useState("dashboard");
  // Real-Time Local Python AI Engine State
  const [liveData, setLiveData] = useState(null);
  const [engineConnected, setEngineConnected] = useState(false);
  const wsRef = useRef(null);
  // Send interactive control commands to Local Python AI Engine
  const sendEngineCommand = useCallback(async (commandObj) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(commandObj));
        return { status: "sent_ws" };
      }
      const res = await fetch(`${LOCAL_ENGINE_HTTP}/api/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandObj),
      });
      return await res.json();
    } catch {
      return { status: "offline" };
    }
  }, []);
  // Sync user permissions to Python engine whenever updated
  const handleUpdatePermissions = async (updatedPerms) => {
    setHardwarePermissions(updatedPerms);
    localStorage.setItem("aethercore_permissions", JSON.stringify(updatedPerms));
    await sendEngineCommand({
      type: "UPDATE_PERMISSIONS",
      permissions: updatedPerms,
    });
  };
  // Connect to Local Python AI Engine (WebSocket Primary + HTTP Polling Fallback)
  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;
    let wsReconnectTimer = null;
    const fetchHttpTelemetry = async () => {
      try {
        const res = await fetch(`${LOCAL_ENGINE_HTTP}/api/live-state`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && json.telemetry) {
            setLiveData(json);
            setEngineConnected(true);
          }
        } else if (isMounted) {
          setEngineConnected(false);
        }
      } catch {
        if (isMounted && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
          setEngineConnected(false);
        }
      }
    };
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(LOCAL_ENGINE_WS);
        wsRef.current = ws;
        ws.onopen = () => {
          if (!isMounted) return;
          setEngineConnected(true);
          // Push user's saved permissions immediately upon engine handshake
          ws.send(
            JSON.stringify({
              type: "UPDATE_PERMISSIONS",
              permissions: hardwarePermissions,
            })
          );
        };
        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && parsed.telemetry) {
              setLiveData(parsed);
              setEngineConnected(true);
            }
          } catch {}
        };
        ws.onclose = () => {
          if (!isMounted) return;
          wsRef.current = null;
          wsReconnectTimer = setTimeout(connectWebSocket, 3000);
        };
        ws.onerror = () => {
          ws.close();
        };
      } catch {}
    };
    // Start both WebSocket and resilient 1.5s HTTP polling fallback
    connectWebSocket();
    fetchHttpTelemetry();
    pollInterval = setInterval(fetchHttpTelemetry, 1500);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearTimeout(wsReconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [hardwarePermissions]);
  // Handlers for Onboarding & Authentication Transitions
  const handleConfirmPermissions = (selectedPerms) => {
    setHardwarePermissions(selectedPerms);
    setPermissionsConfirmed(true);
    localStorage.setItem("aethercore_permissions", JSON.stringify(selectedPerms));
    localStorage.setItem("aethercore_perm_done", "true");
  };
  const handleAcceptLegal = (consentObj) => {
    setLegalConsent(consentObj);
    localStorage.setItem("aethercore_legal", JSON.stringify(consentObj));
  };
  const handleAuthSuccess = ({ token, user: authUser, subscription: authSub }) => {
    setAuthToken(token);
    setUser(authUser);
    if (authSub) setSubscription(authSub);
    localStorage.setItem("aethercore_token", token);
    localStorage.setItem("aethercore_user", JSON.stringify(authUser));
    if (authSub) localStorage.setItem("aethercore_sub", JSON.stringify(authSub));
  };
  const handleLogout = () => {
    setAuthToken("");
    setUser(null);
    localStorage.removeItem("aethercore_token");
    localStorage.removeItem("aethercore_user");
  };
  const dynamicAccent = liveData?.telemetry?.diagnostics?.primary_hex || "#06B6D4";
  const currentTemp = liveData?.telemetry?.metrics?.temp_celsius ?? null;
  // GATE 1: First-Launch Windows OS Permission Prompt
  if (!permissionsConfirmed) {
    return (
      <>
        <MeshBackground dynamicAccentHex="#06B6D4" />
        <PermissionPrompt
          initialPermissions={hardwarePermissions}
          onConfirmPermissions={handleConfirmPermissions}
        />
      </>
    );
  }
  // GATE 2: Mandatory Legal Consent (Terms, Privacy Policy & Copyright)
  if (!legalConsent?.accepted) {
    return (
      <>
        <MeshBackground dynamicAccentHex="#818CF8" />
        <LegalConsentModal
          onAcceptLegal={handleAcceptLegal}
          onBackToPermissions={() => {
            setPermissionsConfirmed(false);
            localStorage.removeItem("aethercore_perm_done");
          }}
        />
      </>
    );
  }
  // GATE 3: Authentication, Google OAuth, MFA & 30-Day Account Recovery
  if (!authToken || !user) {
    return (
      <>
        <MeshBackground dynamicAccentHex="#06B6D4" />
        <AuthPage
          legalConsent={legalConsent}
          hardwarePermissions={hardwarePermissions}
          onAuthSuccess={handleAuthSuccess}
          onBackToLegal={() => {
            setLegalConsent(null);
            localStorage.removeItem("aethercore_legal");
          }}
        />
      </>
    );
  }
  // MAIN AUTHENTICATED DESKTOP APPLICATION WORKSPACE (ALL 7 PAGES)
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-100">
      <MeshBackground dynamicAccentHex={dynamicAccent} />
      {/* Custom Frameless Windows Title Bar */}
      <TitleBar
        engineConnected={engineConnected}
        diagnostics={liveData?.telemetry?.diagnostics}
        currentTemp={currentTemp}
        updateAvailable={false}
        onTriggerUpdate={() => {}}
      />
      {/* Body: Categorized Sidebar + Active Page Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activePage={activePage}
          onSelectPage={setActivePage}
          user={user}
          subscription={subscription}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {activePage === "dashboard" && (
              <DashboardPage
                liveData={liveData}
                engineConnected={engineConnected}
                onSendCommand={sendEngineCommand}
              />
            )}
            {activePage === "thermal" && (
              <ThermalGuardPage
                liveData={liveData}
                engineConnected={engineConnected}
                onSendCommand={sendEngineCommand}
              />
            )}
            {activePage === "processes" && (
              <ProcessManagerPage
                liveData={liveData}
                engineConnected={engineConnected}
                onSendCommand={sendEngineCommand}
              />
            )}
            {activePage === "hardware" && <HardwareInspectorPage liveData={liveData} />}
            {activePage === "permissions" && (
              <PermissionsPage
                permissions={hardwarePermissions}
                onUpdatePermissions={handleUpdatePermissions}
                authToken={authToken}
                legalConsent={legalConsent}
              />
            )}
            {activePage === "billing" && (
              <BillingPage
                subscription={subscription}
                authToken={authToken}
                onSubscriptionUpdated={(updatedSub) => {
                  setSubscription(updatedSub);
                  localStorage.setItem("aethercore_sub", JSON.stringify(updatedSub));
                }}
              />
            )}
            {activePage === "account" && (
              <AccountSupportPage
                user={user}
                authToken={authToken}
                liveData={liveData}
                onUserUpdated={(updatedUser) => {
                  setUser(updatedUser);
                  localStorage.setItem("aethercore_user", JSON.stringify(updatedUser));
                }}
                onAccountDeactivated={handleLogout}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}