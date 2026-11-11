import React, { useState } from 'react';
import { X, Check, Sliders, Shield, Info } from 'lucide-react';
import { ExerciseProtocol, Patient } from '../types/telemetry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  protocol: ExerciseProtocol;
  onSaveProtocol: (updated: ExerciseProtocol) => void;
}

export const PrescriptionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  protocol,
  onSaveProtocol
}) => {
  const [targetAngle, setTargetAngle] = useState<number>(protocol.targetAngle);
  const [safeAngleMax, setSafeAngleMax] = useState<number>(protocol.safeAngleMax);
  const [setsTarget, setSetsTarget] = useState<number>(protocol.setsTarget);
  const [repsPerSet, setRepsPerSet] = useState<number>(protocol.repsPerSet);
  const [holdTimeSec, setHoldTimeSec] = useState<number>(protocol.holdTimeSec);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProtocol({
      ...protocol,
      targetAngle,
      safeAngleMax,
      setsTarget,
      repsPerSet,
      holdTimeSec
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-[#006194]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Therapeutic Prescription Targets</h3>
              <p className="text-xs text-slate-500">{patient.name} • {protocol.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Target ROM Angle */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Target Angle ({protocol.joint})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={targetAngle}
                  onChange={(e) => setTargetAngle(Number(e.target.value))}
                  className="w-full text-base font-bold p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
                <span className="text-sm font-bold text-slate-500">deg</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Prescribed biofeedback goal</p>
            </div>

            {/* Safe Maximum Threshold */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
              <label className="text-xs font-bold text-amber-900 block mb-1">
                Safe Max Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="180"
                  value={safeAngleMax}
                  onChange={(e) => setSafeAngleMax(Number(e.target.value))}
                  className="w-full text-base font-bold p-1.5 bg-white border border-amber-300 rounded-lg text-slate-900"
                />
                <span className="text-sm font-bold text-amber-700">deg</span>
              </div>
              <p className="text-[10px] text-amber-700 mt-1">Triggers red zone limit warning</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sets Target</label>
              <input
                type="number"
                min="1"
                max="10"
                value={setsTarget}
                onChange={(e) => setSetsTarget(Number(e.target.value))}
                className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reps Per Set</label>
              <input
                type="number"
                min="1"
                max="30"
                value={repsPerSet}
                onChange={(e) => setRepsPerSet(Number(e.target.value))}
                className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Hold Duration</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={holdTimeSec}
                  onChange={(e) => setHoldTimeSec(Number(e.target.value))}
                  className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
                <span className="text-xs text-slate-400">sec</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#006194] shrink-0 mt-0.5" />
            <p>
              Modifications immediately recalculate real-time computer-vision vector thresholds and target chime acoustic triggers in the live camera HUD.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006194] hover:bg-[#004b73] text-xs font-bold text-white shadow-md shadow-[#006194]/20"
            >
              <Check className="w-4 h-4" />
              <span>Save & Sync Protocol</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
