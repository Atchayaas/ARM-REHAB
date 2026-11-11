import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// GET all clinician notes for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM clinician_notes WHERE patient_id = ? ORDER BY note_date DESC',
      [req.params.patientId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch clinician notes' });
  }
});

// POST a new clinician SOAP note
router.post('/', async (req, res) => {
  try {
    const pool = getPool();
    const { patientId, author, subjective, objective, assessment, plan, noteDate } = req.body;

    if (!patientId || !author) {
      return res.status(400).json({ error: 'patientId and author are required' });
    }

    const dateToSave = noteDate || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `INSERT INTO clinician_notes (
        patient_id, note_date, author, subjective, objective, assessment, plan
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patientId, dateToSave, author, subjective || '', objective || '', assessment || '', plan || '']
    );

    res.status(201).json({
      success: true,
      message: 'Clinician note saved to MySQL',
      noteId: result.insertId,
    });
  } catch (error) {
    console.error('Error saving clinician note:', error);
    res.status(500).json({ error: 'Failed to save clinician note' });
  }
});

export default router;
