import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: parseInt(process.env.SMTP_PORT || "2525", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

/**
 * Sends email using configured SMTP or logs to console as fallback
 */
export async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Clinic OS" <noreply@clinic-os.local>',
    to,
    subject,
    text,
    html,
  };

  // SMTP can only be bypassed if explicitly disabled via config
  if (process.env.SMTP_DISABLED === "true") {
    console.log(`[SMTP BYPASS - LOGGING ONLY] Email to: ${to}, subject: ${subject}`);
    console.log(`Text content:\n${text}`);
    return { success: true, logged: true };
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error(`[SMTP ERROR] Missing credentials. Set SMTP_DISABLED=true to disable SMTP explicitly.`);
    return { success: false, error: "SMTP credentials not configured" };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Message sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[SMTP ERROR] Failed to send email:", error.message);
    // Don't crash the server on email failure
    return { success: false, error: error.message };
  }
}
