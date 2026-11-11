export type JointType = 'knee' | 'shoulder' | 'hip' | 'elbow' | 'ankle' | 'spine';

export type AlertSeverity = 'normal' | 'caution' | 'warning' | 'danger';

export interface ExerciseProtocol {
  id: string;
  name: string;
  joint: JointType;
  targetAngle: number; // e.g. 125 degrees
  minAngle: number;    // e.g. 0 or 5 degrees extension
  safeAngleMax: number;// e.g. 135 degrees (red zone if exceeded)
  setsTarget: number;
  repsPerSet: number;
  holdTimeSec: number;
  pacingSecondsPerRep: number;
  primaryPlane: 'sagittal' | 'frontal' | 'transverse';
  affectedSide: 'Right' | 'Left' | 'Bilateral';
  description: string;
  contraindications: string[];
}

export interface CompensationEvent {
  id: string;
  timestamp: string;
  type: string; // e.g., 'Trunk Lateral Lean', 'Valgus Collapse', 'Pelvic Tilt', 'Sudden Velocity Spike'
  angleDeviation: number; // degrees deviation
  severity: 'caution' | 'warning';
  notes: string;
}

export interface HistoricalDataPoint {
  date: string;
  sessionNumber: number;
  maxFlexion: number;
  extensionDeficit: number;
  targetAngle: number;
  symmetryIndex: number; // percentage (e.g. 88%)
  painLevel: number; // 0 - 10
  compensationCount: number;
  repsCompleted: number;
}

export interface Milestone {
  id: string;
  title: string;
  targetWeek: number;
  completed: boolean;
  achievedDate?: string;
  category: 'ROM' | 'Strength' | 'Functional' | 'Gait';
  description: string;
}

export interface Patient {
  id: string;
  userNumberId?: string;
  doctorId?: string;
  passwordChanged?: boolean;
  initialPassword?: string;
  name: string;
  email?: string;
  age: number;
  gender: string;
  mrn: string; // Medical Record Number
  photoUrl: string;
  primaryDiagnosis: string;
  surgeryType: string;
  surgeryDate: string;
  postOpDays: number;
  currentPhase: string;
  attendingPhysician: string;
  physicalTherapist: string;
  prescribedProtocol: ExerciseProtocol;
  availableProtocols: ExerciseProtocol[];
  baselineROM: {
    unaffectedLimbAngle: number;
    initialPostOpAngle: number;
  };
  overallAdherence: number; // e.g. 94%
  streakDays: number;
  historicalSessions: HistoricalDataPoint[];
  milestones: Milestone[];
  recentNotes: {
    date: string;
    author: string;
    soap: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
  }[];
}

export interface LiveTelemetryState {
  isActive: boolean;
  isCalibrated: boolean;
  currentAngle: number;
  currentExtensionDeficit: number;
  currentVelocity: number; // deg/sec
  currentReps: number;
  currentSet: number;
  targetReps: number;
  targetSets: number;
  targetAngle: number;
  peakAngleSession: number;
  formStatus: 'optimal' | 'stabilizing' | 'compensating';
  activeCompensation: string | null;
  compensationCount: number;
  symmetryEstimate: number;
  cadenceRpm: number;
  elapsedSeconds: number;
  holdProgress: number; // 0 to 1
}
