/**
 * Shoulder Biomechanical Kinematics Engine
 * Directly ported from post_surgery_rehab.py & rehab-web
 * Uses Law of Cosines for joint angles, threshold-based rep counting,
 * and form posture validation (shrugging, hip tilt, spine arching).
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface FormCheckResult {
  formOk: boolean;
  formMessage: string;
}

// MediaPipe 33 Landmark Constants
export const LM = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

export const POSE_CONNECTIONS: [number, number][] = [
  [LM.RIGHT_EAR, LM.RIGHT_SHOULDER],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.LEFT_SHOULDER],
  [LM.RIGHT_HIP, LM.LEFT_HIP],
];

/**
 * Angle at vertex point **b** formed by segments a->b and b->c
 * Law of Cosines:
 * theta = arccos( (ab^2 + bc^2 - ac^2) / (2 * ab * bc) )
 */
export function calculateAngle(a: Point2D, b: Point2D, c: Point2D): number {
  const ab = Math.hypot(a.x - b.x, a.y - b.y);
  const bc = Math.hypot(b.x - c.x, b.y - c.y);
  const ac = Math.hypot(a.x - c.x, a.y - c.y);

  if (ab * bc === 0) return 0.0;

  let cosVal = (ab ** 2 + bc ** 2 - ac ** 2) / (2 * ab * bc);
  cosVal = Math.max(-1.0, Math.min(1.0, cosVal));
  return (Math.acos(cosVal) * 180) / Math.PI;
}

/**
 * Text-to-Speech Voice Coach using Web Speech API + Web Audio Synthesizer fallback
 */
class VoiceCoach {
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    // Unlock Web Audio & Speech on first user touch / click
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (!this.isUnlocked) {
          this.isUnlocked = true;
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              this.audioCtx = new AudioContextClass();
              if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
              }
            }
          } catch {}
          if ('speechSynthesis' in window) {
            try {
              window.speechSynthesis.resume();
            } catch {}
          }
        }
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  // Play audible melodic confirmation tone for reps and targets on mobile
  beep(frequency: number = 587.33, durationMs: number = 180) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + durationMs / 1000);
      }
    } catch {}
  }

  say(text: string) {
    const now = Date.now();
    // Drop spam if same message was spoken within 1.0 second
    if (this.lastSpokenText === text && now - this.lastSpokenTime < 1000) {
      return;
    }
    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    // Play prompt tone
    if (text.toLowerCase().includes('rep') || text.toLowerCase().includes('good')) {
      this.beep(text.toLowerCase().includes('rep') ? 659.25 : 523.25, 200);
    }

    if (!('speechSynthesis' in window)) return;

    try {
      // Android WebView: ensure speech engine is active and not paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Select appropriate English voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const enVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
        if (enVoice) utterance.voice = enVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio fallback already played via beep
    }
  }

  praise(repNumber: number) {
    if (repNumber % 5 === 0) {
      const praises = [
        "Excellent work!",
        "Amazing progress!",
        "You're doing great!",
        "Keep it up, champion!",
        "Fantastic effort!"
      ];
      const msg = praises[(Math.floor(repNumber / 5) - 1) % praises.length];
      this.say(`Rep ${repNumber}. ${msg}`);
    } else {
      this.say(`Rep ${repNumber}`);
    }
  }
}

export const voiceCoach = new VoiceCoach();

/**
 * Exercise State tracker for in-browser client evaluation
 */
export class ClientExerciseTracker {
  repCount: number = 0;
  hitTarget: boolean = false;
  state: 'IDLE_START' | 'ASCENDING' | 'PEAK_REACHED' | 'DESCENDING' = 'IDLE_START';
  startPosAngle: number = 0;
  peakAngle: number = 0;
  angleLog: number[] = [];
  lastRepTime: number = 0;
  formOk: boolean = true;
  formMessage: string = '';

  reset() {
    this.repCount = 0;
    this.hitTarget = false;
    this.state = 'IDLE_START';
    this.startPosAngle = 0;
    this.peakAngle = 0;
    this.angleLog = [];
    this.lastRepTime = 0;
    this.formOk = true;
    this.formMessage = '';
  }
}

