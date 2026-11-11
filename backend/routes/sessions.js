import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// POST a new rehabilitation session
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const {
      patientId,
      protocolId,
      maxFlexion,
      extensionDeficit = 0,
      targetAngle,
      symmetryIndex = 90.0,
      painLevel = 0,
      compensationCount = 0,
      repsCompleted,
      durationSeconds = 0,
    } = req.body;

    if (!patientId || maxFlexion === undefined || repsCompleted === undefined) {
      return res.status(400).json({ error: 'patientId, maxFlexion, and repsCompleted are required.' });
    }

    // Get current session count for session_number
    const [existing] = await pool.query(
      'SELECT COUNT(*) as total FROM sessions WHERE patient_id = ?',
      [patientId]
    );
    const sessionNumber = (existing[0].total || 0) + 1;

    // Insert session into MySQL
    const [result] = await pool.query(
      `INSERT INTO sessions (
        patient_id, protocol_id, session_number, max_flexion, extension_deficit,
        target_angle, symmetry_index, pain_level, compensation_count,
        reps_completed, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        protocolId || 'proto-knee-flex',
        sessionNumber,
        maxFlexion,
        extensionDeficit,
        targetAngle || 125,
        symmetryIndex,
        painLevel,
        compensationCount,
        repsCompleted,
        durationSeconds,
      ]
    );

    // Update patient streak and adherence
    await pool.query(
      `UPDATE patients
       SET streak_days = streak_days + 1,
           overall_adherence = LEAST(100.0, overall_adherence + 0.5)
       WHERE id = ?`,
      [patientId]
    );

    res.status(201).json({
      success: true,
      message: 'Session successfully logged to MySQL database',
      sessionId: result.insertId,
      sessionNumber,
    });
  } catch (error) {
    console.error('Error logging session:', error);
    res.status(500).json({ error: 'Failed to record session in MySQL' });
  }
});

// GET all sessions for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE patient_id = ? ORDER BY session_number ASC',
      [req.params.patientId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
