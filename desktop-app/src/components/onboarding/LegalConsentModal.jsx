import React, { useState } from "react";
import {
  FileText,
  Shield,
  Copyright,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
  Scale,
} from "lucide-react";
/**
 * Mandatory Legal Compliance Gate (Terms & Conditions, Privacy Policy, Copyright Notice).
 * Enforces an explicit user checkbox before allowing registration or software usage.
 */
export default function LegalConsentModal({ onAcceptLegal, onBackToPermissions }) {
  const [activeTab, setActiveTab] = useState("terms"); // 'terms' | 'privacy' | 'copyright'
  const [isChecked, setIsChecked] = useState(false);
  const tabs = [
    { id: "terms", label: "Terms & Conditions", icon: FileText },
    { id: "privacy", label: "Privacy & Data Security", icon: Shield },
    { id: "copyright", label: "Copyright & License", icon: Copyright },
  ];
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 overflow-y-auto">
      <div className="glass-card w-full max-w-3xl rounded-3xl p-8 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3.5 pb-5 border-b border-white/10">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-300">
              Step 2 of 2 • Legal & Privacy Agreement
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Terms, Privacy Policy & Copyright Notice
            </h1>
          </div>
        </div>
        {/* Navigation Tabs for Legal Sections */}
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  active
                    ? "bg-indigo-500/25 border-indigo-400/50 text-white shadow-sm"
                    : "bg-slate-900/50 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4 text-cyan-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Scrollable Legal Document Box */}
        <div className="mt-4 h-64 overflow-y-auto rounded-2xl bg-slate-950/70 border border-white/10 p-5 text-xs text-slate-300 space-y-4 leading-relaxed">
          {activeTab === "terms" && (
            <>
              <h3 className="text-sm font-bold text-white">1. End-User Software License & Service Terms (v1.0-2026)</h3>
              <p>
                Welcome to <strong>AetherCore-AI</strong>. By installing or operating this software on Windows 10,
                Windows 11, or compatible Windows systems, you are granted a personal, non-transferable license to
                optimize local hardware thermals, process priorities, and system responsiveness.
              </p>
              <h4 className="text-xs font-semibold text-cyan-300">2. Safe System Operation Guarantee</h4>
              <p>
                AetherCore-AI operates exclusively through documented Microsoft Windows APIs (WMI, Win32 Process Priority,
                and Powercfg). It never modifies BIOS firmware, never alters CPU core voltages (no unsafe undervolting/overclocking),
                and never terminates active foreground applications.
              </p>
              <h4 className="text-xs font-semibold text-cyan-300">3. Free Trial & ₹99/Month Subscription</h4>
              <p>
                New accounts receive a full-featured <strong>7-Day Free Trial</strong>. Thereafter, continued cloud AI
                sync and pro optimization require a <strong>₹99/month</strong> subscription via UPI. You retain full
                control over <strong>UPI AutoPay (ON/OFF)</strong> and will never be charged automatically if AutoPay is
                switched OFF.
              </p>
            </>
          )}
          {activeTab === "privacy" && (
            <>
              <h3 className="text-sm font-bold text-white">1. Zero Personal File Access Policy</h3>
              <p>
                Your privacy is non-negotiable. AetherCore-AI <strong>NEVER scans, reads, indexes, or uploads</strong>{" "}
                your personal documents, photos, browser history, passwords, or keystrokes.
              </p>
              <h4 className="text-xs font-semibold text-cyan-300">2. Cloud Synced Telemetry & Encryption</h4>
              <p>
                Only your account profile, subscription status, anonymized hardware fingerprint (SHA-256 hash), OS build
                version, and aggregate thermal reduction metrics are synced over TLS 1.3 encrypted channels to MongoDB
                Atlas cloud servers.
              </p>
              <h4 className="text-xs font-semibold text-cyan-300">3. 30-Day Account Deactivation & Permanent Erasure</h4>
              <p>
                If you choose to delete your account, it enters a <strong>30-day deactivation safety window</strong>{" "}
                (pausing any billing immediately). You may log back in within 30 days to restore everything, or let our
                automated compliance worker permanently purge all records after Day 30.
              </p>
            </>
          )}
          {activeTab === "copyright" && (
            <>
              <h3 className="text-sm font-bold text-white">
                Copyright © 2026 AetherCore-AI. All Rights Reserved.
              </h3>
              <p>
                The AetherCore-AI desktop application, Reinforcement Learning thermal policy weights, UI mesh design,
                background optimization engine, and cloud APIs are protected under international copyright and intellectual
                property laws.
              </p>
              <h4 className="text-xs font-semibold text-cyan-300">Restrictions on Redistribution</h4>
              <p>
                Decompiling, reverse-engineering, redistributing modified binaries, or reselling license keys without
                written authorization from AetherCore-AI is strictly prohibited. Official software updates are delivered
                exclusively via cryptographically signed OTA releases.
              </p>
            </>
          )}
        </div>
        {/* Mandatory Agreement Checkbox */}
        <div
          onClick={() => setIsChecked((prev) => !prev)}
          className={`mt-5 flex items-start gap-3.5 rounded-2xl p-4 border cursor-pointer transition-all select-none ${
            isChecked
              ? "bg-cyan-500/15 border-cyan-400/50 text-white"
              : "bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/25"
          }`}
        >
          <button type="button" className="mt-0.5 text-cyan-400 focus:outline-none">
            {isChecked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-500" />}
          </button>
          <span className="text-xs sm:text-sm font-medium leading-snug">
            I have read and agree to the <strong>Terms & Conditions</strong>, <strong>Privacy Policy</strong>, and{" "}
            <strong>Copyright & License Agreement</strong> of AetherCore-AI.
          </span>
        </div>
        {/* Bottom Action Buttons */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToPermissions}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Permissions</span>
          </button>
          <button
            type="button"
            disabled={!isChecked}
            onClick={() => onAcceptLegal({ accepted: true, policyVersion: "v1.0-2026" })}
            className="btn-primary"
          >
            <span>Accept & Continue to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}