// Patient Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboardLayout('patient', detectActiveNav());

    const page = window.location.pathname;

    if (page.includes('index') || page.endsWith('/patient/')) {
        loadPatientOverview();
        loadAssignedDoctor();
    } else if (page.includes('appointments')) {
        loadPatientAppointments();
        initBookingModal();
    } else if (page.includes('records')) {
        loadPatientRecords();
    } else if (page.includes('profile')) {
        loadPatientProfile();
    }
});

function detectActiveNav() {
    const path = window.location.pathname;
    if (path.includes('appointments')) return 'nav-appointments';
    if (path.includes('records')) return 'nav-records';
    if (path.includes('profile')) return 'nav-profile';
    return 'nav-overview';
}

// ── Patient Overview ──────────────────────────────────────────────────────────
async function loadPatientOverview() {
    const [appointmentsRes, recordsRes, assignmentRes, profileRes] = await Promise.all([
        apiRequest('/api/patients/appointments'),
        apiRequest('/api/patients/records'),
        apiRequest('/api/patients/assignment'),
        apiRequest('/api/patients/profile')
    ]);

    const appointments = (appointmentsRes && appointmentsRes.success) ? appointmentsRes.data : [];
    const records = (recordsRes && recordsRes.success) ? recordsRes.data : [];
    const assignment = (assignmentRes && assignmentRes.success) ? assignmentRes.data : null;
    const profile = (profileRes && profileRes.success) ? profileRes.data : null;

    // Update stat cards
    const today = new Date().toISOString().split('T')[0];
    const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled');

    setEl('stat-total-appointments', appointments.length);
    setEl('stat-upcoming-appointments', upcoming.length);
    setEl('stat-records-count', records.length);

    if (assignment) {
        const doctorName = assignment.doctor ? `Dr. ${assignment.doctor.full_name}` : 'Assigned';
        const specialty = assignment.doctor_details ? assignment.doctor_details.specialty : '';
        setEl('stat-assigned-doctor', doctorName + (specialty ? `\n${specialty}` : ''));
    } else {
        setEl('stat-assigned-doctor', 'Not yet assigned');
    }

    // Health snapshot
    if (profile) {
        setEl('snapshot-blood', profile.blood_group || 'Unknown');
        setEl('snapshot-gender', profile.gender || 'Not set');
        setEl('snapshot-dob', profile.date_of_birth ? formatDateNG(profile.date_of_birth) : 'Not set');
    }

    // Last visit from completed appointments
    const completed = appointments.filter(a => a.status === 'completed').sort((a, b) =>
        b.appointment_date.localeCompare(a.appointment_date)
    );
    setEl('snapshot-last-visit', completed.length > 0 ? formatDateNG(completed[0].appointment_date) : 'No visits yet');

    // Recent appointments table
    renderRecentAppointmentsTable(appointments.slice(0, 5));
}

function renderRecentAppointmentsTable(appointments) {
    const tbody = document.querySelector('#recent-appointments-table tbody');
    if (!tbody) return;

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No appointments yet. <a href="appointments.html" style="color:var(--primary-color)">Book your first appointment.</a></td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.map(a => `
        <tr>
            <td>${formatDateNG(a.appointment_date)}</td>
            <td>${formatTime(a.appointment_time)}</td>
            <td>${a.doctor ? `Dr. ${a.doctor.full_name}` : 'N/A'}</td>
            <td style="text-transform: capitalize;">${a.department}</td>
            <td>${statusBadge(a.status)}</td>
        </tr>
    `).join('');
}

// ── Patient Appointments ──────────────────────────────────────────────────────
let allAppointmentsCache = [];

async function loadPatientAppointments() {
    const res = await apiRequest('/api/patients/appointments');
    allAppointmentsCache = (res && res.success) ? res.data : [];
    renderAppointmentsTable(allAppointmentsCache);

    // Filter tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            filterAppointments(filter);
        });
    });
}

