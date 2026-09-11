const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../middleware/supabaseClient');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { createNotification, createNotificationForAllAdmins } = require('../utils/createNotification');

// Apply verifyToken to all patient routes
router.use(verifyToken);

// GET /api/patients/notifications - get notifications
router.get('/notifications', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// PUT /api/patients/notifications/read - mark notifications as read
router.put('/notifications/read', async (req, res) => {
    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, message: "Notifications marked as read" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// Require patient role for subsequent patient-specific endpoints
router.use(requireRole('patient'));

// GET /api/patients/doctors - list active doctors for booking
router.get('/doctors', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'doctor');

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        const { data: details } = await supabaseAdmin
            .from('doctor_profiles')
            .select('id, specialty');

        const doctors = data.map(doc => {
            const detail = details ? details.find(d => d.id === doc.id) : null;
            return {
                id: doc.id,
                full_name: doc.full_name,
                specialty: detail ? detail.specialty : "General Medicine"
            };
        });

        return res.json({ success: true, data: doctors });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

router.get('/appointments', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                doctor:profiles!appointments_doctor_id_fkey(full_name)
            `)
            .eq('patient_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// POST /api/patients/appointments - book new appointment
router.post('/appointments', async (req, res) => {
    try {
        const { doctor_id, appointment_date, appointment_time, department, reason } = req.body;

        if (!appointment_date || !appointment_time || !department) {
            return res.status(400).json({ success: false, error: "Date, time and department are required" });
        }

        // Insert appointment
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert({
                patient_id: req.user.id,
                doctor_id: doctor_id || null,
                appointment_date,
                appointment_time,
                department,
                reason,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Create in-app notification for all admins
        const notifResult = await createNotificationForAllAdmins({
          message: `New appointment request from ${req.user.full_name} for ${department} on ${appointment_date} at ${appointment_time}.`,
          type: 'appointment'
        });
        console.log('[patients/appointments] Admin notification result:', notifResult);

        // Send email to all admins (fire and forget)
        (async () => {
            try {
                if (notifResult.admins && notifResult.admins.length > 0) {
                    for (const admin of notifResult.admins) {
                        try {
                            const { subject, message } = templates.newAppointmentAdmin({
                                patient_name: req.user.full_name,
                                department,
                                appointment_date,
                                appointment_time,
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
                console.error('[patients/appointments] Async email block error:', err.message);
            }
        })();

        return res.status(201).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});


// DELETE /api/patients/appointments/:id - cancel own appointment
router.delete('/appointments/:id', async (req, res) => {
    try {
        const appointmentId = req.params.id;

        // Fetch appointment first to notify doctor
        const { data: appointment, error: fetchErr } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .eq('patient_id', req.user.id)
            .single();

        if (fetchErr || !appointment) {
            return res.status(404).json({ success: false, error: "Appointment not found or unauthorized" });
        }

        // Delete appointment
        const { error: deleteErr } = await supabaseAdmin
            .from('appointments')
            .delete()
            .eq('id', appointmentId);

        if (deleteErr) {
            return res.status(400).json({ success: false, error: deleteErr.message });
        }

        // Notify doctor
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: appointment.doctor_id,
                message: `Appointment scheduled for ${appointment.appointment_date} has been cancelled by patient: ${req.user.full_name}.`,
                type: 'appointment',
                is_read: false
            });

        return res.json({ success: true, message: "Appointment cancelled successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/patients/records - get own medical records
router.get('/records', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
                *,
                doctor:profiles!medical_records_doctor_id_fkey(full_name)
            `)
            .eq('patient_id', req.user.id)
            .order('record_date', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/patients/assignment - get assigned doctor
router.get('/assignment', async (req, res) => {
    try {
        // Step 1: Get the assignment + doctor name from profiles
        const { data, error } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .select(`
                *,
                doctor:profiles!doctor_patient_assignments_doctor_id_fkey(full_name)
            `)
            .eq('patient_id', req.user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        if (!data) {
            return res.json({ success: true, data: null });
        }

        // Step 2: Get specialty from doctor_profiles separately
        const { data: docDetails } = await supabaseAdmin
            .from('doctor_profiles')
            .select('specialty')
            .eq('id', data.doctor_id)
            .maybeSingle();

        return res.json({
            success: true,
            data: {
                ...data,
                doctor_details: docDetails || null
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/patients/profile - get own profile
router.get('/profile', async (req, res) => {
    return res.json({ success: true, data: req.user });
});

// PUT /api/patients/profile - update own profile and password
router.put('/profile', async (req, res) => {
    try {
        const { full_name, phone, date_of_birth, gender, blood_group, address, password } = req.body;

        // Update profile details
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: full_name || req.user.full_name,
                phone: phone || null,
                date_of_birth: date_of_birth || null,
                gender: gender || null,
                blood_group: blood_group || null,
                address: address || null
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // If password update is requested
        if (password) {
            if (!supabaseAdmin) {
                return res.status(400).json({ success: false, error: "Admin SDK not configured. Cannot update password." });
            }
            const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
                password: password
            });
            if (pwdError) {
                return res.status(400).json({ success: false, error: "Password update failed: " + pwdError.message });
            }
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});



// GET /api/patients/assigned-doctor
router.get('/assigned-doctor', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('doctor_patient_assignments')
      .select(`
        id,
        diagnosis_context,
        assigned_at,
        is_active,
        doctor:doctor_id (
          id,
          full_name,
          email,
          phone,
          doctor_profiles (
            specialty,
            qualification,
            years_experience
          )
        )
      `)
      .eq('patient_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.json({ success: true, data: null });
    }

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch assigned doctor' });
  }
});

module.exports = router;
