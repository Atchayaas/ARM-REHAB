import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getPool } from '../config/db.js';
import { assemblePatientData } from './patients.js';

const router = express.Router();

// Configure Nodemailer transporter (Supports Ethereal / Gmail / Custom SMTP)
let transporterPromise = (async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Create ethereal test account if no SMTP provided so emails are never lost
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log('[Auth Mail] Created Ethereal SMTP test account for notifications:', testAccount.user);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch {
    // Fallback console transport
    return {
      sendMail: async (options) => {
        console.log('[Email Notification (Console Fallback)]:', options);
        return { messageId: 'simulated-id' };
      },
    };
  }
})();

/**
 * 1. POST /api/auth/register
 * Allows new patients to register with their name, email, password
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, mrn, age, gender, diagnosis } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const [existing] = await pool.query('SELECT id FROM patients WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const patientId = `pt-${Date.now().toString(36)}`;
    const userMrn = mrn ? mrn.trim() : `MRN-${Math.floor(10000 + Math.random() * 90000)}-SHLD`;
    const passwordHash = await bcrypt.hash(password, 10);
    const photoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

    await pool.query(
      `INSERT INTO patients (
        id, name, email, password_hash, age, gender, mrn, photo_url,
        primary_diagnosis, surgery_type, surgery_date, post_op_days,
        current_phase, attending_physician, physical_therapist,
        overall_adherence, streak_days, baseline_unaffected_angle, baseline_post_op_angle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1, ?, ?, ?, 100, 1, 165, 45)`,
      [
        patientId,
        name.trim(),
        cleanEmail,
        passwordHash,
        Number(age) || 35,
        gender || 'Not specified',
        userMrn,
        photoUrl,
        diagnosis || 'Post-Operative Shoulder Rotator Cuff Rehabilitation',
        'Arthroscopic Rotator Cuff Repair',
        'Phase I: Passive & Guided Active Motion',
        'Dr. Robert Chen, MD',
        'Sarah Jenkins, DPT'
      ]
    );

    // Auto-seed shoulder rehabilitation protocols for the new patient
    const protocols = [
      { id: `proto-${patientId}-1`, name: 'Shoulder Flexion (Forward Raise)', joint: 'shoulder', target: 150, min: 20, max: 165, sets: 3, reps: 10, is_prescribed: 1 },
      { id: `proto-${patientId}-2`, name: 'Shoulder Abduction (Lateral Raise)', joint: 'shoulder', target: 150, min: 20, max: 165, sets: 3, reps: 10, is_prescribed: 0 },
      { id: `proto-${patientId}-3`, name: 'Cross-Body Reach', joint: 'shoulder', target: 30, min: 90, max: 100, sets: 2, reps: 10, is_prescribed: 0 },
      { id: `proto-${patientId}-4`, name: 'Shoulder Press', joint: 'shoulder', target: 170, min: 40, max: 180, sets: 3, reps: 8, is_prescribed: 0 },
    ];

    for (const pr of protocols) {
      await pool.query(
        `INSERT INTO protocols (id, patient_id, name, joint, target_angle, min_angle, safe_angle_max, sets_target, reps_per_set, is_prescribed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pr.id, patientId, pr.name, pr.joint, pr.target, pr.min, pr.max, pr.sets, pr.reps, pr.is_prescribed]
      );
    }

    // Return the newly created patient profile
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [patientId]);
    const newPatient = rows[0];
    delete newPatient.password_hash;
    delete newPatient.reset_token;

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      patient: newPatient,
    });
  } catch (err) {
    console.error('[Register Error]:', err);
    res.status(500).json({ error: 'Failed to create patient account' });
  }
});

/**
 * 2. POST /api/auth/login
 * Validates email & password against MySQL database
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, gender, username, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();
    const userGender = gender || 'Male';
    const providedName = (username || name || '').trim();
    const identifier = (email || username || '').trim().toLowerCase();

    // Find patient by email, MRN, username, or user_number_id (e.g. user-1)
    const [rows] = await pool.query(
      'SELECT * FROM patients WHERE LOWER(email) = ? OR UPPER(mrn) = ? OR LOWER(name) = ? OR LOWER(user_number_id) = ?',
      [identifier, identifier.toUpperCase(), identifier, identifier]
    );

    // ONLY users created by a Doctor can log in! Do NOT auto-register unknown users.
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Patient account not found. Only users registered by the doctor can log in. Please contact your clinician to register your account.',
      });
    }

    const patient = rows[0];

    // Check password: initial_password (e.g. Rehab@123) or password_hash
    let isMatch = false;
    if (patient.initial_password && password === patient.initial_password) {
      isMatch = true;
    } else if (patient.password_hash) {
      isMatch = await bcrypt.compare(password, patient.password_hash);
    } else if (password === 'Rehab@123') {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({
        error: 'Incorrect password. Please enter the password provided by your doctor.',
      });
    }

    // Check if user is on initial default password and needs to change it
    const requiresPasswordChange = !patient.password_changed && (patient.initial_password === password || password === 'Rehab@123');

    // If user provided a specific username, update their name in database
    if (providedName && providedName !== patient.name && !patient.user_number_id) {
      await pool.query('UPDATE patients SET name = ? WHERE id = ?', [providedName, patient.id]);
      patient.name = providedName;
    }

    const fullPatient = await assemblePatientData(pool, patient);
    delete fullPatient.password_hash;
    delete fullPatient.reset_token;
    delete fullPatient.reset_token_expires;

    res.json({
      success: true,
      message: `Welcome back, ${patient.name}!`,
      patient: fullPatient,
      requiresPasswordChange,
    });
  } catch (err) {
    console.error('[Login Error]:', err);
    res.status(500).json({ error: 'Login authentication failed' });
  }
});

/**
 * 3. POST /api/auth/forgot-password
 * Sends password reset token & notification email to the patient
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();

    const [rows] = await pool.query('SELECT * FROM patients WHERE LOWER(email) = ?', [cleanEmail]);
    if (rows.length === 0) {
      // For security, don't leak user existence, or inform them kindly
      return res.status(404).json({ error: 'No registered patient found with this email address.' });
    }

    const patient = rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      'UPDATE patients SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetCode, expires, patient.id]
    );

    const transporter = await transporterPromise;
    const mailOptions = {
      from: '"FlexRehab AI Medical Portal" <noreply@flexrehab.ai>',
      to: cleanEmail,
      subject: 'Password Reset Notification - FlexRehab AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #006194; margin-top: 0;">FlexRehab AI - Password Reset Notification</h2>
          <p>Hello <strong>${patient.name}</strong>,</p>
          <p>We received a request to reset your password for your physical rehabilitation portal account.</p>
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #0369a1; text-transform: uppercase; font-weight: bold;">Your 6-Digit Verification Code</p>
            <h1 style="margin: 8px 0; color: #006194; font-size: 32px; letter-spacing: 6px;">${resetCode}</h1>
            <p style="margin: 0; font-size: 11px; color: #64748b;">This code will expire in 15 minutes.</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">If you did not request this password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">FlexRehab AI Telemetry System • Orthopedic & Neuromuscular Recovery Portal</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;

    res.json({
      success: true,
      message: `Password reset notification sent to ${cleanEmail}`,
      resetCode, // Also returned for immediate local testing/verification
      previewUrl: previewUrl || undefined,
    });
  } catch (err) {
    console.error('[Forgot Password Error]:', err);
    res.status(500).json({ error: 'Failed to send password reset notification email' });
  }
});

/**
 * 4. POST /api/auth/reset-password
 * Verifies reset token and updates the patient's password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required' });
    }

    const pool = getPool();
    const cleanEmail = email.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT * FROM patients WHERE LOWER(email) = ? AND reset_token = ? AND reset_token_expires > NOW()',
      [cleanEmail, resetCode.trim()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const patient = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE patients SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, patient.id]
    );

    res.json({
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * 5. POST /api/auth/doctor/login
 * Doctor Login with Doctor Name, Password, and Hospital Name
 */
