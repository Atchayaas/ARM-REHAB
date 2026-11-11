-- ===================================================
-- FlexRehab AI - Shoulder Physical Rehabilitation Schema
-- Database: flexrehab_db
-- Designed for XAMPP MySQL (Default user: root, password: '')
-- Matching post_surgery_rehab.py
-- ===================================================

CREATE DATABASE IF NOT EXISTS flexrehab_db;
USE flexrehab_db;

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
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

-- 2. Protocols Table (Shoulder Exercises)
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

-- 3. Sessions Table (Exercise Telemetry Logs)
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

-- 4. Clinician SOAP Notes Table
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

-- 5. Emergency Pain Reports Table
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
