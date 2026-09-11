function hospitalHeader() {
  return `
TOMMY'S HOSPITAL
12 Hospital Road, Ikeja, Lagos, Nigeria
+234 801 234 5678 | info@justpathhospital.com
-------------------------------------------
  `;
}

function hospitalFooter() {
  return `
-------------------------------------------
This is an automated message from TOMMY'S HOSPITAL.
Please do not reply directly to this email.
For enquiries call +234 801 234 5678 or email info@justpathhospital.com
  `;
}

// 1. Welcome email for new patient registration
function welcomePatient({ full_name }) {
  return {
    subject: 'Welcome to TOMMY\'S HOSPITAL',
    message: `
${hospitalHeader()}

Dear ${full_name},

Welcome to TOMMY'S HOSPITAL. Your patient account has been created successfully.

You can now log in to your patient dashboard to:
- Book appointments
- View your medical records
- Track your assigned doctor

Login here: http://justpathhospital.com/dashboards/auth/login.html?role=patient

If you did not create this account, please contact us immediately.

${hospitalFooter()}
    `
  };
}

// 2. New appointment booked by patient (notify admin)
function newAppointmentAdmin({ patient_name, department, appointment_date, appointment_time, reason }) {
  return {
    subject: `New Appointment Request: ${patient_name}`,
    message: `
${hospitalHeader()}

A new appointment has been booked and requires your attention.

Patient: ${patient_name}
Department: ${department}
Date: ${appointment_date}
Time: ${appointment_time}
Reason: ${reason}

Please log in to the admin dashboard to assign a doctor and confirm this appointment.

Admin Dashboard: http://justpathhospital.com/dashboards/auth/login.html?role=admin

${hospitalFooter()}
    `
  };
}

// 3. New public appointment request from website (notify admin)
function newPublicAppointmentAdmin({ full_name, email, phone, department, preferred_date, preferred_time, reason }) {
  return {
    subject: `New Public Appointment Request: ${full_name}`,
    message: `
${hospitalHeader()}

A new appointment request has been submitted from the hospital website.

Name: ${full_name}
Email: ${email}
Phone: ${phone}
Department: ${department}
Preferred Date: ${preferred_date}
Preferred Time: ${preferred_time}
Reason: ${reason}

This person may or may not have a patient account. Please contact them to confirm the appointment and assign a doctor.

Admin Dashboard: http://justpathhospital.com/dashboards/auth/login.html?role=admin

${hospitalFooter()}
    `
  };
}

// 4. Appointment confirmed (notify patient)
function appointmentConfirmed({ patient_name, doctor_name, department, appointment_date, appointment_time }) {
  return {
    subject: 'Your Appointment Has Been Confirmed',
    message: `
${hospitalHeader()}

Dear ${patient_name},

Your appointment at TOMMY'S HOSPITAL has been confirmed.

Doctor: Dr. ${doctor_name}
Department: ${department}
Date: ${appointment_date}
Time: ${appointment_time}

Please arrive 15 minutes before your appointment time.
Bring any previous medical records or prescriptions if available.

To view or manage your appointment, log in to your patient dashboard:
http://justpathhospital.com/dashboards/auth/login.html?role=patient

${hospitalFooter()}
    `
  };
}

// 5. Appointment cancelled (notify patient)
function appointmentCancelled({ patient_name, department, appointment_date, appointment_time }) {
  return {
    subject: 'Your Appointment Has Been Cancelled',
    message: `
${hospitalHeader()}

Dear ${patient_name},

Your appointment scheduled for ${appointment_date} at ${appointment_time} for ${department} has been cancelled.

If you did not request this cancellation or would like to rebook, please contact us:
Phone: +234 801 234 5678
Email: info@justpathhospital.com

Or log in to book a new appointment:
http://justpathhospital.com/dashboards/auth/login.html?role=patient

${hospitalFooter()}
    `
  };
}

// 6. Appointment completed (notify patient)
function appointmentCompleted({ patient_name, doctor_name, department, appointment_date }) {
  return {
    subject: 'Your Appointment is Complete',
    message: `
${hospitalHeader()}

Dear ${patient_name},

Your appointment with Dr. ${doctor_name} (${department}) on ${appointment_date} has been marked as completed.

Your medical records have been updated. You can view them in your patient dashboard:
http://justpathhospital.com/dashboards/auth/login.html?role=patient

If you have a follow-up appointment scheduled, you will be notified separately.

Thank you for choosing TOMMY'S HOSPITAL.

${hospitalFooter()}
    `
  };
}

// 7. Doctor assigned to patient (notify patient)
function doctorAssignedPatient({ patient_name, doctor_name, specialty, diagnosis_context }) {
  return {
    subject: 'A Doctor Has Been Assigned to Your Care',
    message: `
${hospitalHeader()}

Dear ${patient_name},

We are pleased to inform you that a doctor has been assigned to your care at TOMMY'S HOSPITAL.

Your Doctor: Dr. ${doctor_name}
Specialty: ${specialty}
${diagnosis_context ? 'Notes: ' + diagnosis_context : ''}

You can view your assigned doctor details by logging in to your patient dashboard:
http://justpathhospital.com/dashboards/auth/login.html?role=patient

If you have any questions, please contact us at +234 801 234 5678.

${hospitalFooter()}
    `
  };
}

// 8. Doctor assigned a new patient (notify doctor)
function doctorAssignedDoctor({ doctor_name, patient_name, diagnosis_context }) {
  return {
    subject: `New Patient Assigned: ${patient_name}`,
    message: `
${hospitalHeader()}

Dear Dr. ${doctor_name},

A new patient has been assigned to your care by the hospital admin.

Patient: ${patient_name}
${diagnosis_context ? 'Diagnosis Context: ' + diagnosis_context : ''}

Please log in to your doctor dashboard to view the patient details and upcoming appointments:
http://justpathhospital.com/dashboards/auth/login.html?role=doctor

${hospitalFooter()}
    `
  };
}

// 9. New medical record added (notify patient)
function medicalRecordAdded({ patient_name, doctor_name, diagnosis, follow_up_date }) {
  return {
    subject: 'New Medical Record Added to Your Profile',
    message: `
${hospitalHeader()}

Dear ${patient_name},

Dr. ${doctor_name} has added a new medical record to your profile.

Diagnosis: ${diagnosis}
${follow_up_date ? 'Follow-up Date: ' + follow_up_date : ''}

To view the full details of your medical record, log in to your patient dashboard:
http://justpathhospital.com/dashboards/auth/login.html?role=patient

${hospitalFooter()}
    `
  };
}

// 10. New doctor account created (notify doctor)
function doctorAccountCreated({ doctor_name, email, temporary_password }) {
  return {
    subject: 'Your TOMMY\'S HOSPITAL Doctor Account Has Been Created',
    message: `
${hospitalHeader()}

Dear Dr. ${doctor_name},

Your doctor account at TOMMY'S HOSPITAL has been created by the admin team.

Login Email: ${email}
Temporary Password: ${temporary_password}

Please log in and change your password immediately:
http://justpathhospital.com/dashboards/auth/login.html?role=doctor

If you did not expect this email, please contact us immediately at info@justpathhospital.com.

${hospitalFooter()}
    `
  };
}

module.exports = {
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
