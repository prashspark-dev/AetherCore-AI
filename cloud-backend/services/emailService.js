const nodemailer = require("nodemailer");
// ============================================================================
// EMAIL SERVICE: OTPs, Password Reset, Security Alerts, Billing & Support Mail
// ============================================================================
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true for port 465, false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};
// Reusable Modern Dark-Themed HTML Wrapper for Emails
const wrapEmailTemplate = (title, bodyHtml) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #070B14; color: #F8FAFC; padding: 32px; border-radius: 12px; max-width: 560px; margin: auto; border: 1px solid #1E293B;">
    <div style="border-bottom: 1px solid #1E293B; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #38BDF8; letter-spacing: 0.5px;">AetherCore-AI</h2>
      <p style="margin: 4px 0 0; font-size: 12px; color: #94A3B8;">Autonomous System Optimizer & Thermal Guard</p>
    </div>
    <h3 style="color: #FFFFFF; margin-top: 0;">${title}</h3>
    <div style="color: #CBD5E1; font-size: 14px; line-height: 1.6;">
      ${bodyHtml}
    </div>
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B;">
      © ${new Date().getFullYear()} AetherCore-AI. All Rights Reserved. | Automated Security & System Notification
    </div>
  </div>
`;
const sendEmail = async ({ to, subject, title, bodyHtml, replyTo }) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"AetherCore-AI Security" <${process.env.SMTP_USER}>`,
      to,
      replyTo: replyTo || process.env.SMTP_USER,
      subject,
      html: wrapEmailTemplate(title, bodyHtml),
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL SERVICE ERROR]:", error.message);
    return { success: false, error: error.message };
  }
};
// 1. Send OTP (Email Verification / Login MFA / Password Reset)
const sendOtpEmail = async (to, name, otp, purpose = "Verification") => {
  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your one-time security code for <strong>${purpose}</strong> is:</p>
    <div style="background: #0F172A; border: 1px solid #38BDF8; border-radius: 8px; padding: 14px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #38BDF8; margin: 18px 0;">
      ${otp}
    </div>
    <p>This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
  `;
  return await sendEmail({
    to,
    subject: `[${otp}] AetherCore-AI ${purpose} Code`,
    title: `${purpose} Security Code`,
    bodyHtml,
  });
};
// 2. Account Deactivation (30-Day Recovery Window Notice)
const sendDeactivationEmail = async (to, name, deletionDate) => {
  const formattedDate = new Date(deletionDate).toDateString();
  const bodyHtml = `
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your AetherCore-AI account has been <strong>deactivated</strong> as requested, and any active UPI AutoPay mandate has been paused.</p>
    <p style="background: #1E1B4B; border-left: 4px solid #818CF8; padding: 12px; border-radius: 4px;">
      <strong>30-Day Safety Window:</strong> Your profile and settings are safely preserved until <strong>${formattedDate}</strong>. Simply log back in before this date to reactivate your account instantly. After ${formattedDate}, all data will be permanently erased.
    </p>
  `;
  return await sendEmail({
    to,
    subject: "AetherCore-AI Account Deactivated (30-Day Recovery Active)",
    title: "Account Deactivated Safely",
    bodyHtml,
  });
};
// 3. Support Ticket Confirmation & Forwarding
const sendSupportEmails = async ({ userEmail, userName, ticketId, category, subject, message }) => {
  // Mail to Support Team
  await sendEmail({
    to: process.env.SUPPORT_RECEIVER_EMAIL || process.env.SMTP_USER,
    replyTo: userEmail,
    subject: `[Ticket #${ticketId}] [${category}] ${subject}`,
    title: `New Support Request (#${ticketId})`,
    bodyHtml: `
      <p><strong>From:</strong> ${userName} (${userEmail})</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr style="border-color: #1E293B;" />
      <p style="white-space: pre-wrap;">${message}</p>
    `,
  });
  // Auto-acknowledgment Mail to User
  return await sendEmail({
    to: userEmail,
    subject: `We received your request [Ticket #${ticketId}] - AetherCore-AI Support`,
    title: "Support Ticket Received",
    bodyHtml: `
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Thank you for contacting AetherCore-AI Support. Our engineering team has received your message under Ticket ID <strong>#${ticketId}</strong>.</p>
      <p><strong>Category:</strong> ${category}<br/><strong>Subject:</strong> ${subject}</p>
      <p>We typically respond within 12–24 hours.</p>
    `,
  });
};
module.exports = {
  sendEmail,
  sendOtpEmail,
  sendDeactivationEmail,
  sendSupportEmails,
};
