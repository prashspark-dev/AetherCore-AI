const express = require("express");
const passport = require("passport");
const router = express.Router();
const {
  registerUser,
  verifyEmailOtp,
  resendOtp,
  loginUser,
  verifyMfaLogin,
  setupMfa,
  confirmEnableMfa,
  disableMfa,
  forgotPassword,
  resetPassword,
  googleAuthCallback,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authBruteForceLimiter, otpAndEmailLimiter } = require("../middleware/securityMiddleware");
// Public Auth Routes (Protected by Brute-Force & OTP Rate Limiters)
router.post("/register", authBruteForceLimiter, registerUser);
router.post("/verify-email", authBruteForceLimiter, verifyEmailOtp);
router.post("/resend-otp", otpAndEmailLimiter, resendOtp);
router.post("/login", authBruteForceLimiter, loginUser);
router.post("/mfa/verify-login", authBruteForceLimiter, verifyMfaLogin);
router.post("/forgot-password", otpAndEmailLimiter, forgotPassword);
router.post("/reset-password", authBruteForceLimiter, resetPassword);
// Google OAuth 2.0 Routes ("Continue with Google")
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes("your_google")) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured yet. Add GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET in .env.",
    });
  }
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
});
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/api/auth/google/failed" }),
  googleAuthCallback
);
router.get("/google/failed", (req, res) => {
  const clientUrl = process.env.CLIENT_APP_URL || "http://localhost:5173";
  res.redirect(`${clientUrl}/auth/callback?status=google_auth_failed`);
});
// Protected Account & MFA Management Routes
router.get("/me", protect, getMe);
router.post("/mfa/setup", protect, setupMfa);
router.post("/mfa/confirm", protect, confirmEnableMfa);
router.post("/mfa/disable", protect, disableMfa);
module.exports = router;
