// Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboardLayout('admin', detectActiveNav());

    const path = window.location.pathname;

    if (path.includes('index') || path.endsWith('/admin/')) {
        loadAdminOverview();
    } else if (path.includes('patients') && !path.includes('appointments')) {
        loadAdminPatients();
    } else if (path.includes('doctors')) {
        loadAdminDoctors();
        initAddDoctorModal();
    } else if (path.includes('assignments')) {
        loadAdminAssignments();
        initAssignModal();
    } else if (path.includes('appointments')) {
        loadAdminAppointments();
    } else if (path.includes('users')) {
        loadAdminUsers();
    }
});

function detectActiveNav() {
    const path = window.location.pathname;
    if (path.includes('patients') && !path.includes('appointments')) return 'nav-patients';
    if (path.includes('doctors')) return 'nav-doctors';
    if (path.includes('assignments')) return 'nav-assignments';
    if (path.includes('appointments')) return 'nav-appointments';
    if (path.includes('users')) return 'nav-users';
    return 'nav-overview';
}

// ── Admin Overview ────────────────────────────────────────────────────────────
async function loadAdminOverview() {
    const statsRes = await apiRequest('/api/admin/stats');
    const appointmentsRes = await apiRequest('/api/admin/appointments');

    if (statsRes && statsRes.success) {
        const s = statsRes.data;
        setEl('stat-total-patients', s.total_patients);
        setEl('stat-total-doctors', s.total_doctors);
        setEl('stat-today', s.appointments_today);
        setEl('stat-pending', s.pending_appointments);

        if (s.charts) {
            renderBarChart(s.charts.daily_appointments);
            renderPieChart(s.charts.department_appointments);
        }
    }

    if (appointmentsRes && appointmentsRes.success) {
        renderRecentActivityTable(appointmentsRes.data.slice(0, 10));
    }
}

// SVG Bar Chart - Appointments per day (last 7 days)
function renderBarChart(data) {
    const svg = document.getElementById('bar-chart-svg');
    if (!svg || !data || data.length === 0) return;

    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const maxVal = Math.max(...data.map(d => d.count), 1);
    const barWidth = chartW / data.length - 8;
    const primaryColor = '#0A6EBD';

    let svgContent = `<g transform="translate(${padding.left}, ${padding.top})">`;

    data.forEach((d, i) => {
        const barH = Math.max((d.count / maxVal) * chartH, 2);
        const x = i * (chartW / data.length) + 4;
        const y = chartH - barH;

        svgContent += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${primaryColor}" opacity="0.85"/>
            <text x="${x + barWidth / 2}" y="${chartH + 20}" class="bar-label" fill="#4A5568">${d.label}</text>
            ${d.count > 0 ? `<text x="${x + barWidth / 2}" y="${y - 4}" class="bar-label" fill="#4A5568">${d.count}</text>` : ''}
        `;
    });

    // Y-axis baseline
    svgContent += `<line x1="0" y1="${chartH}" x2="${chartW}" y2="${chartH}" stroke="#E2E8F0" stroke-width="1"/>`;
    svgContent += '</g>';
    svg.innerHTML = svgContent;
}

// SVG Pie Chart - Appointments by department
const PIE_COLORS = ['#0A6EBD', '#00B5A5', '#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899'];

function renderPieChart(data) {
    const svg = document.getElementById('pie-chart-svg');
    const legend = document.getElementById('pie-legend');
    if (!svg || !data || data.length === 0) {
        if (svg) svg.innerHTML = '<text x="100" y="100" text-anchor="middle" fill="#4A5568" font-size="13">No data yet</text>';
        return;
    }

    const total = data.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) { svg.innerHTML = '<text x="100" y="100" text-anchor="middle" fill="#4A5568" font-size="13">No data yet</text>'; return; }

    const cx = 100, cy = 100, r = 80;
    let angle = -Math.PI / 2;
    let paths = '';
    let legendHtml = '';

    data.forEach((d, i) => {
        const slice = (d.count / total) * 2 * Math.PI;
        const startAngle = angle;
        const endAngle = angle + slice;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const largeArc = slice > Math.PI ? 1 : 0;
        const color = PIE_COLORS[i % PIE_COLORS.length];

        paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" class="chart-pie-slice">
            <title>${d.label}: ${d.count} (${Math.round(d.count/total*100)}%)</title>
        </path>`;

        const pct = Math.round(d.count / total * 100);
        legendHtml += `<div style="display:flex;align-items:center;gap:6px;">
            <div style="width:12px;height:12px;border-radius:2px;background:${color};flex-shrink:0;"></div>
            <span>${d.label} (${pct}%)</span>
        </div>`;

        angle = endAngle;
    });

    svg.innerHTML = paths;
    if (legend) legend.innerHTML = legendHtml;
}

