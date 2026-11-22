require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const Subscription = require("./models/Subscription");
const { globalApiLimiter, sanitizeInputs } = require("./middleware/securityMiddleware");
const startDeletionCronJob = require("./services/deletionCronJob");
// Import API Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const billingRoutes = require("./routes/billingRoutes");
const supportRoutes = require("./routes/supportRoutes");
const app = express();
app.set("trust proxy", 1);
// ============================================================================
// 1. ENTERPRISE SECURITY & PARSING MIDDLEWARES
// ============================================================================
app.use(helmet()); // Sets secure HTTP response headers (XSS, Clickjacking protection)
app.use(
  cors({
    origin: [
      process.env.CLIENT_APP_URL || "http://localhost:5173",
      "app://.", // Electron desktop production protocol
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" })); // Prevent oversized JSON payload DoS
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeInputs); // NoSQL Injection protection
app.use("/api", globalApiLimiter); // Global DDoS rate limiter
// ============================================================================
// 2. PASSPORT GOOGLE OAUTH 2.0 STRATEGY ("Continue with Google")
// ============================================================================
app.use(passport.initialize());
if (process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.includes("your_google")) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("No email returned from Google account."), null);
          }
          let user = await User.findOne({ email });
          if (user) {
            // Link Google ID if user previously signed up with email
            if (!user.googleId) {
              user.googleId = profile.id;
              user.isEmailVerified = true;
              if (!user.avatar && profile.photos?.[0]?.value) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
            }
            return done(null, user);
          }
          // First-time Google Sign-Up -> Create User + Automatic 7-Day Free Trial
          user = await User.create({
            name: profile.displayName || "AetherCore User",
            email,
            avatar: profile.photos?.[0]?.value || "",
            authProvider: "google",
            googleId: profile.id,
            isEmailVerified: true,
            legalConsent: {
              accepted: true,
              policyVersion: "v1.0-2026",
              acceptedAt: new Date(),
            },
          });
          await Subscription.create({
            user: user._id,
            status: "trial",
            autoPayEnabled: false,
          });
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
  console.log("[OAUTH] Google OAuth 2.0 Strategy initialized.");
} else {
  console.warn("[OAUTH WARNING] Google Client ID not set in .env yet (Continue with Google will wait for keys).");
}
// ============================================================================
// 3. MOUNT API ROUTES & HEALTH CHECK
// ============================================================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "AetherCore-AI Cloud SaaS API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/support", supportRoutes);
// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});
// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[UNHANDLED SERVER ERROR]:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error.",
  });
});
// ============================================================================
// 4. DATABASE CONNECTION & SERVER STARTUP
// ============================================================================
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("<username>")) {
      console.warn("\n[DATABASE WARNING] Please add your real MongoDB Atlas URI in 'cloud-backend/.env' before starting DB operations.");
    } else {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("[MONGODB] Connected to AetherCore-AI Cloud Cluster!");
      startDeletionCronJob(); // Start 30-day permanent deletion background worker
    }
    app.listen(PORT, () => {
      console.log(`\n=========================================================`);
      console.log(` AetherCore-AI Cloud Backend running on Port ${PORT}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=========================================================\n`);
    });
  } catch (error) {
    console.error("[SERVER STARTUP ERROR]:", error.message);
    process.exit(1);
  }
};
startServer();
