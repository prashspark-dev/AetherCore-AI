const crypto = require("crypto");
const Razorpay = require("razorpay");
const Subscription = require("../models/Subscription");
const { sendEmail } = require("../services/emailService");
// Safe Razorpay Initializer (Prevents crash if .env keys are not yet added)
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes("xxxxxxxx")) {
    return null;
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};
// 1. GET CURRENT SUBSCRIPTION, AUTOPAY STATE & INVOICE HISTORY
const getBillingStatus = async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      subscription = await Subscription.create({
        user: req.user._id,
        status: "trial",
        autoPayEnabled: false,
      });
    }
    const now = new Date();
    const expiryDate =
      subscription.status === "trial" ? subscription.trialEndsAt : subscription.currentPeriodEnd;
    const msRemaining = expiryDate ? new Date(expiryDate) - now : 0;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    return res.status(200).json({
      success: true,
      billing: {
        planName: subscription.planName,
        amountINR: subscription.amountINR,
        status: subscription.status,
        autoPayEnabled: subscription.autoPayEnabled,
        upiId: subscription.upiId,
        daysRemaining,
        currentPeriodEnd: expiryDate,
        paymentHistory: subscription.paymentHistory.sort(
          (a, b) => new Date(b.paidAt) - new Date(a.paidAt)
        ),
      },
    });
  } catch (error) {
    console.error("[GET BILLING STATUS ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve billing and subscription details.",
    });
  }
};
// 2. CREATE ₹99 UPI CHECKOUT SESSION (Manual One-Time UPI vs. UPI AutoPay)
const createCheckoutSession = async (req, res) => {
  try {
    const { enableAutoPay, upiId } = req.body;
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        code: "PAYMENT_GATEWAY_NOT_CONFIGURED",
        message: "Razorpay API keys are not configured in .env yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }
    const subscription = await Subscription.findOne({ user: req.user._id });
    if (upiId) {
      subscription.upiId = String(upiId).trim();
      await subscription.save();
    }
    if (enableAutoPay === true) {
      if (!process.env.RAZORPAY_PLAN_ID || process.env.RAZORPAY_PLAN_ID.includes("plan_99")) {
        return res.status(503).json({
          success: false,
          message: "RAZORPAY_PLAN_ID for ₹99/month AutoPay is not configured in .env.",
        });
      }
      const rzpSubscription = await razorpay.subscriptions.create({
        plan_id: process.env.RAZORPAY_PLAN_ID,
        total_count: 60,
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId: req.user._id.toString(),
          userEmail: req.user.email,
          mode: "UPI_AUTOPAY_99",
        },
      });
      subscription.razorpaySubscriptionId = rzpSubscription.id;
      await subscription.save();
      return res.status(200).json({
        success: true,
        checkoutMode: "subscription_autopay",
        keyId: process.env.RAZORPAY_KEY_ID,
        subscriptionId: rzpSubscription.id,
        amountINR: 99,
        currency: "INR",
        userPrefill: { name: req.user.name, email: req.user.email },
        message: "UPI AutoPay mandate session created for ₹99/month.",
      });
    }
    const order = await razorpay.orders.create({
      amount: 99 * 100, // 9900 paise = ₹99
      currency: "INR",
      receipt: `rcpt_${req.user._id.toString().slice(-8)}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        userEmail: req.user.email,
        mode: "MANUAL_UPI_99",
      },
    });
    return res.status(200).json({
      success: true,
      checkoutMode: "one_time_manual",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      amountINR: 99,
      currency: "INR",
      userPrefill: { name: req.user.name, email: req.user.email },
      message: "One-time ₹99 UPI order created (AutoPay is OFF).",
    });
  } catch (error) {
    console.error("[CREATE CHECKOUT ERROR]:", error);
    return res.status(500).json({
      success: false,
      message: "Could not initialize UPI payment session. Please try again.",
    });
  }
};
// 3. VERIFY PAYMENT CRYPTOGRAPHIC SIGNATURE & ACTIVATE PRO PLAN (30 DAYS)
const verifyPaymentSignature = async (req, res) => {
  try {
    const {
      checkoutMode,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      razorpay_signature,
      upiId,
    } = req.body;
    if (!razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay payment ID or cryptographic signature.",
      });
    }
    const secret = process.env.RAZORPAY_KEY_SECRET;
    let generatedSignature = "";
    if (checkoutMode === "subscription_autopay" && razorpay_subscription_id) {
      generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
        .digest("hex");
    } else if (razorpay_order_id) {
      generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment verification payload.",
      });
    }
    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        code: "SIGNATURE_MISMATCH",
        message: "Payment verification failed! Invalid cryptographic signature.",
      });
    }
    const subscription = await Subscription.findOne({ user: req.user._id });
    const now = new Date();
    const baseDate =
      subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > now
        ? new Date(subscription.currentPeriodEnd)
        : now;
    const newPeriodEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    subscription.status = "active";
    subscription.autoPayEnabled = checkoutMode === "subscription_autopay";
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = newPeriodEnd;
    if (upiId) subscription.upiId = String(upiId).trim();
    if (razorpay_subscription_id) subscription.razorpaySubscriptionId = razorpay_subscription_id;
    subscription.paymentHistory.push({
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id || razorpay_subscription_id,
      amount: 99,
      method: "UPI",
      status: "success",
      paidAt: now,
    });
    await subscription.save();
    await sendEmail({
      to: req.user.email,
      subject: "Payment Receipt: ₹99 AetherCore-AI Pro Activated",
      title: "Subscription Activated Successfully",
      bodyHtml: `
        <p>Hello <strong>${req.user.name}</strong>,</p>
        <p>Your payment of <strong>₹99.00 via UPI</strong> has been verified.</p>
        <ul>
          <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
          <li><strong>Valid Until:</strong> ${newPeriodEnd.toDateString()}</li>
          <li><strong>UPI AutoPay Status:</strong> ${subscription.autoPayEnabled ? "ON (Auto-renews monthly)" : "OFF (Manual renewal)"}</li>
        </ul>
      `,
    });
    return res.status(200).json({
      success: true,
      message: "₹99 UPI payment verified! AetherCore-AI Pro is active for 30 days.",
      subscription,
    });
  } catch (error) {
    console.error("[VERIFY PAYMENT ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Server error while verifying payment." });
  }
};
// 4. USER-CONTROLLED AUTOPAY ON/OFF SWITCH
const toggleAutoPay = async (req, res) => {
  try {
    const { enableAutoPay } = req.body;
    if (typeof enableAutoPay !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Please specify enableAutoPay as true or false.",
      });
    }
    const subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription record not found." });
    }
    const razorpay = getRazorpayInstance();
    if (enableAutoPay === false) {
      if (razorpay && subscription.razorpaySubscriptionId) {
        try {
          await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId, 1);
        } catch (rzpErr) {
          console.warn("[RAZORPAY CANCEL WARNING]:", rzpErr.message);
        }
      }
      subscription.autoPayEnabled = false;
      subscription.razorpaySubscriptionId = null;
      await subscription.save();
      await sendEmail({
        to: req.user.email,
        subject: "UPI AutoPay Turned OFF - AetherCore-AI",
        title: "UPI AutoPay Disabled",
        bodyHtml: `<p>Hello <strong>${req.user.name}</strong>,</p><p><strong>UPI AutoPay has been turned OFF</strong>. No automatic deductions will occur next month.</p>`,
      });
      return res.status(200).json({
        success: true,
        autoPayEnabled: false,
        message: "UPI AutoPay turned OFF. No automatic deductions will occur next month.",
      });
    }
    return res.status(200).json({
      success: true,
      requiresMandateAuthorization: true,
      message: "To turn UPI AutoPay ON, please authorize the ₹99/month UPI mandate in the checkout popup.",
    });
  } catch (error) {
    console.error("[TOGGLE AUTOPAY ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update UPI AutoPay settings." });
  }
};
// 5. RAZORPAY SERVER-TO-SERVER WEBHOOK
const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (expectedSignature !== signature) {
        return res.status(400).json({ success: false, message: "Invalid webhook signature." });
      }
    }
    const event = req.body.event;
    const payload = req.body.payload;
    if (event === "subscription.charged") {
      const rzpSubId = payload.subscription?.entity?.id;
      const paymentEntity = payload.payment?.entity;
      const subscription = await Subscription.findOne({ razorpaySubscriptionId: rzpSubId }).populate("user");
      if (subscription) {
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        subscription.status = "active";
        subscription.autoPayEnabled = true;
        subscription.currentPeriodStart = now;
        subscription.currentPeriodEnd = nextMonth;
        subscription.paymentHistory.push({
          razorpayPaymentId: paymentEntity?.id || `auto_${Date.now()}`,
          razorpayOrderId: rzpSubId,
          amount: 99,
          method: "UPI AutoPay",
          status: "success",
          paidAt: now,
        });
        await subscription.save();
      }
    }
    if (event === "subscription.halted" || event === "payment.failed") {
      const rzpSubId = payload.subscription?.entity?.id;
      if (rzpSubId) {
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: rzpSubId });
        if (subscription) {
          subscription.status = "paused";
          await subscription.save();
        }
      }
    }
    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("[RAZORPAY WEBHOOK ERROR]:", error.message);
    return res.status(500).json({ status: "webhook_error" });
  }
};
module.exports = {
  getBillingStatus,
  createCheckoutSession,
  verifyPaymentSignature,
  toggleAutoPay,
  handleRazorpayWebhook,
};
