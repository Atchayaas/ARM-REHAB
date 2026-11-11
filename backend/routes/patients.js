import express from 'express';
import { getPool } from '../config/db.js';

const router = express.Router();

// Helper to format patient SQL rows into the structure frontend expects
export async function assemblePatientData(pool, patientRow) {
  const patientId = patientRow.id;

  // 1. Fetch protocols
  const [protocols] = await pool.query(
    'SELECT * FROM protocols WHERE patient_id = ?',
    [patientId]
  );

  const formattedProtocols = protocols.map((p) => ({
    id: p.id,
    name: p.name,
    joint: p.joint,
    targetAngle: p.target_angle,
    minAngle: p.min_angle,
    safeAngleMax: p.safe_angle_max,
    setsTarget: p.sets_target,
    repsPerSet: p.reps_per_set,
    holdTimeSec: p.hold_time_sec,
    pacingSecondsPerRep: p.pacing_seconds_per_rep,
    primaryPlane: p.primary_plane,
    affectedSide: p.affected_side,
    description: p.description,
    contraindications: typeof p.contraindications === 'string'
      ? JSON.parse(p.contraindications)
      : p.contraindications || [],
    isPrescribed: Boolean(p.is_prescribed),
  }));

  const prescribed = formattedProtocols.find((p) => p.isPrescribed) || formattedProtocols[0];

  // 2. Fetch historical sessions
  const [sessions] = await pool.query(
    'SELECT * FROM sessions WHERE patient_id = ? ORDER BY session_number ASC',
    [patientId]
  );

  const formattedSessions = sessions.map((s) => ({
    date: s.session_date ? new Date(s.session_date).toISOString().split('T')[0] : '2026-10-30',
    sessionNumber: s.session_number,
    maxFlexion: s.max_flexion,
    extensionDeficit: s.extension_deficit,
    targetAngle: s.target_angle,
    symmetryIndex: s.symmetry_index,
    painLevel: s.pain_level,
    compensationCount: s.compensation_count,
    repsCompleted: s.reps_completed,
  }));

  // 3. Fetch clinician notes
  const [notes] = await pool.query(
    'SELECT * FROM clinician_notes WHERE patient_id = ? ORDER BY note_date DESC',
    [patientId]
  );

  const formattedNotes = notes.map((n) => ({
    date: n.note_date ? new Date(n.note_date).toISOString().split('T')[0] : '2026-10-30',
    author: n.author,
    soap: {
      subjective: n.subjective,
      objective: n.objective,
      assessment: n.assessment,
      plan: n.plan,
    },
  }));

  return {
    id: patientRow.id,
    userNumberId: patientRow.user_number_id || patientRow.id,
    doctorId: patientRow.doctor_id,
    passwordChanged: Boolean(patientRow.password_changed),
    initialPassword: patientRow.initial_password || 'Rehab@123',
    name: patientRow.name,
    email: patientRow.email,
    age: patientRow.age,
    gender: patientRow.gender,
    mrn: patientRow.mrn,
    photoUrl: (patientRow.photo_url && !patientRow.photo_url.includes('unsplash')) ? patientRow.photo_url : null,
    primaryDiagnosis: patientRow.primary_diagnosis,
    surgeryType: patientRow.surgery_type,
    surgeryDate: patientRow.surgery_date ? new Date(patientRow.surgery_date).toISOString().split('T')[0] : '2026-09-23',
    postOpDays: patientRow.post_op_days,
    currentPhase: patientRow.current_phase,
    attendingPhysician: patientRow.attending_physician,
    physicalTherapist: patientRow.physical_therapist,
    overallAdherence: formattedSessions.length > 0 ? patientRow.overall_adherence : 0,
    streakDays: formattedSessions.length > 0 ? patientRow.streak_days : 0,
    baselineROM: {
      unaffectedLimbAngle: patientRow.baseline_unaffected_angle,
      initialPostOpAngle: patientRow.baseline_post_op_angle,
    },
    prescribedProtocol: prescribed,
    availableProtocols: formattedProtocols,
    historicalSessions: formattedSessions,
    milestones: (() => {
      const maxAchieved = formattedSessions.length > 0
        ? Math.max(...formattedSessions.map((s) => s.maxFlexion || 0))
        : 0;
      return [
        {
          id: 'm1',
          title: '90 deg Passive Flexion Restored',
          targetWeek: 2,
          completed: maxAchieved >= 90,
          achievedDate: maxAchieved >= 90 ? (formattedSessions.find((s) => s.maxFlexion >= 90)?.date || '2026-10-07') : null,
          category: 'ROM',
          description: 'Attain 90 deg assisted flexion without compensatory trunk movement.'
        },
        {
          id: 'm2',
          title: 'Full Terminal Extension (0 deg)',
          targetWeek: 4,
          completed: maxAchieved >= 110,
          achievedDate: maxAchieved >= 110 ? (formattedSessions.find((s) => s.maxFlexion >= 110)?.date || '2026-10-21') : null,
          category: 'ROM',
          description: 'Eliminate extension lag during straight leg raise.'
        },
        {
          id: 'm3',
          title: '120 deg Active Kinetic Flexion',
          targetWeek: 6,
          completed: maxAchieved >= 120,
          achievedDate: maxAchieved >= 120 ? (formattedSessions.find((s) => s.maxFlexion >= 120)?.date || '2026-11-01') : null,
          category: 'ROM',
          description: 'Demonstrate symmetrical active flexion under kinematic sensor tracking.'
        }
      ];
    })(),
    recentNotes: formattedNotes,
  };
}

// GET all patients
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM patients');
    const fullPatients = await Promise.all(
      rows.map((row) => assemblePatientData(pool, row))
    );
    res.json(fullPatients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to retrieve patients from MySQL' });
  }
});

// GET single patient by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const fullPatient = await assemblePatientData(pool, rows[0]);
    res.json(fullPatient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

// PUT update prescription protocol
router.put('/:id/prescription', async (req, res) => {
  try {
    const pool = getPool();
    const patientId = req.params.id;
    const { protocolId, targetAngle, setsTarget, repsPerSet, holdTimeSec } = req.body;

    // Set all protocols for this patient to not prescribed
    await pool.query('UPDATE protocols SET is_prescribed = FALSE WHERE patient_id = ?', [patientId]);

    // Check if protocol exists
    const [existing] = await pool.query('SELECT * FROM protocols WHERE id = ? AND patient_id = ?', [protocolId, patientId]);

    if (existing.length > 0) {
      // Update existing
      await pool.query(`
        UPDATE protocols
        SET is_prescribed = TRUE,
            target_angle = COALESCE(?, target_angle),
            sets_target = COALESCE(?, sets_target),
            reps_per_set = COALESCE(?, reps_per_set),
            hold_time_sec = COALESCE(?, hold_time_sec)
        WHERE id = ? AND patient_id = ?
      `, [targetAngle, setsTarget, repsPerSet, holdTimeSec, protocolId, patientId]);
    }

    res.json({ success: true, message: 'Prescription updated in MySQL' });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

export default router;
