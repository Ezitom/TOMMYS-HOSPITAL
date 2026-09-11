// Doctor Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboardLayout('doctor', detectActiveNav());

    const path = window.location.pathname;

    if (path.includes('index') || path.endsWith('/doctor/')) {
        loadDoctorOverview();
    } else if (path.includes('patients')) {
        loadDoctorPatients();
    } else if (path.includes('appointments')) {
        loadDoctorAppointments();
        initNotesModal();
    } else if (path.includes('records')) {
        loadDoctorRecords();
        initAddRecordModal();
    } else if (path.includes('profile')) {
        loadDoctorProfile();
    }
});

function detectActiveNav() {
    const path = window.location.pathname;
    if (path.includes('patients')) return 'nav-patients';
    if (path.includes('appointments')) return 'nav-appointments';
    if (path.includes('records')) return 'nav-records';
    if (path.includes('profile')) return 'nav-profile';
    return 'nav-overview';
}

// ── Doctor Overview ───────────────────────────────────────────────────────────
async function loadDoctorOverview() {
    const [patientsRes, appointmentsRes] = await Promise.all([
        apiRequest('/api/doctors/patients'),
        apiRequest('/api/doctors/appointments')
    ]);

    const patients = (patientsRes && patientsRes.success) ? patientsRes.data : [];
    const appointments = (appointmentsRes && appointmentsRes.success) ? appointmentsRes.data : [];

    const today = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.appointment_date === today);
    const pending = appointments.filter(a => a.status === 'pending');

    const thisMonth = new Date().toISOString().substring(0, 7);
    const completedMonth = appointments.filter(a => a.status === 'completed' && a.appointment_date.startsWith(thisMonth));

    setEl('stat-total-patients', patients.length);
    setEl('stat-today-appointments', todayAppts.length);
    setEl('stat-pending-appointments', pending.length);
    setEl('stat-completed-month', completedMonth.length);

    renderTodaysSchedule(todayAppts);
    renderRecentPatientsTable(patients.slice(0, 5));
}

function renderTodaysSchedule(appts) {
    const container = document.getElementById('todays-schedule-container');
    if (!container) return;

    if (appts.length === 0) {
        container.innerHTML = `<div class="empty-state">No appointments scheduled for today.</div>`;
        return;
    }

    const sorted = [...appts].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

    container.innerHTML = sorted.map(a => `
        <div style="display:flex;gap:16px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--border-color);">
            <div style="background:var(--primary-color);color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;white-space:nowrap;min-width:70px;text-align:center;">
                ${formatTime(a.appointment_time)}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600;">${a.patient ? a.patient.full_name : 'Unknown Patient'}</div>
                <div style="font-size:13px;color:var(--text-secondary);">${a.reason || 'General consultation'}</div>
            </div>
            <div>${statusBadge(a.status)}</div>
        </div>
    `).join('');
}

function renderRecentPatientsTable(patients) {
    const tbody = document.querySelector('#recent-patients-table tbody');
    if (!tbody) return;

    if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No assigned patients yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = patients.map(p => {
        const age = p.date_of_birth ? calcAge(p.date_of_birth) : 'N/A';
        return `
            <tr>
                <td>${p.full_name}</td>
                <td>${p.blood_group || 'N/A'}</td>
                <td>${p.assigned_at ? formatDateNG(p.assigned_at) : 'N/A'}</td>
                <td><a href="records.html?patientId=${p.id}" class="btn btn-outline" style="padding:4px 10px;font-size:12px;">View Records</a></td>
            </tr>
        `;
    }).join('');
}

// ── Doctor Patients ───────────────────────────────────────────────────────────
let allPatientsCache = [];

async function loadDoctorPatients() {
    const res = await apiRequest('/api/doctors/patients');
    allPatientsCache = (res && res.success) ? res.data : [];
    renderPatientsTable(allPatientsCache);

    // Search filter
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            const filtered = allPatientsCache.filter(p => p.full_name.toLowerCase().includes(q));
            renderPatientsTable(filtered);
        });
    }
}