function filterAppointments(filter) {
    const today = new Date().toISOString().split('T')[0];
    let filtered = allAppointmentsCache;

    if (filter === 'upcoming') {
        filtered = allAppointmentsCache.filter(a => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed');
    } else if (filter === 'completed') {
        filtered = allAppointmentsCache.filter(a => a.status === 'completed');
    } else if (filter === 'cancelled') {
        filtered = allAppointmentsCache.filter(a => a.status === 'cancelled');
    }

    renderAppointmentsTable(filtered);
}

function renderAppointmentsTable(appointments) {
    const tbody = document.querySelector('#appointments-table tbody');
    if (!tbody) return;

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No appointments found for this filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.map(a => `
        <tr>
            <td>${formatDateNG(a.appointment_date)}</td>
            <td>${formatTime(a.appointment_time)}</td>
            <td>${a.doctor ? `Dr. ${a.doctor.full_name}` : 'N/A'}</td>
            <td style="text-transform: capitalize;">${a.department}</td>
            <td style="max-width:140px; font-size:13px;">${a.reason || 'N/A'}</td>
            <td>${statusBadge(a.status)}</td>
            <td>
                ${a.status === 'pending' ? `<button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="cancelAppointment('${a.id}')">Cancel</button>` : '-'}
            </td>
        </tr>
    `).join('');
}

async function cancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    const res = await apiRequest(`/api/patients/appointments/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        showToast('Appointment cancelled successfully.', 'success');
        loadPatientAppointments();
    } else {
        showToast(res ? res.error : 'Failed to cancel appointment.', 'error');
    }
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
function initBookingModal() {
    const openBtn = document.getElementById('open-book-modal-btn');
    const modal = document.getElementById('book-modal');
    const closeBtn = document.getElementById('close-book-modal');
    const dateInput = document.getElementById('date');

    // Set minimum date to today
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }

    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('show'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });

    // Form submit
    const form = document.getElementById('book-appointment-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Booking...';

            const payload = {
                appointment_date: document.getElementById('date').value,
                appointment_time: document.getElementById('time').value,
                department: document.getElementById('department').value,
                reason: document.getElementById('reason').value
            };

            const res = await apiRequest('/api/patients/appointments', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Booking';

            if (res && res.success) {
                showToast('Appointment booked successfully!', 'success');
                modal.classList.remove('show');
                form.reset();
                loadPatientAppointments();
            } else {
                showToast(res ? res.error : 'Booking failed. Try again.', 'error');
            }
        });
    }
}


// ── Medical Records ───────────────────────────────────────────────────────────
async function loadPatientRecords() {
    const container = document.getElementById('records-list-container');
    if (!container) return;

    const res = await apiRequest('/api/patients/records');

    if (!res || !res.success) {
        container.innerHTML = `<div class="empty-state">Failed to load medical records. Please try again.</div>`;
        return;
    }

    const records = res.data;
    if (records.length === 0) {
        container.innerHTML = `<div class="empty-state">No records yet. Your doctor will add records after your consultation.</div>`;
        return;
    }

    container.innerHTML = records.map(r => `
        <div class="record-card">
            <div class="record-header">
                <span class="record-doctor">${r.doctor ? `Dr. ${r.doctor.full_name}` : 'Unknown Doctor'}</span>
                <span class="record-date">${formatDateNG(r.record_date)}</span>
            </div>
            <div class="record-row">
                <div class="record-label">Diagnosis</div>
                <div class="record-value" style="font-weight:600;">${r.diagnosis}</div>
            </div>
            ${r.symptoms ? `<div class="record-row"><div class="record-label">Symptoms</div><div class="record-value">${r.symptoms}</div></div>` : ''}
            ${r.prescription ? `<div class="record-row"><div class="record-label">Prescription</div><div class="record-value">${r.prescription}</div></div>` : ''}
            ${r.lab_results ? `<div class="record-row"><div class="record-label">Lab Results</div><div class="record-value">${r.lab_results}</div></div>` : ''}
            ${r.follow_up_date ? `<div class="record-row"><div class="record-label">Follow-up Date</div><div class="record-value" style="color:var(--accent-color); font-weight:600;">${formatDateNG(r.follow_up_date)}</div></div>` : ''}
        </div>
    `).join('');
}

// ── Patient Profile ───────────────────────────────────────────────────────────
async function loadPatientProfile() {
    const res = await apiRequest('/api/patients/profile');
    if (!res || !res.success) {
        showToast('Failed to load profile.', 'error');
        return;
    }

    const p = res.data;
    const initials = (p.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    setEl('profile-large-initials', initials);
    setEl('profile-display-name', p.full_name || 'Patient');
    setEl('profile-email-label', p.email || '-');
    setEl('profile-joined-label', formatDateNG(p.created_at));

    // Prefill form fields
    setVal('fullname', p.full_name);
    setVal('phone', p.phone);
    setVal('dob', p.date_of_birth);
    setVal('gender', p.gender);
    setVal('blood_group', p.blood_group);
    setVal('address', p.address);

    // Profile form submit
    const profileForm = document.getElementById('profile-details-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const payload = {
                full_name: document.getElementById('fullname').value,
                phone: document.getElementById('phone').value,
                date_of_birth: document.getElementById('dob').value,
                gender: document.getElementById('gender').value,
                blood_group: document.getElementById('blood_group').value,
                address: document.getElementById('address').value
            };

            const updateRes = await apiRequest('/api/patients/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';

            if (updateRes && updateRes.success) {
                // Refresh localStorage user object
                localStorage.setItem('jph_user', JSON.stringify(updateRes.data));
                showToast('Profile updated successfully!', 'success');
                setEl('profile-display-name', updateRes.data.full_name);
                const newInitials = (updateRes.data.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                setEl('profile-large-initials', newInitials);
            } else {
                showToast(updateRes ? updateRes.error : 'Update failed.', 'error');
            }
        });
    }

    // Password form submit
    const pwdForm = document.getElementById('profile-password-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPwd = document.getElementById('new-password').value;
            const confirmPwd = document.getElementById('confirm-new-password').value;

            if (newPwd.length < 8) {
                showToast('Password must be at least 8 characters.', 'error');
                return;
            }
            if (newPwd !== confirmPwd) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            const submitBtn = pwdForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            const updateRes = await apiRequest('/api/patients/profile', {
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

function statusBadge(status) {
    const classes = {
        pending: 'badge-pending',
        confirmed: 'badge-confirmed',
        completed: 'badge-completed',
        cancelled: 'badge-cancelled'
    };
    return `<span class="badge ${classes[status] || 'badge-pending'}">${status}</span>`;
}

async function loadAssignedDoctor() {
  const result = await apiRequest('/api/patients/assigned-doctor');
  const card = document.getElementById('assigned-doctor-card');

  if (!card) return;

  if (!result || !result.success || !result.data) {
    card.innerHTML = `
      <p class="stat-label">Assigned Doctor</p>
      <p class="no-doctor">Not yet assigned</p>
      <p class="no-doctor-sub">Your doctor will be assigned by the hospital admin.</p>
    `;
    return;
  }

  const doctor = result.data.doctor;
  const profile = doctor.doctor_profiles;

  card.innerHTML = `
    <p class="stat-label">Assigned Doctor</p>
    <p class="doctor-name">Dr. ${doctor.full_name} <span class="badge-active">Active</span></p>
    <p class="doctor-specialty">${profile?.specialty || 'General Medicine'}</p>
    <p class="doctor-qual">${profile?.qualification || ''} ${profile?.years_experience ? '· ' + profile.years_experience + ' years experience' : ''}</p>
  `;
}
