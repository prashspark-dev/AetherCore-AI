const cron = require("node-cron");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const DeviceTelemetry = require("../models/DeviceTelemetry");
// ============================================================================
// AUTOMATED 30-DAY ACCOUNT DELETION CRON WORKER
// Runs every day at 02:00 AM server time to permanently purge expired accounts
// ============================================================================
const startDeletionCronJob = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("[CRON] Running daily 30-day account permanent deletion check...");
    try {
      const now = new Date();
      // Un sabhi deactivated users ko dhundhna jinka 30-day window khatam ho chuka hai
      const expiredUsers = await User.find({
        accountStatus: "deactivated",
        scheduledPermanentDeletionAt: { $lte: now },
      });
      if (expiredUsers.length === 0) {
        console.log("[CRON] No expired deactivated accounts found today.");
        return;
      }
      for (const user of expiredUsers) {
        const userId = user._id;
        // Associated Subscription aur Device Telemetry ko permanently clean karna
        await Subscription.deleteMany({ user: userId });
        await DeviceTelemetry.deleteMany({ user: userId });
        await User.findByIdAndDelete(userId);
        console.log(`[CRON] Permanently deleted user account & data for ID: ${userId}`);
      }
    } catch (error) {
      console.error("[CRON ERROR] Failed during permanent deletion job:", error.message);
    }
  });
  console.log("[CRON] 30-Day Account Lifecycle Worker initialized (Runs daily at 2:00 AM).");
};
module.exports = startDeletionCronJob;
