const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const DeviceTelemetry = require("../models/DeviceTelemetry");
const { sendOtpEmail, sendDeactivationEmail, sendEmail } = require("../services/emailService");
// Helper: 6-Digit Secure OTP Generator
const generateSixDigitOtp = () => crypto.randomInt(100000, 999999).toString();
// Helper: Strong Password Validator
const isStrongPassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
// Helper: Full Access JWT Token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId, scope: "full_access" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};
// ============================================================================
// 1. UPDATE PROFILE DETAILS (Name & Avatar)
// Route: PUT /api/user/profile (Protected)
// ============================================================================
const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2 || trimmedName.length > 60) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 2 and 60 characters.",
        });
      }
      user.name = trimmedName;
    }
    if (avatar !== undefined) {
      // Prevent oversized base64 payloads (> 500 KB) from bloating MongoDB
      if (String(avatar).length > 500000) {
        return res.status(400).json({
          success: false,
          message: "Avatar image size is too large. Please choose an image under 500 KB.",
        });
      }
      user.avatar = avatar;
    }
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        mfaEnabled: user.mfaEnabled,
        mfaType: user.mfaType,
        hardwarePermissions: user.hardwarePermissions,
      },
    });
  } catch (error) {
    console.error("[UPDATE PROFILE ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update profile." });
  }
};
// ============================================================================
// 2. SECURE EMAIL CHANGE STEP 1: Request OTP on New Email Address
// Route: POST /api/user/email/request-change (Protected)
// ============================================================================
const requestEmailChange = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    if (!newEmail) {
      return res.status(400).json({ success: false, message: "Please enter the new email address." });
    }
    const normalizedNewEmail = newEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedNewEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (user.email === normalizedNewEmail) {
      return res.status(400).json({
        success: false,
        message: "New email address cannot be the same as your current email.",
      });
    }
    // Security Check: Local account users must confirm current password
    if (user.authProvider === "local") {
      if (!currentPassword || !(await user.matchPassword(currentPassword))) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }
    }
    // Check if new email is already taken by another account
    const emailTaken = await User.findOne({ email: normalizedNewEmail });
    if (emailTaken) {
      return res.status(409).json({
        success: false,
        message: "This email address is already linked to another AetherCore-AI account.",
      });
    }
    // Bind newEmail + OTP together securely inside otpCode
    const otp = generateSixDigitOtp();
    user.otpCode = `${normalizedNewEmail}|${otp}`;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    // Send verification OTP to the NEW email inbox
    await sendOtpEmail(normalizedNewEmail, user.name, otp, "New Email Verification");
    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedNewEmail}.`,
    });
  } catch (error) {
    console.error("[REQUEST EMAIL CHANGE ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Could not initiate email update." });
  }
};
// ============================================================================
// 3. SECURE EMAIL CHANGE STEP 2: Verify OTP & Apply New Email
// Route: POST /api/user/email/confirm-change (Protected)
// ============================================================================
const confirmEmailChange = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;
    if (!newEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "New email address and 6-digit OTP are required.",
      });
    }
    const normalizedNewEmail = newEmail.toLowerCase().trim();
    const expectedCode = `${normalizedNewEmail}|${String(otp).trim()}`;
    const user = await User.findById(req.user._id);
    if (!user.otpCode || user.otpCode !== expectedCode || !user.otpExpires || new Date() > user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code for this email address.",
      });
    }
    const oldEmail = user.email;
    user.email = normalizedNewEmail;
    user.isEmailVerified = true;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();
    // Notify old email address as a security best practice
    await sendEmail({
      to: oldEmail,
      subject: "Security Notice: Your AetherCore-AI Email Was Updated",
      title: "Account Email Changed",
      bodyHtml: `<p>Hello <strong>${user.name}</strong>,</p><p>Your AetherCore-AI login email was changed from <strong>${oldEmail}</strong> to <strong>${normalizedNewEmail}</strong>. If you did not authorize this change, contact support immediately.</p>`,
    });
    return res.status(200).json({
      success: true,
      message: "Email address updated successfully!",
      email: user.email,
    });
  } catch (error) {
    console.error("[CONFIRM EMAIL CHANGE ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to verify new email." });
  }
};
// ============================================================================
// 4. CHANGE PASSWORD (Inside Account Security Settings)
// Route: PUT /api/user/password (Protected)
// ============================================================================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current password and new password are required.",
      });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.",
      });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message: "Google Sign-In accounts do not have a local password to change.",
      });
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }
    user.password = newPassword; // Auto-hashed by Mongoose pre-save hook
    await user.save();
    await sendEmail({
      to: user.email,
      subject: "Security Alert: AetherCore-AI Password Updated",
      title: "Password Changed Successfully",
      bodyHtml: `<p>Hello <strong>${user.name}</strong>,</p><p>Your account password was updated from your Desktop App settings.</p>`,
    });
    return res.status(200).json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error("[CHANGE PASSWORD ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to change password." });
  }
};
// ============================================================================
// 5. UPDATE GRANULAR HARDWARE & OS ACCESS PERMISSIONS
// Route: PUT /api/user/permissions (Protected)
// ============================================================================
const updateHardwarePermissions = async (req, res) => {
  try {
    const allowedKeys = [
      "readThermalSensors",
      "adjustProcessPriority",
      "managePowerPlans",
      "ramOptimization",
      "autoStartWithWindows",
    ];
    const user = await User.findById(req.user._id);
    for (const key of allowedKeys) {
      if (typeof req.body[key] === "boolean") {
        user.hardwarePermissions[key] = req.body[key];
      }
    }
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Hardware access permissions updated and synced.",
      hardwarePermissions: user.hardwarePermissions,
    });
  } catch (error) {
    console.error("[PERMISSIONS UPDATE ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update permissions." });
  }
};
// ============================================================================
// 6. SYNC DEVICE TELEMETRY & HARDWARE INSPECTOR STATS TO CLOUD
// Route: POST /api/user/device/sync (Protected)
// ============================================================================
const syncDeviceTelemetry = async (req, res) => {
  try {
    const {
      deviceFingerprint,
      deviceName,
      osVersion,
      architecture,
      cpuModel,
      ramTotalGB,
      avgTempReductionCelsius,
      sessionsIncrement,
      appVersion,
    } = req.body;
    if (!deviceFingerprint) {
      return res.status(400).json({
        success: false,
        message: "Device fingerprint is required for telemetry sync.",
      });
    }
    const updateFields = {
      deviceName: deviceName || "Windows PC",
      osVersion: osVersion || "Windows",
      architecture: architecture || "64-bit (x64)",
      cpuModel: cpuModel || "Unknown CPU",
      ramTotalGB: Number(ramTotalGB) || 8,
      appVersion: appVersion || "1.0.0",
      lastSyncedAt: new Date(),
    };
    if (typeof avgTempReductionCelsius === "number") {
      updateFields.avgTempReductionCelsius = avgTempReductionCelsius;
    }
    const device = await DeviceTelemetry.findOneAndUpdate(
      { user: req.user._id, deviceFingerprint },
      {
        $set: updateFields,
        $inc: { totalOptimizedSessions: Number(sessionsIncrement) || 1 },
      },
      { new: true, upsert: true }
    );
    return res.status(200).json({
      success: true,
      message: "Device telemetry synced to cloud.",
      device,
    });
  } catch (error) {
    console.error("[DEVICE SYNC ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to sync device telemetry." });
  }
};
// ============================================================================
// 7. DEACTIVATE ACCOUNT (Triggers 30-Day Soft Delete & Pauses AutoPay)
// Route: POST /api/user/deactivate (Protected)
// ============================================================================
const deactivateAccount = async (req, res) => {
  try {
    const { password, reason } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    // Local accounts must confirm password before deactivation
    if (user.authProvider === "local") {
      if (!password || !(await user.matchPassword(password))) {
        return res.status(401).json({
          success: false,
          message: "Please enter your password to confirm account deactivation.",
        });
      }
    }
    // Schedule 30-day permanent deletion
    user.scheduleDeactivation();
    await user.save();
    // Safety First: Pause subscription and disable UPI AutoPay immediately
    const subscription = await Subscription.findOne({ user: user._id });
    if (subscription) {
      subscription.autoPayEnabled = false;
      if (subscription.status === "active" || subscription.status === "trial") {
        subscription.status = "paused";
      }
      await subscription.save();
    }
    console.log(`[ACCOUNT DEACTIVATED] User: ${user.email} | Reason: ${reason || "Not specified"}`);
    // Send 30-day recovery notice email
    await sendDeactivationEmail(user.email, user.name, user.scheduledPermanentDeletionAt);
    return res.status(200).json({
      success: true,
      message: "Your account has been deactivated and UPI AutoPay has been paused. You have 30 days to log back in and restore your account before permanent deletion.",
      scheduledPermanentDeletionAt: user.scheduledPermanentDeletionAt,
    });
  } catch (error) {
    console.error("[DEACTIVATE ACCOUNT ERROR]:", error.message);
    return res.status(500).json({ success: false, message: "Failed to deactivate account." });
  }
};
// ============================================================================
// 8. REACTIVATE DEACTIVATED ACCOUNT (Within 30-Day Recovery Window)
// Route: POST /api/user/reactivate (Public with recoveryToken)
// ============================================================================
const reactivateAccount = async (req, res) => {
  try {
    const { recoveryToken } = req.body;
    if (!recoveryToken) {
      return res.status(400).json({
        success: false,
        message: "Recovery token is required to restore your account.",
      });
    }
    const decoded = jwt.verify(recoveryToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }
    if (user.accountStatus === "active") {
      return res.status(400).json({ success: false, message: "Account is already active." });
    }
    // Verify 30-day window has not expired
    if (user.scheduledPermanentDeletionAt && new Date() > user.scheduledPermanentDeletionAt) {
      return res.status(410).json({
        success: false,
        message: "The 30-day recovery window has expired. Please create a new account.",
      });
    }
    // Restore account
    user.reactivateAccount();
    await user.save();
    // Restore subscription state based on remaining period
    const subscription = await Subscription.findOne({ user: user._id });
    if (subscription && subscription.status === "paused") {
      const now = new Date();
      if (subscription.currentPeriodEnd && now <= subscription.currentPeriodEnd) {
        subscription.status = subscription.paymentHistory.length > 0 ? "active" : "trial";
      } else {
        subscription.status = "expired";
      }
      await subscription.save();
    }
    const newAccessToken = generateAccessToken(user._id);
    await sendEmail({
      to: user.email,
      subject: "Welcome Back! Your AetherCore-AI Account Is Reactivated",
      title: "Account Successfully Restored",
      bodyHtml: `<p>Hello <strong>${user.name}</strong>,</p><p>Your AetherCore-AI account has been reactivated and permanent deletion has been cancelled. All your settings and profile data are intact.</p>`,
    });
    return res.status(200).json({
      success: true,
      message: "Welcome back! Your account has been restored.",
      token: newAccessToken,
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
    console.error("[REACTIVATE ACCOUNT ERROR]:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired recovery session. Please try logging in again.",
    });
  }
};
module.exports = {
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  changePassword,
  updateHardwarePermissions,
  syncDeviceTelemetry,
  deactivateAccount,
  reactivateAccount,
};
