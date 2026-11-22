const { contextBridge, ipcRenderer } = require("electron");
/**
 * Secure Preload Bridge:
 * Exposes strictly whitelisted native window, tray, and Windows auto-start
 * controls to the React UI without exposing raw Node.js primitives.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:hide-to-tray"),
  setAutoStart: (enabled) => ipcRenderer.send("app:set-autostart", !!enabled),
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
});
try {
  const { contextBridge, ipcRenderer } = require("electron");
  contextBridge.exposeInMainWorld("aetherWinControls", {
    minimize: () => ipcRenderer.send("aether-win-minimize"),
    toggleMaximize: () => ipcRenderer.send("aether-win-maximize"),
    close: () => ipcRenderer.send("aether-win-close")
  });
} catch (_) {}
