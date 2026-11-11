import React, { useState } from 'react';
import { X, FileText, Plus, Check, Clock, User, Stethoscope } from 'lucide-react';
import { Patient } from '../types/telemetry';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onAddNote: (note: {
    date: string;
    author: string;
    soap: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
  }) => void;
}

export const ClinicianNotesDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  onAddNote
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjective || !objective) return;

    const now = new Date();
    const dateStr = `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    onAddNote({
      date: dateStr,
      author: `${patient.physicalTherapist}`,
      soap: {
        subjective,
        objective,
        assessment,
        plan
      }
    });

    setSubjective('');
    setObjective('');
    setAssessment('');
    setPlan('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-[#006194]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Clinical SOAP Notes</h3>
              <p className="text-xs text-slate-500">{patient.name} • {patient.mrn}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list or Add form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isAdding ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Documented Evaluations ({patient.recentNotes.length})
                </span>
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006194] text-white hover:bg-[#004b73] text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </div>

              {patient.recentNotes.map((note, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-[#006194]" />
                      {note.author}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{note.date}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <strong className="text-blue-900 font-semibold">[S] Subjective:</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{note.soap.subjective}</p>
                    </div>
                    <div>
                      <strong className="text-emerald-900 font-semibold">[O] Objective:</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{note.soap.objective}</p>
                    </div>
                    <div>
                      <strong className="text-amber-900 font-semibold">[A] Assessment:</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{note.soap.assessment}</p>
                    </div>
                    <div>
                      <strong className="text-purple-900 font-semibold">[P] Plan:</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{note.soap.plan}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">New Clinical Progress Note</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  [S] Subjective (Patient symptoms, pain status, functional report)
                </label>
                <textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  required
                  rows={2}
                  placeholder="e.g. Patient reports minimal resting pain, able to ascend stairs..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  [O] Objective (Goniometric ROM telemetry, effusion, palpation)
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  required
                  rows={2}
                  placeholder="e.g. Active terminal flexion measured at 124°. Full extension 0°..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  [A] Assessment (Clinical judgment on recovery velocity)
                </label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  rows={2}
                  placeholder="e.g. Progressing smoothly ahead of normative cohort..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  [P] Plan (Next session goals, frequency, adjustments)
                </label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  rows={2}
                  placeholder="e.g. Advance target to 128°. Progress closed-chain wall slides..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#006194]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006194] text-white text-xs font-bold hover:bg-[#004b73]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Note to Chart</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
