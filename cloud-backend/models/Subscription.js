const mongoose = require("mongoose");
// ============================================================================
// SUBSCRIPTION SCHEMA: ₹99/Month Plan, UPI Payment & AutoPay ON/OFF Control
// ============================================================================
const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    planName: {
      type: String,
      default: "AetherCore Pro Monthly",
    },
    amountINR: {
      type: Number,
      default: 99, // Affordable ₹99/month pricing
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["trial", "active", "paused", "expired", "cancelled"],
      default: "trial",
    },
    // User-Controlled UPI AutoPay Toggle (ON = Auto-renew, OFF = Manual renewal)
    autoPayEnabled: {
      type: Boolean,
      default: false,
    },
    upiId: {
      type: String,
      default: "",
    },
    razorpayCustomerId: {
      type: String,
      default: null,
    },
    razorpaySubscriptionId: {
      type: String,
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-Day Free Trial
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    // Billing & Invoice History
    paymentHistory: [
      {
        razorpayPaymentId: String,
        razorpayOrderId: String,
        amount: Number,
        method: { type: String, default: "UPI" },
        status: { type: String, enum: ["success", "failed", "refunded"], default: "success" },
        paidAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
module.exports = mongoose.model("Subscription", subscriptionSchema);