function renderRecentActivityTable(appointments) {
    const tbody = document.querySelector('#recent-activity-table tbody');
    if (!tbody) return;

    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No recent activity found.</td></tr>';
        return;
    }

    tbody.innerHTML = appointments.map(a => `
        <tr>
            <td>${a.patient ? a.patient.full_name : 'N/A'}</td>
            <td>${a.doctor ? `Dr. ${a.doctor.full_name}` : 'N/A'}</td>
            <td style="text-transform:capitalize;">${a.department}</td>
            <td>${formatDateNG(a.appointment_date)}</td>
            <td>${statusBadge(a.status)}</td>
        </tr>
    `).join('');
}

// ── Admin Patients ────────────────────────────────────────────────────────────
let allAdminPatients = [];
let adminPatientsPage = 1;
const PAGE_SIZE = 10;

async function loadAdminPatients() {
    const res = await apiRequest('/api/admin/patients');
    allAdminPatients = (res && res.success) ? res.data : [];
    renderAdminPatientsTable();

    // Search
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            adminPatientsPage = 1;
            renderAdminPatientsTable(searchInput.value.toLowerCase());
        });
    }

    // Export CSV
    const exportBtn = document.getElementById('export-patients-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportCSV(allAdminPatients,
            ['full_name', 'email', 'phone', 'gender', 'blood_group', 'assigned_doctor', 'created_at'],
            'tommys-hospital-patients.csv'));
    }

    // Pagination
    document.getElementById('prev-page-btn').addEventListener('click', () => {
        if (adminPatientsPage > 1) { adminPatientsPage--; renderAdminPatientsTable(); }
    });
    document.getElementById('next-page-btn').addEventListener('click', () => {
        const q = document.getElementById('patient-search').value.toLowerCase();
        const filtered = allAdminPatients.filter(p => !q || p.full_name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q)));
        if (adminPatientsPage * PAGE_SIZE < filtered.length) { adminPatientsPage++; renderAdminPatientsTable(q); }
    });
}

function renderAdminPatientsTable(query = '') {
    const filtered = query
        ? allAdminPatients.filter(p => p.full_name.toLowerCase().includes(query) || (p.email && p.email.toLowerCase().includes(query)))
        : allAdminPatients;

    const start = (adminPatientsPage - 1) * PAGE_SIZE;
    const page = filtered.slice(start, start + PAGE_SIZE);
    const total = filtered.length;

    const tbody = document.querySelector('#patients-table tbody');
    if (!tbody) return;

    setEl('pagination-info', `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, total)} of ${total}`);
    document.getElementById('prev-page-btn').disabled = adminPatientsPage <= 1;
    document.getElementById('next-page-btn').disabled = start + PAGE_SIZE >= total;

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No patients found.</td></tr>';
        return;
    }

    tbody.innerHTML = page.map(p => `
        <tr>
            <td>${p.full_name}</td>
            <td>${p.email}</td>
            <td>${p.phone || 'N/A'}</td>
            <td style="text-transform:capitalize;">${p.gender || 'N/A'}</td>
            <td>${p.blood_group || 'N/A'}</td>
            <td>${p.assigned_doctor || 'Not assigned'}</td>
            <td>${formatDateNG(p.created_at)}</td>
            <td><a href="../admin/assignments.html" class="btn btn-outline" style="padding:4px 10px;font-size:12px;">Assign</a></td>
        </tr>
    `).join('');
}

