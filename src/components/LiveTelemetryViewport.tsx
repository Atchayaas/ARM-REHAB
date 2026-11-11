import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Camera,
  Cpu
} from 'lucide-react';
import { ExerciseProtocol, Patient, LiveTelemetryState } from '../types/telemetry';
import { clinicalAudio } from '../utils/audioAlerts';
import {
  calculateAngle,
  voiceCoach,
  evaluatePoseFrame,
  getAllExerciseReports,
  LM,
  Point2D
} from '../utils/shoulderKinematics';
import {
  W,
  H,
  drawCompleteFrame,
  drawIdle,
  drawHud,
  MENU_ITEMS
} from '../utils/rehabDraw';

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

export const SHOULDER_EXERCISES = [
  {
    key: 'f',
    keyChar: 'F',
    name: 'SHOULDER FLEXION',
    title: 'Shoulder Flexion',
    desc: 'Forward Arm Raise (Target: 150 deg)',
    startAngle: 20,
    targetAngle: 150,
    safeMax: 165,
    joint: 'shoulder' as const,
    decreasing: false,
    repTarget: 10,
    setsTarget: 3
  },
  {
    key: 'a',
    keyChar: 'A',
    name: 'SHOULDER ABDUCTION',
    title: 'Shoulder Abduction',
    desc: 'Lateral Arm Raise to Side (Target: 150 deg)',
    startAngle: 20,
    targetAngle: 150,
    safeMax: 165,
    joint: 'shoulder' as const,
    decreasing: false,
    repTarget: 10,
    setsTarget: 3
  },
  {
    key: 'c',
    keyChar: 'C',
    name: 'CROSS-BODY REACH',
    title: 'Cross-Body Reach',
    desc: 'Horizontal Adduction Stretch (Target: 30 deg)',
    startAngle: 90,
    targetAngle: 30,
    safeMax: 100,
    joint: 'shoulder' as const,
    decreasing: true,
    repTarget: 10,
    setsTarget: 2
  },
  {
    key: 'p',
    keyChar: 'P',
    name: 'SHOULDER PRESS',
    title: 'Shoulder Press',
    desc: 'Overhead Shoulder Press (Target: 170 deg)',
    startAngle: 40,
    targetAngle: 170,
    safeMax: 180,
    joint: 'shoulder' as const,
    decreasing: false,
    repTarget: 8,
    setsTarget: 3
  }
];

const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';
  const host = window.location.hostname || 'localhost';
  return `ws://${host}:8000/ws`;
};
const SEND_W = 640;
const SEND_H = 360;
const SEND_EVERY_MS = 80;

