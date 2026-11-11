import React from 'react';
import {
  Flame,
  Stethoscope,
  HeartPulse,
  LayoutDashboard,
  Video,
  Dumbbell,
  User,
  ArrowRight,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Play
} from 'lucide-react';
import { Patient, ExerciseProtocol } from '../types/telemetry';

interface Props {
  patient: Patient;
  onNavigate: (screen: 'login' | 'home-hub' | 'dashboard' | 'live-studio' | 'exercises' | 'profile') => void;
  onStartExercise: (protocol: ExerciseProtocol) => void;
}

export const HomeHubView: React.FC<Props> = ({
  patient,
  onNavigate,
  onStartExercise
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOP WELCOME SECTION (Mandatory Requirement: Welcome patient name, streaks, and doctor names) */}
      <div className="bg-gradient-to-r from-white via-sky-50/40 to-blue-50/60 rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Welcome Patient Info */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {patient.photoUrl && !patient.photoUrl.includes('unsplash') ? (
              <img
                src={patient.photoUrl}
                alt={patient.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-100 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#006194] to-[#0284C7] flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl shadow-md border-2 border-white ring-2 ring-blue-100 shrink-0">
                {patient.name ? patient.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#006194] uppercase tracking-wider">
                  Screen 2 • Central Navigation Hub
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Rehab Care Plan
                </span>
              </div>

              {/* WELCOME PATIENT NAME */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Welcome back, {patient.name}!
              </h1>

              <p className="text-xs sm:text-sm font-semibold text-[#006194] mt-0.5">
                {patient.primaryDiagnosis} • <span className="text-slate-600 font-medium">Post-Op Day {patient.postOpDays}</span>
              </p>
            </div>
          </div>

          {/* STREAKS & DOCTOR NAMES BADGES */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            {/* Streak Badge */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-xs">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <Flame className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="tnum text-lg font-black text-amber-900">
                    {patient.historicalSessions && patient.historicalSessions.length > 0 ? patient.streakDays : 0} Days
                  </span>
                  <span className="text-xs font-bold text-amber-700">Streak!</span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium">
                  {patient.historicalSessions && patient.historicalSessions.length > 0 ? patient.overallAdherence : 0}% Total Prescription Adherence
                </p>
              </div>
            </div>

            {/* Progress & Milestone Target Card */}
            <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-[#006194] shrink-0" />
                <span>
                  Target Angle: <strong>{patient.prescribedProtocol.targetAngle}°</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Adaptive Gain: <strong>+5° per milestone</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ALL SCREEN DIRECT NAVIGATION TILES (Mandatory Requirement: Access to all screens with all screen names) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Rehabilitation Screen Navigation Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Direct access across all 6 specialized application screens in the clinical workflow.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">5 Active Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SCREEN 3: Dashboard */}
          <div
            onClick={() => onNavigate('dashboard')}
            className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#006194] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#006194] group-hover:bg-[#006194] group-hover:text-white transition-all">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Screen 3
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#006194] transition-colors">
                Patient Dashboard
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Review therapy session history, finished & ongoing prescribed exercises, and download clinical reports.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#006194]">
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* SCREEN 4: Live Studio */}
          <div
            onClick={() => onNavigate('live-studio')}
            className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Screen 4
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Live Studio
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Real-time AI computer vision joint tracking, angle vector HUD, audio biofeedback cues, and pain stop safety.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* SCREEN 5: Exercises */}
          <div
            onClick={() => onNavigate('exercises')}
            className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Screen 5
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                Prescribed Exercises
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Browse catalog of prescribed exercises with target angles, sets, and rep holds. Click to start directly.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
              <span>View All Exercises</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* SCREEN 6: User Profile */}
          <div
            onClick={() => onNavigate('profile')}
            className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-purple-500 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Screen 6
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                User Account Profile
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Patient clinical profile, baseline records, care team contacts, and official medical report downloads.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>View Profile & Reports</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S REHABILITATION FOCUS & QUICK WORKOUT CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Today’s Prescribed Protocol
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {patient.prescribedProtocol.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Flexion: <strong className="text-slate-800">{patient.prescribedProtocol.targetAngle}°</strong> • Volume: <strong className="text-slate-800">{patient.prescribedProtocol.setsTarget} sets × {patient.prescribedProtocol.repsPerSet} reps</strong> • Hold: <strong className="text-slate-800">{patient.prescribedProtocol.holdTimeSec}s</strong>
            </p>
          </div>

          <button
            onClick={() => onStartExercise(patient.prescribedProtocol)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md shadow-[#006194]/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Guided Session (Screen 4)</span>
          </button>
        </div>

        {/* Quick Recovery Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Latest Achieved ROM</span>
            <strong className="tnum text-lg font-extrabold text-slate-900 mt-0.5 block">
              {patient.historicalSessions && patient.historicalSessions.length > 0
                ? `${patient.historicalSessions[patient.historicalSessions.length - 1].maxFlexion}°`
                : '0°'}
            </strong>
            <span className="text-emerald-600 font-semibold text-[11px]">
              {patient.historicalSessions && patient.historicalSessions.length > 0
                ? `+${patient.historicalSessions[patient.historicalSessions.length - 1].maxFlexion - 45}° from post-op`
                : 'Initial baseline'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Bilateral Symmetry</span>
            <strong className="tnum text-lg font-extrabold text-slate-900 mt-0.5 block">
              {patient.historicalSessions && patient.historicalSessions.length > 0
                ? `${patient.historicalSessions[patient.historicalSessions.length - 1].symmetryIndex}%`
                : '0%'}
            </strong>
            <span className="text-slate-500 text-[11px]">Normative goal: &gt;90%</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Completed Sessions</span>
            <strong className="tnum text-lg font-extrabold text-slate-900 mt-0.5 block">
              {patient.historicalSessions ? patient.historicalSessions.length : 0} Sessions
            </strong>
            <span className="text-emerald-600 font-semibold text-[11px]">
              {patient.historicalSessions && patient.historicalSessions.length > 0
                ? '100% on schedule'
                : 'Start your first session'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block text-[11px]">Milestones Achieved</span>
            <strong className="tnum text-lg font-extrabold text-slate-900 mt-0.5 block">
              {patient.milestones ? patient.milestones.filter((m) => m.completed).length : 0} / {patient.milestones?.length || 3}
            </strong>
            <span className="text-slate-500 text-[11px]">
              {patient.milestones && patient.milestones.some((m) => m.completed)
                ? 'Phase II clearance close'
                : 'Milestone tracking active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