// ── Admin Doctors ─────────────────────────────────────────────────────────────
async function loadAdminDoctors() {
    const res = await apiRequest('/api/admin/doctors');
    const doctors = (res && res.success) ? res.data : [];

    const tbody = document.querySelector('#doctors-table tbody');
    if (!tbody) return;

    if (doctors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No doctors registered yet. Click "Add New Doctor" to create one.</td></tr>';
        return;
    }

    tbody.innerHTML = doctors.map(d => `
        <tr>
            <td>Dr. ${d.full_name}</td>
            <td>${d.specialty}</td>
            <td>${d.qualification || 'N/A'}</td>
            <td>${d.years_experience} yrs</td>
            <td>${d.patient_count}</td>
            <td>
                <a href="../admin/assignments.html" class="btn btn-outline" style="padding:4px 10px;font-size:12px;">View Patients</a>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;margin-left:4px;" onclick="deactivateUser('${d.id}', '${d.full_name}')">Deactivate</button>
            </td>
        </tr>
    `).join('');
}

function initAddDoctorModal() {
    const modal = document.getElementById('add-doctor-modal');
    const openBtn = document.getElementById('open-add-doctor-btn');
    const closeBtn = document.getElementById('close-add-doctor-modal');
    const form = document.getElementById('add-doctor-form');

    if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('show'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            const payload = {
                full_name: document.getElementById('doc-fullname').value,
                email: document.getElementById('doc-email').value,
                phone: document.getElementById('doc-phone').value,
                specialty: document.getElementById('doc-specialty').value,
                qualification: document.getElementById('doc-qualification').value,
                years_experience: document.getElementById('doc-experience').value,
                password: document.getElementById('doc-password').value
            };

            const res = await apiRequest('/api/admin/doctors/create', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Doctor Account';

            if (res && res.success) {
                showToast('Doctor account created. They can now log in.', 'success');
                modal.classList.remove('show');
                form.reset();
                loadAdminDoctors();
            } else {
                showToast(res ? res.error : 'Failed to create account.', 'error');
            }
        });
    }
}

async function deactivateUser(id, name) {
    if (!confirm(`Are you sure you want to deactivate the account for "${name}"? This action cannot be undone easily.`)) return;

    const res = await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        showToast(`Account for "${name}" deactivated.`, 'success');
        loadAdminDoctors();
    } else {
        showToast(res ? res.error : 'Deactivation failed.', 'error');
    }
}

// ── Admin Assignments ─────────────────────────────────────────────────────────
let allDoctorsCache = [];
let allPatientsForAssignment = [];

async function loadAdminAssignments() {
    const [assignmentsRes, patientsRes, doctorsRes] = await Promise.all([
        apiRequest('/api/admin/assignments'),
        apiRequest('/api/admin/patients'),
        apiRequest('/api/admin/doctors')
    ]);

    const assignments = (assignmentsRes && assignmentsRes.success) ? assignmentsRes.data : [];
    allPatientsForAssignment = (patientsRes && patientsRes.success) ? patientsRes.data : [];
    allDoctorsCache = (doctorsRes && doctorsRes.success) ? doctorsRes.data : [];

    // Unassigned patients: those with no active assignment
    const assignedIds = new Set(assignments.map(a => a.patient_id));
    const unassigned = allPatientsForAssignment.filter(p => !assignedIds.has(p.id));

    renderUnassignedPatients(unassigned);
    renderAssignmentsTable(assignments);
}

function renderUnassignedPatients(patients) {
    const container = document.getElementById('unassigned-patients-container');
    if (!container) return;

    if (patients.length === 0) {
        container.innerHTML = '<div class="empty-state">All registered patients have been assigned to a doctor.</div>';
        return;
    }

    container.innerHTML = patients.map(p => `
        <div class="unassigned-patient-card">
            <div>
                <div style="font-weight:600;">${p.full_name}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'N/A'} - Blood Group: ${p.blood_group || 'Unknown'}</div>
            </div>
            <button class="btn btn-primary" style="padding:6px 12px;font-size:12px;white-space:nowrap;" onclick="openAssignModal('${p.id}', '${p.full_name}')">Assign Doctor</button>
        </div>
    `).join('');
}

