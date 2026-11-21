const express = require("express");
const router = express.Router();
const {
  getBillingStatus,
  createCheckoutSession,
  verifyPaymentSignature,
  toggleAutoPay,
  handleRazorpayWebhook,
} = require("../controllers/billingController");
const { protect } = require("../middleware/authMiddleware");
// Razorpay Server-to-Server Webhook (Public)
router.post("/webhook", handleRazorpayWebhook);
// Protected ₹99/Month UPI Payment & AutoPay ON/OFF Routes
router.get("/status", protect, getBillingStatus);
router.post("/create-checkout", protect, createCheckoutSession);
router.post("/verify-payment", protect, verifyPaymentSignature);
router.post("/toggle-autopay", protect, toggleAutoPay);
module.exports = router;
