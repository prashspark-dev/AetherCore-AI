const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// ============================================================================
// USER SCHEMA: Auth, Google OAuth, MFA, Legal Consent & 30-Day Soft Delete
// ============================================================================
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false, // Security: Default queries mein password return nahi hoga
    },
    avatar: {
      type: String,
      default: "",
    },
    // Authentication Provider ('local' for email/pass, 'google' for Google OAuth)
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      default: null,
    },
    // Email Verification & Password Reset OTPs
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    // Multi-Factor Authentication (MFA / 2FA via Authenticator App or Email)
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaType: {
      type: String,
      enum: ["none", "totp", "email"],
      default: "none",
    },
    mfaSecret: {
      type: String,
      select: false, // TOTP Base32 Secret encrypted/hidden by default
    },
    // Legal Compliance Gate Proof (Terms, Privacy Policy & Copyright Checkbox)
    legalConsent: {
      accepted: { type: Boolean, required: true, default: false },
      policyVersion: { type: String, default: "v1.0-2026" },
      acceptedAt: { type: Date, default: Date.now },
      ipAddress: { type: String, default: "" },
    },
    // Granular Hardware & OS Access Permissions (Synced with Desktop App)
    hardwarePermissions: {
      readThermalSensors: { type: Boolean, default: true },
      adjustProcessPriority: { type: Boolean, default: true },
      managePowerPlans: { type: Boolean, default: true },
      ramOptimization: { type: Boolean, default: true },
      autoStartWithWindows: { type: Boolean, default: true },
    },
    // Account Lifecycle: Active vs. Deactivated (30-Day Recovery Window)
    accountStatus: {
      type: String,
      enum: ["active", "deactivated"],
      default: "active",
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    scheduledPermanentDeletionAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);
// Pre-save Hook: Password ko database mein save karne se pehle bcrypt se hash karna
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
// Method: Login ke waqt entered password ko hashed password se verify karna
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};
// Method: Account Deactivate karna aur 30 din baad permanent deletion schedule karna
userSchema.methods.scheduleDeactivation = function () {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  this.accountStatus = "deactivated";
  this.deactivatedAt = now;
  this.scheduledPermanentDeletionAt = thirtyDaysLater;
};
// Method: Agar user 30 din ke andar wapas login kare to account restore karna
userSchema.methods.reactivateAccount = function () {
  this.accountStatus = "active";
  this.deactivatedAt = null;
  this.scheduledPermanentDeletionAt = null;
};
module.exports = mongoose.model("User", userSchema);