router.post('/doctor/login', async (req, res) => {
  try {
    const { name, password, hospital } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Doctor name and password are required' });
    }

    const pool = getPool();
    const cleanName = name.trim();
    const cleanHospital = (hospital || 'General Orthopedic Rehabilitation Hospital').trim();

    // Check if doctor exists in doctors table
    const [rows] = await pool.query('SELECT * FROM doctors WHERE LOWER(name) = ?', [cleanName.toLowerCase()]);

    let doctor;
    if (rows.length === 0) {
      // Auto-register new doctor
      const docId = `doc-${Date.now().toString(36)}`;
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO doctors (id, name, hospital, password_hash, email, phone, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [docId, cleanName, cleanHospital, passwordHash, `${cleanName.toLowerCase().replace(/[^a-z]/g, '')}@hospital.org`, '+1 (555) 392-8190', 'Orthopedic Surgery & Rehabilitation']
      );
      const [newDoc] = await pool.query('SELECT * FROM doctors WHERE id = ?', [docId]);
      doctor = newDoc[0];
    } else {
      doctor = rows[0];
      const isMatch = await bcrypt.compare(password, doctor.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect doctor password' });
      }
      // If hospital name is updated, persist it
      if (cleanHospital && cleanHospital !== doctor.hospital) {
        await pool.query('UPDATE doctors SET hospital = ? WHERE id = ?', [cleanHospital, doctor.id]);
        doctor.hospital = cleanHospital;
      }
    }

    delete doctor.password_hash;
    res.json({
      success: true,
      message: 'Doctor login successful',
      doctor,
    });
  } catch (err) {
    console.error('[Doctor Login Error]:', err);
    res.status(500).json({ error: 'Doctor login failed' });
  }
});

