/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { PATIENTS } from './data/mockPatients';
import {
  Patient,
  ExerciseProtocol,
  LiveTelemetryState
} from './types/telemetry';
import { Header, ScreenId } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { HomeHubView } from './components/HomeHubView';
import { DashboardView } from './components/DashboardView';
import { LiveStudioView } from './components/LiveStudioView';
import { ExercisesView } from './components/ExercisesView';
import { UserProfileView } from './components/UserProfileView';
import { DoctorPortalView } from './components/DoctorPortalView';
import { PrescriptionModal } from './components/PrescriptionModal';
import { PainReportModal } from './components/PainReportModal';
import { ClinicianNotesDrawer } from './components/ClinicianNotesDrawer';
import { CheckCircle2, Database, Stethoscope, ArrowLeft } from 'lucide-react';
import {
  fetchPatients,
  saveSessionToDatabase,
  updatePrescriptionInDatabase,
  addClinicianNoteToDatabase,
  checkBackendHealth,
  DoctorProfile
} from './services/api';

export default function App() {
  // Doctor authentication & portal mode
  const [activeDoctor, setActiveDoctor] = useState<DoctorProfile | null>(null);
  const [isDoctorMode, setIsDoctorMode] = useState<boolean>(false);

  // Active patient and protocols
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
  const [activePatient, setActivePatient] = useState<Patient>(PATIENTS[0]);
  const [selectedProtocol, setSelectedProtocol] = useState<ExerciseProtocol>(
    PATIENTS[0].prescribedProtocol
  );
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  // Active navigation screen: defaults to Screen 1 ('login')
  const [activeScreen, setActiveScreen] = useState<ScreenId>('login');

  // Modals state
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isPainModalOpen, setIsPainModalOpen] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Telemetry engine state for Screen 4 (Live Studio)
  const [telemetry, setTelemetry] = useState<LiveTelemetryState>({
    isActive: false,
    isCalibrated: true,
    currentAngle: PATIENTS[0].prescribedProtocol.minAngle,
    currentExtensionDeficit: 0,
    currentVelocity: 0,
    currentReps: 0,
    currentSet: 1,
    targetReps: PATIENTS[0].prescribedProtocol.repsPerSet,
    targetSets: PATIENTS[0].prescribedProtocol.setsTarget,
    targetAngle: PATIENTS[0].prescribedProtocol.targetAngle,
    peakAngleSession: PATIENTS[0].prescribedProtocol.minAngle,
    formStatus: 'optimal',
    activeCompensation: null,
    compensationCount: 0,
    symmetryEstimate: 89.8,
    cadenceRpm: 15,
    elapsedSeconds: 0,
    holdProgress: 0
  });

  // Sync with MySQL Backend on component mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      const online = await checkBackendHealth();
      if (!isMounted) return;
      setIsBackendOnline(online);
      if (online) {
        const dbPatients = await fetchPatients();
        if (isMounted && dbPatients && dbPatients.length > 0) {
          setPatients(dbPatients);
          setActivePatient(dbPatients[0]);
          setSelectedProtocol(dbPatients[0].prescribedProtocol);
          showToast('Connected to MySQL Database via Express API');
        }
      }
    }
    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Switch patient
  const handleSelectPatient = (patient: Patient) => {
    setActivePatient(patient);
    setSelectedProtocol(patient.prescribedProtocol);
    const hasSessions = Boolean(patient.historicalSessions && patient.historicalSessions.length > 0);
    setTelemetry({
      isActive: false,
      isCalibrated: true,
      currentAngle: patient.prescribedProtocol.minAngle,
      currentExtensionDeficit: 0,
      currentVelocity: 0,
      currentReps: 0,
      currentSet: 1,
      targetReps: patient.prescribedProtocol.repsPerSet,
      targetSets: patient.prescribedProtocol.setsTarget,
      targetAngle: patient.prescribedProtocol.targetAngle,
      peakAngleSession: hasSessions ? patient.prescribedProtocol.minAngle : 0,
      formStatus: 'optimal',
      activeCompensation: null,
      compensationCount: 0,
      symmetryEstimate: hasSessions ? (patient.historicalSessions[patient.historicalSessions.length - 1]?.symmetryIndex || 0) : 0,
      cadenceRpm: 15,
      elapsedSeconds: 0,
      holdProgress: 0
    });
  };

  // Launch a specific exercise directly into Screen 4 (Live Studio)
  const handleStartExercise = (protocol: ExerciseProtocol) => {
    setSelectedProtocol(protocol);
    setTelemetry((prev) => ({
      ...prev,
      isActive: true,
      targetAngle: protocol.targetAngle,
      targetReps: protocol.repsPerSet,
      targetSets: protocol.setsTarget,
      currentAngle: protocol.minAngle,
      peakAngleSession: protocol.minAngle,
      currentReps: 0,
      currentSet: 1
    }));
    setActiveScreen('live-studio');
    showToast(`Launching ${protocol.name} in Screen 4 (Live Studio)...`);
  };

  // Repetition complete callback
  // Repetition complete callback - with Adaptive +5 Target Angle Progression!
  const handleRepetitionComplete = useCallback(
    (repCount: number, peakAngle: number) => {
      setTelemetry((prev) => {
        let newSet = prev.currentSet;
        let newReps = repCount;
        let updatedTargetAngle = prev.targetAngle;

        // If user completes target reps, automatically increase target angle by +5°!
        if (newReps >= selectedProtocol.repsPerSet) {
          updatedTargetAngle = Math.min(180, prev.targetAngle + 5);
          showToast(`🎯 Target Milestone reached! Next target angle progressed by +5° to ${updatedTargetAngle}°!`);

          // Update active protocol target angle
          setSelectedProtocol((proto) => ({
            ...proto,
            targetAngle: updatedTargetAngle
          }));
          setActivePatient((pat) => ({
            ...pat,
            prescribedProtocol: {
              ...pat.prescribedProtocol,
              targetAngle: updatedTargetAngle
            }
          }));

          if (newSet < selectedProtocol.setsTarget) {
            newSet += 1;
            newReps = 0;
          }
        }
        return {
          ...prev,
          currentReps: newReps,
          currentSet: newSet,
          targetAngle: updatedTargetAngle,
          peakAngleSession: Math.max(prev.peakAngleSession, peakAngle)
        };
      });
    },
    [selectedProtocol.repsPerSet, selectedProtocol.setsTarget]
  );

  // Compensation detected callback
  const handleCompensationDetected = useCallback((type: string, deviation: number) => {
    setTelemetry((prev) => ({
      ...prev,
      compensationCount: prev.compensationCount + 1,
      activeCompensation: `${type} (Deviation: +${deviation}°)`
    }));
  }, []);

  // Emergency / Pain Stop
  const handleEmergencyStop = () => {
    setTelemetry((prev) => ({ ...prev, isActive: false }));
    setIsPainModalOpen(true);
  };

  // Toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Save modified prescription to local state and MySQL
  const handleSaveProtocol = async (updated: ExerciseProtocol) => {
    setSelectedProtocol(updated);
    setTelemetry((prev) => ({
      ...prev,
      targetAngle: updated.targetAngle,
      targetReps: updated.repsPerSet,
      targetSets: updated.setsTarget
    }));
    showToast(`Prescription saved: Target ${updated.targetAngle}°, Volume ${updated.setsTarget}x${updated.repsPerSet}`);

    // Persist to MySQL database
    await updatePrescriptionInDatabase(activePatient.id, {
      protocolId: updated.id,
      targetAngle: updated.targetAngle,
      setsTarget: updated.setsTarget,
      repsPerSet: updated.repsPerSet,
      holdTimeSec: updated.holdTimeSec
    });
  };

  // End workout session and save telemetry metrics to MySQL
  const handleEndSessionAndReturn = async () => {
    if (telemetry.currentReps > 0 || telemetry.peakAngleSession > selectedProtocol.minAngle) {
      showToast('Logging session telemetry to MySQL...');
      await saveSessionToDatabase({
        patientId: activePatient.id,
        protocolId: selectedProtocol.id,
        maxFlexion: Math.round(telemetry.peakAngleSession),
        targetAngle: telemetry.targetAngle,
        symmetryIndex: telemetry.symmetryEstimate,
        compensationCount: telemetry.compensationCount,
        repsCompleted: telemetry.currentReps,
        durationSeconds: telemetry.elapsedSeconds || 120
      });

      // Refresh latest metrics from MySQL
      const refreshed = await fetchPatients();
      if (refreshed && refreshed.length > 0) {
        setPatients(refreshed);
        const curr = refreshed.find((p) => p.id === activePatient.id) || refreshed[0];
        setActivePatient(curr);
      }
    }
    setActiveScreen('dashboard');
    showToast('Session logged to MySQL database. Returned to Screen 3 (Dashboard).');
  };

  // Add new clinical SOAP note
  const handleAddNote = async (newNote: Patient['recentNotes'][0]) => {
    const updatedPatients = patients.map((p) => {
      if (p.id === activePatient.id) {
        return {
          ...p,
          recentNotes: [newNote, ...p.recentNotes]
        };
      }
      return p;
    });
    setPatients(updatedPatients);
    setActivePatient((prev) => ({
      ...prev,
      recentNotes: [newNote, ...prev.recentNotes]
    }));
    showToast('Clinical progress note saved to electronic medical record.');

    // Save to MySQL
    await addClinicianNoteToDatabase({
      patientId: activePatient.id,
      author: newNote.author,
      subjective: newNote.soap.subjective,
      objective: newNote.soap.objective,
      assessment: newNote.soap.assessment,
      plan: newNote.soap.plan,
      noteDate: newNote.date
    });
  };

  // SCREEN 1: LOGIN PAGE
  if (activeScreen === 'login') {
    return (
      <LoginPage
        patients={patients}
        selectedPatient={activePatient}
        onSelectPatient={handleSelectPatient}
        onDoctorLoginSuccess={(doctor) => {
          setActiveDoctor(doctor);
          setIsDoctorMode(true);
          setActiveScreen('doctor-portal');
          showToast(`Welcome Dr. ${doctor.name}! Accessing Hospital Management Portal.`);
        }}
        onLoginSuccess={(authenticatedPatient, startingTargetAngle, customNotes) => {
          const finalTarget = startingTargetAngle || authenticatedPatient.prescribedProtocol.targetAngle || 110;
          const updatedPatient = {
            ...authenticatedPatient,
            prescribedProtocol: {
              ...authenticatedPatient.prescribedProtocol,
              targetAngle: finalTarget,
              description: customNotes || authenticatedPatient.prescribedProtocol.description,
            },
          };
          handleSelectPatient(updatedPatient);
          setTelemetry((prev) => ({
            ...prev,
            targetAngle: finalTarget,
          }));
          setActiveScreen('home-hub');
          showToast(`Welcome ${authenticatedPatient.name}! Target angle set to ${finalTarget}°.`);
        }}
      />
    );
  }

  // SCREEN: DOCTOR PORTAL
  if (activeScreen === 'doctor-portal' && activeDoctor) {
    return (
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DoctorPortalView
            doctor={activeDoctor}
            patients={patients}
            onUpdateDoctor={(updated) => {
              setActiveDoctor(updated);
              showToast('Doctor profile and hospital details updated.');
            }}
            onSelectPatientToMonitor={(patientToMonitor) => {
              handleSelectPatient(patientToMonitor);
              setActiveScreen('dashboard');
              showToast(`Monitoring patient: ${patientToMonitor.name} (${patientToMonitor.userNumberId || patientToMonitor.mrn})`);
            }}
            onLogoutDoctor={() => {
              setActiveDoctor(null);
              setIsDoctorMode(false);
              setActiveScreen('login');
              showToast('Doctor signed out.');
            }}
          />
        </main>
      </div>
    );
  }

  // SCREENS 2 - 6: Clinical Shell with Unified Header
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans selection:bg-[#cce5ff] selection:text-[#001d31]">
      <Header
        patients={patients}
        activePatient={activePatient}
        onSelectPatient={handleSelectPatient}
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        isSessionActive={telemetry.isActive}
        isDoctorMode={isDoctorMode}
        onReturnToDoctorPortal={() => setActiveScreen('doctor-portal')}
        onLogout={() => {
          setIsDoctorMode(false);
          setActiveDoctor(null);
          setActiveScreen('login');
          showToast('Logged out successfully. Returned to Login Screen.');
        }}
      />

      {/* Doctor Remote Monitoring Mode Banner */}
      {isDoctorMode && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-4 py-2 border-b border-purple-700/80 text-xs shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="font-extrabold uppercase tracking-wider text-purple-300">Doctor Monitoring Active:</span>
              <span className="text-purple-100">
                Viewing Patient: <strong className="text-white">{activePatient.name}</strong> ({activePatient.userNumberId || activePatient.mrn}) • Target ROM: <strong className="text-emerald-300">{activePatient.prescribedProtocol.targetAngle}°</strong>
              </span>
            </div>
            <button
              onClick={() => setActiveScreen('doctor-portal')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/25 cursor-pointer self-end sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Doctor Portal / Manage Users</span>
            </button>
          </div>
        </div>
      )}

      {/* Database Status Indicator Bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#006194]" />
            <span>Database Status:</span>
            {isBackendOnline ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                MySQL Connected (XAMPP localhost:3306)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" title="Start MySQL in XAMPP and run 'npm run server'">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Offline Mode (Local Mock Fallback)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">REST API: http://localhost:5000/api</span>
        </div>
      </div>

      {/* Floating System Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        {activeScreen === 'home-hub' && (
          <HomeHubView
            patient={activePatient}
            onNavigate={setActiveScreen}
            onStartExercise={handleStartExercise}
          />
        )}

        {activeScreen === 'dashboard' && (
          <DashboardView
            patient={activePatient}
            onStartExercise={handleStartExercise}
            onOpenPrescription={() => setIsPrescriptionModalOpen(true)}
            onOpenNotes={() => setIsNotesDrawerOpen(true)}
          />
        )}

        {activeScreen === 'live-studio' && (
          <LiveStudioView
            patient={activePatient}
            protocol={selectedProtocol}
            telemetry={telemetry}
            onUpdateTelemetry={setTelemetry}
            onEmergencyStop={handleEmergencyStop}
            onRepetitionComplete={handleRepetitionComplete}
            onCompensationDetected={handleCompensationDetected}
            onBackToDashboard={handleEndSessionAndReturn}
            onSelectProtocol={setSelectedProtocol}
          />
        )}

        {activeScreen === 'exercises' && (
          <ExercisesView
            patient={activePatient}
            onStartExercise={handleStartExercise}
            onOpenPrescription={(proto) => {
              setSelectedProtocol(proto);
              setIsPrescriptionModalOpen(true);
            }}
          />
        )}

        {activeScreen === 'profile' && (
          <UserProfileView
            patient={activePatient}
            onLogout={() => {
              setActiveScreen('login');
              showToast('Logged out to Screen 1 (Login).');
            }}
            onUpdatePatient={(updated) => {
              setActivePatient(updated);
              setSelectedProtocol(updated.prescribedProtocol);
              setTelemetry((prev) => ({
                ...prev,
                targetAngle: updated.prescribedProtocol.targetAngle,
              }));
              showToast('Patient profile updated successfully.');
            }}
          />
        )}
      </main>

      {/* Clinical Modals */}
      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        patient={activePatient}
        protocol={selectedProtocol}
        onSaveProtocol={handleSaveProtocol}
      />

      <PainReportModal
        isOpen={isPainModalOpen}
        onClose={() => setIsPainModalOpen(false)}
        patient={activePatient}
        protocol={selectedProtocol}
        currentAngle={telemetry.currentAngle}
      />

      <ClinicianNotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        patient={activePatient}
        onAddNote={handleAddNote}
      />
    </div>
  );
}
