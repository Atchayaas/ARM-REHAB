import React from 'react';
import {
  Activity,
  Compass,
  CheckCircle,
  AlertCircle,
  Clock,
  Gauge,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { ExerciseProtocol, LiveTelemetryState, Patient } from '../types/telemetry';

interface Props {
  patient: Patient;
  protocol: ExerciseProtocol;
  telemetry: LiveTelemetryState;
}

export const TelemetryMetricPods: React.FC<Props> = ({
  patient,
  protocol,
  telemetry
}) => {
  const isTargetMet = telemetry.currentAngle >= protocol.targetAngle;
  const targetDiff = Math.round(telemetry.currentAngle - protocol.targetAngle);
  const percentTarget = Math.min(100, Math.round((telemetry.currentAngle / protocol.targetAngle) * 100));

  // Format elapsed time (MM:SS)
  const minutes = Math.floor(telemetry.elapsedSeconds / 60);
  const seconds = Math.floor(telemetry.elapsedSeconds % 60);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {/* POD 1: Current Active Flexion / Extension ROM */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            Active ROM ({protocol.joint})
          </span>
          {isTargetMet ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
              <CheckCircle className="w-3 h-3" />
              Target Met
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 border border-sky-200 text-[#006194]">
              {targetDiff}° to target
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="tnum text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              {Math.round(telemetry.currentAngle)}
            </span>
            <span className="text-xl font-bold text-slate-400">°</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Peak today: <strong className="tnum text-slate-700">{telemetry.peakAngleSession}°</strong></span>
            <span className="text-emerald-600 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +14° gain
            </span>
          </p>
        </div>

        {/* Integrated 4px emerald recovery bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#10B981] h-full rounded-full transition-all duration-300"
            style={{ width: `${percentTarget}%` }}
          />
        </div>
      </div>

      {/* POD 2: Repetition & Compliance Volume */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            Session Volume
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Flame className="w-3 h-3 text-emerald-600" />
            Set {telemetry.currentSet} of {protocol.setsTarget}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="tnum text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              {telemetry.currentReps}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              / {protocol.repsPerSet} reps
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Prescribed: <strong className="text-slate-700">{protocol.setsTarget * protocol.repsPerSet} total</strong></span>
            <span className="tnum font-medium text-slate-600">{Math.round((telemetry.currentReps / protocol.repsPerSet) * 100)}%</span>
          </p>
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#0284C7] h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (telemetry.currentReps / protocol.repsPerSet) * 100)}%` }}
          />
        </div>
      </div>

      {/* POD 3: Bilateral Kinetic Symmetry Index */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            Bilateral Symmetry
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
            {telemetry.symmetryEstimate >= 85 ? 'High Grade' : 'Moderate'}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1">
            <span className="tnum text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              {telemetry.symmetryEstimate}
            </span>
            <span className="text-xl font-bold text-slate-400">%</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Vs Unaffected: <strong className="tnum text-slate-700">{patient.baselineROM.unaffectedLimbAngle}°</strong></span>
            <span className="text-slate-600 font-medium">Norm: &gt;90%</span>
          </p>
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, telemetry.symmetryEstimate)}%` }}
          />
        </div>
      </div>

      {/* POD 4: Kinematic Pacing & Stability */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] flex flex-col justify-between hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            Pacing & Stability
          </span>
          {telemetry.formStatus === 'compensating' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">
              <AlertCircle className="w-3 h-3" />
              Drift Alert
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
              Pacing Steady
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-1.5">
            <span className="tnum text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              {formattedTime}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Speed: <strong className="tnum text-slate-700">{telemetry.cadenceRpm} rpm</strong></span>
            <span>Comps: <strong className="tnum text-slate-700">{telemetry.compensationCount}</strong></span>
          </p>
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              telemetry.formStatus === 'compensating' ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(10, 100 - telemetry.compensationCount * 12))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