const exerciseTrackers: Record<string, ClientExerciseTracker> = {
  f: new ClientExerciseTracker(),
  a: new ClientExerciseTracker(),
  c: new ClientExerciseTracker(),
  p: new ClientExerciseTracker(),
};

export function getClientExerciseTracker(key: string): ClientExerciseTracker {
  if (!exerciseTrackers[key]) {
    exerciseTrackers[key] = new ClientExerciseTracker();
  }
  return exerciseTrackers[key];
}

export function getAllExerciseReports(): Array<{ name: string; reps: number; peaks: number[] }> {
  return [
    { name: 'SHOULDER FLEXION', reps: exerciseTrackers.f.repCount, peaks: exerciseTrackers.f.angleLog },
    { name: 'SHOULDER ABDUCTION', reps: exerciseTrackers.a.repCount, peaks: exerciseTrackers.a.angleLog },
    { name: 'CROSS-BODY REACH', reps: exerciseTrackers.c.repCount, peaks: exerciseTrackers.c.angleLog },
    { name: 'SHOULDER PRESS', reps: exerciseTrackers.p.repCount, peaks: exerciseTrackers.p.angleLog },
  ];
}

/**
 * Client-Side Frame Evaluation matching post_surgery_rehab.py & main.py exactly!
 */
export function evaluatePoseFrame(
  normalizedLandmarks: [number, number][],
  w: number,
  h: number,
  activeKey: string | null,
  targetAngleOverride?: number
) {
  if (!normalizedLandmarks || normalizedLandmarks.length < 25) {
    return {
      found: false,
      landmarks: [],
      key: activeKey,
      exercise: null,
      angle: 0,
      target: targetAngleOverride || 110,
      reps: 0,
      progress: 0,
      form_ok: true,
      form_message: '',
      hit_target: false,
      l_angle: 20,
      r_angle: 20,
      use_wrist: true,
      r_active: false,
      speak: [] as string[],
    };
  }

  const L = (idx: number): Point2D => {
    const pt = normalizedLandmarks[idx] || [0.5, 0.5];
    return { x: pt[0] * w, y: pt[1] * h };
  };

  // On idle screen or flexion/abduction, use wrist for direct arm raising tracking
  const use_wrist = activeKey === null || activeKey === 'f' || activeKey === 'a';
  const r_arm = use_wrist ? L(LM.RIGHT_WRIST) : L(LM.RIGHT_ELBOW);
  const l_arm = use_wrist ? L(LM.LEFT_WRIST) : L(LM.LEFT_ELBOW);

  const r_angle = calculateAngle(L(LM.RIGHT_HIP), L(LM.RIGHT_SHOULDER), r_arm);
  const l_angle = calculateAngle(L(LM.LEFT_HIP), L(LM.LEFT_SHOULDER), l_arm);
  const r_active = activeKey === 'f' || activeKey === 'a' || activeKey === 'p';

  const out = {
    found: true,
    landmarks: normalizedLandmarks,
    key: activeKey,
    exercise: null as string | null,
    angle: 0,
    target: targetAngleOverride || 110,
    reps: 0,
    progress: 0,
    form_ok: true,
    form_message: '',
    hit_target: false,
    l_angle: Math.round(l_angle * 10) / 10,
    r_angle: Math.round(r_angle * 10) / 10,
    use_wrist,
    r_active,
    speak: [] as string[],
  };

  if (!activeKey) {
    return out;
  }

  const tracker = getClientExerciseTracker(activeKey);
  let angle = r_angle;
  const userTarget = targetAngleOverride && targetAngleOverride > 0 ? targetAngleOverride : 110.0;
  let targetAngle = userTarget;
  let startAngle = 20.0;
  let decreasing = false;
  let exName = 'SHOULDER FLEXION';
  const BUFFER = 15;

  if (activeKey === 'f') {
    exName = 'SHOULDER FLEXION';
    targetAngle = userTarget;
    startAngle = 20.0;
    decreasing = false;
    const r_ang = calculateAngle(L(LM.RIGHT_HIP), L(LM.RIGHT_SHOULDER), L(LM.RIGHT_WRIST));
    const l_ang = calculateAngle(L(LM.LEFT_HIP), L(LM.LEFT_SHOULDER), L(LM.LEFT_WRIST));
    // Bilateral dual-arm tracking: Display limiting angle so user sees both arms must elevate
    angle = Math.min(r_ang, l_ang);

    // Form check: shrugging
    const ear = L(LM.RIGHT_EAR);
    const shld = L(LM.RIGHT_SHOULDER);
    if (Math.hypot(ear.x - shld.x, ear.y - shld.y) < h * 0.07) {
      tracker.formOk = false;
      tracker.formMessage = "Don't shrug";
    } else {
      tracker.formOk = true;
      tracker.formMessage = '';
    }
  } else if (activeKey === 'a') {
    exName = 'SHOULDER ABDUCTION';
    targetAngle = userTarget;
    startAngle = 20.0;
    decreasing = false;
    const r_ang = calculateAngle(L(LM.RIGHT_HIP), L(LM.RIGHT_SHOULDER), L(LM.RIGHT_WRIST));
    const l_ang = calculateAngle(L(LM.LEFT_HIP), L(LM.LEFT_SHOULDER), L(LM.LEFT_WRIST));
    // Bilateral dual-arm tracking
    angle = Math.min(r_ang, l_ang);

    // Form check: shrugging
    const ear = L(LM.RIGHT_EAR);
    const shld = L(LM.RIGHT_SHOULDER);
    if (Math.hypot(ear.x - shld.x, ear.y - shld.y) < h * 0.07) {
      tracker.formOk = false;
      tracker.formMessage = "Don't shrug";
    } else {
      tracker.formOk = true;
      tracker.formMessage = '';
    }
  } else if (activeKey === 'c') {
    exName = 'CROSS-BODY REACH';
    targetAngle = 30.0;
    startAngle = 90.0;
    decreasing = true;

    // Both arms - pick arm closer to target (lower angle)
    const r_pts: [Point2D, Point2D, Point2D] = [L(LM.LEFT_SHOULDER), L(LM.RIGHT_SHOULDER), L(LM.RIGHT_WRIST)];
    const l_pts: [Point2D, Point2D, Point2D] = [L(LM.RIGHT_SHOULDER), L(LM.LEFT_SHOULDER), L(LM.LEFT_WRIST)];
    const r_ang = calculateAngle(...r_pts);
    const l_ang = calculateAngle(...l_pts);
    angle = r_ang <= l_ang ? r_ang : l_ang;

    // Form check: torso twist (hips tilt)
    const l_hip = L(LM.LEFT_HIP);
    const r_hip = L(LM.RIGHT_HIP);
    if (Math.abs(l_hip.y - r_hip.y) > h * 0.08) {
      tracker.formOk = false;
      tracker.formMessage = 'Keep hips level';
    } else {
      tracker.formOk = true;
      tracker.formMessage = '';
    }
  } else if (activeKey === 'p') {
    exName = 'SHOULDER PRESS';
    targetAngle = 170.0;
    startAngle = 40.0;
    decreasing = false;
    const r_ang = calculateAngle(L(LM.RIGHT_ELBOW), L(LM.RIGHT_SHOULDER), L(LM.RIGHT_HIP));
    const l_ang = calculateAngle(L(LM.LEFT_ELBOW), L(LM.LEFT_SHOULDER), L(LM.LEFT_HIP));
    // Bilateral dual-arm overhead press
    angle = Math.min(r_ang, l_ang);

    // Form check: back arching (nose drifts forward)
    const nose = L(LM.NOSE);
    const shld = L(LM.RIGHT_SHOULDER);
    if (nose.x - shld.x > w * 0.1) {
      tracker.formOk = false;
      tracker.formMessage = 'Straighten your back';
    } else {
      tracker.formOk = true;
      tracker.formMessage = '';
    }
  }

  // Strict Bilateral Dual-Arm Gesture Verification
  const r_wri = L(LM.RIGHT_WRIST);
  const l_wri = L(LM.LEFT_WRIST);
  const r_shld = L(LM.RIGHT_SHOULDER);
  const l_shld = L(LM.LEFT_SHOULDER);
  const r_elb = L(LM.RIGHT_ELBOW);
  const l_elb = L(LM.LEFT_ELBOW);
  const r_hip = L(LM.RIGHT_HIP);
  const l_hip = L(LM.LEFT_HIP);

  const r_arm_ang = calculateAngle(r_hip, r_shld, r_wri);
  const l_arm_ang = calculateAngle(l_hip, l_shld, l_wri);
  const r_elb_ang = calculateAngle(r_shld, r_elb, r_wri);
  const l_elb_ang = calculateAngle(l_shld, l_elb, l_wri);

  let isValidGesture = true;
  let isAtStart = false;
  let isAtTarget = false;

  if (activeKey === 'f') {
    // Shoulder Flexion: BOTH arms must be straight and elevate synchronously
    isValidGesture = r_elb_ang >= 110 && l_elb_ang >= 110;
    isAtStart = r_arm_ang <= 45.0 && l_arm_ang <= 45.0 && r_wri.y > (r_shld.y + 35) && l_wri.y > (l_shld.y + 35);
    const bothAngHit = r_arm_ang >= (targetAngle - 8.0) && l_arm_ang >= (targetAngle - 8.0);
    const bothWriUp = r_wri.y <= (r_shld.y + 60) && l_wri.y <= (l_shld.y + 60);
    isAtTarget = bothAngHit && bothWriUp;
  } else if (activeKey === 'a') {
    // Shoulder Abduction: BOTH arms must raise laterally out to sides
    isValidGesture = r_elb_ang >= 110 && l_elb_ang >= 110;
    isAtStart = r_arm_ang <= 45.0 && l_arm_ang <= 45.0;
    const bothAngHit = r_arm_ang >= (targetAngle - 8.0) && l_arm_ang >= (targetAngle - 8.0);
    const r_lat = Math.abs(r_wri.x - r_shld.x);
    const l_lat = Math.abs(l_wri.x - l_shld.x);
    isAtTarget = bothAngHit && r_lat >= 70 && l_lat >= 70;
  } else if (activeKey === 'c') {
    // Cross-body reach
    isValidGesture = true;
    isAtStart = angle >= 70.0;
    const r_cross = r_wri.x < r_shld.x - 20;
    const l_cross = l_wri.x > l_shld.x + 20;
    isAtTarget = angle <= (targetAngle + 8.0) && (r_cross || l_cross);
  } else if (activeKey === 'p') {
    // Shoulder press: BOTH arms overhead
    const r_press_ang = calculateAngle(r_elb, r_shld, r_hip);
    const l_press_ang = calculateAngle(l_elb, l_shld, l_hip);
    isValidGesture = true;
    isAtStart = r_press_ang <= 80.0 && l_press_ang <= 80.0;
    const bothAngHit = r_press_ang >= (targetAngle - 10.0) && l_press_ang >= (targetAngle - 10.0);
    const bothOverhead = r_wri.y < (r_shld.y - 30) && l_wri.y < (l_shld.y - 30);
    isAtTarget = bothAngHit && bothOverhead;
  }

  // Multi-Phase Clinical Repetition State Machine
  const now = Date.now();
  if (decreasing) {
    // Cross-body reach
    if (tracker.state === 'IDLE_START') {
      tracker.hitTarget = false;
      if (isAtStart) {
        tracker.startPosAngle = angle;
        tracker.peakAngle = angle;
      } else if (tracker.startPosAngle > 0 && isValidGesture && angle <= startAngle - 15.0) {
        tracker.state = 'ASCENDING';
        tracker.peakAngle = angle;
      }
    } else if (tracker.state === 'ASCENDING') {
      tracker.peakAngle = tracker.peakAngle > 0 ? Math.min(tracker.peakAngle, angle) : angle;
      if (isAtTarget && isValidGesture) {
        tracker.state = 'PEAK_REACHED';
        tracker.hitTarget = true;
        if (tracker.formOk) {
          out.speak.push('Good, now return');
        } else {
          out.speak.push(tracker.formMessage || 'Good, now return');
        }
      } else if (isAtStart) {
        tracker.state = 'IDLE_START';
      }
    } else if (tracker.state === 'PEAK_REACHED') {
      tracker.peakAngle = Math.min(tracker.peakAngle, angle);
      if (angle >= targetAngle + 12.0) {
        tracker.state = 'DESCENDING';
      }
    } else if (tracker.state === 'DESCENDING') {
      if (isAtStart) {
        if (now - tracker.lastRepTime >= 850) {
          tracker.lastRepTime = now;
          tracker.repCount += 1;
          tracker.angleLog.push(Math.round(tracker.peakAngle));
          if (tracker.repCount % 5 === 0) {
            const praises = [
              'Excellent work!',
              'Amazing progress!',
              "You're doing great!",
              'Keep it up, champion!',
              'Fantastic effort!'
            ];
            const msg = praises[(Math.floor(tracker.repCount / 5) - 1) % praises.length];
            out.speak.push(`Rep ${tracker.repCount}. ${msg}`);
          } else {
            out.speak.push(`Rep ${tracker.repCount}`);
          }
        }
        tracker.state = 'IDLE_START';
        tracker.hitTarget = false;
        tracker.peakAngle = 0;
        tracker.startPosAngle = 0;
      }
    }
  } else {
    // Increasing: Flexion, Abduction, Press
    if (tracker.state === 'IDLE_START') {
      tracker.hitTarget = false;
      if (isAtStart) {
        tracker.startPosAngle = angle;
        tracker.peakAngle = angle;
      } else if (tracker.startPosAngle > 0 && isValidGesture && angle >= startAngle + 15.0) {
        tracker.state = 'ASCENDING';
        tracker.peakAngle = angle;
      }
    } else if (tracker.state === 'ASCENDING') {
      tracker.peakAngle = Math.max(tracker.peakAngle, angle);
      if (isAtTarget && isValidGesture) {
        tracker.state = 'PEAK_REACHED';
        tracker.hitTarget = true;
        if (tracker.formOk) {
          out.speak.push('Good, now return');
        } else {
          out.speak.push(tracker.formMessage || 'Good, now return');
        }
      } else if (isAtStart) {
        tracker.state = 'IDLE_START';
      }
    } else if (tracker.state === 'PEAK_REACHED') {
      tracker.peakAngle = Math.max(tracker.peakAngle, angle);
      if (angle <= targetAngle - 15.0) {
        tracker.state = 'DESCENDING';
      }
    } else if (tracker.state === 'DESCENDING') {
      if (isAtStart) {
        if (now - tracker.lastRepTime >= 850) {
          tracker.lastRepTime = now;
          tracker.repCount += 1;
          tracker.angleLog.push(Math.round(tracker.peakAngle));
          if (tracker.repCount % 5 === 0) {
            const praises = [
              'Excellent work!',
              'Amazing progress!',
              "You're doing great!",
              'Keep it up, champion!',
              'Fantastic effort!'
            ];
            const msg = praises[(Math.floor(tracker.repCount / 5) - 1) % praises.length];
            out.speak.push(`Rep ${tracker.repCount}. ${msg}`);
          } else {
            out.speak.push(`Rep ${tracker.repCount}`);
          }
        }
        tracker.state = 'IDLE_START';
        tracker.hitTarget = false;
        tracker.peakAngle = 0;
        tracker.startPosAngle = 0;
      }
    }
  }

  const span = Math.abs(targetAngle - startAngle);
  const progress = span === 0 ? 0 : Math.max(0, Math.min(1, Math.abs(angle - startAngle) / span));

  out.exercise = exName;
  out.angle = Math.round(angle * 10) / 10;
  out.reps = tracker.repCount;
  out.progress = progress;
  out.form_ok = tracker.formOk;
  out.form_message = tracker.formMessage;
  out.hit_target = tracker.hitTarget;

  return out;
}
