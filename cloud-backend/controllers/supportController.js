const SupportTicket = require("../models/SupportTicket");
const { sendSupportEmails } = require("../services/emailService");
// ============================================================================
// 1. SUBMIT CONTACT SUPPORT REQUEST (Saves Ticket + Sends Dual Emails)
// Route: POST /api/support/ticket (Protected)
// ============================================================================
const createSupportTicket = async (req, res) => {
  try {
    const { category, subject, message, systemSnapshot } = req.body;
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide both a subject and a detailed message.",
      });
    }
    if (String(message).trim().length < 15) {
      return res.status(400).json({
        success: false,
        message: "Please describe your issue in at least 15 characters so our team can assist you properly.",
      });
    }
    // Create Support Ticket in MongoDB with unique Ticket ID (#AC-2026-XXXXXX)
    const ticket = await SupportTicket.create({
      user: req.user._id,
      userEmail: req.user.email,
      category: category || "Thermal & Performance",
      subject: String(subject).trim(),
      message: String(message).trim(),
      systemSnapshot: {
        osVersion: systemSnapshot?.osVersion || "Unknown Windows",
        cpuModel: systemSnapshot?.cpuModel || "Unknown CPU",
        appVersion: systemSnapshot?.appVersion || "1.0.0",
      },
    });
    // Send email to Support Team & Auto-Confirmation Receipt to User
    await sendSupportEmails({
      userEmail: req.user.email,
      userName: req.user.name,
      ticketId: ticket.ticketId,
      category: ticket.category,
      subject: ticket.subject,
      message: ticket.message,
    });
    return res.status(201).json({
      success: true,
      message: `Support request submitted! Your Ticket ID is #${ticket.ticketId}. Confirmation sent to ${req.user.email}.`,
      ticket,
    });
  } catch (error) {
    console.error("[CREATE SUPPORT TICKET ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not submit your support request. Please try again.",
    });
  }
};
// ============================================================================
// 2. GET USER'S SUPPORT TICKET HISTORY
// Route: GET /api/support/my-tickets (Protected)
// ============================================================================
const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("[GET TICKETS ERROR]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load your support ticket history.",
    });
  }
};
module.exports = {
  createSupportTicket,
  getMyTickets,
};
