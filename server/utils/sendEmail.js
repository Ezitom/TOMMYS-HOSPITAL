const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('[sendEmail] GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  console.log('[sendEmail] Nodemailer transporter created for:', process.env.GMAIL_USER);
  return transporter;
}

async function sendEmail({ to, subject, message, html }) {
  console.log('[sendEmail] Called — to:', to, '| subject:', subject);

  if (!to || !subject || (!message && !html)) {
    console.error('[sendEmail] Missing required fields — to:', to, 'subject:', subject, 'message:', !!message);
    return { success: false, error: 'Missing required fields' };
  }

  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'Email transporter not configured. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env' };
  }

  const emailHtml = html || (typeof message === 'string' && /<[a-z][\s\S]*>/i.test(message) ? message : undefined);
  const plainText = message ? (emailHtml ? message.replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim() : message) : undefined;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'TOMMY\'S HOSPITAL'}" <${process.env.GMAIL_USER}>`,
    to: to,
    subject: subject,
    ...(plainText ? { text: plainText } : {}),
    ...(emailHtml ? { html: emailHtml } : {})
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log('[sendEmail] Email sent successfully to:', to);
    console.log('[sendEmail] Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[sendEmail] Failed to send email to:', to);
    console.error('[sendEmail] Error:', err.message);

    if (err.message.includes('Invalid login')) {
      console.error('[sendEmail] HINT: Gmail login failed. Make sure you are using an App Password not your regular Gmail password.');
    }
    if (err.message.includes('Username and Password not accepted')) {
      console.error('[sendEmail] HINT: App Password is wrong or 2-Step Verification is not enabled on your Google account.');
    }

    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