function renderPatientsTable(patients) {
    const tbody = document.querySelector('#patients-table tbody');
    if (!tbody) return;

    if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No patients found.</td></tr>`;
        return;
    }

    tbody.innerHTML = patients.map(p => {
        const age = p.date_of_birth ? calcAge(p.date_of_birth) : 'N/A';
        return `
            <tr>
                <td>${p.full_name}</td>
                <td>${age}</td>
                <td style="text-transform:capitalize;">${p.gender || 'N/A'}</td>
                <td>${p.blood_group || 'N/A'}</td>
                <td style="max-width:160px;font-size:13px;">${p.diagnosis_context || 'Not specified'}</td>
                <td>${formatDateNG(p.assigned_at)}</td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                    <a href="records.html?patientId=${p.id}" class="btn btn-outline" style="padding:4px 10px;font-size:12px;">View Records</a>
                    <a href="records.html?patientId=${p.id}&action=add" class="btn btn-accent" style="padding:4px 10px;font-size:12px;">Add Record</a>
                </td>
            </tr>
        `;
    }).join('');
}

// ── Doctor Appointments ───────────────────────────────────────────────────────
let allDoctorAppointments = [];

async function loadDoctorAppointments() {
    const res = await apiRequest('/api/doctors/appointments');
    allDoctorAppointments = (res && res.success) ? res.data : [];
    renderDoctorAppointmentsTable(allDoctorAppointments);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterDoctorAppointments(btn.dataset.filter);
        });
    });
}

function filterDoctorAppointments(filter) {
    const today = new Date().toISOString().split('T')[0];
    let filtered = allDoctorAppointments;

    if (filter === 'today') filtered = allDoctorAppointments.filter(a => a.appointment_date === today);
    else if (filter === 'upcoming') filtered = allDoctorAppointments.filter(a => a.appointment_date > today && a.status !== 'cancelled' && a.status !== 'completed');
    else if (filter === 'completed') filtered = allDoctorAppointments.filter(a => a.status === 'completed');
    else if (filter === 'cancelled') filtered = allDoctorAppointments.filter(a => a.status === 'cancelled');

    renderDoctorAppointmentsTable(filtered);
}

function renderDoctorAppointmentsTable(appointments) {
    const tbody = document.querySelector('#appointments-table tbody');
    if (!tbody) return;

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No appointments found for this filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.map(a => {
        let actions = '';
        if (a.status === 'pending') {
            actions = `<button class="btn btn-accent" style="padding:4px 10px;font-size:12px;" onclick="updateApptStatus('${a.id}','confirmed')">Confirm</button>`;
        } else if (a.status === 'confirmed') {
            actions = `<button class="btn btn-accent" style="padding:4px 10px;font-size:12px;" onclick="updateApptStatus('${a.id}','completed')">Mark Complete</button>`;
        }
        if (a.status !== 'cancelled' && a.status !== 'completed') {
            actions += ` <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="updateApptStatus('${a.id}','cancelled')">Cancel</button>`;
        }
        actions += ` <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="openNotesModal('${a.id}')">Notes</button>`;

        return `
            <tr>
                <td>${formatDateNG(a.appointment_date)}</td>
                <td>${formatTime(a.appointment_time)}</td>
                <td>${a.patient ? a.patient.full_name : 'Unknown'}</td>
                <td style="max-width:160px;font-size:13px;">${a.reason || 'N/A'}</td>
                <td>${statusBadge(a.status)}</td>
                <td style="display:flex;gap:4px;flex-wrap:wrap;">${actions}</td>
            </tr>
        `;
    }).join('');
}

async function updateApptStatus(id, status) {
    if (status === 'cancelled' && !confirm('Are you sure you want to cancel this appointment?')) return;

    const res = await apiRequest(`/api/doctors/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });

    if (res && res.success) {
        showToast(`Appointment ${status} successfully.`, 'success');
        loadDoctorAppointments();
    } else {
        showToast(res ? res.error : 'Action failed. Try again.', 'error');
    }
}

