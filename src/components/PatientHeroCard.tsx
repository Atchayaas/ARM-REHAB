import React from 'react';
import {
  Calendar,
  User,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Play,
  Settings,
  HeartPulse,
  Flame,
  Award
} from 'lucide-react';
import { Patient, ExerciseProtocol } from '../types/telemetry';

interface Props {
  patient: Patient;
  selectedProtocol: ExerciseProtocol;
  onSelectProtocol: (protocol: ExerciseProtocol) => void;
  onStartSession: () => void;
  onOpenPrescription: () => void;
  onOpenNotes: () => void;
}

export const PatientHeroCard: React.FC<Props> = ({
  patient,
  selectedProtocol,
  onSelectProtocol,
  onStartSession,
  onOpenPrescription,
  onOpenNotes
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Patient Avatar & Clinical Data */}
        <div className="flex items-start gap-4">
          <img
            src={patient.photoUrl}
            alt={patient.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-sm shrink-0"
          />

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {patient.name}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {patient.gender}, {patient.age}y
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                {patient.mrn}
              </span>
            </div>

            <p className="text-sm font-semibold text-[#006194]">
              {patient.primaryDiagnosis}
            </p>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-0.5">
              <span>Post-Op: <strong className="text-slate-800">Day {patient.postOpDays}</strong> ({patient.surgeryDate})</span>
              <span>Attending: <strong className="text-slate-800">{patient.attendingPhysician}</strong></span>
              <span>DPT: <strong className="text-slate-800">{patient.physicalTherapist}</strong></span>
            </div>

            <div className="pt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-sky-50 text-[#006194] border border-sky-200">
                <HeartPulse className="w-3.5 h-3.5" />
                {patient.currentPhase}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Active Protocol Selector & Action Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="text-left lg:text-right">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Prescribed Protocol
            </label>
            <div className="relative inline-block w-full sm:w-auto">
              <select
                value={selectedProtocol.id}
                onChange={(e) => {
                  const found = patient.availableProtocols.find((p) => p.id === e.target.value);
                  if (found) onSelectProtocol(found);
                }}
                className="w-full sm:w-auto appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold py-2 pl-3 pr-8 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006194]"
              >
                {patient.availableProtocols.map((proto) => (
                  <option key={proto.id} value={proto.id}>
                    {proto.name} (Target {proto.targetAngle}°)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNotes}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm"
            >
              SOAP Notes ({patient.recentNotes.length})
            </button>
            <button
              onClick={onOpenPrescription}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-sm"
              title="Edit Prescription Targets"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onStartSession}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold transition-all shadow-md shadow-[#006194]/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
