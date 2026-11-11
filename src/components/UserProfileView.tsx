import React, { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  FileSpreadsheet,
  LogOut,
  CheckCircle2,
  Sliders,
  Settings,
  Edit3,
  Save,
  X,
  Target,
  Sparkles,
  Camera,
  Upload
} from 'lucide-react';
import { Patient } from '../types/telemetry';

interface Props {
  patient: Patient;
  onLogout: () => void;
  onUpdatePatient: (updated: Patient) => void;
}

export const UserProfileView: React.FC<Props> = ({
  patient,
  onLogout,
  onUpdatePatient
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Editable Form fields
  const [name, setName] = useState<string>(patient.name);
  const [email, setEmail] = useState<string>(patient.email || `${patient.name.toLowerCase().replace(' ', '.')}@rehab.org`);
  const [age, setAge] = useState<number>(patient.age);
  const [gender, setGender] = useState<string>(patient.gender);
  const [diagnosis, setDiagnosis] = useState<string>(patient.primaryDiagnosis);
  const [targetAngle, setTargetAngle] = useState<number>(patient.prescribedProtocol.targetAngle || 120);
  const [photoUrl, setPhotoUrl] = useState<string>(patient.photoUrl && !patient.photoUrl.includes('unsplash') ? patient.photoUrl : '');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
          onUpdatePatient({ ...patient, photoUrl: reader.result });
          setDownloadSuccess('Profile photo updated successfully!');
          setTimeout(() => setDownloadSuccess(null), 3500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Patient = {
      ...patient,
      name,
      email,
      age: Number(age) || patient.age,
      gender,
      photoUrl,
      primaryDiagnosis: diagnosis,
      prescribedProtocol: {
        ...patient.prescribedProtocol,
        targetAngle: Number(targetAngle) || patient.prescribedProtocol.targetAngle,
      },
    };
    onUpdatePatient(updated);
    setIsEditing(false);
    setDownloadSuccess('Profile details updated successfully!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleDownloadCSV = () => {
    const headers = ['Session', 'Date', 'MaxROM_Deg', 'ExtensionDeficit_Deg', 'TargetAngle_Deg', 'Symmetry_Percent', 'Pain_VAS', 'RepsCompleted'];
    const rows = patient.historicalSessions.map((s) => [
      s.sessionNumber,
      `"${s.date}"`,
      s.maxFlexion,
      s.extensionDeficit,
      s.targetAngle,
      s.symmetryIndex,
      s.painLevel,
      s.repsCompleted
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${patient.name.replace(' ', '_')}_Full_Telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('Complete Telemetry History (.CSV) exported.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SCREEN 6 HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Screen 6
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              User Account & Profile Details
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal profile, rehabilitation target angle, and exercise telemetry reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#006194]" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Alert Toast */}
      {downloadSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
          <button onClick={() => setDownloadSuccess(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* EDIT PROFILE FORM */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-blue-200 p-6 sm:p-8 shadow-md space-y-5 animate-fade-in">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Edit3 className="w-4 h-4 text-[#006194]" />
            Edit Profile Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sex</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Condition / Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Angle (Degrees)</label>
              <input
                type="number"
                min="30"
                max="180"
                value={targetAngle}
                onChange={(e) => setTargetAngle(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#006194]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      ) : (
        /* VIEW PROFILE DETAILS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-5 pb-5 border-b border-slate-100">
              <div className="relative group">
                {patient.photoUrl && !patient.photoUrl.includes('unsplash') ? (
                  <img
                    src={patient.photoUrl}
                    alt={patient.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#006194] to-[#0284C7] flex items-center justify-center text-white font-black text-3xl shadow-sm border-2 border-white ring-2 ring-blue-100 shrink-0">
                    {patient.name ? patient.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white border border-slate-300 shadow-md hover:bg-slate-50 cursor-pointer text-[#006194]" title="Upload Profile Picture">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{patient.name}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500">
                  Medical Record: <strong>{patient.mrn}</strong>
                </p>
                <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                  <p>Gender: <strong className="text-slate-900">{patient.gender}</strong> • Age: <strong className="text-slate-900">{patient.age} years</strong></p>
                  <p>Diagnosis: <strong className="text-slate-900">{patient.primaryDiagnosis}</strong></p>
                </div>
              </div>
            </div>

            {/* Target Angle & Progression Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#006194] text-white flex items-center justify-center font-bold">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Current Target Angle</span>
                  <span className="text-[11px] text-slate-500">Adaptive progression: increases +5° each time target is met</span>
                </div>
              </div>
              <div className="text-2xl font-black text-[#006194]">
                {patient.prescribedProtocol.targetAngle}°
              </div>
            </div>

            {/* Quick Contact & Details */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Account Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Email Address</span>
                  <span className="font-semibold text-slate-800">{patient.email || `${patient.name.toLowerCase().replace(' ', '.')}@rehab.org`}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Rehabilitation Phase</span>
                  <span className="font-semibold text-slate-800">{patient.currentPhase}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Telemetry Export */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Telemetry Data Export
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export your complete goniometric exercise angles, repetitions, and performance history to CSV.
            </p>

            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download CSV Telemetry Log</span>
            </button>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Adaptive +5° Angle Milestone
              </span>
              <p className="text-[11px] text-amber-700 leading-snug">
                Every time you successfully complete your target reps during physical therapy, your target angle will automatically advance by +5° to progressively rebuild your range of motion!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
