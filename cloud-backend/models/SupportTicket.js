const mongoose = require("mongoose");
// ============================================================================
// SUPPORT TICKET SCHEMA: Direct User-to-Support Email & Issue Tracking
// ============================================================================
const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      default: () => `AC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["Thermal & Performance", "UPI Billing & AutoPay", "Account & MFA Security", "Bug Report / Feature"],
      default: "Thermal & Performance",
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      maxlength: 2000,
    },
    systemSnapshot: {
      osVersion: String,
      cpuModel: String,
      appVersion: String,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("SupportTicket", supportTicketSchema);