function renderAssignmentsTable(assignments) {
    const tbody = document.querySelector('#assignments-table tbody');
    if (!tbody) return;

    if (assignments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No assignments made yet.</td></tr>';
        return;
    }

    tbody.innerHTML = assignments.map(a => `
        <tr>
            <td>${a.patient_name}</td>
            <td>Dr. ${a.doctor_name}</td>
            <td>${a.specialty}</td>
            <td style="max-width:150px;font-size:13px;">${a.diagnosis_context || 'No context given'}</td>
            <td>${formatDateNG(a.assigned_at)}</td>
            <td>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="removeAssignment('${a.id}')">Remove</button>
            </td>
        </tr>
    `).join('');
}

function initAssignModal() {
    const modal = document.getElementById('assign-modal');
    const closeBtn = document.getElementById('close-assign-modal');
    const confirmBtn = document.getElementById('confirm-assign-btn');
    const doctorSelect = document.getElementById('assign-doctor-select');

    // Populate doctor dropdown
    if (doctorSelect && allDoctorsCache.length > 0) {
        doctorSelect.innerHTML = '<option value="" disabled selected>Select Doctor</option>' +
            allDoctorsCache.map(d => `<option value="${d.id}">Dr. ${d.full_name} - ${d.specialty}</option>`).join('');
    }

    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const patientId = document.getElementById('assign-patient-id').value;
            const doctorId = document.getElementById('assign-doctor-select').value;
            const context = document.getElementById('assign-context').value;

            if (!doctorId) { showToast('Please select a doctor.', 'error'); return; }

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Assigning...';

            const res = await apiRequest('/api/admin/assign', {
                method: 'POST',
                body: JSON.stringify({ patient_id: patientId, doctor_id: doctorId, diagnosis_context: context })
            });

            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Assign Doctor';

            if (res && res.success) {
                showToast('Doctor assigned successfully. Both parties have been notified.', 'success');
                modal.classList.remove('show');
                loadAdminAssignments();
            } else {
                showToast(res ? res.error : 'Assignment failed.', 'error');
            }
        });
    }
}

function openAssignModal(patientId, patientName) {
    document.getElementById('assign-patient-id').value = patientId;
    document.getElementById('assign-patient-name').value = patientName;
    document.getElementById('assign-context').value = '';

    // Update doctor dropdown in case it hasn't been initialized
    const doctorSelect = document.getElementById('assign-doctor-select');
    if (doctorSelect && allDoctorsCache.length > 0) {
        doctorSelect.innerHTML = '<option value="" disabled selected>Select Doctor</option>' +
            allDoctorsCache.map(d => `<option value="${d.id}">Dr. ${d.full_name} - ${d.specialty}</option>`).join('');
    }

    document.getElementById('assign-modal').classList.add('show');
}