function initNotesModal() {
    const modal = document.getElementById('notes-modal');
    const closeBtn = document.getElementById('close-notes-modal');
    const saveBtn = document.getElementById('save-notes-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const id = document.getElementById('notes-appointment-id').value;
            const notes = document.getElementById('appointment-notes-input').value;

            const res = await apiRequest(`/api/doctors/appointments/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ notes })
            });

            if (res && res.success) {
                showToast('Notes saved.', 'success');
                modal.classList.remove('show');
            } else {
                showToast(res ? res.error : 'Save failed.', 'error');
            }
        });
    }
}

function openNotesModal(appointmentId) {
    document.getElementById('notes-appointment-id').value = appointmentId;
    document.getElementById('appointment-notes-input').value = '';
    document.getElementById('notes-modal').classList.add('show');
}

// ── Doctor Records ────────────────────────────────────────────────────────────
async function loadDoctorRecords() {
    const params = new URLSearchParams(window.location.search);
    const patientId = params.get('patientId');
    const shouldAddRecord = params.get('action') === 'add';

    const container = document.getElementById('doctor-records-container');
    if (!container) return;

    let url = patientId ? `/api/doctors/records/${patientId}` : '/api/doctors/patients';
    
    if (patientId) {
        const res = await apiRequest(`/api/doctors/records/${patientId}`);
        const records = (res && res.success) ? res.data : [];
        renderDoctorRecords(records, patientId);

        if (shouldAddRecord) {
            setTimeout(() => {
                const modal = document.getElementById('record-modal');
                if (modal) modal.classList.add('show');
            }, 500);
        }
    } else {
        // Show all assigned patients summary with records
        const pRes = await apiRequest('/api/doctors/patients');
        const patients = (pRes && pRes.success) ? pRes.data : [];
        
        if (patients.length === 0) {
            container.innerHTML = '<div class="empty-state">No assigned patients. Records will appear once patients are assigned to you.</div>';
            return;
        }

        // Build patient record links
        container.innerHTML = patients.map(p => `
            <div class="record-card">
                <div class="record-header">
                    <span class="record-doctor" style="font-size:16px;">${p.full_name}</span>
                    <a href="records.html?patientId=${p.id}" class="btn btn-outline" style="padding:4px 10px;font-size:12px;">View All Records</a>
                </div>
                <div style="font-size:13px;color:var(--text-secondary);">
                    Assigned ${formatDateNG(p.assigned_at)} 
                    ${p.diagnosis_context ? ' - Context: ' + p.diagnosis_context : ''}
                </div>
            </div>
        `).join('');
    }
}

function renderDoctorRecords(records, patientId) {
    const container = document.getElementById('doctor-records-container');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = `<div class="empty-state">No records found for this patient yet. Use "Add New Record" above to create one.</div>`;
        return;
    }

    container.innerHTML = records.map(r => `
        <div class="record-card">
            <div class="record-header">
                <span class="record-doctor">Patient: ${r.patient ? r.patient.full_name : 'Unknown'}</span>
                <span class="record-date">${formatDateNG(r.record_date)}</span>
            </div>
            <div class="record-row"><div class="record-label">Diagnosis</div><div class="record-value" style="font-weight:600;">${r.diagnosis}</div></div>
            ${r.symptoms ? `<div class="record-row"><div class="record-label">Symptoms</div><div class="record-value">${r.symptoms}</div></div>` : ''}
            ${r.prescription ? `<div class="record-row"><div class="record-label">Prescription</div><div class="record-value">${r.prescription}</div></div>` : ''}
            ${r.lab_results ? `<div class="record-row"><div class="record-label">Lab Results</div><div class="record-value">${r.lab_results}</div></div>` : ''}
            ${r.follow_up_date ? `<div class="record-row"><div class="record-label">Follow-up Date</div><div class="record-value" style="color:var(--accent-color);font-weight:600;">${formatDateNG(r.follow_up_date)}</div></div>` : ''}
        </div>
    `).join('');
}

async function initAddRecordModal() {
    const modal = document.getElementById('record-modal');
    const openBtn = document.getElementById('open-record-modal-btn');
    const closeBtn = document.getElementById('close-record-modal');
    const patientSelect = document.getElementById('record-patient');
    const form = document.getElementById('add-record-form');

    // Load patients into dropdown
    const pRes = await apiRequest('/api/doctors/patients');
    const patients = (pRes && pRes.success) ? pRes.data : [];

    if (patientSelect) {
        patients.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.full_name;
            patientSelect.appendChild(opt);
        });

        // Pre-select patient if patientId in URL
        const params = new URLSearchParams(window.location.search);
        const preselect = params.get('patientId');
        if (preselect) patientSelect.value = preselect;
    }

    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('show'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const payload = {
                patient_id: document.getElementById('record-patient').value,
                diagnosis: document.getElementById('record-diagnosis').value,
                symptoms: document.getElementById('record-symptoms').value,
                prescription: document.getElementById('record-prescription').value,
                lab_results: document.getElementById('record-lab').value,
                follow_up_date: document.getElementById('record-followup').value || null
            };

            const res = await apiRequest('/api/doctors/records', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Record';

            if (res && res.success) {
                showToast('Medical record saved successfully.', 'success');
                modal.classList.remove('show');
                form.reset();
                loadDoctorRecords();
            } else {
                showToast(res ? res.error : 'Save failed. Try again.', 'error');
            }
        });
    }
}

// ── Doctor Profile ────────────────────────────────────────────────────────────
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

async function loadDoctorProfile() {
    const res = await apiRequest('/api/doctors/profile');
    if (!res || !res.success) {
        showToast('Failed to load profile.', 'error');
        return;
    }

    const p = res.data;
    const details = p.details || {};
    const initials = (p.full_name || 'D').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    setEl('profile-large-initials', initials);
    setEl('profile-display-name', p.full_name || 'Doctor');
    setEl('profile-email-label', p.email || '-');
    setEl('profile-specialty-label', details.specialty || 'General Medicine');
    setEl('profile-exp-label', details.years_experience || '0');

    setVal('fullname', p.full_name);
    setVal('phone', p.phone);
    setVal('specialty', details.specialty);
    setVal('qualification', details.qualification);
    setVal('years_experience', details.years_experience);
    setVal('consultation_fee', details.consultation_fee);
    setVal('bio', details.bio);

    // Render available days checkboxes
    const grid = document.getElementById('available-days-grid');
    if (grid) {
        const savedDays = details.available_days || [];
        grid.innerHTML = WEEKDAYS.map(day => `
            <label class="checkbox-item">
                <input type="checkbox" name="available_days" value="${day}" ${savedDays.includes(day) ? 'checked' : ''}>
                ${day.substring(0, 3)}
            </label>
        `).join('');
    }

    // Profile form submit
    const form = document.getElementById('doctor-profile-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const selectedDays = Array.from(document.querySelectorAll('input[name="available_days"]:checked')).map(el => el.value);

            const payload = {
                full_name: document.getElementById('fullname').value,
                phone: document.getElementById('phone').value,
                specialty: document.getElementById('specialty').value,
                qualification: document.getElementById('qualification').value,
                years_experience: document.getElementById('years_experience').value,
                consultation_fee: document.getElementById('consultation_fee').value,
                bio: document.getElementById('bio').value,
                available_days: selectedDays
            };

            const updateRes = await apiRequest('/api/doctors/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Profile';

            if (updateRes && updateRes.success) {
                showToast('Profile updated successfully!', 'success');
                setEl('profile-specialty-label', payload.specialty);
            } else {
                showToast(updateRes ? updateRes.error : 'Update failed.', 'error');
            }
        });
    }

    // Password form
    const pwdForm = document.getElementById('doctor-password-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPwd = document.getElementById('new-password').value;
            const confirmPwd = document.getElementById('confirm-new-password').value;

            if (newPwd.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
            if (newPwd !== confirmPwd) { showToast('Passwords do not match.', 'error'); return; }

            const submitBtn = pwdForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            const updateRes = await apiRequest('/api/doctors/profile', {
                method: 'PUT',
                body: JSON.stringify({ password: newPwd })
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';

            if (updateRes && updateRes.success) {
                showToast('Password updated successfully!', 'success');
                pwdForm.reset();
            } else {
                showToast(updateRes ? updateRes.error : 'Password update failed.', 'error');
            }
        });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el && value !== null && value !== undefined) el.value = value;
}

function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${minutes} ${ampm}`;
}

function calcAge(dob) {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function statusBadge(status) {
    const classes = {
        pending: 'badge-pending',
        confirmed: 'badge-confirmed',
        completed: 'badge-completed',
        cancelled: 'badge-cancelled'
    };
    return `<span class="badge ${classes[status] || 'badge-pending'}">${status}</span>`;
}
