const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../middleware/supabaseClient');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { createNotification, createNotificationForAllAdmins } = require('../utils/createNotification');

// Apply verifyToken and requireRole('admin') to all admin routes
router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/admin/patients - all patients
router.get('/patients', async (req, res) => {
    try {
        const { data: patients, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'patient')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Add doctor assignment info if available
        const { data: assignments } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .select('*, doctor:profiles!doctor_patient_assignments_doctor_id_fkey(full_name)')
            .eq('is_active', true);

        const patientList = patients.map(p => {
            const assign = assignments.find(a => a.patient_id === p.id);
            return {
                ...p,
                assigned_doctor: assign ? assign.doctor.full_name : "Not yet assigned"
            };
        });

        return res.json({ success: true, data: patientList });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/admin/doctors - all doctors
router.get('/doctors', async (req, res) => {
    try {
        // Fetch doctor profiles
        const { data: doctors, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'doctor')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        const { data: details } = await supabaseAdmin
            .from('doctor_profiles')
            .select('*');

        const { data: assignments } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .select('doctor_id')
            .eq('is_active', true);

        const doctorList = doctors.map(doc => {
            const detail = details.find(d => d.id === doc.id) || {};
            const count = assignments.filter(a => a.doctor_id === doc.id).length;
            return {
                ...doc,
                specialty: detail.specialty || "General Medicine",
                qualification: detail.qualification || "MBBS",
                years_experience: detail.years_experience || 0,
                patient_count: count
            };
        });

        return res.json({ success: true, data: doctorList });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/admin/appointments - all appointments
router.get('/appointments', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                patient:profiles!appointments_patient_id_fkey(full_name),
                doctor:profiles!appointments_doctor_id_fkey(full_name)
            `)
            .order('appointment_date', { ascending: false })
            .order('appointment_time', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// PUT /api/admin/appointments/:id - update appointment status, doctor, or notes
router.put('/appointments/:id', async (req, res) => {
    try {
        const { status, doctor_id, notes } = req.body;
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (doctor_id !== undefined) updateData.doctor_id = doctor_id || null;
        if (notes !== undefined) updateData.notes = notes;

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Notify patient and doctor about updates if applicable using createNotification
        if (data.patient_id) {
            let msg = `Your appointment status was updated to ${data.status}.`;
            if (data.doctor_id) {
                const { data: doc } = await supabaseAdmin.from('profiles').select('full_name').eq('id', data.doctor_id).single();
                if (doc) {
                    msg += ` Dr. ${doc.full_name} has been assigned.`;
                }
            }
            await createNotification({
                user_id: data.patient_id,
                message: msg,
                type: 'appointment'
            });
        }

        if (data.doctor_id) {
            await createNotification({
                user_id: data.doctor_id,
                message: `An appointment (Date: ${data.appointment_date}, Time: ${data.appointment_time}) has been assigned to you.`,
                type: 'appointment'
            });
        }

        // Send status update email to patient (fire and forget)
        if (status === 'confirmed' || status === 'completed' || status === 'cancelled') {
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
                        .eq('id', req.params.id)
                        .single();

                    if (apptDetails && apptDetails.patient) {
                        const patientEmail = apptDetails.patient.email;
                        const patientName = apptDetails.patient.full_name;
                        const docName = apptDetails.doctor?.full_name || 'Staff Doctor';

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
                    console.error('[Route] Email appointment status update notification failed:', emailErr.message);
                }
            })();
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});


// POST /api/admin/assign - assign doctor to patient
router.post('/assign', async (req, res) => {
    try {
        const { doctor_id, patient_id, diagnosis_context } = req.body;

        if (!doctor_id || !patient_id) {
            return res.status(400).json({ success: false, error: "Doctor and Patient IDs are required" });
        }

        // Upsert assignment (if active assignment exists, update it, otherwise create new)
        const { data, error } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .upsert({
                doctor_id,
                patient_id,
                diagnosis_context: diagnosis_context || null,
                assigned_by: req.user.id,
                is_active: true
            }, { onConflict: 'doctor_id,patient_id' })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Fetch doctor and patient details first
        const { data: doctor } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email, doctor_profiles(specialty)')
            .eq('id', doctor_id)
            .single();

        const { data: patient } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', patient_id)
            .single();

        if (doctor && patient) {
            // Notify patient
            await createNotification({
                user_id: patient_id,
                message: `A doctor has been assigned to your care: Dr. ${doctor.full_name} (${doctor.doctor_profiles?.specialty || 'General Medicine'}).`,
                type: 'assignment'
            });

            // Notify doctor
            await createNotification({
                user_id: doctor_id,
                message: `You have been assigned a new patient: ${patient.full_name}. ${diagnosis_context ? 'Diagnosis context: ' + diagnosis_context : ''}`,
                type: 'assignment'
            });

            // Send emails (fire and forget)
            (async () => {
                try {
                    const patientEmailData = templates.doctorAssignedPatient({
                        patient_name: patient.full_name,
                        doctor_name: doctor.full_name,
                        specialty: doctor.doctor_profiles?.specialty || 'General Medicine',
                        diagnosis_context: diagnosis_context || ''
                    });
                    try {
                        const emailResultPatient = await sendEmail({ to: patient.email, ...patientEmailData });
                        if (!emailResultPatient.success) {
                            console.error('[Route] Email failed but continuing:', emailResultPatient.error);
                        }
                    } catch (emailErr) {
                        console.error('[Route] Email error caught:', emailErr.message);
                    }

                    const doctorEmailData = templates.doctorAssignedDoctor({
                        doctor_name: doctor.full_name,
                        patient_name: patient.full_name,
                        diagnosis_context: diagnosis_context || ''
                    });
                    try {
                        const emailResultDoctor = await sendEmail({ to: doctor.email, ...doctorEmailData });
                        if (!emailResultDoctor.success) {
                            console.error('[Route] Email failed but continuing:', emailResultDoctor.error);
                        }
                    } catch (emailErr) {
                        console.error('[Route] Email error caught:', emailErr.message);
                    }
                } catch (emailErr) {
                    console.error('[admin/assign] Email error:', emailErr.message);
                }
            })();
        }

        return res.status(201).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// DELETE /api/admin/assign/:id - remove assignment
router.delete('/assign/:id', async (req, res) => {
    try {
        const { error } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, message: "Assignment removed successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/admin/assignments - all assignments
router.get('/assignments', async (req, res) => {
    try {
        // Step 1: Fetch assignments + patient and doctor names (both from profiles)
        const { data, error } = await supabaseAdmin
            .from('doctor_patient_assignments')
            .select(`
                *,
                patient:profiles!doctor_patient_assignments_patient_id_fkey(full_name),
                doctor:profiles!doctor_patient_assignments_doctor_id_fkey(full_name)
            `)
            .order('assigned_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        // Step 2: Fetch all doctor specialties from doctor_profiles in one query
        const doctorIds = [...new Set(data.map(item => item.doctor_id).filter(Boolean))];
        let specialtyMap = {};
        if (doctorIds.length > 0) {
            const { data: docDetails } = await supabaseAdmin
                .from('doctor_profiles')
                .select('id, specialty')
                .in('id', doctorIds);
            if (docDetails) {
                docDetails.forEach(d => { specialtyMap[d.id] = d.specialty; });
            }
        }

        const formatted = data.map(item => ({
            ...item,
            doctor_name: item.doctor?.full_name || "Unknown Doctor",
            patient_name: item.patient?.full_name || "Unknown Patient",
            specialty: specialtyMap[item.doctor_id] || "General Medicine"
        }));

        return res.json({ success: true, data: formatted });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// POST /api/admin/doctors/create - create doctor profile
router.post('/doctors/create', async (req, res) => {
    try {
        const { email, password, full_name, phone, specialty, qualification, years_experience } = req.body;

        if (!email || !password || !full_name || !specialty) {
            return res.status(400).json({ success: false, error: "Email, password, full name and specialty are required" });
        }

        if (!supabaseAdmin) {
            return res.status(400).json({ success: false, error: "Supabase service role admin key is missing in .env" });
        }

        // Create user via Admin SDK (bypasses email confirmation)
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role: 'doctor'
            }
        });

        if (authErr) {
            return res.status(400).json({ success: false, error: authErr.message });
        }

        const doctorId = authData.user.id;

        // Force role updates in profile if trigger was delayed
        await supabaseAdmin
            .from('profiles')
            .update({ 
                role: 'doctor',
                phone: phone || null 
            })
            .eq('id', doctorId);

        // Insert specialty details in doctor_profiles
        const { error: detailErr } = await supabaseAdmin
            .from('doctor_profiles')
            .insert({
                id: doctorId,
                specialty,
                qualification: qualification || null,
                years_experience: years_experience ? parseInt(years_experience, 10) : 0,
                available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                consultation_fee: 1500.00
            });

        if (detailErr) {
            console.error("Doctor detail entry error:", detailErr.message);
        }

        // Send credentials email to the new doctor (fire and forget)
        (async () => {
            try {
                const { subject, message } = templates.doctorAccountCreated({
                    doctor_name: full_name,
                    email: email,
                    temporary_password: password
                });
                const emailResult = await sendEmail({ to: email, subject, message });
                if (!emailResult.success) {
                    console.error('[Route] Email failed but continuing:', emailResult.error);
                }
            } catch (emailErr) {
                console.error('[Route] Email error caught:', emailErr.message);
            }
        })();

        return res.status(201).json({ success: true, message: "Doctor account created successfully. They can now log in." });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// DELETE /api/admin/users/:id - deactivate user
router.delete('/users/:id', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(400).json({ success: false, error: "Supabase service role admin key is missing in .env" });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, message: "User account deactivated/deleted successfully" });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/admin/stats - get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Patients count
        const { count: patientsCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'patient');

        // Doctors count
        const { count: doctorsCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'doctor');

        // Today's appointments count
        const { count: todayCount } = await supabaseAdmin
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', todayStr);

        // Pending appointments count
        const { count: pendingCount } = await supabaseAdmin
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // Fetch all appointments to compute chart aggregates
        const { data: appointments } = await supabaseAdmin
            .from('appointments')
            .select('appointment_date, department, status');

        // Aggregate last 7 days count
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const displayLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            
            const count = appointments ? appointments.filter(a => a.appointment_date === dateStr).length : 0;
            last7Days.push({ label: displayLabel, date: dateStr, count });
        }

        // Aggregate departments count
        const deptCounts = {};
        if (appointments) {
            appointments.forEach(a => {
                deptCounts[a.department] = (deptCounts[a.department] || 0) + 1;
            });
        }
        
        const departmentsData = Object.keys(deptCounts).map(dept => ({
            label: dept.replace('-', ' ').toUpperCase(),
            count: deptCounts[dept]
        }));

        return res.json({
            success: true,
            data: {
                total_patients: patientsCount || 0,
                total_doctors: doctorsCount || 0,
                appointments_today: todayCount || 0,
                pending_appointments: pendingCount || 0,
                charts: {
                    daily_appointments: last7Days,
                    department_appointments: departmentsData
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/admin/users - manage user accounts (lists all roles)
router.get('/users', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }

        return res.json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server error: " + err.message });
    }
});

// GET /api/admin/notifications
router.get('/notifications', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[admin/notifications] Error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[admin/notifications] Unexpected error:', err.message);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