async function removeAssignment(id) {
    if (!confirm('Remove this doctor-patient assignment?')) return;

    const res = await apiRequest(`/api/admin/assign/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        showToast('Assignment removed.', 'success');
        loadAdminAssignments();
    } else {
        showToast(res ? res.error : 'Removal failed.', 'error');
    }
}

// ── Admin Appointments ────────────────────────────────────────────────────────
let allAdminAppointments = [];

async function loadAdminAppointments() {
    const [apptRes, doctorsRes] = await Promise.all([
        apiRequest('/api/admin/appointments'),
        apiRequest('/api/admin/doctors')
    ]);
    allAdminAppointments = (apptRes && apptRes.success) ? apptRes.data : [];
    allDoctorsCache = (doctorsRes && doctorsRes.success) ? doctorsRes.data : [];

    // Populate doctors in manage-appt-doctor-select dropdown
    const docSelect = document.getElementById('manage-appt-doctor-select');
    if (docSelect && allDoctorsCache.length > 0) {
        docSelect.innerHTML = '<option value="">Select Doctor (or leave unassigned)</option>' +
            allDoctorsCache.map(d => `<option value="${d.id}">Dr. ${d.full_name} - ${d.specialty}</option>`).join('');
    }

    renderAdminAppointmentsTable(allAdminAppointments);
    initManageApptModal();

    // Apply filters button
    const applyBtn = document.getElementById('apply-filters-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', filterAdminAppointments);
    }

    // Export CSV
    const exportBtn = document.getElementById('export-appointments-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportCSV(allAdminAppointments,
                ['patient.full_name', 'doctor.full_name', 'department', 'appointment_date', 'appointment_time', 'status', 'reason'],
                'tommys-hospital-appointments.csv');
        });
    }
}

function filterAdminAppointments() {
    const status = document.getElementById('filter-status').value;
    const from = document.getElementById('filter-date-from').value;
    const to = document.getElementById('filter-date-to').value;

    let filtered = allAdminAppointments;
    if (status !== 'all') filtered = filtered.filter(a => a.status === status);
    if (from) filtered = filtered.filter(a => a.appointment_date >= from);
    if (to) filtered = filtered.filter(a => a.appointment_date <= to);

    renderAdminAppointmentsTable(filtered);
}

function renderAdminAppointmentsTable(appointments) {
    const tbody = document.querySelector('#admin-appointments-table tbody');
    if (!tbody) return;

    if (appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No appointments found for this filter.</td></tr>';
        return;
    }

    tbody.innerHTML = appointments.map(a => {
        // Determine requester display
        let requesterHtml;
        const isPublic = !a.patient_id;

        if (!isPublic && a.patient) {
            const newBadge = !a.is_acknowledged ? '<span class="badge-new">NEW</span>' : '';
            requesterHtml = `<span style="font-weight:600;">${a.patient.full_name}</span>${newBadge}`;
        } else if (isPublic && a.notes) {
            // Extract name from notes: "Public request from: NAME | Email: ... | Phone: ..."
            const nameMatch = a.notes.match(/Public request from:\s*([^|]+)/);
            const extractedName = nameMatch ? nameMatch[1].trim() : 'Walk-in';
            const newBadge = !a.is_acknowledged ? '<span class="badge-new">NEW</span>' : '';
            requesterHtml = `<span style="font-weight:600;">${extractedName}</span> <span class="badge badge-walkin">Walk-in</span>${newBadge}`;
        } else {
            requesterHtml = '<span style="color:var(--text-secondary);">Unknown</span>';
        }

        // Notes tooltip for public requests
        const notesTooltip = isPublic && a.notes
            ? `<span title="${a.notes.replace(/"/g, '&quot;')}" style="cursor:help;color:var(--primary-color);font-size:12px;margin-left:4px;" aria-label="View contact details">&#9432;</span>`
            : '';

        const statusHtml = isPublic && a.status === 'pending'
            ? `${statusBadge(a.status)} <span class="badge badge-public-request" style="margin-left:4px;">Public</span>`
            : statusBadge(a.status);

        return `
        <tr>
            <td>${requesterHtml}${notesTooltip}</td>
            <td>${a.doctor ? `Dr. ${a.doctor.full_name}` : '<span style="color:var(--text-secondary);font-size:13px;">Unassigned</span>'}</td>
            <td style="text-transform:capitalize;">${a.department}</td>
            <td>${formatDateNG(a.appointment_date)}</td>
            <td>${formatTime(a.appointment_time)}</td>
            <td>${statusHtml}</td>
            <td style="font-size:13px;max-width:140px;">${a.reason || 'N/A'}</td>
            <td>
                <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="openManageApptModal('${a.id}')">Manage</button>
            </td>
        </tr>`;
    }).join('');
}