export const LiveTelemetryViewport: React.FC<Props> = ({
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Per-frame data refs for smooth 60fps rendering without React re-render lag
  const infoRef = useRef<any>(null);
  const activeKeyRef = useRef<string | null>(null);
  const rectsRef = useRef<{
    back: [number, number, number, number] | null;
    menu: Record<string, [number, number, number, number]> | null;
  }>({ back: null, menu: null });

  const isWsBusyRef = useRef<boolean>(false);
  const lastWsSentRef = useRef<number>(0);
  const isBrowserDetectBusyRef = useRef<boolean>(false);
  const poseDetectorRef = useRef<any>(null);
  const prevRepsRef = useRef<number>(0);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<'python' | 'browser'>('browser');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [sessionReport, setSessionReport] = useState<Array<{ name: string; reps: number; peaks: number[] }> | null>(null);

  // Sync state with ref
  const setActiveKeySynced = useCallback((key: string | null) => {
    activeKeyRef.current = key;
    setActiveKey(key);
  }, []);

  const sendWs = useCallback((obj: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  // Choose an exercise by key ('f', 'a', 'c', 'p')
  const chooseExercise = useCallback(
    (key: string) => {
      const ex = SHOULDER_EXERCISES.find((e) => e.key === key);
      if (!ex) return;

      const activeTarget = (key === 'f' || key === 'a') ? (protocol.targetAngle || ex.targetAngle) : ex.targetAngle;
      setActiveKeySynced(key);
      sendWs({ action: 'select', key, target: activeTarget });

      // Reset infoRef immediate exercise display and reps: 0
      const currentInfo = infoRef.current || {};

      infoRef.current = {
        ...currentInfo,
        key,
        exercise: ex.name,
        target: activeTarget,
        reps: 0,
        progress: 0,
        hit_target: false,
      };

      // Voice announcement
      voiceCoach.say(`${ex.name} mode. Ready. Rep zero`);

      // Update parent protocol & telemetry
      const matchingProto = patient.availableProtocols.find((p) =>
        p.name.toUpperCase().includes(ex.name)
      ) || {
        id: `proto-shoulder-${ex.key}`,
        name: ex.title,
        joint: 'shoulder',
        targetAngle: activeTarget,
        minAngle: ex.startAngle,
        safeAngleMax: ex.safeMax,
        setsTarget: ex.setsTarget,
        repsPerSet: ex.repTarget,
        holdTimeSec: 2,
        pacingSecondsPerRep: 4,
        primaryPlane: 'sagittal',
        affectedSide: 'Right',
        description: ex.desc,
        contraindications: []
      };

      onSelectProtocol({ ...matchingProto, targetAngle: activeTarget } as any);
      onUpdateTelemetry((prev) => ({
        ...prev,
        isActive: true,
        targetAngle: activeTarget,
        currentReps: 0
      }));
      prevRepsRef.current = 0;
    },
    [onSelectProtocol, onUpdateTelemetry, patient.availableProtocols, protocol.targetAngle, sendWs, setActiveKeySynced]
  );

  // Return to Idle Main Menu
  const returnToMenu = useCallback(() => {
    if (activeKeyRef.current !== null) {
      setActiveKeySynced(null);
      sendWs({ action: 'menu' });
      voiceCoach.say('Main menu');
      onUpdateTelemetry((prev) => ({ ...prev, isActive: false }));
    }
  }, [sendWs, setActiveKeySynced, onUpdateTelemetry]);

  // Auto-activate exercise from protocol on mount or when protocol changes
  useEffect(() => {
    let key = 'f';
    const protoName = (protocol.name || '').toLowerCase();
    const protoId = (protocol.id || '').toLowerCase();
    if (protoName.includes('flex') || protoId.includes('flex')) key = 'f';
    else if (protoName.includes('abd') || protoName.includes('lateral') || protoId.includes('abd')) key = 'a';
    else if (protoName.includes('reach') || protoName.includes('cross') || protoId.includes('reach')) key = 'c';
    else if (protoName.includes('press') || protoName.includes('overhead') || protoId.includes('press')) key = 'p';

    chooseExercise(key);
  }, [protocol.id, chooseExercise]);

  // 1. Setup Camera and WebSocket Bridge
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    // Create offscreen canvas for frame downsampling & mirroring
    const sendCanvas = document.createElement('canvas');
    sendCanvas.width = SEND_W;
    sendCanvas.height = SEND_H;
    sendCanvasRef.current = sendCanvas;

    // Attempt Python WebSocket connection (port 8000)
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(getWsUrl());
      ws.onopen = () => {
        if (!isCancelled) {
          console.log('[FlexRehab] Connected to Python CV2/MediaPipe WebSocket server');
          setEngineMode('python');
          if (activeKeyRef.current) {
            ws?.send(JSON.stringify({
              action: 'select',
              key: activeKeyRef.current,
              target: protocol.targetAngle || 110
            }));
          }
        }
      };
      ws.onerror = () => {
        if (!isCancelled) {
          console.log('[FlexRehab] Python WebSocket server offline; using Browser MediaPipe');
          setEngineMode('browser');
        }
      };
      ws.onclose = () => {
        if (!isCancelled) setEngineMode('browser');
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'report') {
            setSessionReport(msg.items || []);
          } else if (msg.type === 'speak' && msg.text) {
            voiceCoach.say(msg.text);
          } else if (msg.type === 'frame') {
            isWsBusyRef.current = false;
            infoRef.current = msg;
            if (msg.speak && Array.isArray(msg.speak)) {
              msg.speak.forEach((t: string) => voiceCoach.say(t));
            }
          }
        } catch {}
      };
      wsRef.current = ws;
    } catch {
      setEngineMode('browser');
    }

    // Initialize Browser MediaPipe Pose as fallback / standalone
    const initBrowserPose = () => {
      if (typeof (window as any).Pose === 'function' && !poseDetectorRef.current) {
        try {
          const pose = new (window as any).Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          });
          pose.setOptions({
            modelComplexity: 0, // Lite model: starts immediately, fast 30+ FPS & zero lag
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });
          pose.onResults((results: any) => {
            isBrowserDetectBusyRef.current = false;
            if (results && results.poseLandmarks && results.poseLandmarks.length >= 25) {
              const rawLms: [number, number][] = results.poseLandmarks.map((lm: any) => [
                lm.x,
                lm.y
              ]);
              const evaluated = evaluatePoseFrame(rawLms, W, H, activeKeyRef.current, protocol.targetAngle);
              infoRef.current = evaluated;
              if (evaluated.speak && evaluated.speak.length > 0) {
                evaluated.speak.forEach((s: string) => voiceCoach.say(s));
              }
            }
          });
          poseDetectorRef.current = pose;
        } catch (e) {
          console.warn('Browser Pose init notice:', e);
        }
      }
    };

    const poseCheckInterval = setInterval(initBrowserPose, 400);
    initBrowserPose();

    // Start Webcam
    async function startCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setIsCameraActive(true);
          };
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setCameraError('Camera access blocked. Please enable webcam permission.');
        setIsCameraActive(false);
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      clearInterval(poseCheckInterval);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleEndSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendWs({ action: 'report' });
    } else {
      const reports = getAllExerciseReports();
      setSessionReport(reports);
    }
  }, [sendWs]);

  // Keyboard navigation matching post_surgery_rehab.py (F, A, C, P, Esc/M, Q)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'f') chooseExercise('f');
      else if (k === 'a') chooseExercise('a');
      else if (k === 'c') chooseExercise('c');
      else if (k === 'p') chooseExercise('p');
      else if (e.key === 'Escape' || k === 'm' || e.key === 'Backspace') {
        e.preventDefault();
        returnToMenu();
      } else if (k === 'q') {
        handleEndSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chooseExercise, returnToMenu, handleEndSession]);

  // Handle canvas clicks (Cards in menu mode, Back button in exercise mode)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;

    const inRect = (rx1: number, ry1: number, rx2: number, ry2: number) =>
      x >= rx1 && x <= rx2 && y >= ry1 && y <= ry2;

    if (activeKeyRef.current) {
      // In Exercise Mode: Check click on [< BACK] button
      const back = rectsRef.current.back;
      if (back && inRect(back[0], back[1], back[2], back[3])) {
        returnToMenu();
      }
    } else {
      // In Menu Mode: Check clicks on 4 exercise cards
      const menu = rectsRef.current.menu;
      if (menu) {
        for (const [key, rect] of Object.entries(menu)) {
          if (inRect(rect[0], rect[1], rect[2], rect[3])) {
            chooseExercise(key);
            break;
          }
        }
      }
    }
  };

  // Main 60fps Animation & Processing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const loop = (now: number) => {
      const video = videoRef.current;
      const sendCanvas = sendCanvasRef.current;

      if (video && video.readyState >= 2 && video.videoWidth > 0 && sendCanvas) {
        const sctx = sendCanvas.getContext('2d');
        if (sctx) {
          // 1. Prepare mirrored frame for AI engine (aspect-ratio preserved)
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const targetRatio = SEND_W / SEND_H;
          const vRatio = vw / vh;
          let sx = 0, sy = 0, sw = vw, sh = vh;
          if (vRatio > targetRatio) {
            sw = vh * targetRatio;
            sx = (vw - sw) / 2;
          } else {
            sh = vw / targetRatio;
            sy = (vh - sh) / 2;
          }

          sctx.save();
          sctx.translate(SEND_W, 0);
          sctx.scale(-1, 1);
          sctx.drawImage(video, sx, sy, sw, sh, 0, 0, SEND_W, SEND_H);
          sctx.restore();

          // 2. Dispatch to Python WebSocket if active (with automatic 300ms watchdog for screen-recording / heavy CPU load)
          const ws = wsRef.current;
          if (isWsBusyRef.current && now - lastWsSentRef.current > 300) {
            isWsBusyRef.current = false;
          }

          if (
            ws &&
            ws.readyState === WebSocket.OPEN &&
            !isWsBusyRef.current &&
            now - lastWsSentRef.current > SEND_EVERY_MS
          ) {
            isWsBusyRef.current = true;
            lastWsSentRef.current = now;
            sendCanvas.toBlob(
              (blob) => {
                if (blob && ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(blob);
                } else {
                  isWsBusyRef.current = false;
                }
              },
              'image/jpeg',
              0.70
            );
          } else if (
            (!ws || ws.readyState !== WebSocket.OPEN || (now - lastWsSentRef.current > 350)) &&
            poseDetectorRef.current &&
            (!isBrowserDetectBusyRef.current || now - lastWsSentRef.current > 350)
          ) {
            // 3. Dual Engine Failover: If WebSocket is slow during screen-recording, use in-browser MediaPipe Pose
            isBrowserDetectBusyRef.current = true;
            lastWsSentRef.current = now;
            poseDetectorRef.current
              .send({ image: sendCanvas })
              .catch(() => {
                isBrowserDetectBusyRef.current = false;
              });
          }
        }
      }

      // 4. Render exact frame: Mirrored camera + Skeleton + Joint Angle Arc + HUD + Badges
      const rects = drawCompleteFrame(ctx, video, infoRef.current, activeKeyRef.current);
      if (rects.back) rectsRef.current.back = rects.back;
      if (rects.menu) rectsRef.current.menu = rects.menu;

      // 5. Update parent telemetry if info updated
      const info = infoRef.current;
      if (info && activeKeyRef.current) {
        if (info.reps > prevRepsRef.current) {
          prevRepsRef.current = info.reps;
          onRepetitionComplete(info.reps, Math.round(info.angle || 0));
          clinicalAudio.playRepTick();
        }

        if (!info.form_ok && info.form_message) {
          onCompensationDetected(info.form_message, 5);
        }

        onUpdateTelemetry((prev) => ({
          ...prev,
          currentAngle: Math.round(info.angle || prev.currentAngle),
          peakAngleSession: Math.max(prev.peakAngleSession, Math.round(info.angle || 0)),
          currentReps: info.reps ?? prev.currentReps,
          formStatus: info.form_ok ? 'optimal' : 'compensating',
          activeCompensation: info.form_ok ? null : info.form_message
        }));
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [chooseExercise, onCompensationDetected, onRepetitionComplete, onUpdateTelemetry]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      {/* Offscreen Native Video Element (Must not be display:none so browser continues hardware video decoding) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '640px',
          height: '480px',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Main High-Performance 1280x720 Canvas */}
      <div className="relative w-full aspect-video min-h-[460px] sm:min-h-[560px] bg-black flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain block cursor-pointer select-none"
        />

        {/* Floating Top Controls Overlay */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 border border-slate-700 text-xs text-white backdrop-blur-md">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold tracking-wide">
              {engineMode === 'python'
                ? 'PYTHON CV2 ENGINE (PORT 8000) • 1280x720'
                : isCameraActive
                ? 'BROWSER MEDIAPIPE POSE • 1280x720'
                : 'INITIALIZING CAMERA...'}
            </span>
          </div>

          <button
            onClick={() => {
              clinicalAudio.isMuted = !isMuted;
              setIsMuted(!isMuted);
            }}
            className="p-2 rounded-full bg-slate-950/85 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md cursor-pointer transition active:scale-95"
            title="Toggle Voice Biofeedback"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={() => {
              const el = canvasRef.current?.parentElement;
              if (!el) return;
              if (!document.fullscreenElement) {
                el.requestFullscreen().catch(() => {});
                setIsFullscreen(true);
              } else {
                document.exitFullscreen().catch(() => {});
                setIsFullscreen(false);
              }
            }}
            className="p-2 rounded-full bg-slate-950/85 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md cursor-pointer transition active:scale-95"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Right Floating [End Session Q] Button */}
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={handleEndSession}
            className="px-4 py-2.5 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/50 flex items-center gap-2 backdrop-blur-md border border-red-400/40 cursor-pointer transition active:scale-95"
            title="Press [Q] or click to exit session & review summary"
          >
            <span>End Session [Q]</span>
          </button>
        </div>

        {/* Error Banner if Camera Blocked */}
        {cameraError && (
          <div className="absolute top-16 left-4 right-4 z-20 p-3 rounded-xl bg-amber-950/90 border border-amber-700 text-xs text-amber-200 flex items-center gap-2 backdrop-blur-md">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Session Summary Modal (Faithful 1:1 match to rehab-web) */}
        {sessionReport && (
          <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    Session Summary
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Physical rehabilitation telemetry review</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-900/60 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-700">
                  Completed
                </span>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {sessionReport.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No exercises done this session.</p>
                ) : (
                  sessionReport.map((r) => (
                    <div key={r.name} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <strong className="text-cyan-300">{r.name}</strong>
                        <span className="text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
                          {r.reps} reps
                        </span>
                      </div>
                      {r.peaks && r.peaks.length > 0 && (
                        <p className="text-xs text-slate-400">
                          Peak angles: <span className="text-emerald-300 font-mono">{r.peaks.join('°, ')}°</span>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setSessionReport(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
                >
                  Resume Session
                </button>
                <button
                  onClick={onBackToDashboard}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950 cursor-pointer transition"
                >
                  Save & Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
