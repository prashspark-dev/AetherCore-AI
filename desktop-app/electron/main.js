const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");
let mainWindow = null;
let tray = null;
let pythonEngineProcess = null;
let isQuitting = false;
const isDev = !app.isPackaged;
const DEV_SERVER_URL = "http://localhost:5173";
// Enforce Single-Instance Lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
function checkEngineAlreadyRunning() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:8766/api/live-state", (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}
async function ensurePythonEngineStarted() {
  const alreadyActive = await checkEngineAlreadyRunning();
  if (alreadyActive) {
    console.log("[ELECTRON] Local AI Engine already active on Port 8766.");
    return;
  }
  if (isDev) {
    const engineDir = path.resolve(__dirname, "../../ai-engine");
    const scriptPath = path.join(engineDir, "main_service.py");
    if (fs.existsSync(scriptPath)) {
      console.log("[ELECTRON] Spawning Python AI Engine from:", scriptPath);
      pythonEngineProcess = spawn("python", ["main_service.py"], {
        cwd: engineDir,
        windowsHide: true,
        stdio: "ignore",
      });
      pythonEngineProcess.on("exit", (code) => {
        console.log(`[ELECTRON] Python AI Engine exited with code ${code}`);
        pythonEngineProcess = null;
      });
    }
  } else {
    const bundledExe = path.join(process.resourcesPath, "ai-engine", "aethercore-engine.exe");
    if (fs.existsSync(bundledExe)) {
      pythonEngineProcess = spawn(bundledExe, [], {
        windowsHide: true,
        stdio: "ignore",
      });
    }
  }
}
/**
 * Generates a crisp 32x32 High-DPI Cyber-Cyan & Electric-Indigo RGBA icon
 * directly in memory so the Windows System Tray icon is ALWAYS vivid and visible.
 */
