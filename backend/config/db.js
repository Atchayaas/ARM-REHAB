import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT) || 3306,
};

const DB_NAME = process.env.DB_NAME || 'flexrehab_db';

let pool;

export async function initDatabase() {
  try {
    const rootConnection = await mysql.createConnection(dbConfig);
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await rootConnection.end();

    pool = mysql.createPool({
      ...dbConfig,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log(`[MySQL] Connected to database '${DB_NAME}' successfully.`);

    // 1. Patients Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(120) UNIQUE,
        password_hash VARCHAR(255),
        reset_token VARCHAR(100),
        reset_token_expires TIMESTAMP NULL,
        age INT,
        gender VARCHAR(20),
        mrn VARCHAR(50) UNIQUE,
        photo_url TEXT,
        primary_diagnosis TEXT,
        surgery_type TEXT,
        surgery_date DATE,
        post_op_days INT,
        current_phase VARCHAR(150),
        attending_physician VARCHAR(100),
        physical_therapist VARCHAR(100),
        overall_adherence FLOAT DEFAULT 90.0,
        streak_days INT DEFAULT 0,
        baseline_unaffected_angle INT DEFAULT 165,
        baseline_post_op_angle INT DEFAULT 45,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure email, password_hash, reset_token, doctor columns exist if table was created previously
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN email VARCHAR(120) UNIQUE;");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN password_hash VARCHAR(255);");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN reset_token VARCHAR(100);");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN reset_token_expires TIMESTAMP NULL;");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN user_number_id VARCHAR(50);");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN doctor_id VARCHAR(50);");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN password_changed BOOLEAN DEFAULT FALSE;");
    } catch {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN initial_password VARCHAR(100) DEFAULT 'Rehab@123';");
    } catch {}

    // Doctors Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        hospital VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(120),
        phone VARCHAR(50),
        department VARCHAR(100) DEFAULT 'Orthopedics & Physical Rehabilitation',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Protocols Table (Shoulder rehab exercises)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS protocols (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        joint VARCHAR(50) NOT NULL,
        target_angle INT NOT NULL,
        min_angle INT NOT NULL,
        safe_angle_max INT NOT NULL,
        sets_target INT NOT NULL,
        reps_per_set INT NOT NULL,
        hold_time_sec INT DEFAULT 2,
        pacing_seconds_per_rep INT DEFAULT 4,
        primary_plane VARCHAR(50) DEFAULT 'sagittal',
        affected_side VARCHAR(50) DEFAULT 'Right',
        description TEXT,
        contraindications JSON,
        is_prescribed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // 3. Sessions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        protocol_id VARCHAR(50),
        session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_number INT DEFAULT 1,
        max_flexion INT NOT NULL,
        extension_deficit INT DEFAULT 0,
        target_angle INT NOT NULL,
        symmetry_index FLOAT DEFAULT 90.0,
        pain_level INT DEFAULT 0,
        compensation_count INT DEFAULT 0,
        reps_completed INT NOT NULL,
        duration_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // 4. Clinician Notes Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clinician_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        note_date DATE NOT NULL,
        author VARCHAR(100) NOT NULL,
        subjective TEXT,
        objective TEXT,
        assessment TEXT,
        plan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // 5. Pain Reports Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pain_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        pain_level INT NOT NULL,
        joint VARCHAR(50),
        activity_type VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
    `);

    // Auto-seed or reset if database has outdated patient data
    const [existing] = await pool.query("SELECT * FROM patients WHERE id = 'pt-001'");
    if (existing.length === 0 || existing[0].name !== 'John Doe') {
      console.log('[MySQL] Initializing John Doe Shoulder Rehabilitation database...');
      await pool.query('DELETE FROM pain_reports');
      await pool.query('DELETE FROM clinician_notes');
      await pool.query('DELETE FROM sessions');
      await pool.query('DELETE FROM protocols');
      await pool.query('DELETE FROM patients');
      await seedShoulderData(pool);
    }

    return pool;
  } catch (error) {
    console.error('[MySQL Error] Could not connect to MySQL:', error.message);
    console.warn('[MySQL Tip] Make sure XAMPP is running and MySQL module is started!');
    throw error;
  }
}

async function seedShoulderData(db) {
  // Patient: John Doe (Shoulder recovery)
  await db.query(`
    INSERT INTO patients (
      id, name, age, gender, mrn, photo_url, primary_diagnosis, surgery_type,
      surgery_date, post_op_days, current_phase, attending_physician, physical_therapist,
      overall_adherence, streak_days, baseline_unaffected_angle, baseline_post_op_angle
    ) VALUES (
      'pt-001', 'John Doe', 46, 'Male', 'MRN-78291-SHL',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'Right Rotator Cuff Tear (Supraspinatus Tendon Repair)',
      'Arthroscopic Right Rotator Cuff Repair + Subacromial Decompression',
      '2026-10-14', 22, 'Phase II: Active-Assisted Range of Motion Restoration',
      'Dr. Katherine Reynolds, MD (Orthopedic Surgery)', 'Dr. Sarah Jenkins, DPT, OCS',
      94.6, 5, 165, 45
    );
  `);

  // 1. Shoulder Flexion (Forward Arm Raise)
  await db.query(`
    INSERT INTO protocols (
      id, patient_id, name, joint, target_angle, min_angle, safe_angle_max,
      sets_target, reps_per_set, hold_time_sec, pacing_seconds_per_rep,
      primary_plane, affected_side, description, contraindications, is_prescribed
    ) VALUES (
      'proto-shoulder-flex', 'pt-001',
      'Shoulder Flexion (Forward Arm Raise)', 'shoulder',
      150, 20, 165, 3, 10, 2, 4, 'sagittal', 'Right',
      'Active forward arm raise in sagittal plane. Lift slowly toward ceiling while preventing scapular shrugging. Angle: Hip -> Shoulder -> Wrist.',
      JSON_ARRAY('Avoid shoulder shrugging', 'Stop if sharp impingement pain occurs'),
      TRUE
    );
  `);

  // 2. Shoulder Abduction (Lateral Arm Raise)
  await db.query(`
    INSERT INTO protocols (
      id, patient_id, name, joint, target_angle, min_angle, safe_angle_max,
      sets_target, reps_per_set, hold_time_sec, pacing_seconds_per_rep,
      primary_plane, affected_side, description, contraindications, is_prescribed
    ) VALUES (
      'proto-shoulder-abd', 'pt-001',
      'Shoulder Abduction (Lateral Arm Raise)', 'shoulder',
      150, 20, 165, 3, 10, 2, 4, 'frontal', 'Right',
      'Lateral arm raise out to side in coronal plane. Angle: Hip -> Shoulder -> Wrist.',
      JSON_ARRAY('Avoid shoulder shrugging', 'Keep arms in scapular plane'),
      FALSE
    );
  `);

  // 3. Cross-Body Reach
  await db.query(`
    INSERT INTO protocols (
      id, patient_id, name, joint, target_angle, min_angle, safe_angle_max,
      sets_target, reps_per_set, hold_time_sec, pacing_seconds_per_rep,
      primary_plane, affected_side, description, contraindications, is_prescribed
    ) VALUES (
      'proto-shoulder-reach', 'pt-001',
      'Cross-Body Reach (Horizontal Adduction)', 'shoulder',
      30, 90, 100, 2, 10, 3, 4, 'transverse', 'Right',
      'Horizontal adduction stretch across chest toward opposite shoulder. Angle: Opposite Shoulder -> Shoulder -> Wrist.',
      JSON_ARRAY('Torso twisting (keep hips level)'),
      FALSE
    );
  `);

  // 4. Shoulder Press
  await db.query(`
    INSERT INTO protocols (
      id, patient_id, name, joint, target_angle, min_angle, safe_angle_max,
      sets_target, reps_per_set, hold_time_sec, pacing_seconds_per_rep,
      primary_plane, affected_side, description, contraindications, is_prescribed
    ) VALUES (
      'proto-shoulder-press', 'pt-001',
      'Shoulder Press (Overhead Press)', 'shoulder',
      170, 40, 180, 3, 8, 1, 3, 'sagittal', 'Right',
      'Overhead arm extension. Angle: Elbow -> Shoulder -> Hip.',
      JSON_ARRAY('Arching back (straighten spine)'),
      FALSE
    );
  `);

  // Historical Sessions
  const sessions = [
    ['pt-001', 'proto-shoulder-flex', 1, 95, 0, 150, 82.0, 2, 3, 10],
    ['pt-001', 'proto-shoulder-flex', 2, 112, 0, 150, 85.5, 2, 2, 10],
    ['pt-001', 'proto-shoulder-flex', 3, 128, 0, 150, 88.0, 1, 1, 10],
    ['pt-001', 'proto-shoulder-flex', 4, 138, 0, 150, 91.2, 1, 1, 10],
    ['pt-001', 'proto-shoulder-flex', 5, 145, 0, 150, 94.0, 0, 0, 10],
  ];

  for (const s of sessions) {
    await db.query(`
      INSERT INTO sessions (
        patient_id, protocol_id, session_number, max_flexion, extension_deficit,
        target_angle, symmetry_index, pain_level, compensation_count, reps_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, s);
  }

  // Clinician Note
  await db.query(`
    INSERT INTO clinician_notes (
      patient_id, note_date, author, subjective, objective, assessment, plan
    ) VALUES (
      'pt-001', '2026-11-04', 'Dr. Sarah Jenkins, DPT, OCS',
      'Patient reports minimal soreness after yesterday sessions. Zero sharp subacromial pain.',
      'Active forward flexion verified at 145 deg. Ear-to-shoulder shrugging decreased by 85%.',
      'Remarkable kinematic compliance. Rotator cuff healing trajectory on track for Phase III next week.',
      'Continue 3 sets of forward flexion and lateral abduction daily. Maintain strict scapular depression.'
    )
  `);

  console.log('[MySQL] Seeding completed.');
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase() first.');
  }
  return pool;
}
