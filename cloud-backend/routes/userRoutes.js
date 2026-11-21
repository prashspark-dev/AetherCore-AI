const express = require("express");
const router = express.Router();
const {
  updateProfile,
  requestEmailChange,
  confirmEmailChange,
  changePassword,
  updateHardwarePermissions,
  syncDeviceTelemetry,
  deactivateAccount,
  reactivateAccount,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { otpAndEmailLimiter, authBruteForceLimiter } = require("../middleware/securityMiddleware");
// Reactivate Deactivated Account (Within 30-Day Window)
router.post("/reactivate", authBruteForceLimiter, reactivateAccount);
// Protected User Profile, Security, Hardware Permissions & 30-Day Deactivation Routes
router.put("/profile", protect, updateProfile);
router.post("/email/request-change", protect, otpAndEmailLimiter, requestEmailChange);
router.post("/email/confirm-change", protect, confirmEmailChange);
router.put("/password", protect, changePassword);
router.put("/permissions", protect, updateHardwarePermissions);
router.post("/device/sync", protect, syncDeviceTelemetry);
router.post("/deactivate", protect, deactivateAccount);
module.exports = router;
