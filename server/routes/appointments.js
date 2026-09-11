const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../middleware/supabaseClient');
const { verifyToken } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { createNotification, createNotificationForAllAdmins } = require('../utils/createNotification');

// POST /api/appointments/public
// Public appointment request from the hospital website (no auth required)
router.post('/public', async (req, res) => {
    const { full_name, email, phone, department, preferred_date, preferred_time, reason } = req.body;

    if (!full_name || !email || !phone || !department || !preferred_date || !preferred_time || !reason) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    try {
        // Check if a patient account exists with this email
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

        // Insert into appointments table
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert({
                patient_id: existingProfile?.id || null,
                doctor_id: null,
                appointment_date: preferred_date,
                appointment_time: preferred_time,
                department,
                reason,
                status: 'pending',
                notes: `Public request from: ${full_name} | Email: ${email} | Phone: ${phone}`
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: 'Failed to submit appointment request' });
        }

        // Create in-app notification for all admins
        const notifResult = await createNotificationForAllAdmins({
          message: `New public appointment request from ${full_name} (${phone}) for ${department} on ${preferred_date}.`,
          type: 'appointment'
        });
        console.log('[appointments/public] Admin notification result:', notifResult);

        // Send email to admins (fire and forget)
        (async () => {
            try {
                if (notifResult.admins && notifResult.admins.length > 0) {
                    for (const admin of notifResult.admins) {
                        try {
                            const { subject, message } = templates.newPublicAppointmentAdmin({
                                full_name,
                                email,
                                phone,
                                department,
                                preferred_date,
                                preferred_time,
                                reason
                            });
                            const emailResult = await sendEmail({ to: admin.email, subject, message });
                            if (!emailResult.success) {
                                console.error('[Route] Email failed but continuing:', emailResult.error);
                            }
                        } catch (emailErr) {
                            console.error('[Route] Email error caught:', emailErr.message);
                        }
                    }
                }
            } catch (err) {
                console.error('[appointments/public] Async email block error:', err.message);
            }
        })();

        // Send confirmation email to the requester (fire and forget)
        (async () => {
            try {
                await sendEmail({
                    to: email,
                    subject: 'Appointment Request Received - TOMMY\'S HOSPITAL',
                    message: `
Dear ${full_name},

Thank you for requesting an appointment at TOMMY'S HOSPITAL.

Your Request Details:
Department: ${department}
Preferred Date: ${preferred_date}
Preferred Time: ${preferred_time}
Reason: ${reason}

Our team will review your request and contact you within 24 hours to confirm your appointment and assign a doctor.

If your situation is urgent please call us directly:
Phone: +234 801 234 5678

Thank you for choosing TOMMY'S HOSPITAL.

TOMMY'S HOSPITAL Team
                    `
                });
            } catch (emailErr) {
                console.error('[appointments/public] Confirmation email error:', emailErr.message);
            }
        })();

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Apply verifyToken to all remaining appointment routes
router.use(verifyToken);

// GET /api/appointments/:id - get appointment detail (shared)
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                patient:profiles!appointments_patient_id_fkey(full_name, phone, email, date_of_birth, gender),
                doctor:profiles!appointments_doctor_id_fkey(full_name)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Authorization check: only patient, doctor of the appointment, or admin can read
        const isPatient = req.user.role === 'patient' && data.patient_id === req.user.id;
        const isDoctor = req.user.role === 'doctor' && data.doctor_id === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isPatient && !isDoctor && !isAdmin) {
            return res.status(403).json({ success: false, error: "Access denied. Unauthorized." });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

module.exports = router;

