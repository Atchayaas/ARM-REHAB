import React, { useState } from 'react';
import { AlertTriangle, X, CheckCircle, ShieldAlert, HeartCrack } from 'lucide-react';
import { Patient, ExerciseProtocol } from '../types/telemetry';
import { submitPainReportToDatabase } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  protocol: ExerciseProtocol;
  currentAngle: number;
}

export const PainReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  protocol,
  currentAngle
}) => {
  const [painLevel, setPainLevel] = useState<number>(5);
  const [painType, setPainType] = useState<string>('Sharp pinch');
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    await submitPainReportToDatabase({
      patientId: patient.id,
      painLevel,
      joint: protocol.joint,
      activityType: protocol.name,
      description: `${painType}: ${notes} (at ${Math.round(currentAngle)} deg)`
    });
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-red-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-red-700">
            <div className="p-2 rounded-xl bg-red-100 text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900 leading-tight">Pain Stop Triggered</h3>
              <p className="text-xs text-red-600">Session halted at {Math.round(currentAngle)}° ROM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-red-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Clinical Alert Dispatched</h4>
            <p className="text-xs text-slate-600">
              Pain report of <strong>{painLevel}/10</strong> ({painType}) logged into {patient.name}’s telemetry chart. Attending therapist {patient.physicalTherapist} has been notified.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Visual Analog Scale (VAS) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">Visual Analog Pain Scale (VAS)</label>
                <span
                  className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                    painLevel >= 7
                      ? 'bg-red-100 text-red-700'
                      : painLevel >= 4
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {painLevel} / 10
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0: No Pain</span>
                <span>5: Moderate</span>
                <span>10: Unbearable</span>
              </div>
            </div>

            {/* Pain Description Tags */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Pain Quality</label>
              <div className="grid grid-cols-2 gap-2">
                {['Sharp pinch', 'Dull ache / soreness', 'Tendon burning', 'Joint tightness / guarding'].map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPainType(type)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                        painType === type
                          ? 'border-red-500 bg-red-50 text-red-800 font-semibold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Clinical Note / Specific Location */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Anatomical Location / Details
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Anterior joint line pinch at terminal flexion..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-600/20"
              >
                Log Pain & Alert Therapist
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
