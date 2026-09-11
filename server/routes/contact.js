const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail');

// POST /api/contact
// Public route — no auth required
router.post('/', async (req, res) => {
  const { full_name, email, phone, message } = req.body;

  console.log('[contact] New contact form submission from:', full_name, email);

  if (!full_name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'Full name, email and message are required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }

  try {
    // Send notification email to hospital
    const hospitalEmailResult = await sendEmail({
      to: process.env.GMAIL_USER,
      subject: `New Contact Message from ${full_name}`,
      message: `
New Contact Form Submission
---------------------------
TOMMY'S HOSPITAL Website

Name: ${full_name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}

---------------------------
Reply directly to: ${email}
Submitted at: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}
      `
    });

    if (!hospitalEmailResult.success) {
      console.error('[contact] Failed to send hospital notification:', hospitalEmailResult.error);
    }

    // Send confirmation email to the person who contacted
    const confirmationResult = await sendEmail({
      to: email,
      subject: 'We received your message - TOMMY\'S HOSPITAL',
      message: `
Dear ${full_name},

Thank you for contacting TOMMY'S HOSPITAL. We have received your message and will get back to you within 24 hours.

Your message:
"${message}"

If your enquiry is urgent please call us directly:
Phone: +234 801 234 5678
Email: info@justpathhospital.com
Address: 12 Hospital Road, Ikeja, Lagos, Nigeria

Working Hours:
Monday to Friday: 8am to 8pm
Saturday: 9am to 5pm
Sunday: Emergency only

Thank you for choosing TOMMY'S HOSPITAL.

TOMMY'S HOSPITAL Team
      `
    });

    if (!confirmationResult.success) {
      console.error('[contact] Failed to send confirmation to sender:', confirmationResult.error);
    }

    return res.json({
      success: true,
      message: 'Your message has been sent. We will get back to you within 24 hours.'
    });

  } catch (err) {
    console.error('[contact] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again or call us directly.'
    });
  }
});

module.exports = router;
