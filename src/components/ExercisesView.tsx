import React, { useState } from 'react';
import {
  Dumbbell,
  Play,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Patient, ExerciseProtocol } from '../types/telemetry';

interface Props {
  patient: Patient;
  onStartExercise: (protocol: ExerciseProtocol) => void;
  onOpenPrescription: (protocol: ExerciseProtocol) => void;
}

export const ExercisesView: React.FC<Props> = ({
  patient,
  onStartExercise,
  onOpenPrescription
}) => {
  const [selectedJoint, setSelectedJoint] = useState<string>('all');

  const protocols = patient.availableProtocols;
  const filtered = selectedJoint === 'all'
    ? protocols
    : protocols.filter((p) => p.joint.toLowerCase() === selectedJoint.toLowerCase());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SCREEN 5 HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Screen 5
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Prescribed Exercise Catalog
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse your prescribed rehabilitation movements. Click &quot;Start Exercise&quot; on any card to launch computer-vision tracking in Screen 4 (Live Studio).
          </p>
        </div>

        {/* Joint Filter Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'knee', 'shoulder', 'hip', 'spine'].map((joint) => (
            <button
              key={joint}
              onClick={() => setSelectedJoint(joint)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedJoint === joint
                  ? 'bg-[#006194] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {joint === 'all' ? 'All Joints' : joint}
            </button>
          ))}
        </div>
      </div>

      {/* EXERCISE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((proto) => {
          return (
            <div
              key={proto.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-[#006194] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Pills */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {proto.joint.toUpperCase()} • {proto.affectedSide} Side
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {proto.primaryPlane} plane
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#006194] transition-colors leading-snug">
                  {proto.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {proto.description}
                </p>

                {/* Biomechanical Target Metrics */}
                <div className="grid grid-cols-3 gap-2 my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Target ROM</span>
                    <strong className="text-base font-extrabold text-[#006194]">{proto.targetAngle}°</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Volume</span>
                    <strong className="text-base font-extrabold text-slate-800">{proto.setsTarget}x{proto.repsPerSet}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-amber-700 block uppercase">Peak Hold</span>
                    <strong className="text-base font-extrabold text-amber-800">{proto.holdTimeSec}s</strong>
                  </div>
                </div>

                {/* Contraindications & Safety bounds */}
                {proto.contraindications && proto.contraindications.length > 0 && (
                  <div className="mb-4 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                    <span className="font-bold flex items-center gap-1 text-amber-800 mb-0.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Safety Precaution:
                    </span>
                    <span className="text-amber-800/90 leading-tight">
                      {proto.contraindications[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* CARD ACTION DECK WITH "Start Exercise" (Mandatory Requirement) */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onOpenPrescription(proto)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                  title="Adjust Target Angles"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {/* EXACT MANDATORY BUTTON: "Start Exercise" */}
                <button
                  onClick={() => onStartExercise(proto)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold shadow-md shadow-[#006194]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Exercise</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
