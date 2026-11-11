import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Sliders,
  CheckCircle2,
  Key,
  Lock,
  ArrowRight,
  TrendingUp,
  Activity,
  Award,
  Calendar,
  LogOut,
  Edit3,
  Save,
  Clock,
  Sparkles,
  ChevronRight,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Patient } from '../types/telemetry';
import { DoctorProfile, updateDoctorProfile, doctorAddUser, doctorGetUsers } from '../services/api';

interface Props {
  doctor: DoctorProfile;
  patients: Patient[];
  onUpdateDoctor: (updated: DoctorProfile) => void;
  onSelectPatientToMonitor: (patient: Patient) => void;
  onLogoutDoctor: () => void;
}

export const DoctorPortalView: React.FC<Props> = ({
  doctor,
  patients: initialPatients,
  onUpdateDoctor,
  onSelectPatientToMonitor,
  onLogoutDoctor
}) => {
  const [activeTab, setActiveTab] = useState<'manage-users' | 'add-user' | 'doctor-profile'>('manage-users');
  const [patientList, setPatientList] = useState<Patient[]>(initialPatients);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable Doctor Profile Form states
  const [doctorName, setDoctorName] = useState<string>(doctor.name);
  const [hospitalName, setHospitalName] = useState<string>(doctor.hospital);
  const [department, setDepartment] = useState<string>(doctor.department || 'Orthopedics & Physical Rehabilitation');
  const [doctorPhone, setDoctorPhone] = useState<string>(doctor.phone || '+1 (555) 782-9901');
  const [doctorEmail, setDoctorEmail] = useState<string>(doctor.email || 'doctor@hospital.org');
  const [doctorPassword, setDoctorPassword] = useState<string>('');
  const [doctorEditSuccess, setDoctorEditSuccess] = useState<string | null>(null);

  // Add User Form states
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('Rehab@123'); // Standard static default password
  const [problemLevel, setProblemLevel] = useState<'low' | 'medium' | 'high' | 'custom'>('medium');
  const [customAngle, setCustomAngle] = useState<number>(120);
  const [customPrescriptionText, setCustomPrescriptionText] = useState<string>('');
  const [newAge, setNewAge] = useState<number>(45);
  const [newGender, setNewGender] = useState<string>('Male');
  const [newDiagnosis, setNewDiagnosis] = useState<string>('Post-Operative Shoulder Rotator Cuff Rehabilitation');
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);
  const [addUserSuccess, setAddUserSuccess] = useState<{
    message: string;
    userId: string;
    username: string;
    initialPassword: string;
    targetAngle: number;
  } | null>(null);

  // Sync / fetch fresh patients
  useEffect(() => {
    async function loadUsers() {
      const users = await doctorGetUsers(doctor.id);
      if (users && users.length > 0) {
        setPatientList(users);
      }
    }
    loadUsers();
  }, [doctor.id]);

  // Handle Save Doctor Profile
  const handleSaveDoctorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateDoctorProfile(doctor.id, {
      name: doctorName.trim(),
      hospital: hospitalName.trim(),
      department: department.trim(),
      phone: doctorPhone.trim(),
      email: doctorEmail.trim(),
      password: doctorPassword.trim() || undefined,
    });
    if (updated.success && updated.doctor) {
      onUpdateDoctor(updated.doctor);
      setDoctorEditSuccess('Doctor profile details and hospital information saved successfully!');
      setTimeout(() => setDoctorEditSuccess(null), 4000);
    }
  };

  // Handle Add New User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setIsSubmittingUser(true);
    setAddUserSuccess(null);

    const result = await doctorAddUser({
      doctorId: doctor.id,
      doctorName: doctor.name,
      username: newUsername.trim(),
      password: newPassword.trim() || 'Rehab@123',
      level: problemLevel,
      customAngle: Number(customAngle) || 120,
      customNotes: customPrescriptionText.trim() || undefined,
      gender: newGender,
      age: Number(newAge) || 45,
      diagnosis: newDiagnosis.trim(),
    });

    setIsSubmittingUser(false);

    if (result.success && result.patient) {
      setPatientList((prev) => [result.patient, ...prev]);
      setAddUserSuccess({
        message: 'Patient account created successfully and added to database!',
        userId: result.userCredentials?.userId || result.patient.userNumberId || 'user-new',
        username: result.patient.name,
        initialPassword: result.userCredentials?.initialPassword || newPassword,
        targetAngle: result.userCredentials?.targetAngle || result.patient.prescribedProtocol.targetAngle,
      });

      // Reset form
      setNewUsername('');
      setCustomPrescriptionText('');
    }
  };

  // Filtered patients for Manage Users list
  const filteredPatients = patientList.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.userNumberId && p.userNumberId.toLowerCase().includes(q)) ||
      (p.mrn && p.mrn.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* DOCTOR PORTAL TOP BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-[#004870] to-[#006194] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Stethoscope className="w-8 h-8 text-sky-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-sky-400/20 text-sky-200 px-2.5 py-0.5 rounded-full border border-sky-300/30">
                  Doctor Clinical Administration Portal
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Certified Clinician Mode
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {doctor.name}
              </h1>
              <p className="text-xs sm:text-sm text-sky-100 flex items-center gap-2 mt-0.5">
                <Building2 className="w-4 h-4 text-sky-300" />
                <span>{doctor.hospital}</span>
                <span className="text-sky-300/60">•</span>
                <span className="text-sky-200">{doctor.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center">
            <button
              onClick={() => setActiveTab('doctor-profile')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'doctor-profile'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Doctor Profile</span>
            </button>

            <button
              onClick={onLogoutDoctor}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-400/30 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Doctor Portal Navigation Tabs */}
        <div className="mt-8 pt-5 border-t border-white/15 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('manage-users')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'manage-users'
                ? 'bg-white text-[#006194] shadow-md'
                : 'text-sky-100 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users ({patientList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('add-user');
              setAddUserSuccess(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'add-user'
                ? 'bg-white text-[#006194] shadow-md'
                : 'text-sky-100 hover:bg-white/10'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New User</span>
          </button>

          <button
            onClick={() => setActiveTab('doctor-profile')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'doctor-profile'
                ? 'bg-white text-[#006194] shadow-md'
                : 'text-sky-100 hover:bg-white/10'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hospital & Account Settings</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: MANAGE USERS ================= */}
      {activeTab === 'manage-users' && (
        <div className="space-y-5 animate-fade-in">
          {/* Search & Actions Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient by ID (user-1), name, or MRN..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>

            <button
              onClick={() => {
                setActiveTab('add-user');
                setAddUserSuccess(null);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md cursor-pointer transition-all self-end sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Another User</span>
            </button>
          </div>

          {/* User List Table / Cards */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Registered Patients & Telemetry Records
                </h2>
                <p className="text-xs text-slate-500">
                  Click on any patient to open their real-time dashboard, current status, and exercise logs.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredPatients.length} Active Patients
              </span>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Patients Found</h3>
                <p className="text-xs text-slate-400">
                  {searchQuery ? 'Try matching a different name or ID.' : 'Click "+ Add New User" to register your first patient.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPatients.map((pat, idx) => {
                  const targetAng = pat.prescribedProtocol?.targetAngle || 110;
                  const sessionsCount = pat.historicalSessions?.length || 0;
                  const latestRom = sessionsCount > 0 ? `${pat.historicalSessions[sessionsCount - 1].maxFlexion}°` : '0°';
                  const isPasswordChanged = Boolean(pat.passwordChanged);
                  const displayId = pat.userNumberId || `user-${idx + 1}`;

                  return (
                    <div
                      key={pat.id}
                      className="p-5 hover:bg-sky-50/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#006194] to-[#0284C7] text-white flex items-center justify-center font-black text-lg shadow-sm border border-sky-200 shrink-0">
                          {pat.name ? pat.name.charAt(0).toUpperCase() : 'U'}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#006194] bg-sky-100 px-2 py-0.5 rounded font-mono">
                              {displayId}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900">{pat.name}</h3>
                            <span className="text-[11px] text-slate-400 font-mono">({pat.mrn})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>Sex: <strong>{pat.gender}</strong></span>
                            <span>•</span>
                            <span>Age: <strong>{pat.age} yrs</strong></span>
                            <span>•</span>
                            <span className="text-slate-600 truncate max-w-xs">{pat.primaryDiagnosis}</span>
                          </div>
                        </div>
                      </div>

                      {/* Metrics & Password Status Badges */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Target Angle Badge */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Assigned Target</span>
                          <span className="font-black text-slate-900">{targetAng}°</span>
                        </div>

                        {/* Latest Achieved ROM */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Latest Achieved</span>
                          <span className="font-black text-emerald-700">{latestRom}</span>
                        </div>

                        {/* Sessions Completed */}
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Sessions</span>
                          <span className="font-black text-slate-800">{sessionsCount}</span>
                        </div>

                        {/* Password Status: Changed vs Default */}
                        <div className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border">
                          {isPasswordChanged ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Password Changed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px]" title={`Default Password: ${pat.initialPassword || 'Rehab@123'}`}>
                              <Key className="w-3 h-3 text-amber-600" />
                              Default Password ({pat.initialPassword || 'Rehab@123'})
                            </span>
                          )}
                        </div>

                        {/* Monitor Patient Button */}
                        <button
                          onClick={() => onSelectPatientToMonitor(pat)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Monitor & View Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: ADD NEW USER ================= */}
      {activeTab === 'add-user' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#006194] uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Patient Account Creation
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                Next ID: user-{patientList.length + 1}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              Add & Prescribe New Patient
            </h2>
            <p className="text-xs text-slate-500">
              Doctor chooses the patient problem level and target angle. A static initial password will be set, which you can physically hand over to the patient.
            </p>
          </div>

          {/* Success Notification Box */}
          {addUserSuccess && (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 space-y-3 shadow-md animate-fade-in">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{addUserSuccess.message}</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned User ID:</span>
                  <strong className="text-base font-black text-[#006194] font-mono">{addUserSuccess.userId}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Patient Username:</span>
                  <strong className="text-base font-black text-slate-900">{addUserSuccess.username}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Initial Static Password:</span>
                  <strong className="text-sm font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{addUserSuccess.initialPassword}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Prescribed Target Angle:</span>
                  <strong className="text-base font-black text-emerald-700">{addUserSuccess.targetAngle}°</strong>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800">
                <strong>Doctor Note:</strong> Please physically share this <strong>Username</strong> and <strong>Password</strong> with the patient. When the patient logs in, they will be given the option to set their own new password.
              </p>

              <div className="pt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('manage-users')}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  View in Manage Users List
                </button>
                <button
                  type="button"
                  onClick={() => setAddUserSuccess(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Add Another User
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-5">
            {/* 1. Patient Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Patient Full Name / Username *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Initial Password (For Patient) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="e.g. Rehab@123"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Static default for all new patients. User can set a new password on login.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Sex (Gender)
                </label>
                <select
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#006194]"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* 2. Doctor Prescription / Problem Level (Low, Medium, High, Custom) */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Doctor Mobility & Pain Level Selection (Sets Target Angle):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Low: 60° */}
                <div
                  onClick={() => setProblemLevel('low')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    problemLevel === 'low'
                      ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-400/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase">Low Range</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Gentle</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">60°</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Mild pain, limited early post-op mobility. Safe elevation target.
                  </p>
                </div>

                {/* Medium: 110° */}
                <div
                  onClick={() => setProblemLevel('medium')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    problemLevel === 'medium'
                      ? 'border-[#006194] bg-sky-50/60 shadow-md ring-2 ring-sky-400/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#006194] uppercase">Medium Range</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-[#006194]">Standard</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">110°</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Moderate pain, good mobility up to chest/shoulder level.
                  </p>
                </div>

                {/* High: 150° */}
                <div
                  onClick={() => setProblemLevel('high')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    problemLevel === 'high'
                      ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-400/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-800 uppercase">High Range</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">Advanced</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">150°</div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Minimal pain, full overhead recovery target reach.
                  </p>
                </div>
              </div>

              {/* Custom Doctor Prescribed Option */}
              <div
                onClick={() => setProblemLevel('custom')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all mt-3 ${
                  problemLevel === 'custom'
                    ? 'border-amber-600 bg-amber-50/60 shadow-md ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-900 uppercase">
                      Custom Doctor Prescribed Angle & Notes
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Doctor Specific
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 mb-3">
                  Specify exact target angle and clinical guidance notes for this patient:
                </p>

                {problemLevel === 'custom' && (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">Target Angle (Degrees):</label>
                        <span className="text-sm font-black text-amber-900">{customAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="180"
                        step="5"
                        value={customAngle}
                        onChange={(e) => setCustomAngle(Number(e.target.value))}
                        className="w-full accent-amber-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Doctor Prescription Notes:
                      </label>
                      <input
                        type="text"
                        value={customPrescriptionText}
                        onChange={(e) => setCustomPrescriptionText(e.target.value)}
                        placeholder="e.g. 120° forward elevation with 2s hold, 3 sets x 10 reps daily"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmittingUser}
                className="w-full py-3.5 px-6 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-sm font-bold shadow-lg shadow-[#006194]/25 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmittingUser ? 'Creating Patient Account...' : 'Save & Add Patient to Database'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: DOCTOR ACCOUNT DETAILS (EDITABLE) ================= */}
      {activeTab === 'doctor-profile' && (
        <form
          onSubmit={handleSaveDoctorProfile}
          className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-lg max-w-3xl mx-auto space-y-6 animate-fade-in"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Doctor Account
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {doctor.id}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
              Doctor Account & Hospital Information
            </h2>
            <p className="text-xs text-slate-500">
              Update your clinician name, hospital affiliation, department, and contact information.
            </p>
          </div>

          {doctorEditSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{doctorEditSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Doctor Full Name & Title *
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Katherine Reynolds, MD"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Hospital / Clinic Name *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  required
                  placeholder="e.g. Apollo Orthopedic Rehabilitation Hospital"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Specialization / Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Orthopedics & Post-Op Physical Rehabilitation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  placeholder="+1 (555) 782-9901"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Change Doctor Login Password (Leave blank to keep current)
              </label>
              <div className="relative max-w-sm">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={doctorPassword}
                  onChange={(e) => setDoctorPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Doctor & Hospital Details</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
