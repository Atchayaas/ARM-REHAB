import { Patient } from '../types/telemetry';

export const PATIENTS: Patient[] = [
  {
    id: 'pt-001',
    name: 'John Doe',
    age: 46,
    gender: 'Male',
    mrn: 'MRN-78291-SHL',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    primaryDiagnosis: 'Right Rotator Cuff Tear (Supraspinatus Tendon Repair)',
    surgeryType: 'Arthroscopic Right Rotator Cuff Repair + Subacromial Decompression',
    surgeryDate: '2026-10-14',
    postOpDays: 22,
    currentPhase: 'Phase II: Active-Assisted Range of Motion Restoration',
    attendingPhysician: 'Dr. Katherine Reynolds, MD (Orthopedic Surgery)',
    physicalTherapist: 'Dr. Sarah Jenkins, DPT, OCS',
    overallAdherence: 94.6,
    streakDays: 5,
    baselineROM: {
      unaffectedLimbAngle: 165,
      initialPostOpAngle: 45,
    },
    prescribedProtocol: {
      id: 'proto-shoulder-flex',
      name: 'Shoulder Flexion (Forward Arm Raise)',
      joint: 'shoulder',
      targetAngle: 150,
      minAngle: 20,
      safeAngleMax: 165,
      setsTarget: 3,
      repsPerSet: 10,
      holdTimeSec: 2,
      pacingSecondsPerRep: 4,
      primaryPlane: 'sagittal',
      affectedSide: 'Right',
      description: 'Active forward arm raise in sagittal plane. Lift slowly toward ceiling while preventing scapular shrugging.',
      contraindications: ['Avoid shoulder shrugging', 'Stop if sharp impingement pain occurs > 4/10']
    },
    availableProtocols: [
      {
        id: 'proto-shoulder-flex',
        name: 'Shoulder Flexion (Forward Arm Raise)',
        joint: 'shoulder',
        targetAngle: 150,
        minAngle: 20,
        safeAngleMax: 165,
        setsTarget: 3,
        repsPerSet: 10,
        holdTimeSec: 2,
        pacingSecondsPerRep: 4,
        primaryPlane: 'sagittal',
        affectedSide: 'Right',
        description: 'Post rotator-cuff surgery. Angle: Hip -> Shoulder -> Wrist. Target = 150 deg.',
        contraindications: ['Ear-to-shoulder shrugging']
      },
      {
        id: 'proto-shoulder-abd',
        name: 'Shoulder Abduction (Lateral Arm Raise)',
        joint: 'shoulder',
        targetAngle: 150,
        minAngle: 20,
        safeAngleMax: 165,
        setsTarget: 3,
        repsPerSet: 10,
        holdTimeSec: 2,
        pacingSecondsPerRep: 4,
        primaryPlane: 'frontal',
        affectedSide: 'Right',
        description: 'Lateral arm raise out to side in coronal plane. Target = 150 deg.',
        contraindications: ['Ear-to-shoulder shrugging']
      },
      {
        id: 'proto-shoulder-reach',
        name: 'Cross-Body Reach (Horizontal Adduction)',
        joint: 'shoulder',
        targetAngle: 30,
        minAngle: 90,
        safeAngleMax: 100,
        setsTarget: 2,
        repsPerSet: 10,
        holdTimeSec: 3,
        pacingSecondsPerRep: 4,
        primaryPlane: 'transverse',
        affectedSide: 'Right',
        description: 'Horizontal adduction stretch across chest toward opposite shoulder. Target = 30 deg.',
        contraindications: ['Torso twisting (keep hips level)']
      },
      {
        id: 'proto-shoulder-press',
        name: 'Shoulder Press (Overhead Press)',
        joint: 'shoulder',
        targetAngle: 170,
        minAngle: 40,
        safeAngleMax: 180,
        setsTarget: 3,
        repsPerSet: 8,
        holdTimeSec: 1,
        pacingSecondsPerRep: 3,
        primaryPlane: 'sagittal',
        affectedSide: 'Right',
        description: 'Overhead arm extension. Angle: Elbow -> Shoulder -> Hip. Target = 170 deg.',
        contraindications: ['Arching back (straighten spine)']
      }
    ],
    historicalSessions: [
      { date: '2026-10-28', sessionNumber: 1, maxFlexion: 95, extensionDeficit: 0, targetAngle: 150, symmetryIndex: 82.0, painLevel: 2, compensationCount: 3, repsCompleted: 10 },
      { date: '2026-10-30', sessionNumber: 2, maxFlexion: 112, extensionDeficit: 0, targetAngle: 150, symmetryIndex: 85.5, painLevel: 2, compensationCount: 2, repsCompleted: 10 },
      { date: '2026-11-01', sessionNumber: 3, maxFlexion: 128, extensionDeficit: 0, targetAngle: 150, symmetryIndex: 88.0, painLevel: 1, compensationCount: 1, repsCompleted: 10 },
      { date: '2026-11-03', sessionNumber: 4, maxFlexion: 138, extensionDeficit: 0, targetAngle: 150, symmetryIndex: 91.2, painLevel: 1, compensationCount: 1, repsCompleted: 10 },
      { date: '2026-11-04', sessionNumber: 5, maxFlexion: 145, extensionDeficit: 0, targetAngle: 150, symmetryIndex: 94.0, painLevel: 0, compensationCount: 0, repsCompleted: 10 }
    ],
    milestones: [
      { id: 'm1', title: '90 deg Passive Flexion Restored', targetWeek: 1, completed: true, achievedDate: '2026-10-21', category: 'ROM', description: 'Assisted forward raise past horizontal plane.' },
      { id: 'm2', title: '120 deg Active Flexion', targetWeek: 3, completed: true, achievedDate: '2026-11-01', category: 'ROM', description: 'Active elevation without scapular hiking.' },
      { id: 'm3', title: '150 deg Full Active Range', targetWeek: 5, completed: false, category: 'ROM', description: 'Full functional overhead mobility target.' }
    ],
    recentNotes: [
      {
        date: '2026-11-04',
        author: 'Dr. Sarah Jenkins, DPT, OCS',
        soap: {
          subjective: 'Patient reports minimal soreness after yesterday sessions. Zero sharp subacromial pain.',
          objective: 'Active forward flexion verified at 145 deg. Ear-to-shoulder shrugging decreased by 85%.',
          assessment: 'Remarkable kinematic compliance. Rotator cuff healing trajectory on track for Phase III next week.',
          plan: 'Continue 3 sets of forward flexion and lateral abduction daily. Maintain strict scapular depression.'
        }
      }
    ]
  }
];
