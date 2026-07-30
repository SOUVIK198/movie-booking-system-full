const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an email. Attachments (e.g. PDF ticket) supported via `attachments`.
 * @param {{to: string, subject: string, html: string, attachments?: Array}} options
 */
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
      attachments,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    // Email failures should not crash a booking flow — log and continue.
    logger.error(`Failed to send email to ${to}: ${error.message}`);
  }
};

module.exports = sendEmail;