function openManageApptModal(id) {
    const appt = allAdminAppointments.find(a => a.id === id);
    if (!appt) return;

    document.getElementById('manage-appt-id').value = appt.id;
    
    let requesterName = 'Walk-in';
    if (appt.patient) {
        requesterName = appt.patient.full_name;
    } else if (appt.notes) {
        const nameMatch = appt.notes.match(/Public request from:\s*([^|]+)/);
        requesterName = nameMatch ? nameMatch[1].trim() : 'Walk-in';
    }
    document.getElementById('manage-appt-requester').value = requesterName;
    document.getElementById('manage-appt-doctor-select').value = appt.doctor_id || '';
    document.getElementById('manage-appt-status-select').value = appt.status || 'pending';
    document.getElementById('manage-appt-notes').value = appt.notes || '';

    document.getElementById('manage-appt-modal').classList.add('show');

    // Acknowledge (clear NEW badge) if not yet seen
    if (!appt.is_acknowledged) {
        appt.is_acknowledged = true; // optimistic update
        apiRequest(`/api/admin/appointments/${id}/acknowledge`, { method: 'PATCH' });
        // Re-render to remove badge immediately without a full reload
        renderAdminAppointmentsTable(
            document.querySelector('#filter-status') && document.querySelector('#filter-status').value !== 'all'
                ? allAdminAppointments.filter(a => a.status === document.querySelector('#filter-status').value)
                : allAdminAppointments
        );
    }
}

function initManageApptModal() {
    const modal = document.getElementById('manage-appt-modal');
    const closeBtn = document.getElementById('close-manage-appt-modal');
    const confirmBtn = document.getElementById('confirm-manage-appt-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    }

    if (confirmBtn) {
        // Remove existing listener to prevent duplicate handlers
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', async () => {
            const id = document.getElementById('manage-appt-id').value;
            const doctor_id = document.getElementById('manage-appt-doctor-select').value;
            const status = document.getElementById('manage-appt-status-select').value;
            const notes = document.getElementById('manage-appt-notes').value;

            newConfirmBtn.disabled = true;
            newConfirmBtn.textContent = 'Saving...';

            const res = await apiRequest(`/api/admin/appointments/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ doctor_id, status, notes })
            });

            newConfirmBtn.disabled = false;
            newConfirmBtn.textContent = 'Save Changes';

            if (res && res.success) {
                showToast('Appointment updated successfully.', 'success');
                modal.classList.remove('show');
                loadAdminAppointments();
            } else {
                showToast(res ? res.error : 'Failed to update appointment.', 'error');
            }
        });
    }
}



// ── Admin Users ───────────────────────────────────────────────────────────────
let allAdminUsers = [];

async function loadAdminUsers() {
    const res = await apiRequest('/api/admin/users');
    allAdminUsers = (res && res.success) ? res.data : [];

    renderUsersTable('patient');

    document.querySelectorAll('.tab-btn[data-role]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderUsersTable(btn.dataset.role);
        });
    });

    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const activeTab = document.querySelector('.tab-btn.active[data-role]');
            renderUsersTable(activeTab ? activeTab.dataset.role : 'patient', searchInput.value.toLowerCase());
        });
    }
}

function renderUsersTable(role, query = '') {
    let filtered = allAdminUsers.filter(u => u.role === role);
    if (query) filtered = filtered.filter(u => u.full_name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));

    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No ${role}s found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => `
        <tr>
            <td>${u.full_name}</td>
            <td>${u.email}</td>
            <td style="text-transform:capitalize;">${u.role}</td>
            <td>${formatDateNG(u.created_at)}</td>
            <td>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" onclick="deactivateUser('${u.id}', '${u.full_name}')">Deactivate</button>
            </td>
        </tr>
    `).join('');
}

// ── CSV Export Helper ─────────────────────────────────────────────────────────
function exportCSV(data, fields, filename) {
    if (!data || data.length === 0) { showToast('No data to export.', 'error'); return; }

    const headers = fields.map(f => f.split('.').pop()).join(',');
    const rows = data.map(row => {
        return fields.map(f => {
            const parts = f.split('.');
            let val = row;
            for (const p of parts) val = val ? val[p] : '';
            val = val !== null && val !== undefined ? String(val) : '';
            // Escape commas and quotes
            if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val.replace(/"/g, '""')}"`;
            return val;
        }).join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
}

// ── Shared Helpers ────────────────────────────────────────────────────────────
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
