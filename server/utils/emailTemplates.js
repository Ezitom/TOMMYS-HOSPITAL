/**
 * Email Templates for TOMMY'S HOSPITAL
 * Shared responsive HTML wrapper with flat brand color palette
 *
 * Brand Palette:
 * Primary:      #0A6EBD
 * Primary Dark: #084E8A
 * Accent:       #00B5A5
 * Text Primary: #0D1B2A
 * Text Muted:   #4A5568
 * Surface / BG: #F5F7FA
 * Border:       #E2E8F0
 * White:        #FFFFFF
 */

function getAppUrl() {
  const url = process.env.FRONTEND_URL || 'https://tommyshospital.com';
  return url.replace(/\/$/, '');
}

/**
 * Shared HTML email wrapper function
 * Wraps content in a responsive 600px max-width container with branded header and footer.
 */
function sharedEmailWrapper({ title, preheader, content }) {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || "TOMMY'S HOSPITAL"}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #0D1B2A;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F5F7FA;">${preheader}</div>` : ''}
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F7FA; margin: 0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (max-width: 600px) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0A6EBD; padding: 24px 30px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin: 0;">
                      TOMMY'S HOSPITAL
                    </div>
                    <div style="color: #F5F7FA; font-size: 12px; margin-top: 4px; opacity: 0.9;">
                      12 Hospital Road, Ikeja, Lagos, Nigeria &bull; +234 801 234 5678
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 32px 30px; background-color: #FFFFFF; color: #0D1B2A; font-size: 15px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #F5F7FA; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center; color: #4A5568; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 500; color: #4A5568;">
                This is an automated message from <strong style="color: #0D1B2A;">TOMMY'S HOSPITAL</strong>.
              </p>
              <p style="margin: 0 0 6px 0; color: #4A5568;">
                Please do not reply directly to this email. For enquiries call 
                <strong style="color: #0D1B2A;">+234 801 234 5678</strong> or email 
                <a href="mailto:info@tommyshospital.com" style="color: #0A6EBD; text-decoration: none; font-weight: 500;">info@tommyshospital.com</a>.
              </p>
              <p style="margin: 10px 0 0 0; color: #718096; font-size: 11px;">
                &copy; ${currentYear} TOMMY'S HOSPITAL. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Helper to render key-value details table inside email body
 */
