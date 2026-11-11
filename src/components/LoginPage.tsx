import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  HeartPulse,
  Mail,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sliders,
  Users,
  User,
  Stethoscope,
  Building2,
  Key
} from 'lucide-react';
import { Patient } from '../types/telemetry';
import {
  loginPatient,
  sendForgotPasswordNotification,
  resetPatientPassword,
  loginDoctor,
  userChangePassword,
  DoctorProfile
} from '../services/api';

interface Props {
  patients: Patient[];
  selectedPatient: Patient;
  onSelectPatient: (patient: Patient) => void;
  onLoginSuccess: (patient: Patient, initialTargetAngle?: number, customNotes?: string) => void;
  onDoctorLoginSuccess: (doctor: DoctorProfile) => void;
}

export const LoginPage: React.FC<Props> = ({
  patients,
  selectedPatient,
  onSelectPatient,
  onLoginSuccess,
  onDoctorLoginSuccess
}) => {
  // Role tab: 'user' (Patient) or 'doctor' (Clinician)
  const [role, setRole] = useState<'user' | 'doctor'>('user');

  // Steps: 'login' | 'change-password' | 'forgot' | 'assessment'
  const [step, setStep] = useState<'login' | 'change-password' | 'forgot' | 'assessment'>('login');

  // Patient Login Form fields
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [gender, setGender] = useState<string>('Male');

  // Doctor Login Form fields
  const [doctorName, setDoctorName] = useState<string>('Dr. Katherine Reynolds, MD');
  const [doctorHospital, setDoctorHospital] = useState<string>('Apollo Orthopedic Rehabilitation Hospital');
  const [doctorPassword, setDoctorPassword] = useState<string>('doctor123');

  // User First-Time Change Password fields
  const [firstTimeNewPassword, setFirstTimeNewPassword] = useState<string>('');
  const [firstTimeConfirmPassword, setFirstTimeConfirmPassword] = useState<string>('');

  // Authenticated user awaiting password change or assessment
  const [pendingUser, setPendingUser] = useState<Patient | null>(null);

  // Forgot password & Reset states
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [previewEmailUrl, setPreviewEmailUrl] = useState<string | null>(null);

  // Assessment Selection States (Low: 60°, Medium: 110°, High: 150°, Custom)
  const [selectedRange, setSelectedRange] = useState<'low' | 'medium' | 'high' | 'custom'>('medium');
  const [customAngle, setCustomAngle] = useState<number>(120);
  const [customPrescriptionText, setCustomPrescriptionText] = useState<string>('');

  // UI status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. User / Patient Login Submit
  const handleUserLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both your Username (or ID) and Password provided by your doctor.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await loginPatient(username.trim(), password.trim(), gender, username.trim());
    setIsLoading(false);

    if (result.success && result.patient) {
      const isNew = result.isNewUser || !result.patient.historicalSessions || result.patient.historicalSessions.length === 0;
      const displayName = username.trim() || result.patient.name || 'Patient';

      const fullPatient: Patient = {
        ...selectedPatient,
        ...result.patient,
        id: result.patient.id || selectedPatient.id,
        name: displayName,
        email: result.patient.email || `${username.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@rehab.org`,
        gender: result.patient.gender || gender,
        mrn: result.patient.mrn || selectedPatient.mrn,
        photoUrl: result.patient.photo_url || '',
        primaryDiagnosis: result.patient.primary_diagnosis || selectedPatient.primaryDiagnosis,
        historicalSessions: isNew ? [] : (result.patient.historicalSessions || []),
        milestones: isNew
          ? [
              { id: 'm1', title: '90 deg Passive Flexion Restored', targetWeek: 1, completed: false, category: 'ROM', description: 'Assisted forward raise past horizontal plane.' },
              { id: 'm2', title: '120 deg Active Flexion', targetWeek: 3, completed: false, category: 'ROM', description: 'Active elevation without scapular hiking.' },
              { id: 'm3', title: '150 deg Full Active Range', targetWeek: 5, completed: false, category: 'ROM', description: 'Full functional overhead mobility target.' }
            ]
          : (result.patient.milestones || selectedPatient.milestones),
      };

      setPendingUser(fullPatient);

      // If user is logging in with doctor-assigned initial static password, prompt to set personal password!
      if (result.requiresPasswordChange || fullPatient.passwordChanged === false) {
        setStep('change-password');
      } else {
        // Direct entry with doctor-prescribed target
        const prescribedTarget = fullPatient.prescribedProtocol?.targetAngle || 110;
        onSelectPatient(fullPatient);
        onLoginSuccess(fullPatient, prescribedTarget);
      }
    } else {
      setErrorMessage(result.error || 'Login failed. Please verify your credentials or check with your doctor.');
    }
  };

  // 2. Doctor Login Submit
  const handleDoctorLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !doctorPassword.trim() || !doctorHospital.trim()) {
      setErrorMessage('Please enter Doctor Name, Password, and Hospital Name.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await loginDoctor(doctorName.trim(), doctorPassword.trim(), doctorHospital.trim());
    setIsLoading(false);

    if (result.success && result.doctor) {
      onDoctorLoginSuccess(result.doctor);
    } else {
      setErrorMessage(result.error || 'Doctor authentication failed.');
    }
  };

  // 3. User First-Time Change Password Submit
  const handleFirstTimeChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstTimeNewPassword.trim()) {
      setErrorMessage('Please enter your new password.');
      return;
    }
    if (firstTimeNewPassword.length < 4) {
      setErrorMessage('Password should be at least 4 characters long.');
      return;
    }
    if (firstTimeNewPassword !== firstTimeConfirmPassword) {
      setErrorMessage('New passwords do not match. Please re-enter.');
      return;
    }

    if (!pendingUser) return;

    setIsLoading(true);
    setErrorMessage(null);
    await userChangePassword(pendingUser.id, firstTimeNewPassword.trim());
    setIsLoading(false);

    const updatedUser: Patient = {
      ...pendingUser,
      passwordChanged: true,
    };

    const finalTarget = updatedUser.prescribedProtocol?.targetAngle || 110;
    onSelectPatient(updatedUser);
    onLoginSuccess(updatedUser, finalTarget);
  };

  // 4. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewEmailUrl(null);

    const result = await sendForgotPasswordNotification(forgotEmail.trim());
    setIsLoading(false);

    if (result.success) {
      setCodeSent(true);
      setSuccessMessage(result.message || `Password reset notification sent to ${forgotEmail}`);
      if (result.previewUrl) setPreviewEmailUrl(result.previewUrl);
    } else {
      setErrorMessage(result.error || 'Failed to send reset notification.');
    }
  };

  // 5. Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) {
      setErrorMessage('Please enter the verification code and your new password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await resetPatientPassword(forgotEmail, resetCode, newPassword);
    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('Password reset successfully! You can now log in.');
      setPassword(newPassword);
      setTimeout(() => {
        setStep('login');
        setCodeSent(false);
        setResetCode('');
      }, 1200);
    } else {
      setErrorMessage(result.error || 'Invalid or expired verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8ff] via-[#f1f5f9] to-[#e2e8f0] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Clinical Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#006194] to-[#0284C7] flex items-center justify-center text-white shadow-md shadow-[#006194]/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">
              FlexRehab <span className="text-[#006194]">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              CLINICAL DUAL-ROLE PORTAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">256-Bit Encrypted Telemetry</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto my-auto py-6">
        {/* ================= STEP: FIRST-TIME USER CHANGE PASSWORD ================= */}
        {step === 'change-password' && pendingUser && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 max-w-lg mx-auto animate-fade-in space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-2">
                <Key className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider bg-amber-100/60 px-2.5 py-1 rounded-full">
                First-Time Security Setup
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome, {pendingUser.name}!
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your doctor created your account (ID: <strong className="text-slate-800 font-mono">{pendingUser.userNumberId || pendingUser.mrn}</strong>). Please set your personal password below to replace the doctor's initial temporary password.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleFirstTimeChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Enter New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={firstTimeNewPassword}
                    onChange={(e) => setFirstTimeNewPassword(e.target.value)}
                    required
                    placeholder="Create a personal password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={firstTimeConfirmPassword}
                    onChange={(e) => setFirstTimeConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#006194] shrink-0" />
                <span>
                  Doctor assigned target: <strong>{pendingUser.prescribedProtocol?.targetAngle || 110}°</strong>. You can begin therapy immediately!
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-sm font-bold shadow-lg shadow-[#006194]/25 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Save New Password & Enter App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP: FORGOT PASSWORD ================= */}
        {step === 'forgot' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-10 max-w-md mx-auto animate-fade-in space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900">Reset Your Password</h2>
              <p className="text-xs text-slate-500">
                Enter your email address to receive password reset notification.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {!codeSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setStep('login'); setErrorMessage(null); setSuccessMessage(null); }}
                    className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-1/2 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    {isLoading ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">6-Digit Code</label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeSent(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ================= STEP: MAIN LOGIN (PATIENT OR DOCTOR) ================= */}
        {step === 'login' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
            {/* Left Brand Panel */}
            <div className="md:col-span-5 bg-gradient-to-br from-[#006194] to-[#034d75] p-6 sm:p-8 text-white flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-semibold text-sky-100 mb-4 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                  Dual Role Telemetry Engine v3.5
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Shoulder Physical Rehabilitation Platform
                </h2>
                <p className="text-xs text-sky-100/90 mt-2 leading-relaxed">
                  Select your role below: Patient/User login with doctor-assigned credentials, or Doctor login to manage patients and adjust prescribed angles.
                </p>

                <div className="mt-8 pt-5 border-t border-white/15 space-y-2.5 text-xs text-sky-200">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Doctor Multi-User Administration</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Sequential IDs: user-1, user-2, user-3</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Real-Time Biomechanical Angle Telemetry</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Remote Patient Dashboard Monitoring</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-sky-200">
                <span className="flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5" /> Clinical Synchronization
                </span>
                <span>Active MySQL Sync</span>
              </div>
            </div>

            {/* Right Panel: Role Tabs + Login Form */}
            <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
              {/* ROLE SWITCHER TABS (USER LOGIN vs DOCTOR LOGIN) */}
              <div className="mb-6">
                <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('user');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      role === 'user'
                        ? 'bg-white text-[#006194] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Patient / User Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRole('doctor');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      role === 'doctor'
                        ? 'bg-[#006194] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Doctor / Clinician Login</span>
                  </button>
                </div>

                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {role === 'user' ? 'Patient Portal Login' : 'Doctor Clinical Administration'}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {role === 'user'
                    ? 'Enter the Username (or User ID) and Password given by your doctor.'
                    : 'Enter Doctor Name, Password, and Hospital Name to access management portal.'}
                </p>
              </div>

              {/* Error & Success Alerts */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* FORM A: PATIENT / USER LOGIN */}
              {role === 'user' && (
                <form onSubmit={handleUserLoginSubmit} className="space-y-4 animate-fade-in">
                  {/* Username / User ID */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Username or User ID (e.g. user-1 or Ramesh)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Enter username or ID given by doctor"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">Password</label>
                      <button
                        type="button"
                        onClick={() => { setStep('forgot'); setErrorMessage(null); setSuccessMessage(null); }}
                        className="text-[11px] text-[#006194] hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194] transition-all"
                      />
                    </div>
                  </div>

                  {/* Sex */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Sex</label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#006194]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Login Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-sm font-bold shadow-lg shadow-[#006194]/25 hover:shadow-xl transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Login as Patient</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* FORM B: DOCTOR / CLINICIAN LOGIN */}
              {role === 'doctor' && (
                <form onSubmit={handleDoctorLoginSubmit} className="space-y-4 animate-fade-in">
                  {/* Doctor Full Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Doctor Name & Title
                    </label>
                    <div className="relative">
                      <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        required
                        placeholder="e.g. Dr. Katherine Reynolds, MD"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194] transition-all"
                      />
                    </div>
                  </div>

                  {/* Hospital Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Hospital / Clinic Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={doctorHospital}
                        onChange={(e) => setDoctorHospital(e.target.value)}
                        required
                        placeholder="e.g. Apollo Orthopedic Rehabilitation Hospital"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194] transition-all"
                      />
                    </div>
                  </div>

                  {/* Doctor Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Doctor Access Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        value={doctorPassword}
                        onChange={(e) => setDoctorPassword(e.target.value)}
                        required
                        placeholder="Enter doctor password"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194] transition-all"
                      />
                    </div>
                  </div>

                  {/* Doctor Login Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-sm font-bold shadow-lg shadow-[#006194]/25 hover:shadow-xl transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Stethoscope className="w-4 h-4" />
                          <span>Login to Doctor Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-3">
        FlexRehab AI • Secure Clinical Rehabilitation & Telemetry Platform • Multi-User Administration
      </div>
    </div>
  );
};
