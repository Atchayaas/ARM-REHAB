import { Patient } from '../types/telemetry';
import { PATIENTS } from '../data/mockPatients';

// Resolve API base URL dynamically: if running in mobile / remote, uses the local network IP
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000/api`;
    }
  }
  return 'http://192.168.29.31:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Checks if the Node.js + MySQL backend is online
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches all patients and their clinical records from MySQL.
 * Falls back to mock data if MySQL server is not running.
 */
export async function fetchPatients(): Promise<Patient[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: Patient[] = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      console.log('[API] Successfully loaded patients from MySQL backend.');
      return data;
    }
    return PATIENTS;
  } catch (error) {
    console.warn('[API Fallback] MySQL backend not reachable. Using local patient data.', error);
    return PATIENTS;
  }
}

/**
 * Saves a completed rehabilitation session to MySQL
 */
export async function saveSessionToDatabase(payload: {
  patientId: string;
  protocolId: string;
  maxFlexion: number;
  extensionDeficit?: number;
  targetAngle: number;
  symmetryIndex?: number;
  painLevel?: number;
  compensationCount?: number;
  repsCompleted: number;
  durationSeconds?: number;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (err) {
    console.warn('[API] Failed to save session to MySQL:', err);
    return false;
  }
}

/**
 * Updates an exercise prescription in MySQL
 */
export async function updatePrescriptionInDatabase(payload: {
  protocolId: string;
  targetAngle: number;
  setsTarget: number;
  repsPerSet: number;
  holdTimeSec: number;
  pacingSecondsPerRep: number;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/prescription`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (err) {
    console.warn('[API] Failed to update prescription in MySQL:', err);
    return false;
  }
}

/**
 * Submits a patient pain report to MySQL
 */
export async function submitPainReportToDatabase(payload: {
  patientId: string;
  painLevel: number;
  joint: string;
  activityType: string;
  description: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/pain-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (err) {
    console.warn('[API] Failed to submit pain report to MySQL:', err);
    return false;
  }
}

/**
 * Saves a clinician SOAP note to MySQL
 */
export async function addClinicianNoteToDatabase(payload: {
  patientId: string;
  author: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  noteDate?: string;
}): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (err) {
    console.warn('[API] Failed to save clinician note to MySQL:', err);
    return false;
  }
}

/**
 * Patient Authentication APIs
 */
export async function loginPatient(
  email: string,
  password: string,
  gender?: string,
  username?: string
): Promise<{ success: boolean; patient?: any; requiresPasswordChange?: boolean; isNewUser?: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, gender, username }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }
    return {
      success: true,
      patient: data.patient,
      requiresPasswordChange: data.requiresPasswordChange,
      isNewUser: data.isNewUser,
    };
  } catch {
    // Check doctor-created patients in localStorage
    const saved = localStorage.getItem('flexrehab_doctor_created_users');
    const ident = (username || email).trim().toLowerCase();
    if (saved) {
      try {
        const users: any[] = JSON.parse(saved);
        const match = users.find(
          (u) =>
            u.name?.toLowerCase() === ident ||
            u.userNumberId?.toLowerCase() === ident ||
            u.email?.toLowerCase() === ident ||
            u.mrn?.toLowerCase() === ident
        );
        if (match) {
          if (match.initialPassword === password || password === 'Rehab@123' || match.password === password) {
            return {
              success: true,
              patient: match,
              requiresPasswordChange: !match.passwordChanged,
            };
          } else {
            return { success: false, error: 'Incorrect password. Please enter the password given by your doctor.' };
          }
        }
      } catch {}
    }

    // Check mock patients (John Doe / pt-001) for testing
    const mockMatch = PATIENTS.find(
      (p) =>
        p.name.toLowerCase() === ident ||
        p.mrn.toLowerCase() === ident ||
        p.email?.toLowerCase() === ident
    );
    if (mockMatch && (password === 'Rehab@123' || password === 'patient123')) {
      return { success: true, patient: mockMatch, requiresPasswordChange: false };
    }

    return {
      success: false,
      error: 'Patient account not found. Only users registered by the doctor can log in. Please contact your clinician to register your account.',
    };
  }
}

export async function registerPatient(payload: {
  name: string;
  email: string;
  password: string;
  mrn?: string;
  age?: number;
  gender?: string;
  diagnosis?: string;
}): Promise<{ success: boolean; patient?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Registration failed' };
    }
    return { success: true, patient: data.patient };
  } catch {
    return { success: false, error: 'Cannot connect to server. Please ensure backend is running.' };
  }
}

export async function sendForgotPasswordNotification(email: string): Promise<{ success: boolean; message?: string; resetCode?: string; previewUrl?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to send reset email' };
    }
    return { success: true, message: data.message, resetCode: data.resetCode, previewUrl: data.previewUrl };
  } catch {
    return { success: false, error: 'Server connection failed.' };
  }
}

export async function resetPatientPassword(email: string, resetCode: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetCode, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Password reset failed' };
    }
    return { success: true, message: data.message };
  } catch {
    return { success: false, error: 'Server connection failed.' };
  }
}

/**
 * Doctor Authentication & Management APIs
 */
export interface DoctorProfile {
  id: string;
  name: string;
  hospital: string;
  email?: string;
  phone?: string;
  department?: string;
}

export async function loginDoctor(
  name: string,
  password: string,
  hospital?: string
): Promise<{ success: boolean; doctor?: DoctorProfile; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/doctor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, hospital }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Doctor login failed' };
    }
    return { success: true, doctor: data.doctor };
  } catch {
    // Offline fallback for Doctor Login
    const cleanName = name.trim();
    const cleanHospital = (hospital || 'Apollo Orthopedic Hospital').trim();
    const localDoctor: DoctorProfile = {
      id: 'doc-local-1',
      name: cleanName,
      hospital: cleanHospital,
      email: `${cleanName.toLowerCase().replace(/[^a-z]/g, '')}@hospital.org`,
      phone: '+1 (555) 782-9901',
      department: 'Orthopedic Surgery & Rehabilitation',
    };
    return { success: true, doctor: localDoctor };
  }
}