function createTrayIcon() {
  const brandIconPath = path.join(__dirname, "../public/icons/icon.png");
  return nativeImage.createFromPath(brandIconPath).resize({ width: 20, height: 20 });
}
function setupSystemTray() {
  if (tray) return;
  tray = new Tray(createTrayIcon());
  tray.setToolTip("AetherCore-AI • Autonomous Thermal & Performance Guard");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open AetherCore-AI Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "Status: Thermal & RAM Guard Active",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Quit AetherCore-AI Completely",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });
}
function getSmartRestoredBounds() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const targetW = Math.max(960, Math.round(screenW * 0.78));
  const targetH = Math.max(620, Math.round(screenH * 0.80));
  const x = Math.round((screenW - targetW) / 2);
  const y = Math.round((screenH - targetH) / 2);
  return { x, y, width: targetW, height: targetH };
}
function createMainWindow() {
  const initialBounds = getSmartRestoredBounds();
  mainWindow = new BrowserWindow({
    icon: require("path").join(__dirname, "../public/icon.png"),
    maximizable: true,
    minimizable: true,
    resizable: true,
    x: initialBounds.x,
    y: initialBounds.y,
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: 920,
    minHeight: 600,
    frame: false,
    icon: path.join(__dirname, "../public/icons/icon.png"),
    backgroundColor: "#060913",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.once("ready-to-show", () => {
    // Open cleanly maximized on first launch so every new user gets full view immediately
    mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost:5000") || url.startsWith("https://accounts.google.com")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}
// IPC Handlers for Custom TitleBar & Windows Startup Integration
ipcMain.on("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on("window:maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    // Explicitly snap to clean 78% centered window size so Restore Down is always noticeable & crisp
    mainWindow.setBounds(getSmartRestoredBounds(), true);
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on("window:hide-to-tray", () => {
  if (mainWindow) mainWindow.hide();
});
ipcMain.on("app:set-autostart", (_event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      args: ["--background-tray"],
    });
  } catch (err) {
    console.warn("[ELECTRON] Could not update login item settings:", err.message);
  }
});
ipcMain.handle("app:get-info", () => {
  return {
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
  };
});
app.whenReady().then(async () => {
  await ensurePythonEngineStarted();
  setupSystemTray();
  createMainWindow();
});
app.on("before-quit", () => {
  isQuitting = true;
  if (pythonEngineProcess && !pythonEngineProcess.killed) {
    try {
      pythonEngineProcess.kill("SIGINT");
    } catch {}
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

// === AETHERCORE_V101_UX_PATCH ===
(() => {
  const { app, BrowserWindow, ipcMain } = require("electron");
  const path = require("path");
  const brandIcon = path.join(__dirname, "../public/icon.png");
  const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
  if (!ipcMain.listenerCount("aether-win-minimize")) {
    ipcMain.on("aether-win-minimize", (e) => {
      const w = BrowserWindow.fromWebContents(e.sender);
      if (w) w.minimize();
    });
    ipcMain.on("aether-win-maximize", (e) => {
      const w = BrowserWindow.fromWebContents(e.sender);
      if (!w) return;
      if (w.isMaximized()) w.unmaximize();
      else w.maximize();
    });
    ipcMain.on("aether-win-close", (e) => {
      const w = BrowserWindow.fromWebContents(e.sender);
      if (w) w.close();
    });
  }
  app.on("browser-window-created", (_event, win) => {
    if (win._isOAuthPopup) return;
    try {
      win.setIcon(brandIcon);
      win.setMaximizable(true);
      win.setMinimizable(true);
      win.setResizable(true);
    } catch (_) {}
    const openCenteredOAuth = (oauthUrl) => {
      const popup = new BrowserWindow({
        width: 500,
        height: 660,
        center: true,
        parent: win,
        modal: true,
        autoHideMenuBar: true,
        backgroundColor: "#07090F",
        title: "Sign in with Google — AetherCore-AI",
        icon: brandIcon,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      popup._isOAuthPopup = true;
      popup.webContents.setUserAgent(chromeUA);
      popup.loadURL(oauthUrl, { userAgent: chromeUA });
      let completed = false;
      const finishWithToken = async (targetUrl) => {
        if (completed || !targetUrl) return false;
        try {
          const parsed = new URL(targetUrl);
          const token = parsed.searchParams.get("token");
          if (token) {
            completed = true;
            const safeToken = JSON.stringify(token);
            const safeKey = JSON.stringify("aethercore_token");
            await win.webContents.executeJavaScript(`
              localStorage.setItem(${safeKey}, ${safeToken});
              localStorage.setItem("token", ${safeToken});
              localStorage.setItem("aethercore_token", ${safeToken});
            `);
            const baseAppUrl = win.webContents.getURL().split("?")[0].split("#")[0];
            win.loadURL(`${baseAppUrl}?token=${encodeURIComponent(token)}`);
            if (!popup.isDestroyed()) popup.close();
            return true;
          }
        } catch (_) {}
        return false;
      };
      popup.webContents.on("will-redirect", (ev, url) => {
        finishWithToken(url).then((ok) => { if (ok) ev.preventDefault(); });
      });
      popup.webContents.on("will-navigate", (ev, url) => {
        finishWithToken(url).then((ok) => { if (ok) ev.preventDefault(); });
      });
      popup.webContents.on("did-navigate", (_ev, url) => {
        finishWithToken(url);
      });
      popup.webContents.on("did-fail-load", (_ev, _code, _desc, validatedURL) => {
        finishWithToken(validatedURL);
      });
    };
    win.webContents.on("will-navigate", (ev, navUrl) => {
      if (navUrl.includes("/api/auth/google") || navUrl.includes("accounts.google.com")) {
        ev.preventDefault();
        openCenteredOAuth(navUrl);
      }
    });
    win.webContents.setWindowOpenHandler(({ url: navUrl }) => {
      if (navUrl.includes("/api/auth/google") || navUrl.includes("accounts.google.com")) {
        openCenteredOAuth(navUrl);
        return { action: "deny" };
      }
      return { action: "allow" };
    });
  });
})();
