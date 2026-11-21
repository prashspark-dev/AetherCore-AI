const mongoose = require("mongoose");
// ============================================================================
// DEVICE TELEMETRY SCHEMA: Universal Windows OS, CPU Gen & Thermal Savings
// ============================================================================
const deviceTelemetrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceFingerprint: {
      type: String,
      required: true, // Hardware UUID hash (privacy-safe)
    },
    deviceName: {
      type: String,
      default: "Windows PC",
    },
    osVersion: {
      type: String, // e.g., "Windows 11 Pro (Build 26100)" or "Windows 10" or "Windows 12"
      default: "Unknown Windows",
    },
    architecture: {
      type: String, // e.g., "64-bit (x64)" or "ARM64"
      default: "64-bit (x64)",
    },
    cpuModel: {
      type: String, // e.g., "12th Gen Intel Core i5-12450H"
      default: "Unknown CPU",
    },
    ramTotalGB: {
      type: Number,
      default: 8,
    },
    // Performance & Cooling Impact Metrics (Shown on Dashboard)
    avgTempReductionCelsius: {
      type: Number,
      default: 0,
    },
    totalOptimizedSessions: {
      type: Number,
      default: 0,
    },
    appVersion: {
      type: String,
      default: "1.0.0",
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
deviceTelemetrySchema.index({ user: 1, deviceFingerprint: 1 }, { unique: true });
module.exports = mongoose.model("DeviceTelemetry", deviceTelemetrySchema);
