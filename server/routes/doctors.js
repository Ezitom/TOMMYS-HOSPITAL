const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../middleware/supabaseClient');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { createNotification, createNotificationForAllAdmins } = require('../utils/createNotification');

// Apply verifyToken and requireRole('doctor') to all doctor routes
router.use(verifyToken);
router.use(requireRole('doctor'));

// GET /api/doctors/patients - get assigned patients list
router.get('/patients', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .select(`
                id,
                diagnosis_context,
                assigned_at,
                patient:profiles!doctor_patient_assignments_patient_id_fkey(
                    id, full_name, email, phone, date_of_birth, gender, blood_group
                )
            `)
            .eq('doctor_id', req.user.id)
            .eq('is_active', true);

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Format data to simplify client side mapping
        const patients = data.map(item => ({
            assignment_id: item.id,
            diagnosis_context: item.diagnosis_context,
            assigned_at: item.assigned_at,
            ...item.patient
        }));

        return res.json({ success: true, data: patients });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/doctors/appointments - get upcoming appointments
router.get('/appointments', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                patient:profiles!appointments_patient_id_fkey(full_name, phone, blood_group, date_of_birth)
            `)
            .eq('doctor_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/doctors/appointments/:id - single appointment details
router.get('/appointments/:id', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                patient:profiles!appointments_patient_id_fkey(full_name, phone, date_of_birth, gender, blood_group, address)
            `)
            .eq('id', req.params.id)
            .eq('doctor_id', req.user.id)
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// PUT /api/doctors/appointments/:id/status - update status and add notes
router.put('/appointments/:id/status', async (req, res) => {
    try {
        const { status, notes } = req.body;
        const appointmentId = req.params.id;

        if (!status) {
            return res.status(400).json({ success: false, error: "Status is required" });
        }

        // Fetch appointment details first to notify patient
        const { data: appointment, error: fetchErr } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .eq('doctor_id', req.user.id)
            .single();

        if (fetchErr || !appointment) {
            return res.status(404).json({ success: false, error: "Appointment not found or unauthorized" });
        }

        const updateData = { status };
        if (notes !== undefined) {
            updateData.notes = notes;
        }

        // Update appointment
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Notify patient based on new status
        const statusMessages = {
          confirmed: `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been confirmed by Dr. ${req.user.full_name}.`,
          completed: `Your appointment with Dr. ${req.user.full_name} on ${appointment.appointment_date} has been completed. Your records have been updated.`,
          cancelled: `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled. Please contact us to rebook.`
        };

        if (statusMessages[status] && appointment.patient_id) {
          await createNotification({
            user_id: appointment.patient_id,
            message: statusMessages[status],
            type: 'appointment'
          });
        }

        // Send status update email to patient (fire and forget)
        (async () => {
            try {
                const { data: apptDetails } = await supabaseAdmin
                    .from('appointments')
                    .select(`
                        appointment_date,
                        appointment_time,
                        department,
                        patient:patient_id ( full_name, email ),
                        doctor:doctor_id ( full_name )
                    `)
                    .eq('id', appointmentId)
                    .single();

                if (apptDetails && apptDetails.patient) {
                    const patientEmail = apptDetails.patient.email;
                    const patientName = apptDetails.patient.full_name;
                    const docName = apptDetails.doctor?.full_name || doctorName;

                    if (status === 'confirmed') {
                        try {
                            const { subject, message } = templates.appointmentConfirmed({
                                patient_name: patientName,
                                doctor_name: docName,
                                department: apptDetails.department,
                                appointment_date: apptDetails.appointment_date,
                                appointment_time: apptDetails.appointment_time
                            });
                            const emailResult = await sendEmail({ to: patientEmail, subject, message });
                            if (!emailResult.success) {
                                console.error('[Route] Email failed but continuing:', emailResult.error);
                            }
                        } catch (emailErr) {
                            console.error('[Route] Email error caught:', emailErr.message);
                        }
                    } else if (status === 'completed') {
                        try {
                            const { subject, message } = templates.appointmentCompleted({
                                patient_name: patientName,
                                doctor_name: docName,
                                department: apptDetails.department,
                                appointment_date: apptDetails.appointment_date
                            });
                            const emailResult = await sendEmail({ to: patientEmail, subject, message });
                            if (!emailResult.success) {
                                console.error('[Route] Email failed but continuing:', emailResult.error);
                            }
                        } catch (emailErr) {
                            console.error('[Route] Email error caught:', emailErr.message);
                        }
                    } else if (status === 'cancelled') {
                        try {
                            const { subject, message } = templates.appointmentCancelled({
                                patient_name: patientName,
                                department: apptDetails.department,
                                appointment_date: apptDetails.appointment_date,
                                appointment_time: apptDetails.appointment_time
                            });
                            const emailResult = await sendEmail({ to: patientEmail, subject, message });
                            if (!emailResult.success) {
                                console.error('[Route] Email failed but continuing:', emailResult.error);
                            }
                        } catch (emailErr) {
                            console.error('[Route] Email error caught:', emailErr.message);
                        }
                    }
                }
            } catch (emailErr) {
                console.error('Email status update notification failed:', emailErr.message);
            }
        })();

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// POST /api/doctors/records - write medical record for patient
router.post('/records', async (req, res) => {
    try {
        const { patient_id, diagnosis, symptoms, prescription, lab_results, follow_up_date } = req.body;

        if (!patient_id || !diagnosis) {
            return res.status(400).json({ success: false, error: "Patient ID and Diagnosis are required" });
        }

        // Check if doctor is assigned to patient (clinical safety check)
        const { data: assignment, error: assignErr } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .select('id')
            .eq('doctor_id', req.user.id)
            .eq('patient_id', patient_id)
            .eq('is_active', true)
            .maybeSingle();

        if (assignErr || !assignment) {
            return res.status(403).json({ success: false, error: "Clinical access denied. Patient must be assigned to you before writing records." });
        }

        // Insert record
        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .insert({
                patient_id,
                doctor_id: req.user.id,
                diagnosis,
                symptoms: symptoms || null,
                prescription: prescription || null,
                lab_results: lab_results || null,
                follow_up_date: follow_up_date || null
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Notify patient
        await createNotification({
          user_id: patient_id,
          message: `Dr. ${req.user.full_name} has added a new medical record to your profile. Diagnosis: ${diagnosis}.`,
          type: 'record'
        });

        // Notify patient via email (fire and forget)
        (async () => {
            try {
                const { data: patient } = await supabaseAdmin
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', patient_id)
                    .single();

                if (patient) {
                    try {
                        const { subject, message } = templates.medicalRecordAdded({
                            patient_name: patient.full_name,
                            doctor_name: req.user.full_name,
                            diagnosis: diagnosis,
                            follow_up_date: follow_up_date || null
                        });
                        const emailResult = await sendEmail({ to: patient.email, subject, message });
                        if (!emailResult.success) {
                            console.error('[Route] Email failed but continuing:', emailResult.error);
                        }
                    } catch (emailErr) {
                        console.error('[Route] Email error caught:', emailErr.message);
                    }
                }
            } catch (emailErr) {
                console.error('Email record notification failed:', emailErr.message);
            }
        })();

        return res.status(201).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/doctors/records/:patientId - get patient specific records
router.get('/records/:patientId', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
                *,
                doctor:profiles!medical_records_doctor_id_fkey(full_name)
            `)
            .eq('patient_id', req.params.patientId)
            .order('record_date', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/doctors/profile - get doctor profile + doctor details
router.get('/profile', async (req, res) => {
    try {
        // Fetch doctor profiles fields
        const { data: docProfile, error: docProfileErr } = await supabaseAdmin
            .from('doctor_profiles')
            .select('*')
            .eq('id', req.user.id)
            .maybeSingle();

        const combinedProfile = {
            ...req.user,
            details: docProfile || {
                specialty: "General Medicine",
                qualification: "",
                years_experience: 0,
                bio: "",
                available_days: [],
                consultation_fee: 0
            }
        };

        return res.json({ success: true, data: combinedProfile });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// PUT /api/doctors/profile - update doctor profile
router.put('/profile', async (req, res) => {
    try {
        const { 
            full_name, phone, specialty, qualification, years_experience, bio, available_days, consultation_fee, password 
        } = req.body;

        // 1. Update basic profile info
        const { error: baseError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: full_name || req.user.full_name,
                phone: phone || null
            })
            .eq('id', req.user.id);

        if (baseError) {
            return res.status(400).json({ success: false, error: baseError.message });
        }

        // 2. Upsert details in doctor_profiles table
        const { error: docError } = await supabaseAdmin
            .from('doctor_profiles')
            .upsert({
                id: req.user.id,
                specialty: specialty || "General Medicine",
                qualification: qualification || null,
                years_experience: years_experience ? parseInt(years_experience, 10) : null,
                bio: bio || null,
                available_days: available_days || [],
                consultation_fee: consultation_fee ? parseFloat(consultation_fee) : null
            });

        if (docError) {
            return res.status(400).json({ success: false, error: docError.message });
        }

        // 3. If password change is requested
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

        return res.json({ success: true, message: "Doctor profile updated successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/doctors/notifications - get notifications
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

// PUT /api/doctors/notifications/read - mark notifications as read
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

// PATCH /api/doctors/appointments/:id/acknowledge - mark appointment as seen
router.patch('/appointments/:id/acknowledge', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .update({ is_acknowledged: true })
            .eq('id', req.params.id)
            .eq('doctor_id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
});

module.exports = router;