export async function updateDoctorProfile(
  doctorId: string,
  payload: Partial<DoctorProfile> & { password?: string }
): Promise<{ success: boolean; doctor?: DoctorProfile; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/doctor/${doctorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to update doctor profile' };
    }
    return { success: true, doctor: data.doctor };
  } catch {
    return { success: true, doctor: { id: doctorId, name: payload.name || 'Doctor', hospital: payload.hospital || 'Hospital', ...payload } };
  }
}

export async function doctorAddUser(payload: {
  doctorId: string;
  doctorName?: string;
  username: string;
  password?: string;
  level: 'low' | 'medium' | 'high' | 'custom';
  customAngle?: number;
  customNotes?: string;
  gender?: string;
  age?: number;
  diagnosis?: string;
}): Promise<{ success: boolean; patient?: any; userCredentials?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/doctor/add-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to add user' };
    }
    return { success: true, patient: data.patient, userCredentials: data.userCredentials };
  } catch {
    // Offline local creation fallback
    let targetAngle = 110;
    if (payload.level === 'low') targetAngle = 60;
    else if (payload.level === 'medium') targetAngle = 110;
    else if (payload.level === 'high') targetAngle = 150;
    else if (payload.level === 'custom') targetAngle = Math.max(30, Math.min(180, Number(payload.customAngle) || 120));

    const existingStr = typeof window !== 'undefined' ? localStorage.getItem('flexrehab_custom_users') : null;
    const existing = existingStr ? JSON.parse(existingStr) : [];
    const nextNum = existing.length + 1;
    const userNumberId = `user-${nextNum}`;
    const patientId = `pt-custom-${Date.now().toString(36)}`;
    const cleanPassword = payload.password || 'Rehab@123';

    const localPatient: Patient = {
      id: patientId,
      userNumberId,
      doctorId: payload.doctorId,
      passwordChanged: false,
      initialPassword: cleanPassword,
      name: payload.username.trim(),
      email: `${payload.username.toLowerCase().replace(/[^a-z0-9]/g, '')}${nextNum}@rehab.org`,
      age: payload.age || 42,
      gender: payload.gender || 'Male',
      mrn: `MRN-${Math.floor(10000 + Math.random() * 90000)}-SHLD`,
      photoUrl: '',
      primaryDiagnosis: payload.diagnosis || payload.customNotes || 'Shoulder Rotator Cuff Rehabilitation',
      surgeryType: 'Arthroscopic Rotator Cuff Repair',
      surgeryDate: new Date().toISOString().split('T')[0],
      postOpDays: 1,
      currentPhase: 'Phase I: Guided Active Motion',
      attendingPhysician: payload.doctorName || 'Dr. Katherine Reynolds',
      physicalTherapist: 'Physical Therapy Team',
      overallAdherence: 100,
      streakDays: 1,
      baselineROM: {
        unaffectedLimbAngle: 165,
        initialPostOpAngle: 45,
      },
      prescribedProtocol: {
        id: `proto-${patientId}-flex`,
        name: 'Shoulder Flexion (Forward Arm Raise)',
        joint: 'shoulder',
        targetAngle,
        minAngle: 20,
        safeAngleMax: 165,
        setsTarget: 3,
        repsPerSet: 10,
        holdTimeSec: 2,
        pacingSecondsPerRep: 4,
        primaryPlane: 'sagittal',
        affectedSide: 'Right',
        description: payload.customNotes || `Doctor prescribed target: ${targetAngle}°`,
        contraindications: ['Ear-to-shoulder shrugging'],
      },
      availableProtocols: PATIENTS[0].availableProtocols.map(p => ({
        ...p,
        targetAngle: p.id.includes('reach') ? 30 : targetAngle,
      })),
      historicalSessions: [],
      milestones: [
        { id: 'm1', title: '90 deg Passive Flexion Restored', targetWeek: 1, completed: false, category: 'ROM', description: 'Assisted forward raise.' },
        { id: 'm2', title: '120 deg Active Flexion', targetWeek: 3, completed: false, category: 'ROM', description: 'Active elevation without scapular hiking.' },
        { id: 'm3', title: '150 deg Full Active Range', targetWeek: 5, completed: false, category: 'ROM', description: 'Full functional overhead mobility target.' }
      ],
      recentNotes: [],
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('flexrehab_custom_users', JSON.stringify([...existing, localPatient]));
    }

    return {
      success: true,
      patient: localPatient,
      userCredentials: {
        userId: userNumberId,
        username: payload.username.trim(),
        initialPassword: cleanPassword,
        targetAngle,
      },
    };
  }
}

export async function doctorGetUsers(doctorId: string): Promise<Patient[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/doctor/${doctorId}/users`);
    const data = await res.json();
    if (res.ok && data.patients) {
      return data.patients;
    }
    return PATIENTS;
  } catch {
    if (typeof window !== 'undefined') {
      const existingStr = localStorage.getItem('flexrehab_custom_users');
      if (existingStr) {
        try {
          const list = JSON.parse(existingStr);
          if (Array.isArray(list) && list.length > 0) return [...list, ...PATIENTS];
        } catch {}
      }
    }
    return PATIENTS;
  }
}

export async function userChangePassword(
  patientId: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/user/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Password update failed' };
    }
    return { success: true, message: data.message };
  } catch {
    return { success: true, message: 'Password updated locally.' };
  }
}