/**
 * 6. PUT /api/auth/doctor/:id
 * Update Doctor account details (Name, Hospital, Email, Phone, Department, Password)
 */
router.put('/doctor/:id', async (req, res) => {
  try {
    const { name, hospital, email, phone, department, password } = req.body;
    const pool = getPool();

    if (password && password.trim()) {
      const hash = await bcrypt.hash(password.trim(), 10);
      await pool.query(
        'UPDATE doctors SET name = COALESCE(?, name), hospital = COALESCE(?, hospital), email = COALESCE(?, email), phone = COALESCE(?, phone), department = COALESCE(?, department), password_hash = ? WHERE id = ?',
        [name, hospital, email, phone, department, hash, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE doctors SET name = COALESCE(?, name), hospital = COALESCE(?, hospital), email = COALESCE(?, email), phone = COALESCE(?, phone), department = COALESCE(?, department) WHERE id = ?',
        [name, hospital, email, phone, department, req.params.id]
      );
    }

    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    const doctor = rows[0];
    if (doctor) delete doctor.password_hash;

    res.json({
      success: true,
      message: 'Doctor details updated successfully',
      doctor,
    });
  } catch (err) {
    console.error('[Doctor Update Error]:', err);
    res.status(500).json({ error: 'Failed to update doctor details' });
  }
});

/**
 * 7. POST /api/auth/doctor/add-user
 * Doctor adds a new patient with prescribed mobility target angle (Low, Medium, High, Custom)
 */
router.post('/doctor/add-user', async (req, res) => {
  try {
    const {
      doctorId,
      doctorName,
      username,
      password,
      level, // 'low' | 'medium' | 'high' | 'custom'
      customAngle,
      customNotes,
      gender,
      age,
      diagnosis,
    } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Patient username is required' });
    }

    const pool = getPool();
    const cleanUsername = username.trim();
    const cleanPassword = (password || 'Rehab@123').trim();
    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    // Calculate sequential user_number_id (e.g. user-1, user-2)
    const [countResult] = await pool.query('SELECT COUNT(*) as cnt FROM patients');
    const userNumber = (countResult[0]?.cnt || 0) + 1;
    const userNumberId = `user-${userNumber}`;

    // Target angle from problem level:
    let targetAngle = 110;
    if (level === 'low') targetAngle = 60;
    else if (level === 'medium') targetAngle = 110;
    else if (level === 'high') targetAngle = 150;
    else if (level === 'custom') targetAngle = Math.max(30, Math.min(180, Number(customAngle) || 120));

    const patientId = `pt-${Date.now().toString(36)}`;
    const userMrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}-SHLD`;
    const email = `${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}${userNumber}@rehab.org`;
    const docDisplay = doctorName || 'Attending Physician';

    await pool.query(
      `INSERT INTO patients (
        id, user_number_id, doctor_id, name, email, password_hash, initial_password,
        password_changed, age, gender, mrn, photo_url,
        primary_diagnosis, surgery_type, surgery_date, post_op_days,
        current_phase, attending_physician, physical_therapist,
        overall_adherence, streak_days, baseline_unaffected_angle, baseline_post_op_angle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?, '', ?, 'Rotator Cuff Arthroscopic Repair', CURDATE(), 1, 'Phase I: Mobility Restoration', ?, 'Physical Therapy Team', 100, 1, 165, 45)`,
      [
        patientId,
        userNumberId,
        doctorId || 'doc-1',
        cleanUsername,
        email,
        passwordHash,
        cleanPassword,
        Number(age) || 45,
        gender || 'Male',
        userMrn,
        diagnosis || customNotes || 'Shoulder Rotator Cuff Rehabilitation',
        docDisplay
      ]
    );

    // Seed protocols with doctor prescribed target angle
    const protocols = [
      { id: `proto-${patientId}-1`, name: 'Shoulder Flexion (Forward Arm Raise)', joint: 'shoulder', target: targetAngle, min: 20, max: 165, sets: 3, reps: 10, is_prescribed: 1 },
      { id: `proto-${patientId}-2`, name: 'Shoulder Abduction (Lateral Arm Raise)', joint: 'shoulder', target: targetAngle, min: 20, max: 165, sets: 3, reps: 10, is_prescribed: 0 },
      { id: `proto-${patientId}-3`, name: 'Cross-Body Reach', joint: 'shoulder', target: 30, min: 90, max: 100, sets: 2, reps: 10, is_prescribed: 0 },
      { id: `proto-${patientId}-4`, name: 'Shoulder Press', joint: 'shoulder', target: 170, min: 40, max: 180, sets: 3, reps: 8, is_prescribed: 0 },
    ];

    for (const pr of protocols) {
      await pool.query(
        `INSERT INTO protocols (id, patient_id, name, joint, target_angle, min_angle, safe_angle_max, sets_target, reps_per_set, is_prescribed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pr.id, patientId, pr.name, pr.joint, pr.target, pr.min, pr.max, pr.sets, pr.reps, pr.is_prescribed]
      );
    }

    const [createdRows] = await pool.query('SELECT * FROM patients WHERE id = ?', [patientId]);
    const createdPatient = await assemblePatientData(pool, createdRows[0]);
    delete createdPatient.password_hash;
    delete createdPatient.reset_token;

    res.status(201).json({
      success: true,
      message: `User created successfully! Assigned ID: ${userNumberId}`,
      patient: createdPatient,
      userCredentials: {
        userId: userNumberId,
        username: cleanUsername,
        initialPassword: cleanPassword,
        targetAngle,
      },
    });
  } catch (err) {
    console.error('[Add User Error]:', err);
    res.status(500).json({ error: 'Failed to create patient account' });
  }
});

/**
 * 8. GET /api/auth/doctor/:id/users
 * Returns all patients under this doctor with live session metrics
 */
router.get('/doctor/:id/users', async (req, res) => {
  try {
    const pool = getPool();
    // Return all patients (or filtered by doctor_id if populated)
    const [rows] = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
    const fullPatients = await Promise.all(
      rows.map((row) => assemblePatientData(pool, row))
    );
    res.json({
      success: true,
      patients: fullPatients,
    });
  } catch (err) {
    console.error('[Doctor Users Error]:', err);
    res.status(500).json({ error: 'Failed to fetch doctor patients' });
  }
});

/**
 * 9. POST /api/auth/user/change-password
 * User changes their initial/default password
 */
router.post('/user/change-password', async (req, res) => {
  try {
    const { patientId, newPassword } = req.body;
    if (!patientId || !newPassword) {
      return res.status(400).json({ error: 'Patient ID and new password are required' });
    }

    const pool = getPool();
    const hash = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query(
      'UPDATE patients SET password_hash = ?, password_changed = TRUE WHERE id = ?',
      [hash, patientId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully. You can now use your new password.',
    });
  } catch (err) {
    console.error('[Change Password Error]:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
