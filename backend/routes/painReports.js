import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// POST an emergency pain report
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { patientId, painLevel, joint, activityType, description } = req.body;

    if (!patientId || painLevel === undefined) {
      return res.status(400).json({ error: 'patientId and painLevel are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO pain_reports (
        patient_id, pain_level, joint, activity_type, description
      ) VALUES (?, ?, ?, ?, ?)`,
      [patientId, painLevel, joint || 'Knee', activityType || 'Exercise', description || '']
    );

    res.status(201).json({
      success: true,
      message: 'Pain report filed to MySQL and flagged for clinician review',
      reportId: result.insertId,
    });
  } catch (error) {
    console.error('Error logging pain report:', error);
    res.status(500).json({ error: 'Failed to record pain report' });
  }
});

// GET pain reports for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM pain_reports WHERE patient_id = ? ORDER BY created_at DESC',
      [req.params.patientId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pain reports:', error);
    res.status(500).json({ error: 'Failed to retrieve pain reports' });
  }
});

export default router;
