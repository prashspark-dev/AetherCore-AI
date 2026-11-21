const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
// ============================================================================
// 1. GLOBAL API RATE LIMITER (DDoS & API Abuse Protection)
// Ek IP address se 15 minute mein maximum 150 requests allow hongi.
// ============================================================================
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests from this device. Please wait 15 minutes and try again.",
  },
});
// ============================================================================
// 2. STRICT AUTH BRUTE-FORCE LIMITER (Login & Password Protection)
// Agar koi galat password daal kar account hack karne ki koshish kare,
// to 15 minute mein 8 failed attempts ke baad IP temporarily block ho jayegi.
// ============================================================================
const authBruteForceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  skipSuccessfulRequests: true, // Sahi login count nahi hoga, sirf failed attempts count honge
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "AUTH_LOCKED_TEMPORARILY",
    message: "Multiple failed login attempts detected. For your security, try again after 15 minutes.",
  },
});
// ============================================================================
// 3. OTP & SUPPORT EMAIL SPAM LIMITER
// Taaki koi baar-baar OTP ya Support mail bhej kar email server ko overload na kare.
// ============================================================================
const otpAndEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "EMAIL_QUOTA_EXCEEDED",
    message: "Maximum OTP/email limit reached for this hour. Please try again later.",
  },
});
// ============================================================================
// 4. NOSQL INJECTION & PAYLOAD SANITIZER
// Incoming req.body, req.query aur req.params se '$' aur '.' operators hatata hai.
// ============================================================================
const sanitizeInputs = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY ALERT] Sanitized potential NoSQL injection attempt in '${key}' from IP: ${req.ip}`);
  },
});
module.exports = {
  globalApiLimiter,
  authBruteForceLimiter,
  otpAndEmailLimiter,
  sanitizeInputs,
};
