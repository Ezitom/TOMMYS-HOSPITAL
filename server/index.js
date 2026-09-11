const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');

// Startup environment check
console.log('='.repeat(50));
console.log('[Server] TOMMY\'S HOSPITAL Backend Starting...');
console.log('[Server] PORT:', process.env.PORT || 3000);
console.log('[Server] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('[Server] SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('[Server] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('[Server] GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET');
console.log('[Server] GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET');
console.log('[Server] EMAIL_FROM_NAME:', process.env.EMAIL_FROM_NAME || 'NOT SET');
console.log('[Server] FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET (using placeholder)');
console.log('='.repeat(50));

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CORS Configuration
// REPLACE https://YOUR-SITE-NAME.netlify.app with your actual Netlify domain
// or configure the FRONTEND_URL environment variable in your Render dashboard.
// ============================================================================
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://YOUR-SITE-NAME.netlify.app', // <-- REPLACE THIS with your actual Netlify site URL
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8888'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (such as mobile apps, curl, or Postman)
        if (!origin) return callback(null, true);

        // Allow explicitly configured origins, GitHub Pages, or Netlify deployment domains
        let frontendOrigin = null;
        if (process.env.FRONTEND_URL) {
            try { frontendOrigin = new URL(process.env.FRONTEND_URL).origin; } catch (_) {}
        }

        const isAllowed = allowedOrigins.includes(origin) ||
                          (frontendOrigin && origin === frontendOrigin) ||
                          /^https:\/\/[a-zA-Z0-9-]+\.github\.io$/.test(origin) ||
                          /^https:\/\/[a-zA-Z0-9-]+(?:\.netlify\.app|--[a-zA-Z0-9-]+\.netlify\.app)$/.test(origin);

        if (isAllowed) {
            return callback(null, true);
        }

        console.warn(`[CORS] Request from origin ${origin} not explicitly authorized.`);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Root health check endpoint
app.get('/', (req, res) => {
    res.status(200).send('Backend is running');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// Test email route — remove before going live
const { sendEmail } = require('./utils/sendEmail');

app.get('/api/test-email', async (req, res) => {
  console.log('[test-email] Route hit');

  const testEmail = req.query.email || 'test@example.com';
  console.log('[test-email] Sending to:', testEmail);

  const result = await sendEmail({
    to: testEmail,
    subject: 'TOMMY\'S HOSPITAL — Email Test ' + new Date().toISOString(),
    message: `
TOMMY'S HOSPITAL Email Test
------------------------------
This is a test email from TOMMY'S HOSPITAL backend.
If you received this, Nodemailer is working correctly.

Time: ${new Date().toISOString()}
Server: TOMMY'S HOSPITAL Express Backend
Gmail Account: ${process.env.GMAIL_USER || 'NOT SET'}
    `
  });

  console.log('[test-email] Final result:', result);

  return res.json({
    success: result.success,
    message: result.success
      ? 'Email sent successfully to ' + testEmail + '. Check your inbox.'
      : 'Email failed: ' + result.error,
    sentTo: testEmail,
    result
  });
});

// Import API route routers
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const contactRouter = require('./routes/contact');

// Mount API routers
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRouter);



app.listen(PORT, () => {
    console.log(`TOMMY'S HOSPITAL server is running on http://localhost:${PORT}`);
    console.log(`Test email: http://localhost:${PORT}/api/test-email?email=YOUR_EMAIL_HERE`);
});
