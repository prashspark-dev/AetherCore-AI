import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
ReactDOM.
function UniversalWindowControls() {
  if (typeof window === "undefined" || !window.aetherWinControls) return null;
  return (
    <div
      style={{ WebkitAppRegion: "no-drag", zIndex: 99999 }}
      className="fixed top-2 right-2 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/70 backdrop-blur-md px-2 py-1 rounded-lg shadow-lg"
    >
      <button
        onClick={() => window.aetherWinControls.minimize()}
        title="Minimize"
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-300 text-xs font-bold"
      >
        &#8211;
      </button>
      <button
        onClick={() => window.aetherWinControls.toggleMaximize()}
        title="Maximize / Restore"
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-cyan-600/40 text-cyan-300 text-xs font-bold"
      >
        &#9633;
      </button>
      <button
        onClick={() => window.aetherWinControls.close()}
        title="Close"
        className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-600 text-slate-200 text-xs font-bold"
      >
        &#10005;
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <><UniversalWindowControls /><App /></>
  </React.StrictMode>
);
