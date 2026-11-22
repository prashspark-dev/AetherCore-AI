const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { sendOtpEmail, sendEmail } = require("../services/emailService");
// ============================================================================
// HELPER FUNCTIONS: Token Generation & Strong Password Validation
// ============================================================================
// Full Session JWT Token generate karta hai
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, scope: "full_access" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};
// MFA verification ke liye short-lived (5-minute) temporary token
const generateTempMfaToken = (userId) => {
  return jwt.sign({ id: userId, scope: "mfa_pending" }, process.env.JWT_SECRET, {
    expiresIn: "5m",
  });
};
// Cryptographically secure 6-digit OTP generator
const generateSixDigitOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};
// Password strength check: Min 8 chars, 1 uppercase, 1 lowercase, 1 number
const isStrongPassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
};
// Client IP address safely nikalne ka helper (Legal consent proof ke liye)
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "127.0.0.1"
  );
};
// ============================================================================
// 1. REGISTER NEW USER (Sign Up + Legal Checkbox + 7-Day Free Trial + OTP)
// Route: POST /api/auth/register
// ============================================================================
const registerUser = async (req, res) => {
  try {
    const { name, email, password, legalConsentAccepted, policyVersion } = req.body;
    // Step 1: Mandatory Legal Consent Checkbox Enforcement
    if (!legalConsentAccepted) {
      return res.status(400).json({
        success: false,
        code: "LEGAL_CONSENT_REQUIRED",
        message: "You must agree to the Terms & Conditions, Privacy Policy, and Copyright Notice.",
      });
    }
    // Step 2: Input Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your full name, email address, and password.",
      });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, and 1 number.",
      });
    }
    // Step 3: Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_REGISTERED",
        message: "An account with this email already exists. Please log in instead.",
      });
    }
    // Step 4: Generate 6-Digit Email Verification OTP (Valid for 10 mins)
    const otp = generateSixDigitOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    // Step 5: Create User in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      authProvider: "local",
      isEmailVerified: false,
      otpCode: otp,
      otpExpires,
      legalConsent: {
        accepted: true,
        policyVersion: policyVersion || "v1.0-2026",
        acceptedAt: new Date(),
        ipAddress: getClientIp(req),
      },
    });
    // Step 6: Provision Automatic 7-Day Free Trial Subscription
    await Subscription.create({
      user: user._id,
      status: "trial",
      autoPayEnabled: false,
    });
    // Step 7: Send Verification OTP Email
    let _emailDelivered = true;
      try {
        await sendOtpEmail(user.email, user.name, otp, "Email Verification");
      } catch (_mailErr) {
        _emailDelivered = false;
        console.warn("[AETHERCORE_SMTP_FALLBACK] SMTP restricted on host:", _mailErr.message);
      }
    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      email: user.email,
      message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Account created! Please check your email for the 6-digit verification code.",
    });
  } catch (error) {
    console.error("[REGISTER ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again.",
    });
  }
};
// ============================================================================
// 2. VERIFY EMAIL OTP (Activates Account & Issues Session Token)
// Route: POST /api/auth/verify-email
// ============================================================================
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Email and 6-digit OTP code are required.",
      });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please log in.",
      });
    }
    // OTP Match & Expiry Validation
    if (user.otpCode !== String(otp).trim() || !user.otpExpires || new Date() > user.otpExpires) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OR_EXPIRED_OTP",
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "The verification code is invalid or has expired. Please request a new code.",
      });
    }
    // Mark Verified & Clear OTP
    user.isEmailVerified = true;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();
    const token = generateAccessToken(user._id);
    const subscription = await Subscription.findOne({ user: user._id });
    return res.status(200).json({
      success: true,
      message: "Email verified successfully! Welcome to AetherCore-AI.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        mfaEnabled: user.mfaEnabled,
        mfaType: user.mfaType,
        hardwarePermissions: user.hardwarePermissions,
      },
      subscription,
    });
  } catch (error) {
    console.error("[VERIFY EMAIL ERROR]:", error.message);
    return res.status(500).json({ success: false, message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Email verification failed." });
  }
};
// ============================================================================
// 3. RESEND VERIFICATION / MFA OTP
// Route: POST /api/auth/resend-otp
// ============================================================================
const resendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Security: Do not reveal whether email exists
      return res.status(200).json({
        success: true,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "If an account exists with this email, a new security code has been sent.",
      });
    }
    const otp = generateSixDigitOtp();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    let _emailDelivered = true;
      try {
        await sendOtpEmail(user.email, user.name, otp, purpose || "Security Verification");
      } catch (_mailErr) {
        _emailDelivered = false;
        console.warn("[AETHERCORE_SMTP_FALLBACK] SMTP restricted on host:", _mailErr.message);
      }
    return res.status(200).json({
      success: true,
      message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "A fresh 6-digit security code has been sent to your email.",
    });
  } catch (error) {
    console.error("[RESEND OTP ERROR]:", error.message);
    return res.status(500).json({ success: false, message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Could not send OTP email." });
  }
};
// ============================================================================
// 4. LOGIN USER (Password Check + 30-Day Deactivation Guard + MFA Challenge)
// Route: POST /api/auth/login
// ============================================================================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password.",
      });
    }
    // Explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }
    // Agar account Google OAuth se bana tha aur password set nahi hai
    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        code: "USE_GOOGLE_LOGIN",
        message: "This account uses Google Sign-In. Please click 'Continue with Google'.",
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }
    // Check 1: Email Verification Status
    if (!user.isEmailVerified) {
      const otp = generateSixDigitOtp();
      user.otpCode = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      let _emailDelivered = true;
      try {
        await sendOtpEmail(user.email, user.name, otp, "Email Verification");
      } catch (_mailErr) {
        _emailDelivered = false;
        console.warn("[AETHERCORE_SMTP_FALLBACK] SMTP restricted on host:", _mailErr.message);
      }
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Please verify your email first. A new OTP has been sent to your inbox.",
      });
    }
    // Check 2: 30-Day Deactivated Account Recovery Check
    if (user.accountStatus === "deactivated") {
      const tempToken = generateTempMfaToken(user._id);
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DEACTIVATED_RECOVERABLE",
        message: "Your account is currently deactivated. Would you like to reactivate it now?",
        scheduledPermanentDeletionAt: user.scheduledPermanentDeletionAt,
        recoveryToken: tempToken,
      });
    }
    // Check 3: Multi-Factor Authentication (MFA / 2FA) Challenge
    if (user.mfaEnabled) {
      if (user.mfaType === "email") {
        const mfaOtp = generateSixDigitOtp();
        user.otpCode = mfaOtp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        let _emailDelivered = true;
      try {
        await sendOtpEmail(user.email, user.name, mfaOtp, "Login 2FA Verification");
      } catch (_mailErr) {
        _emailDelivered = false;
        console.warn("[AETHERCORE_SMTP_FALLBACK] SMTP restricted on host:", _mailErr.message);
      }
      }
      const tempMfaToken = generateTempMfaToken(user._id);
      return res.status(200).json({
        success: true,
        mfaRequired: true,
        mfaType: user.mfaType, // 'totp' or 'email'
        tempMfaToken,
        message:
          user.mfaType === "totp"
            ? "Enter the 6-digit code from your Authenticator App."
            : "A 6-digit login security code has been sent to your email.",
      });
    }
    // Step 4: Issue Full Access Token
    const token = generateAccessToken(user._id);
    const subscription = await Subscription.findOne({ user: user._id });
    return res.status(200).json({
      success: true,
      mfaRequired: false,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        mfaEnabled: user.mfaEnabled,
        mfaType: user.mfaType,
        hardwarePermissions: user.hardwarePermissions,
      },
      subscription,
    });
  } catch (error) {
    console.error("[LOGIN ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Login failed due to server error." });
  }
};
// ============================================================================
// 5. VERIFY MFA LOGIN (Completes 2FA Step via Authenticator App or Email OTP)
// Route: POST /api/auth/mfa/verify-login
// ============================================================================
const verifyMfaLogin = async (req, res) => {
  try {
    const { tempMfaToken, code } = req.body;
    if (!tempMfaToken || !code) {
      return res.status(400).json({
        success: false,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "MFA session token and 6-digit code are required.",
      });
    }
    const decoded = jwt.verify(tempMfaToken, process.env.JWT_SECRET);
    if (decoded.scope !== "mfa_pending") {
      return res.status(401).json({ success: false, message: "Invalid MFA session scope." });
    }
    const user = await User.findById(decoded.id).select("+mfaSecret");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    let isCodeValid = false;
    if (user.mfaType === "totp") {
      // Verify Authenticator App TOTP code (window: 1 allows ±30 sec clock drift)
      isCodeValid = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: "base32",
        token: String(code).trim(),
        window: 1,
      });
    } else if (user.mfaType === "email") {
      if (user.otpCode === String(code).trim() && user.otpExpires && new Date() <= user.otpExpires) {
        isCodeValid = true;
        user.otpCode = null;
        user.otpExpires = null;
        await user.save();
      }
    }
    if (!isCodeValid) {
      return res.status(401).json({
        success: false,
        code: "INVALID_MFA_CODE",
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Invalid or expired 2FA security code. Please try again.",
      });
    }
    const token = generateAccessToken(user._id);
    const subscription = await Subscription.findOne({ user: user._id });
    return res.status(200).json({
      success: true,
      message: "Multi-Factor Authentication verified!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        mfaEnabled: user.mfaEnabled,
        mfaType: user.mfaType,
        hardwarePermissions: user.hardwarePermissions,
      },
      subscription,
    });
  } catch (error) {
    console.error("[MFA VERIFY ERROR]:", error.message);
    return res.status(401).json({
      success: false,
      message: "MFA session expired. Please log in again.",
    });
  }
};
// ============================================================================
// 6. SETUP & ENABLE MFA (Generates Authenticator QR Code or Enables Email 2FA)
// Route: POST /api/auth/mfa/setup (Protected)
// ============================================================================
const setupMfa = async (req, res) => {
  try {
    const { mfaType } = req.body; // 'totp' or 'email'
    const user = await User.findById(req.user._id);
    if (mfaType === "email") {
      user.mfaEnabled = true;
      user.mfaType = "email";
      user.mfaSecret = null;
      await user.save();
      return res.status(200).json({
        success: true,
        mfaType: "email",
        message: "Email-based Multi-Factor Authentication is now enabled.",
      });
    }
    // Default: Authenticator App (TOTP) Setup
    const secret = speakeasy.generateSecret({
      name: `AetherCore-AI (${user.email})`,
      issuer: "AetherCore-AI",
    });
    // Temporarily store secret until user confirms with their first 6-digit code
    user.mfaSecret = secret.base32;
    await user.save();
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
    return res.status(200).json({
      success: true,
      mfaType: "totp",
      qrCodeDataUrl, // Frontend <img> mein direct render hoga
      manualEntryKey: secret.base32,
      message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Scan this QR code in Google Authenticator or Authy, then confirm with a 6-digit code.",
    });
  } catch (error) {
    console.error("[MFA SETUP ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to initialize MFA setup." });
  }
};
// ============================================================================
// 7. CONFIRM ENABLE TOTP MFA (Prevents Accidental Lockout)
// Route: POST /api/auth/mfa/confirm (Protected)
// ============================================================================
const confirmEnableMfa = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select("+mfaSecret");
    if (!user.mfaSecret) {
      return res.status(400).json({
        success: false,
        message: "Please initiate MFA setup first.",
      });
    }
    const isVerified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: "base32",
      token: String(code).trim(),
      window: 1,
    });
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Incorrect code from Authenticator App. Please check your device time and try again.",
      });
    }
    user.mfaEnabled = true;
    user.mfaType = "totp";
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Authenticator App 2FA is now active on your account!",
    });
  } catch (error) {
    console.error("[MFA CONFIRM ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to confirm MFA." });
  }
};
// ============================================================================
// 8. DISABLE MFA (Requires Password Confirmation for Security)
// Route: POST /api/auth/mfa/disable (Protected)
// ============================================================================
const disableMfa = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (user.authProvider === "local") {
      if (!password || !(await user.matchPassword(password))) {
        return res.status(401).json({
          success: false,
          message: "Current password is required to disable Multi-Factor Authentication.",
        });
      }
    }
    user.mfaEnabled = false;
    user.mfaType = "none";
    user.mfaSecret = null;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Multi-Factor Authentication has been disabled.",
    });
  } catch (error) {
    console.error("[MFA DISABLE ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Could not disable MFA." });
  }
};
// ============================================================================
// 9. FORGOT PASSWORD & RESET PASSWORD FLOW
// Route: POST /api/auth/forgot-password & POST /api/auth/reset-password
// ============================================================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide your email address." });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      const resetOtp = generateSixDigitOtp();
      user.resetPasswordToken = resetOtp;
      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      let _emailDelivered = true;
      try {
        await sendOtpEmail(user.email, user.name, resetOtp, "Password Reset");
      } catch (_mailErr) {
        _emailDelivered = false;
        console.warn("[AETHERCORE_SMTP_FALLBACK] SMTP restricted on host:", _mailErr.message);
      }
    }
    // Always return generic success message to prevent email enumeration attacks
    return res.status(200).json({
      success: true,
      message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "If an account is registered with this email, a 6-digit password reset code has been sent.",
    });
  } catch (error) {
    console.error("[FORGOT PASSWORD ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Error initiating password reset." });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Email, 6-digit reset code, and new password are required.",
      });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.",
      });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (
      !user ||
      user.resetPasswordToken !== String(otp).trim() ||
      !user.resetPasswordExpires ||
      new Date() > user.resetPasswordExpires
    ) {
      return res.status(400).json({
        success: false,
        message: typeof _emailDelivered !== "undefined" && !_emailDelivered ? `Cloud email delayed — use backup code: ${typeof otp !== "undefined" ? otp : (typeof code !== "undefined" ? code : "")}` : "Invalid or expired password reset code.",
      });
    }
    user.password = newPassword; // Mongoose pre-save hook will hash automatically
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    // Send confirmation alert email
    let _emailDelivered = true;
      try {
        await sendEmail({
      to: user.email,
      subject: "Your AetherCore-AI Password Was Changed",
      title: "Password Successfully Updated",
      bodyHtml: `<p>Hello <strong>${user.name}</strong>,</p><p>Your AetherCore-AI account password was just reset. If you did not perform this action, please contact support immediately.</p>`,
    });
      } catch (_mailErr) {
        _emailDelivered = false;
        console.warn("[AETHERCORE_SMTP_FALLBACK] SMTP restricted on host:", _mailErr.message);
      }
    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to reset password." });
  }
};
// ============================================================================
// 10. GOOGLE OAUTH 2.0 CALLBACK HANDLER (Continue with Google)
// Route: GET /api/auth/google/callback
// ============================================================================
const googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    const clientUrl = process.env.CLIENT_APP_URL || "http://localhost:5173";
    // Check if account is deactivated (30-day recovery window)
    if (user.accountStatus === "deactivated") {
      const recoveryToken = generateTempMfaToken(user._id);
      return res.redirect(`${clientUrl}/auth/callback?status=deactivated&recoveryToken=${recoveryToken}`);
    }
    // Check if user has MFA enabled
    if (user.mfaEnabled) {
      const tempMfaToken = generateTempMfaToken(user._id);
      return res.redirect(
        `${clientUrl}/auth/callback?status=mfa_required&mfaType=${user.mfaType}&tempMfaToken=${tempMfaToken}`
      );
    }
    const token = generateAccessToken(user._id);
    return res.redirect(`${clientUrl}/auth/callback?status=success&token=${token}`);
  } catch (error) {
    console.error("[GOOGLE CALLBACK ERROR]:", error.message);
    const clientUrl = process.env.CLIENT_APP_URL || "http://localhost:5173";
    return res.redirect(`${clientUrl}/auth/callback?status=error`);
  }
};
// ============================================================================
// 11. GET CURRENT LOGGED-IN USER PROFILE & SUBSCRIPTION
// Route: GET /api/auth/me (Protected)
// ============================================================================
const getMe = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    return res.status(200).json({
      success: true,
      user: req.user,
      subscription,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch user profile." });
  }
};
module.exports = {
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
};
