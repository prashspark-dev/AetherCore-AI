const express = require("express");
const router = express.Router();
const { createSupportTicket, getMyTickets } = require("../controllers/supportController");
const { protect } = require("../middleware/authMiddleware");
const { otpAndEmailLimiter } = require("../middleware/securityMiddleware");
router.post("/ticket", protect, otpAndEmailLimiter, createSupportTicket);
router.get("/my-tickets", protect, getMyTickets);
module.exports = router;