function renderDetailsTable(rows) {
  const validRows = rows.filter(r => r && r.value !== undefined && r.value !== null && r.value !== '');
  if (!validRows.length) return '';

  const trs = validRows.map((row, index) => {
    const isLast = index === validRows.length - 1;
    const borderStyle = isLast ? '' : 'border-bottom: 1px solid #E2E8F0;';
    return `
      <tr>
        <td style="padding: 10px 14px; width: 34%; font-weight: 600; color: #4A5568; font-size: 13px; ${borderStyle} vertical-align: top;">
          ${row.label}
        </td>
        <td style="padding: 10px 14px; color: #0D1B2A; font-size: 14px; font-weight: 500; ${borderStyle} vertical-align: top;">
          ${row.value}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F7FA; border: 1px solid #E2E8F0; border-left: 4px solid #0A6EBD; border-radius: 6px; margin: 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tbody>
        ${trs}
      </tbody>
    </table>
  `;
}

/**
 * Helper to render a consistent CTA button
 */
function renderButton(text, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 16px 0;">
      <tr>
        <td align="center" style="background-color: #0A6EBD; border-radius: 6px;">
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 6px;">
            ${text} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Helper to render a callout message box
 */
function renderCallout(text, borderColor = '#0A6EBD') {
  return `
    <div style="background-color: #F5F7FA; border-left: 4px solid ${borderColor}; padding: 12px 16px; margin: 18px 0; border-radius: 4px; font-size: 14px; color: #4A5568; line-height: 1.5;">
      ${text}
    </div>
  `;
}

// -------------------------------------------------------------
// 1. Welcome email for new patient registration
// -------------------------------------------------------------
function welcomePatient({ full_name }) {
  const subject = "Welcome to TOMMY'S HOSPITAL";
  const loginUrl = `${getAppUrl()}/dashboards/auth/login.html?role=patient`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Welcome to TOMMY'S HOSPITAL</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>${full_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      Welcome to TOMMY'S HOSPITAL. Your patient account has been created successfully.
    </p>

    <div style="background-color: #F5F7FA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #0D1B2A; font-size: 14px;">You can now log in to your patient dashboard to:</p>
      <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 14px; line-height: 1.7;">
        <li>Book and manage appointments</li>
        <li>View your medical records and diagnoses</li>
        <li>Track your assigned doctor</li>
      </ul>
    </div>

    ${renderButton('Log In to Patient Dashboard', loginUrl)}

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #718096; line-height: 1.5;">
      If you did not create this account, please contact us immediately at <a href="mailto:info@tommyshospital.com" style="color: #0A6EBD; text-decoration: none;">info@tommyshospital.com</a>.
    </p>
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Welcome to TOMMY'S HOSPITAL, ${full_name}. Your account is ready.`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 2. New appointment booked by patient (notify admin)
// -------------------------------------------------------------
function newAppointmentAdmin({ patient_name, department, appointment_date, appointment_time, reason }) {
  const subject = `New Appointment Request: ${patient_name}`;
  const adminUrl = `${getAppUrl()}/dashboards/auth/login.html?role=admin`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">New Appointment Request</h2>
    
    <p style="margin: 0 0 14px 0; color: #4A5568;">
      A new appointment has been booked by a patient and requires your review:
    </p>

    ${renderDetailsTable([
      { label: 'Patient Name', value: patient_name },
      { label: 'Department', value: department },
      { label: 'Date', value: appointment_date },
      { label: 'Time', value: appointment_time },
      { label: 'Reason for Visit', value: reason || 'Not specified' }
    ])}

    <p style="margin: 16px 0 0 0; color: #4A5568; font-size: 14px;">
      Please log in to the admin dashboard to assign a doctor and confirm this appointment.
    </p>

    ${renderButton('Open Admin Dashboard', adminUrl)}
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `New appointment booked by ${patient_name} (${department})`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 3. New public appointment request from website (notify admin)
// -------------------------------------------------------------
function newPublicAppointmentAdmin({ full_name, email, phone, department, preferred_date, preferred_time, reason }) {
  const subject = `New Public Appointment Request: ${full_name}`;
  const adminUrl = `${getAppUrl()}/dashboards/auth/login.html?role=admin`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Website Appointment Request</h2>
    
    <p style="margin: 0 0 14px 0; color: #4A5568;">
      A new appointment request has been submitted directly from the TOMMY'S HOSPITAL website:
    </p>

    ${renderDetailsTable([
      { label: 'Full Name', value: full_name },
      { label: 'Email', value: email },
      { label: 'Phone', value: phone || 'Not provided' },
      { label: 'Department', value: department },
      { label: 'Preferred Date', value: preferred_date },
      { label: 'Preferred Time', value: preferred_time },
      { label: 'Reason for Visit', value: reason || 'Not specified' }
    ])}

    ${renderCallout('<strong>Note:</strong> This person may or may not have an existing patient account. Please contact them to confirm the appointment and assign an appropriate doctor.', '#00B5A5')}

    ${renderButton('Open Admin Dashboard', adminUrl)}
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Public booking request from ${full_name} (${department})`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 4. Appointment confirmed (notify patient)
// -------------------------------------------------------------
function appointmentConfirmed({ patient_name, doctor_name, department, appointment_date, appointment_time }) {
  const subject = 'Your Appointment Has Been Confirmed';
  const patientUrl = `${getAppUrl()}/dashboards/auth/login.html?role=patient`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Appointment Confirmed</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>${patient_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      Your appointment at <strong style="color: #0D1B2A;">TOMMY'S HOSPITAL</strong> has been confirmed. Below are your scheduled details:
    </p>

    ${renderDetailsTable([
      { label: 'Attending Doctor', value: `Dr. ${doctor_name}` },
      { label: 'Department', value: department },
      { label: 'Date', value: appointment_date },
      { label: 'Time', value: appointment_time }
    ])}

    <div style="background-color: #F5F7FA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #0D1B2A; font-size: 14px;">Important Reminders:</p>
      <ul style="margin: 0; padding-left: 20px; color: #4A5568; font-size: 13px; line-height: 1.6;">
        <li>Please arrive <strong>15 minutes before</strong> your scheduled appointment time.</li>
        <li>Bring any previous medical records, test results, or current prescriptions if available.</li>
      </ul>
    </div>

    ${renderButton('View Appointment Details', patientUrl)}
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Your appointment with Dr. ${doctor_name} is confirmed for ${appointment_date} at ${appointment_time}.`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 5. Appointment cancelled (notify patient)
// -------------------------------------------------------------
function appointmentCancelled({ patient_name, department, appointment_date, appointment_time }) {
  const subject = 'Your Appointment Has Been Cancelled';
  const rebookUrl = `${getAppUrl()}/dashboards/auth/login.html?role=patient`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #D32F2F; font-size: 20px; font-weight: 700; line-height: 1.3;">Appointment Cancelled</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>${patient_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      Your appointment scheduled for <strong style="color: #0D1B2A;">${appointment_date}</strong> at <strong style="color: #0D1B2A;">${appointment_time}</strong> in the <strong style="color: #0D1B2A;">${department}</strong> department has been cancelled.
    </p>

    ${renderCallout(`
      If you did not request this cancellation or would like to rebook your appointment, please reach out to our team:
      <div style="margin-top: 8px; font-weight: 500; color: #0D1B2A;">
        Phone: <strong>+234 801 234 5678</strong><br>
        Email: <a href="mailto:info@tommyshospital.com" style="color: #0A6EBD; text-decoration: none;">info@tommyshospital.com</a>
      </div>
    `, '#EF4444')}

    <p style="margin: 16px 0 0 0; color: #4A5568; font-size: 14px;">
      You can also book a new appointment directly from your patient portal:
    </p>

    ${renderButton('Book a New Appointment', rebookUrl)}
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Your appointment for ${department} on ${appointment_date} has been cancelled.`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 6. Appointment completed (notify patient)
// -------------------------------------------------------------
function appointmentCompleted({ patient_name, doctor_name, department, appointment_date }) {
  const subject = 'Your Appointment is Complete';
  const recordsUrl = `${getAppUrl()}/dashboards/auth/login.html?role=patient`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Appointment Completed</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>${patient_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      Your appointment with <strong style="color: #0D1B2A;">Dr. ${doctor_name}</strong> (<strong style="color: #0D1B2A;">${department}</strong>) on <strong style="color: #0D1B2A;">${appointment_date}</strong> has been marked as completed.
    </p>

    <div style="background-color: #F5F7FA; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; color: #0D1B2A; font-weight: 600; font-size: 14px;">Medical Records Updated</p>
      <p style="margin: 0; color: #4A5568; font-size: 13px; line-height: 1.6;">
        Your consultation notes and prescriptions have been updated in your profile. If you have a follow-up visit scheduled, you will receive a separate notification.
      </p>
    </div>

    ${renderButton('View Your Medical Records', recordsUrl)}

    <p style="margin: 20px 0 0 0; color: #4A5568; font-size: 14px;">
      Thank you for choosing <strong>TOMMY'S HOSPITAL</strong> for your healthcare needs.
    </p>
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Your consultation with Dr. ${doctor_name} is complete. Medical records updated.`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 7. Doctor assigned to patient (notify patient)
// -------------------------------------------------------------
function doctorAssignedPatient({ patient_name, doctor_name, specialty, diagnosis_context }) {
  const subject = 'A Doctor Has Been Assigned to Your Care';
  const dashboardUrl = `${getAppUrl()}/dashboards/auth/login.html?role=patient`;

  const rows = [
    { label: 'Assigned Doctor', value: `Dr. ${doctor_name}` },
    { label: 'Specialty', value: specialty }
  ];

  if (diagnosis_context) {
    rows.push({ label: 'Notes', value: diagnosis_context });
  }

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Doctor Assigned to Your Care</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>${patient_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      We are pleased to inform you that a dedicated doctor has been assigned to oversee your care at <strong style="color: #0D1B2A;">TOMMY'S HOSPITAL</strong>.
    </p>

    ${renderDetailsTable(rows)}

    <p style="margin: 16px 0 0 0; color: #4A5568; font-size: 14px;">
      You can view your doctor's full profile and consultation details directly in your patient dashboard:
    </p>

    ${renderButton('View Doctor Details', dashboardUrl)}

    <p style="margin: 18px 0 0 0; font-size: 13px; color: #718096;">
      If you have any questions, please contact our team at <strong>+234 801 234 5678</strong>.
    </p>
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Dr. ${doctor_name} (${specialty}) has been assigned to your care at TOMMY'S HOSPITAL.`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 8. Doctor assigned a new patient (notify doctor)
// -------------------------------------------------------------
function doctorAssignedDoctor({ doctor_name, patient_name, diagnosis_context }) {
  const subject = `New Patient Assigned: ${patient_name}`;
  const doctorUrl = `${getAppUrl()}/dashboards/auth/login.html?role=doctor`;

  const rows = [
    { label: 'Patient Name', value: patient_name }
  ];

  if (diagnosis_context) {
    rows.push({ label: 'Diagnosis Context', value: diagnosis_context });
  }

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">New Patient Assignment</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>Dr. ${doctor_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      A new patient has been assigned to your care by the hospital admin team:
    </p>

    ${renderDetailsTable(rows)}

    <p style="margin: 16px 0 0 0; color: #4A5568; font-size: 14px;">
      Please log in to your doctor dashboard to review the patient's medical history and manage upcoming consultations:
    </p>

    ${renderButton('Open Doctor Dashboard', doctorUrl)}
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `New patient assignment: ${patient_name}`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 9. New medical record added (notify patient)
// -------------------------------------------------------------
function medicalRecordAdded({ patient_name, doctor_name, diagnosis, follow_up_date }) {
  const subject = 'New Medical Record Added to Your Profile';
  const recordsUrl = `${getAppUrl()}/dashboards/auth/login.html?role=patient`;

  const rows = [
    { label: 'Attending Doctor', value: `Dr. ${doctor_name}` },
    { label: 'Diagnosis', value: diagnosis }
  ];

  if (follow_up_date) {
    rows.push({ label: 'Follow-up Date', value: follow_up_date });
  }

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Medical Record Update</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>${patient_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      <strong style="color: #0D1B2A;">Dr. ${doctor_name}</strong> has added a new medical record to your health profile:
    </p>

    ${renderDetailsTable(rows)}

    <p style="margin: 16px 0 0 0; color: #4A5568; font-size: 14px;">
      To view prescriptions, treatment plans, and notes, log in to your patient dashboard:
    </p>

    ${renderButton('View Full Medical Record', recordsUrl)}
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `A new medical record has been added to your profile by Dr. ${doctor_name}.`,
    content
  });

  return { subject, message: html, html };
}

// -------------------------------------------------------------
// 10. New doctor account created (notify doctor)
// -------------------------------------------------------------
function doctorAccountCreated({ doctor_name, email, temporary_password }) {
  const subject = "Your TOMMY'S HOSPITAL Doctor Account Has Been Created";
  const doctorUrl = `${getAppUrl()}/dashboards/auth/login.html?role=doctor`;

  const content = `
    <h2 style="margin: 0 0 16px 0; color: #0D1B2A; font-size: 20px; font-weight: 700; line-height: 1.3;">Doctor Account Created</h2>
    
    <p style="margin: 0 0 14px 0;">Dear <strong>Dr. ${doctor_name}</strong>,</p>
    
    <p style="margin: 0 0 16px 0; color: #4A5568;">
      Your staff account at <strong style="color: #0D1B2A;">TOMMY'S HOSPITAL</strong> has been provisioned by the administration team.
    </p>

    ${renderDetailsTable([
      { label: 'Login Email', value: email },
      { label: 'Temporary Password', value: `<code style="background-color: #E2E8F0; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; color: #0D1B2A;">${temporary_password}</code>` }
    ])}

    ${renderCallout('<strong>Security Notice:</strong> Please log in and change your temporary password immediately upon your first sign-in.', '#F59E0B')}

    ${renderButton('Log In to Doctor Dashboard', doctorUrl)}

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #718096; line-height: 1.5;">
      If you did not expect this invitation, please contact hospital administration immediately at <a href="mailto:info@tommyshospital.com" style="color: #0A6EBD; text-decoration: none;">info@tommyshospital.com</a>.
    </p>
  `;

  const html = sharedEmailWrapper({
    title: subject,
    preheader: `Your TOMMY'S HOSPITAL doctor account credentials for ${email}`,
    content
  });

  return { subject, message: html, html };
}

module.exports = {
  sharedEmailWrapper,
  welcomePatient,
  newAppointmentAdmin,
  newPublicAppointmentAdmin,
  appointmentConfirmed,
  appointmentCancelled,
  appointmentCompleted,
  doctorAssignedPatient,
  doctorAssignedDoctor,
  medicalRecordAdded,
  doctorAccountCreated
};
