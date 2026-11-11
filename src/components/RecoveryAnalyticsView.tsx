import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Patient, HistoricalDataPoint } from '../types/telemetry';

interface Props {
  patient: Patient;
  onOpenPrescriptionModal: () => void;
  onOpenClinicianNotes: () => void;
}

export const RecoveryAnalyticsView: React.FC<Props> = ({
  patient,
  onOpenPrescriptionModal,
  onOpenClinicianNotes
}) => {
  const hasSessions = Boolean(patient.historicalSessions && patient.historicalSessions.length > 0);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number>(
    hasSessions ? patient.historicalSessions.length - 1 : 0
  );
  const [activeTab, setActiveTab] = useState<'rom' | 'symmetry' | 'adherence' | 'milestones'>('rom');
  const [printSuccess, setPrintSuccess] = useState<boolean>(false);

  const currentSession = hasSessions
    ? (patient.historicalSessions[selectedSessionIndex] || patient.historicalSessions[patient.historicalSessions.length - 1])
    : null;
  const maxSessionROM = hasSessions ? Math.max(...patient.historicalSessions.map((s) => s.maxFlexion)) : 0;
  const latestGain = hasSessions && currentSession
    ? (currentSession.maxFlexion - patient.baselineROM.initialPostOpAngle)
    : 0;

  const handleExportSummary = () => {
    window.print();
    setPrintSuccess(true);
    setTimeout(() => setPrintSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Navigation Tabs & Quick Report Generator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'rom', label: 'ROM Progression & Arc', icon: TrendingUp },
            { id: 'symmetry', label: 'Bilateral Symmetry', icon: Zap },
            { id: 'adherence', label: 'Compliance & Heatmap', icon: Calendar },
            { id: 'milestones', label: 'Clinical Milestones', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#006194] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onOpenPrescriptionModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-all"
          >
            <span>Adjust Rx Targets</span>
          </button>
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Clinical Note</span>
          </button>
        </div>
      </div>

      {printSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Biomechanical Clinical Recovery Summary generated and formatted for print/PDF export.</span>
        </div>
      )}

      {/* TAB 1: RANGE OF MOTION PROGRESSION */}
      {activeTab === 'rom' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main SVG Longitudinal ROM Chart */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#006194]" />
                  Longitudinal Range of Motion Recovery Curve
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target threshold progression vs active computer-vision recorded flexion ({patient.prescribedProtocol.joint})
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#006194] rounded-full" />
                  <span className="text-slate-600 font-medium">Achieved ROM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-500" />
                  <span className="text-slate-600 font-medium">Prescribed Target</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Chart or Zero State */}
            {hasSessions && patient.historicalSessions.length > 1 ? (
              <div className="mt-6 relative h-64 sm:h-72 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 700 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="romGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="targetZone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Grid guidelines */}
                  {[50, 75, 100, 125, 140].map((deg) => {
                    const y = 220 - ((deg - 40) / 110) * 200;
                    return (
                      <g key={deg}>
                        <line x1="35" y1={y} x2="680" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x="25" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-sans">
                          {deg}°
                        </text>
                      </g>
                    );
                  })}

                  {/* Target baseline green zone (120-135 deg) */}
                  <rect x="35" y={220 - ((135 - 40) / 110) * 200} width="645" height={((135 - 120) / 110) * 200} fill="url(#targetZone)" />

                  {/* Area under the curve */}
                  {(() => {
                    const points = patient.historicalSessions.map((s, idx) => {
                      const x = 50 + (idx / (patient.historicalSessions.length - 1)) * 620;
                      const y = 220 - ((s.maxFlexion - 40) / 110) * 200;
                      return `${x},${y}`;
                    });
                    const firstX = 50;
                    const lastX = 670;
                    return (
                      <polygon
                        points={`${firstX},220 ${points.join(' ')} ${lastX},220`}
                        fill="url(#romGradient)"
                      />
                    );
                  })()}

                  {/* Target dashed line */}
                  {(() => {
                    const targetPoints = patient.historicalSessions.map((s, idx) => {
                      const x = 50 + (idx / (patient.historicalSessions.length - 1)) * 620;
                      const y = 220 - ((s.targetAngle - 40) / 110) * 200;
                      return `${x},${y}`;
                    });
                    return (
                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray="4,4"
                        points={targetPoints.join(' ')}
                      />
                    );
                  })()}

                  {/* Actual Achieved ROM Line */}
                  {(() => {
                    const points = patient.historicalSessions.map((s, idx) => {
                      const x = 50 + (idx / (patient.historicalSessions.length - 1)) * 620;
                      const y = 220 - ((s.maxFlexion - 40) / 110) * 200;
                      return `${x},${y}`;
                    });
                    return (
                      <polyline
                        fill="none"
                        stroke="#0284C7"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points.join(' ')}
                      />
                    );
                  })()}

                  {/* Data Points */}
                  {patient.historicalSessions.map((s, idx) => {
                    const x = 50 + (idx / (patient.historicalSessions.length - 1)) * 620;
                    const y = 220 - ((s.maxFlexion - 40) / 110) * 200;
                    const isSelected = selectedSessionIndex === idx;

                    return (
                      <g key={s.sessionNumber} className="cursor-pointer" onClick={() => setSelectedSessionIndex(idx)}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 6 : 4}
                          fill={isSelected ? '#006194' : '#ffffff'}
                          stroke="#0284C7"
                          strokeWidth={isSelected ? 3 : 2}
                        />
                        <text x={x} y={235} textAnchor="middle" className="text-[10px] fill-slate-500 font-sans">
                          {s.date}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="mt-6 h-64 sm:h-72 w-full flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center p-6 space-y-2">
                <TrendingUp className="w-8 h-8 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">No Therapy Sessions Recorded Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Complete your prescribed exercise reps in Screen 4 (Live Studio). Your computer-vision joint angles, ROM curve, and bilateral telemetry will automatically populate here.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>Baseline Post-Op: <strong>{patient.baselineROM.initialPostOpAngle}°</strong></span>
              <span>Current Max: <strong className="text-emerald-700">{maxSessionROM}° ({latestGain >= 0 ? `+${latestGain}°` : `${latestGain}°`})</strong></span>
              <span>Contralateral Unaffected: <strong>{patient.baselineROM.unaffectedLimbAngle}°</strong></span>
            </div>
          </div>

          {/* Session Detail Inspector Pod */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            {currentSession ? (
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Session {currentSession.sessionNumber} Telemetry
                  </span>
                  <span className="text-xs font-bold text-[#006194] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {currentSession.date}
                  </span>
                </div>

                <div className="mt-4 space-y-3.5">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600">Peak Angle Achieved</span>
                    <span className="tnum text-xl font-bold text-slate-900">{currentSession.maxFlexion}°</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600">Extension Deficit</span>
                    <span className="tnum text-sm font-semibold text-slate-800">
                      {currentSession.extensionDeficit === 0 ? '0° (Full Ext)' : `${currentSession.extensionDeficit}° lag`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600">Bilateral Symmetry</span>
                    <span className="tnum text-sm font-semibold text-emerald-700">{currentSession.symmetryIndex}%</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600">Patient Pain (VAS 0-10)</span>
                    <span className="tnum text-sm font-semibold text-amber-700">{currentSession.painLevel} / 10</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs text-slate-600">Form Compensation Flags</span>
                    <span className="tnum text-sm font-semibold text-slate-700">{currentSession.compensationCount} instances</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                <p>No session selected yet.</p>
                <p className="mt-1 text-slate-500">Live metrics will appear here after your first exercise.</p>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={onOpenClinicianNotes}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>View Session Clinical SOAP Notes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BILATERAL SYMMETRY ANALYSIS */}
      {activeTab === 'symmetry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Limb-to-Limb Symmetry Comparison
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Contralateral healthy reference vs operated/rehabilitating limb
            </p>

            <div className="mt-6 space-y-5">
              {/* Healthy Limb */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                  <span>Unaffected Healthy Limb ({patient.baselineROM.unaffectedLimbAngle}°)</span>
                  <span className="text-slate-500">100% Baseline Reference</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full w-full" />
                </div>
              </div>

              {/* Affected Limb Current */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-900 mb-1.5">
                  <span className="text-[#006194]">Operated Limb - Day {patient.postOpDays} ({currentSession.maxFlexion}°)</span>
                  <span className="text-emerald-700">{Math.round((currentSession.maxFlexion / patient.baselineROM.unaffectedLimbAngle) * 100)}% of contralateral</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                    style={{ width: `${(currentSession.maxFlexion / patient.baselineROM.unaffectedLimbAngle) * 100}%` }}
                  />
                </div>
              </div>

              {/* Initial Post-Op Baseline */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                  <span>Initial Post-Op Day 1 ({patient.baselineROM.initialPostOpAngle}°)</span>
                  <span>{Math.round((patient.baselineROM.initialPostOpAngle / patient.baselineROM.unaffectedLimbAngle) * 100)}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-300 rounded-full"
                    style={{ width: `${(patient.baselineROM.initialPostOpAngle / patient.baselineROM.unaffectedLimbAngle) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Clinical Clearance Criteria
              </div>
              <p className="mt-1 leading-relaxed text-emerald-800/90">
                Patient currently exceeds the 85% limb symmetry index (LSI) threshold required to initiate Phase III functional agility drills.
              </p>
            </div>
          </div>

          {/* Kinetic Compensation Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Kinetic Compensation Frequency Log
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Biomechanical drift patterns flagged across last 14 sessions
            </p>

            <div className="mt-5 space-y-3">
              {[
                { name: 'Scapular Hiking / Shoulder Shrugging', count: 14, percent: 56, severity: 'caution', note: 'Ear-shoulder distance improved by 85%' },
                { name: 'Trunk Lateral Lean / Uneven Hips', count: 7, percent: 28, severity: 'warning', note: 'Flagged during cross-body reach stretch' },
                { name: 'Lumbar Hyperextension / Back Arching', count: 4, percent: 16, severity: 'caution', note: 'Corrected via real-time auditory cueing' }
              ].map((comp, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{comp.name}</span>
                    <span className="tnum font-bold text-slate-900">{comp.count} logged</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        comp.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${comp.percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">{comp.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPLIANCE & WEEKLY ADHERENCE */}
      {activeTab === 'adherence' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#006194]" />
                Therapy Protocol Adherence & Consistency
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Session completion frequency against prescribed 5x/week clinical regimen
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Streak:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {patient.streakDays} Consecutive Days
              </span>
            </div>
          </div>

          {/* Monthly / Weekly Calendar Grid */}
          <div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Last 4 Weeks Activity Matrix
            </span>
            <div className="grid grid-cols-7 gap-2 mt-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-[11px] font-semibold text-slate-400 py-1">
                  {day}
                </div>
              ))}

              {Array.from({ length: 28 }).map((_, index) => {
                // generate realistic adherence
                const isCompleted = index !== 3 && index !== 11 && index !== 18;
                const isRestDay = index === 6 || index === 13 || index === 20 || index === 27;
                return (
                  <div
                    key={index}
                    className={`h-10 sm:h-12 rounded-lg border flex flex-col items-center justify-center text-xs transition-all ${
                      isCompleted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : isRestDay
                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <span className="text-[10px] opacity-75">{index + 1}</span>
                    <span className="text-[10px] font-bold">
                      {isCompleted ? '✓ 3/3' : isRestDay ? 'Rest' : '1/3'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500">Prescription Completion</span>
              <p className="tnum text-xl font-bold text-slate-900 mt-1">{patient.overallAdherence}%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500">Average Session Duration</span>
              <p className="tnum text-xl font-bold text-slate-900 mt-1">18.4 mins</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500">AI Real-Time Feedback Corrections</span>
              <p className="tnum text-xl font-bold text-emerald-700 mt-1">98.2% corrected</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLINICAL MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Clinical Milestones & Discharge Clearance Pathway
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evidence-based criteria for {patient.primaryDiagnosis}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {patient.milestones.filter((m) => m.completed).length} of {patient.milestones.length} Completed
            </span>
          </div>

          <div className="space-y-3">
            {patient.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                  milestone.completed
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    milestone.completed
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-300 text-transparent'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-sm font-bold text-slate-900">{milestone.title}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {milestone.category}
                      </span>
                      {milestone.completed ? (
                        <span className="text-emerald-700 font-semibold">
                          Achieved on {milestone.achievedDate}
                        </span>
                      ) : (
                        <span className="text-slate-500">Target Week {milestone.targetWeek}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
