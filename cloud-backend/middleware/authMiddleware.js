const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
// ============================================================================
// 1. PROTECT ROUTE MIDDLEWARE (JWT Verification + Account Status Check)
// ============================================================================
const protect = async (req, res, next) => {
  try {
    let token;
    // Authorization header se 'Bearer <token>' extract karna
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        code: "NO_TOKEN",
        message: "Authentication required. Please log in to AetherCore-AI.",
      });
    }
    // Token verify karna
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Database se fresh user record nikalna
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "Account no longer exists.",
      });
    }
    // Check 1: Kya user ne Legal Terms & Privacy accept kiye hain?
    if (!user.legalConsent || !user.legalConsent.accepted) {
      return res.status(403).json({
        success: false,
        code: "LEGAL_CONSENT_REQUIRED",
        message: "Please accept the Terms & Conditions, Privacy Policy, and Copyright Policy to continue.",
      });
    }
    // Check 2: Kya account 30-day soft-delete (deactivated) state mein hai?
    if (user.accountStatus === "deactivated") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DEACTIVATED",
        message: "Your account is currently deactivated. Reactivate it to access cloud features.",
        scheduledPermanentDeletionAt: user.scheduledPermanentDeletionAt,
      });
    }
    // Request object mein user attach karna taaki aage ke controllers use kar sakein
    req.user = user;
    next();
  } catch (error) {
    const isExpired = error.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      message: isExpired
        ? "Session expired. Please log in again."
        : "Invalid security token. Authentication failed.",
    });
  }
};
// ============================================================================
// 2. SUBSCRIPTION / TRIAL GUARD MIDDLEWARE (₹99/mo Plan & 7-Day Trial Check)
// Un routes par lagaya jayega jo sirf active trial ya paid users ke liye hain.
// ============================================================================
const requireActivePlan = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      return res.status(402).json({
        success: false,
        code: "SUBSCRIPTION_REQUIRED",
        message: "No active subscription or trial found. Please activate your ₹99/month plan.",
      });
    }
    const now = new Date();
    // Case A: 7-Day Free Trial check
    if (subscription.status === "trial") {
      if (subscription.trialEndsAt && now <= subscription.trialEndsAt) {
        req.subscription = subscription;
        return next();
      } else {
        // Trial expire ho gaya hai -> status update karein
        subscription.status = "expired";
        await subscription.save();
        return res.status(402).json({
          success: false,
          code: "TRIAL_EXPIRED",
          message: "Your 7-day free trial has ended. Subscribe for ₹99/month via UPI to continue.",
        });
      }
    }
    // Case B: Paid ₹99/Month Subscription check
    if (subscription.status === "active") {
      if (subscription.currentPeriodEnd && now <= subscription.currentPeriodEnd) {
        req.subscription = subscription;
        return next();
      } else {
        subscription.status = "expired";
        await subscription.save();
        return res.status(402).json({
          success: false,
          code: "PLAN_EXPIRED",
          message: "Your monthly ₹99 plan has expired. Renew via UPI to unlock AI optimization.",
        });
      }
    }
    // Case C: Cancelled / Paused / Expired
    return res.status(402).json({
      success: false,
      code: "PLAN_INACTIVE",
      message: "Subscription is inactive. Please renew your ₹99/month plan.",
    });
  } catch (error) {
    console.error("[SUBSCRIPTION GUARD ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error verifying subscription status.",
    });
  }
};
module.exports = {
  protect,
  requireActivePlan,
};
