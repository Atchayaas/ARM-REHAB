import React, { useState } from 'react';
import {
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Flame,
  ArrowRight
} from 'lucide-react';
import { ExerciseProtocol, Patient } from '../types/telemetry';

interface Props {
  patient: Patient;
  selectedProtocol: ExerciseProtocol;
  onSelectProtocol: (protocol: ExerciseProtocol) => void;
  onStartSession: (protocol: ExerciseProtocol) => void;
  onOpenPrescription: (protocol: ExerciseProtocol) => void;
}

export const CareProtocolsView: React.FC<Props> = ({
  patient,
  selectedProtocol,
  onSelectProtocol,
  onStartSession,
  onOpenPrescription
}) => {
  const [filterJoint, setFilterJoint] = useState<string>('all');

  const protocols = patient.availableProtocols;
  const filtered = filterJoint === 'all' ? protocols : protocols.filter((p) => p.joint === filterJoint);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Stethoscope className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Prescribed Rehabilitation Protocol Catalog
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clinical protocols configured with AI computer-vision kinematic angles, rep hold thresholds, and compensation safeguards.
          </p>
        </div>

        {/* Filter by joint */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'knee', 'shoulder', 'hip', 'spine'].map((joint) => (
            <button
              key={joint}
              onClick={() => setFilterJoint(joint)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterJoint === joint
                  ? 'bg-[#006194] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {joint === 'all' ? 'All Joints' : joint}
            </button>
          ))}
        </div>
      </div>

      {/* Protocol Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((proto) => {
          const isCurrentActive = selectedProtocol.id === proto.id;

          return (
            <div
              key={proto.id}
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between bg-white ${
                isCurrentActive
                  ? 'border-[#006194] ring-2 ring-[#006194]/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {proto.joint.toUpperCase()} • {proto.primaryPlane.toUpperCase()} PLANE
                  </span>

                  {isCurrentActive && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Rx
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {proto.name}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {proto.description}
                </p>

                {/* Biomechanical Telemetry Targets */}
                <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-semibold">Target ROM</span>
                    <strong className="text-base font-extrabold text-[#006194]">{proto.targetAngle}°</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-semibold">Volume</span>
                    <strong className="text-base font-extrabold text-slate-800">{proto.setsTarget}x{proto.repsPerSet}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50/60">
                    <span className="text-[10px] text-amber-700 block font-semibold">Safe Max</span>
                    <strong className="text-base font-extrabold text-amber-700">{proto.safeAngleMax}°</strong>
                  </div>
                </div>

                {/* Contraindications & Alerts */}
                {proto.contraindications && proto.contraindications.length > 0 && (
                  <div className="mb-4 space-y-1">
                    <span className="text-[11px] font-bold text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Clinical Safety Bounds:
                    </span>
                    <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5">
                      {proto.contraindications.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Deck */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onOpenPrescription(proto)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Configure Parameters"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {!isCurrentActive ? (
                  <button
                    onClick={() => onSelectProtocol(proto)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold text-center transition-all"
                  >
                    Select as Active
                  </button>
                ) : (
                  <button
                    onClick={() => onStartSession(proto)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold transition-all shadow-md shadow-[#006194]/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Launch Tracking</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
