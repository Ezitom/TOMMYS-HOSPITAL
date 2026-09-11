const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabasePublic } = require('../middleware/supabaseClient');
const { verifyToken } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name, phone, date_of_birth, gender, blood_group } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ success: false, error: "Missing required registration details: email, password, full name" });
        }

        // SignUp via Supabase Auth
        const { data, error } = await supabasePublic.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    role: 'patient'
                }
            }
        });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        if (!data.user) {
            return res.status(400).json({ success: false, error: "User registration failed. No user object returned." });
        }

        // Update the profiles table with the extra registration fields
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                phone: phone || null,
                date_of_birth: date_of_birth || null,
                gender: gender || null,
                blood_group: blood_group || null
            })
            .eq('id', data.user.id);

        if (profileError) {
            // Note: Don't fail the whole request, but log the profile update issue
            console.error("Profile extra update error:", profileError.message);
        }

        // Send welcome email to new patient (fire and forget)
        (async () => {
            try {
                const { subject, message } = templates.welcomePatient({
                    full_name: full_name
                });
                const emailResult = await sendEmail({ to: email, subject, message });
                if (!emailResult.success) {
                    console.error('[Route] Email failed but continuing:', emailResult.error);
                }
            } catch (emailErr) {
                console.error('[Route] Email error caught:', emailErr.message);
            }
        })();

        return res.status(201).json({ 
            success: true, 
            message: "Registration successful. Please log in." 
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: "Server registration error: " + err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: "Email and password are required" });
        }

        // Sign in with password
        const { data, error } = await supabasePublic.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        if (!data.session || !data.user) {
            return res.status(400).json({ success: false, error: "Login session could not be established." });
        }

        // Fetch profile to verify role
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            return res.status(400).json({ 
                success: false, 
                error: "User profile record not found." 
            });
        }

        return res.json({
            success: true,
            data: {
                token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                role: profile.role,
                profile
            }
        });

    } catch (err) {
        return res.status(500).json({ success: false, error: "Server login error: " + err.message });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.json({ success: false, error: 'No refresh token provided' });
    }

    try {
        const { data, error } = await supabasePublic.auth.refreshSession({ 
            refresh_token 
        });

        if (error || !data.session) {
            return res.json({ success: false, error: 'Session expired' });
        }

        return res.json({
            success: true,
            data: {
                token: data.session.access_token,
                refresh_token: data.session.refresh_token
            }
        });
    } catch (err) {
        return res.json({ success: false, error: 'Refresh failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabasePublic.auth.signOut();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server logout error: " + err.message });
    }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
    return res.json({ success: true, data: req.user });
});



module.exports = router;
