import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Square,
  Video,
  Volume2,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Dumbbell
} from 'lucide-react';
import { Patient, ExerciseProtocol, LiveTelemetryState } from '../types/telemetry';
import { LiveTelemetryViewport } from './LiveTelemetryViewport';
import { TelemetryMetricPods } from './TelemetryMetricPods';

interface Props {
  patient: Patient;
  protocol: ExerciseProtocol;
  telemetry: LiveTelemetryState;
  onUpdateTelemetry: (updater: (prev: LiveTelemetryState) => LiveTelemetryState) => void;
  onEmergencyStop: () => void;
  onRepetitionComplete: (repNumber: number, peakAngle: number) => void;
  onCompensationDetected: (type: string, deviation: number) => void;
  onBackToDashboard: () => void;
  onSelectProtocol: (protocol: ExerciseProtocol) => void;
}

export const LiveStudioView: React.FC<Props> = ({
  patient,
  protocol,
  telemetry,
  onUpdateTelemetry,
  onEmergencyStop,
  onRepetitionComplete,
  onCompensationDetected,
  onBackToDashboard,
  onSelectProtocol
}) => {
  // Listen for keyboard shortcut [Q] or [q] to End Session and return to Screen 3 (Dashboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        onUpdateTelemetry((prev) => ({ ...prev, isActive: false }));
        onBackToDashboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToDashboard, onUpdateTelemetry]);

  const handleEndSession = () => {
    onUpdateTelemetry((prev) => ({ ...prev, isActive: false }));
    onBackToDashboard();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SCREEN 4 TOP CONTROL BAR WITH [← Back] AND End Session [Q] (Mandatory Requirement) */}
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: [← Back] Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            title="Return to Screen 3 (Dashboard)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>[← Back]</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded border border-blue-700">
                Screen 4
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Live Studio • {protocol.name}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              Joint: <strong className="text-slate-200 capitalize">{protocol.joint}</strong> ({protocol.affectedSide} Side) • Target: <strong className="text-emerald-400">{protocol.targetAngle}°</strong>
            </p>
          </div>
        </div>

        {/* Right: Exercise Selector & End Session [Q] Button */}
        <div className="flex items-center gap-2.5">
          <select
            value={protocol.id}
            onChange={(e) => {
              const found = patient.availableProtocols.find((p) => p.id === e.target.value);
              if (found) onSelectProtocol(found);
            }}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 hidden md:block"
          >
            {patient.availableProtocols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* End Session [Q] Button (Mandatory Requirement) */}
          <button
            onClick={handleEndSession}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-red-600/30 transition-all border border-red-500 cursor-pointer"
            title="End current tracking session and return to Screen 3 (Dashboard)"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>End Session [Q]</span>
          </button>
        </div>
      </div>

      {/* Metric Pods */}
      <TelemetryMetricPods
        patient={patient}
        protocol={protocol}
        telemetry={telemetry}
      />

      {/* Main Full-Fidelity Biomechanical Live Telemetry Viewport */}
      <LiveTelemetryViewport
        patient={patient}
        protocol={protocol}
        telemetry={telemetry}
        onUpdateTelemetry={onUpdateTelemetry}
        onEmergencyStop={onEmergencyStop}
        onRepetitionComplete={onRepetitionComplete}
        onCompensationDetected={onCompensationDetected}
        onBackToDashboard={onBackToDashboard}
        onSelectProtocol={onSelectProtocol}
      />

      {/* Instructions & Shortcuts Footer */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span>⌨️ Keyboard Shortcut: Press <strong>Q</strong> to End Session and return to Dashboard.</span>
          <span className="hidden sm:inline">🎯 Audio Target Chimes & Voice Guidance Enabled</span>
        </div>
        <span className="text-slate-400">FlexVision™ Skeletal Mesh 60 FPS</span>
      </div>
    </div>
  );
};
