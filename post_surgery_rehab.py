"""
Shoulder Physical Rehab Assistant
=================================
Real-time pose-estimation rehab coach using **OpenCV**, **MediaPipe 0.10+**,
and **pyttsx3**, focused exclusively on shoulder post-operative recovery.
Provides auditory & visual feedback, interactive click/key navigation,
and generates a progress report on exit.

Controls & Navigation
---------------------
    f - Shoulder Flexion (Forward Raise)
    a - Shoulder Abduction (Lateral Raise)
    c - Cross-Body Reach
    p - Shoulder Press
    Click [< BACK] or Esc/M - Return to Main Menu
    q - Quit & generate report
"""

# ──────────────────────────────────────────────────────────────────────────────
#  Imports
# ──────────────────────────────────────────────────────────────────────────────
import os
import cv2
import math
import subprocess
import threading
import queue
from abc import ABC, abstractmethod

import numpy as np
import mediapipe as mp
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ── MediaPipe 0.10 task-based API aliases ──
BaseOptions       = mp.tasks.BaseOptions
PoseLandmarker    = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOpt = mp.tasks.vision.PoseLandmarkerOptions
RunningMode       = mp.tasks.vision.RunningMode
PoseLandmark      = mp.tasks.vision.PoseLandmark

# Landmark index constants
LM_NOSE             = PoseLandmark.NOSE
LM_RIGHT_EAR        = PoseLandmark.RIGHT_EAR
LM_LEFT_EAR         = PoseLandmark.LEFT_EAR
LM_RIGHT_SHOULDER   = PoseLandmark.RIGHT_SHOULDER
LM_RIGHT_ELBOW      = PoseLandmark.RIGHT_ELBOW
LM_RIGHT_WRIST      = PoseLandmark.RIGHT_WRIST
LM_RIGHT_HIP        = PoseLandmark.RIGHT_HIP
LM_LEFT_SHOULDER    = PoseLandmark.LEFT_SHOULDER
LM_LEFT_ELBOW       = PoseLandmark.LEFT_ELBOW
LM_LEFT_WRIST       = PoseLandmark.LEFT_WRIST
LM_LEFT_HIP         = PoseLandmark.LEFT_HIP

# Skeleton connections for drawing (upper-body subset)
POSE_CONNECTIONS = [
    (LM_RIGHT_EAR,      LM_RIGHT_SHOULDER),
    (LM_RIGHT_SHOULDER, LM_RIGHT_ELBOW),
    (LM_RIGHT_ELBOW,    LM_RIGHT_WRIST),
    (LM_RIGHT_SHOULDER, LM_RIGHT_HIP),
    (LM_LEFT_SHOULDER,  LM_LEFT_ELBOW),
    (LM_LEFT_ELBOW,     LM_LEFT_WRIST),
    (LM_LEFT_SHOULDER,  LM_LEFT_HIP),
    (LM_RIGHT_SHOULDER, LM_LEFT_SHOULDER),
    (LM_RIGHT_HIP,      LM_LEFT_HIP),
]


# ──────────────────────────────────────────────────────────────────────────────
#  Utility – Angle Calculation (Law of Cosines)
# ──────────────────────────────────────────────────────────────────────────────
def calculate_angle(a, b, c):
    """
    Angle at point **b** formed by segments a->b and b->c.

        theta = arccos( (ab^2 + bc^2 - ac^2) / (2*ab*bc) )

    Parameters
    ----------
    a, b, c : tuple[float, float]
        (x, y) in pixel coordinates.

    Returns
    -------
    float   Angle in degrees (0-180).
    """
    ab = math.dist(a, b)
    bc = math.dist(b, c)
    ac = math.dist(a, c)
    if ab * bc == 0:
        return 0.0
    cos_val = (ab ** 2 + bc ** 2 - ac ** 2) / (2 * ab * bc)
    cos_val = max(-1.0, min(1.0, cos_val))
    return math.degrees(math.acos(cos_val))


# ──────────────────────────────────────────────────────────────────────────────
#  Voice Feedback Engine (non-blocking, uses Windows SAPI via PowerShell)
# ──────────────────────────────────────────────────────────────────────────────
class VoiceFeedback:
    """
    Non-blocking TTS using Windows SAPI through PowerShell subprocess.

    Each message spawns a small PowerShell process — no COM threading
    issues, guaranteed audio output on Windows.
    """

    def __init__(self):
        self._queue = queue.Queue()
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def _worker(self):
        while True:
            text = self._queue.get()
            if text is None:
                break
            try:
                # Sanitize text for PowerShell string
                safe = text.replace('"', '').replace("'", "")
                ps_cmd = (
                    'Add-Type -AssemblyName System.Speech; '
                    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; '
                    f'$s.Speak("{safe}")'
                )
                subprocess.run(
                    ['powershell', '-Command', ps_cmd],
                    capture_output=True, timeout=10,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            except Exception:
                pass

    def say(self, text):
        """Enqueue text (non-blocking). Drops if queue already has 2+ items."""
        if self._queue.qsize() < 2:
            self._queue.put(text)

    def say_now(self, text):
        """Clear the queue and enqueue text so it's spoken immediately."""
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except queue.Empty:
                break
        self._queue.put(text)

    def shutdown(self):
        self._queue.put(None)


# ──────────────────────────────────────────────────────────────────────────────
#  Landmark helper
# ──────────────────────────────────────────────────────────────────────────────
def _lm(lms, idx, w, h):
    """Return (x_px, y_px) from a NormalizedLandmark list."""
    pt = lms[idx]
    return (int(pt.x * w), int(pt.y * h))


# ──────────────────────────────────────────────────────────────────────────────
#  Exercise Base Class  (simple threshold-based rep counting)
# ──────────────────────────────────────────────────────────────────────────────
class Exercise(ABC):
    """
    Abstract base for every exercise.

    Rep counting is simple threshold logic:
      1. Angle crosses the *target* threshold  ->  _hit_target = True
      2. Angle returns past the *start* threshold -> count 1 rep, reset
    No state machine — just two thresholds and a boolean flag.
    """

    BUFFER = 6   # Accurate clinical threshold buffer

    def __init__(self):
        self.rep_count = 0
        self.angle_log = []          # peak angle per rep
        self._state = "IDLE_START"   # "IDLE_START", "ASCENDING", "PEAK_REACHED", "DESCENDING"
        self._hit_target = False     # compatibility with HUD
        self._peak_angle = 0.0
        self._start_pos_angle = 0.0
        self._last_rep_time = 0.0
        self.form_ok = True
        self.form_message = ""

    @property
    @abstractmethod
    def exercise_name(self): ...

    @property
    @abstractmethod
    def _target_angle(self): ...

    @property
    @abstractmethod
    def _start_angle(self): ...

    @abstractmethod
    def _get_landmarks(self, lms, w, h): ...

    @abstractmethod
    def check_form(self, lms, w, h): ...

    @property
    def _decreasing(self):
        """True if angle DECREASES toward target (e.g. Cross-body reach)."""
        return float(self._target_angle) < float(self._start_angle)

    def process_frame(self, lms, w, h, voice):
            """
            True clinical biomechanical gesture rep-counter.
            Requires correct exercise posture, extension, and full range of motion.
            Prevents false triggers from sitting, typing, or random movements.
            """
            import time as _t
            pts = self._get_landmarks(lms, w, h)
            if pts is None:
                return 0.0
            a, b, c = pts
            angle = calculate_angle(a, b, c)
    
            self.form_ok, self.form_message = self.check_form(lms, w, h)
            target = float(self._target_angle)
            start = float(self._start_angle)
            now = _t.time()
    
            # Check if the current body posture matches the expected exercise gesture
            valid_gesture = self.is_valid_gesture(lms, w, h)
            at_start = self.is_at_start(lms, w, h, angle)
            at_target = self.is_at_target(lms, w, h, angle)
    
            if self._state == "IDLE_START":
                self._hit_target = False
                # Armed only when user is genuinely in resting start position
                if at_start:
                    self._start_pos_angle = angle
                    self._peak_angle = angle
                elif self._start_pos_angle > 0 and valid_gesture:
                    # Started legitimate exercise excursion
                    if not self._decreasing and angle >= start + 15.0:
                        self._state = "ASCENDING"
                        self._peak_angle = angle
                    elif self._decreasing and angle <= start - 15.0:
                        self._state = "ASCENDING"
                        self._peak_angle = angle
    
            elif self._state == "ASCENDING":
                if self._decreasing:
                    self._peak_angle = min(self._peak_angle, angle) if self._peak_angle > 0 else angle
                else:
                    self._peak_angle = max(self._peak_angle, angle)
    
                # Legitimate target achievement with valid gesture
                if at_target and valid_gesture:
                    self._state = "PEAK_REACHED"
                    self._hit_target = True
                    if self.form_ok:
                        voice.say("Good, now return")
                    else:
                        voice.say(self.form_message or "Good, now return")
                elif at_start:
                    # Aborted rep before reaching target
                    self._state = "IDLE_START"
                    self._hit_target = False
    
            elif self._state == "PEAK_REACHED":
                if self._decreasing:
                    self._peak_angle = min(self._peak_angle, angle)
                    if angle >= target + 12.0:
                        self._state = "DESCENDING"
                else:
                    self._peak_angle = max(self._peak_angle, angle)
                    if angle <= target - 12.0:
                        self._state = "DESCENDING"
    
            elif self._state == "DESCENDING":
                # Must return all the way back to the resting start position
                if at_start:
                    if now - self._last_rep_time >= 0.9:
                        self._last_rep_time = now
                        self.rep_count += 1
                        self.angle_log.append(round(self._peak_angle, 1))
                        if self.rep_count % 5 == 0:
                            praise = [
                                "Excellent work!",
                                "Amazing progress!",
                                "You're doing great!",
                                "Keep it up, champion!",
                                "Fantastic effort!"
                            ]
                            msg = praise[(self.rep_count // 5 - 1) % len(praise)]
                            voice.say_now(f"Rep {self.rep_count}. {msg}")
                        else:
                            voice.say_now(f"Rep {self.rep_count}")
                    self._state = "IDLE_START"
                    self._hit_target = False
                    self._peak_angle = 0.0
                    self._start_pos_angle = 0.0
    
            return angle
    
    def is_valid_gesture(self, lms, w, h):
        return True
    
    def is_at_start(self, lms, w, h, angle):
        if self._decreasing:
            return angle >= float(self._start_angle) - 15.0
        return angle <= float(self._start_angle) + 15.0
    
    def is_at_target(self, lms, w, h, angle):
        if self._decreasing:
            return angle <= float(self._target_angle) + 8.0
        return angle >= float(self._target_angle) - 8.0
    
    def progress(self, angle):
        """0.0-1.0 progress toward the target."""
        span = abs(self._target_angle - self._start_angle)
        if span == 0:
            return 0.0
        return max(0.0, min(1.0, abs(angle - self._start_angle) / span))


# ──────────────────────────────────────────────────────────────────────────────
#  Exercise Sub-classes
# ──────────────────────────────────────────────────────────────────────────────

class ShoulderFlexionExercise(Exercise):
    """
    **Bilateral Shoulder Flexion** - Dual arm synchronous forward arm raise.
    BOTH HANDS must perform the exercise together. One arm only will NOT count!
    """
    exercise_name  = "SHOULDER FLEXION"
    _target_angle  = 110.0
    _start_angle   = 20.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        # Return the limiting (minimum) arm so HUD shows both arms must meet target
        return r_pts if r_ang <= l_ang else l_pts

    def is_valid_gesture(self, lms, w, h):
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        r_elb = _lm(lms, LM_RIGHT_ELBOW, w, h)
        l_elb = _lm(lms, LM_LEFT_ELBOW, w, h)
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        # BOTH arms must be extended (not bent typing or holding phone)
        r_elb_ang = calculate_angle(r_shld, r_elb, r_wri)
        l_elb_ang = calculate_angle(l_shld, l_elb, l_wri)
        return (r_elb_ang >= 110.0) and (l_elb_ang >= 110.0)

    def is_at_start(self, lms, w, h, angle):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        # BOTH arms must be resting down below shoulder height
        both_down = (r_ang <= 45.0) and (l_ang <= 45.0)
        both_wri_down = (r_wri[1] > r_shld[1] + 35) and (l_wri[1] > l_shld[1] + 35)
        return both_down and both_wri_down

    def is_at_target(self, lms, w, h, angle):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        target = float(self._target_angle)

        # STRICT BILATERAL: BOTH arms must achieve the prescribed target angle!
        both_angles_hit = (r_ang >= target - 8.0) and (l_ang >= target - 8.0)

        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        # BOTH wrists must have elevated upwards toward or above shoulder level
        both_elevated = (r_wri[1] <= r_shld[1] + 60) and (l_wri[1] <= l_shld[1] + 60)

        return both_angles_hit and both_elevated

    def check_form(self, lms, w, h):
        r_ear  = _lm(lms, LM_RIGHT_EAR, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_ear  = _lm(lms, LM_LEFT_EAR, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        if math.dist(r_ear, r_shld) < h * 0.07 or math.dist(l_ear, l_shld) < h * 0.07:
            return False, "Don't shrug shoulders"
        return True, ""


class ShoulderAbductionExercise(Exercise):
    """
    **Bilateral Shoulder Abduction** - Dual arm synchronous lateral raise.
    BOTH HANDS must raise out to the sides together. One arm only will NOT count!
    """
    exercise_name  = "SHOULDER ABDUCTION"
    _target_angle  = 110.0
    _start_angle   = 20.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        return r_pts if r_ang <= l_ang else l_pts

    def is_valid_gesture(self, lms, w, h):
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        r_elb = _lm(lms, LM_RIGHT_ELBOW, w, h)
        l_elb = _lm(lms, LM_LEFT_ELBOW, w, h)
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_elb_ang = calculate_angle(r_shld, r_elb, r_wri)
        l_elb_ang = calculate_angle(l_shld, l_elb, l_wri)
        return (r_elb_ang >= 110.0) and (l_elb_ang >= 110.0)

    def is_at_start(self, lms, w, h, angle):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        return (r_ang <= 45.0) and (l_ang <= 45.0)

    def is_at_target(self, lms, w, h, angle):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        target = float(self._target_angle)

        both_angles_hit = (r_ang >= target - 8.0) and (l_ang >= target - 8.0)

        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        # BOTH arms must extend laterally out away from torso
        r_lat = abs(r_wri[0] - r_shld[0])
        l_lat = abs(l_wri[0] - l_shld[0])
        both_lateral = (r_lat >= 70.0) and (l_lat >= 70.0)

        return both_angles_hit and both_lateral

    def check_form(self, lms, w, h):
        r_ear  = _lm(lms, LM_RIGHT_EAR, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_ear  = _lm(lms, LM_LEFT_EAR, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        if math.dist(r_ear, r_shld) < h * 0.07 or math.dist(l_ear, l_shld) < h * 0.07:
            return False, "Don't shrug shoulders"
        return True, ""


class CrossBodyReachExercise(Exercise):
    """
    **Cross-Body Reach** - Bring arm across chest toward opposite shoulder.
    """
    exercise_name  = "CROSS-BODY REACH"
    _target_angle  = 30.0
    _start_angle   = 90.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_LEFT_SHOULDER, w, h),
                 _lm(lms, LM_RIGHT_SHOULDER, w, h),
                 _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_RIGHT_SHOULDER, w, h),
                 _lm(lms, LM_LEFT_SHOULDER, w, h),
                 _lm(lms, LM_LEFT_WRIST, w, h))
        r_angle = calculate_angle(*r_pts)
        l_angle = calculate_angle(*l_pts)
        return r_pts if r_angle <= l_angle else l_pts

    def is_valid_gesture(self, lms, w, h):
        return True

    def is_at_start(self, lms, w, h, angle):
        return angle >= 70.0

    def is_at_target(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        # Wrist must cross chest
        r_cross = r_wri[0] < r_shld[0] - 20
        l_cross = l_wri[0] > l_shld[0] + 20
        return angle <= (float(self._target_angle) + 8.0) and (r_cross or l_cross)

    def check_form(self, lms, w, h):
        l_hip = _lm(lms, LM_LEFT_HIP, w, h)
        r_hip = _lm(lms, LM_RIGHT_HIP, w, h)
        if abs(l_hip[1] - r_hip[1]) > h * 0.08:
            return False, "Keep hips level"
        return True, ""


class ShoulderPressExercise(Exercise):
    """
    **Bilateral Shoulder Press** - Push BOTH arms overhead synchronously.
    """
    exercise_name  = "SHOULDER PRESS"
    _target_angle  = 170.0
    _start_angle   = 40.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_RIGHT_ELBOW, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_HIP, w, h))
        l_pts = (_lm(lms, LM_LEFT_ELBOW, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_HIP, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        return r_pts if r_ang <= l_ang else l_pts

    def is_valid_gesture(self, lms, w, h):
        return True

    def is_at_start(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        return angle <= 80.0 and r_wri[1] >= (r_shld[1] - 40) and l_wri[1] >= (l_shld[1] - 40)

    def is_at_target(self, lms, w, h, angle):
        r_pts = (_lm(lms, LM_RIGHT_ELBOW, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_HIP, w, h))
        l_pts = (_lm(lms, LM_LEFT_ELBOW, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_HIP, w, h))
        r_ang = calculate_angle(*r_pts)
        l_ang = calculate_angle(*l_pts)
        target = float(self._target_angle)

        both_angles_hit = (r_ang >= target - 10.0) and (l_ang >= target - 10.0)

        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        both_overhead = (r_wri[1] < r_shld[1] - 30) and (l_wri[1] < l_shld[1] - 30)

        return both_angles_hit and both_overhead

    def check_form(self, lms, w, h):
        nose = _lm(lms, LM_NOSE, w, h)
        shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        if nose[0] - shld[0] > w * 0.1:
            return False, "Straighten your back"
        return True, ""


class ShoulderAbductionExercise(Exercise):
    """
    **Shoulder Abduction** - Lateral arm raise out to the side.
    Arm must move laterally away from body in coronal plane.
    """
    exercise_name  = "SHOULDER ABDUCTION"
    _target_angle  = 110.0
    _start_angle   = 20.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        return r_pts if calculate_angle(*r_pts) >= calculate_angle(*l_pts) else l_pts

    def is_valid_gesture(self, lms, w, h):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        is_r = r_wri[1] <= l_wri[1]
        shld = _lm(lms, LM_RIGHT_SHOULDER if is_r else LM_LEFT_SHOULDER, w, h)
        elb = _lm(lms, LM_RIGHT_ELBOW if is_r else LM_LEFT_ELBOW, w, h)
        wri = r_wri if is_r else l_wri
        elbow_ang = calculate_angle(shld, elb, wri)
        # Arm must be straight
        return elbow_ang >= 115.0

    def is_at_start(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        active_wri_y = min(r_wri[1], l_wri[1])
        shld_y = min(r_shld[1], l_shld[1])
        return angle <= 42.0 and active_wri_y > (shld_y + 40)

    def is_at_target(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        # For abduction, arm must extend laterally out away from torso
        lat_dist = max(abs(r_wri[0] - r_shld[0]), abs(l_wri[0] - l_shld[0]))
        target = float(self._target_angle)
        return angle >= (target - 7.0) and lat_dist >= 80.0

    def check_form(self, lms, w, h):
        ear  = _lm(lms, LM_RIGHT_EAR, w, h)
        shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        if math.dist(ear, shld) < h * 0.07:
            return False, "Don't shrug"
        return True, ""


class CrossBodyReachExercise(Exercise):
    """
    **Cross-Body Reach** - Bring arm across chest toward opposite shoulder.
    """
    exercise_name  = "CROSS-BODY REACH"
    _target_angle  = 30.0
    _start_angle   = 90.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_LEFT_SHOULDER, w, h),
                 _lm(lms, LM_RIGHT_SHOULDER, w, h),
                 _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_RIGHT_SHOULDER, w, h),
                 _lm(lms, LM_LEFT_SHOULDER, w, h),
                 _lm(lms, LM_LEFT_WRIST, w, h))
        r_angle = calculate_angle(*r_pts)
        l_angle = calculate_angle(*l_pts)
        return r_pts if r_angle <= l_angle else l_pts

    def is_valid_gesture(self, lms, w, h):
        return True

    def is_at_start(self, lms, w, h, angle):
        return angle >= 70.0

    def is_at_target(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        l_wri = _lm(lms, LM_LEFT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        # Wrist must cross towards the opposite shoulder
        r_cross = r_wri[0] < r_shld[0] - 20
        l_cross = l_wri[0] > l_shld[0] + 20
        return angle <= (float(self._target_angle) + 8.0) and (r_cross or l_cross)

    def check_form(self, lms, w, h):
        l_hip = _lm(lms, LM_LEFT_HIP, w, h)
        r_hip = _lm(lms, LM_RIGHT_HIP, w, h)
        if abs(l_hip[1] - r_hip[1]) > h * 0.08:
            return False, "Keep hips level"
        return True, ""


class ShoulderPressExercise(Exercise):
    """
    **Shoulder Press** - Push arms overhead from shoulders.
    """
    exercise_name  = "SHOULDER PRESS"
    _target_angle  = 170.0
    _start_angle   = 40.0

    def _get_landmarks(self, lms, w, h):
        return (_lm(lms, LM_RIGHT_ELBOW, w, h),
                _lm(lms, LM_RIGHT_SHOULDER, w, h),
                _lm(lms, LM_RIGHT_HIP, w, h))

    def is_valid_gesture(self, lms, w, h):
        return True

    def is_at_start(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        return angle <= 80.0 and r_wri[1] >= (r_shld[1] - 40)

    def is_at_target(self, lms, w, h, angle):
        r_wri = _lm(lms, LM_RIGHT_WRIST, w, h)
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        # Hand must extend overhead above shoulder
        return angle >= (float(self._target_angle) - 10.0) and r_wri[1] < (r_shld[1] - 30)

    def check_form(self, lms, w, h):
        nose = _lm(lms, LM_NOSE, w, h)
        shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        if nose[0] - shld[0] > w * 0.1:
            return False, "Straighten your back"
        return True, ""


class ShoulderAbductionExercise(Exercise):
    """
    **Shoulder Abduction** - Lateral arm raise out to the side.

    Post shoulder / rotator-cuff surgery (improves coronal plane range of motion).
    Angle: Hip -> Shoulder -> Wrist (right side).  Target = 150 deg.
    Form error: shrugging (ear-shoulder distance too small).
    """
    exercise_name  = "SHOULDER ABDUCTION"
    _target_angle  = 150.0
    _start_angle   = 20.0

    def _get_landmarks(self, lms, w, h):
        r_pts = (_lm(lms, LM_RIGHT_HIP, w, h), _lm(lms, LM_RIGHT_SHOULDER, w, h), _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_LEFT_HIP, w, h), _lm(lms, LM_LEFT_SHOULDER, w, h), _lm(lms, LM_LEFT_WRIST, w, h))
        return r_pts if calculate_angle(*r_pts) >= calculate_angle(*l_pts) else l_pts

    def check_form(self, lms, w, h):
        ear  = _lm(lms, LM_RIGHT_EAR, w, h)
        shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        if math.dist(ear, shld) < h * 0.07:
            return False, "Don't shrug"
        return True, ""


class CrossBodyReachExercise(Exercise):
    """
    **Cross-Body Reach** - Bring either arm across chest toward opposite shoulder.

    Post shoulder surgery rehab (improves horizontal adduction).
    Tracks BOTH arms — whichever is reaching further across is used.
    Angle: OppositeShoulder -> Shoulder -> Wrist.
    Starts at ~90 deg (arm at side), target = 30 deg (arm across body).
    Form error: torso twists (hips become uneven).
    """
    exercise_name  = "CROSS-BODY REACH"
    _target_angle  = 30.0
    _start_angle   = 90.0

    def _get_landmarks(self, lms, w, h):
        # Calculate angle for both arms, pick the one closer to target
        r_pts = (_lm(lms, LM_LEFT_SHOULDER, w, h),
                 _lm(lms, LM_RIGHT_SHOULDER, w, h),
                 _lm(lms, LM_RIGHT_WRIST, w, h))
        l_pts = (_lm(lms, LM_RIGHT_SHOULDER, w, h),
                 _lm(lms, LM_LEFT_SHOULDER, w, h),
                 _lm(lms, LM_LEFT_WRIST, w, h))
        r_angle = calculate_angle(*r_pts)
        l_angle = calculate_angle(*l_pts)
        # Use whichever arm is closer to the target (lower angle = more across)
        if r_angle <= l_angle:
            return r_pts
        return l_pts

    def check_form(self, lms, w, h):
        l_hip = _lm(lms, LM_LEFT_HIP, w, h)
        r_hip = _lm(lms, LM_RIGHT_HIP, w, h)
        if abs(l_hip[1] - r_hip[1]) > h * 0.08:
            return False, "Keep hips level"
        return True, ""


class ShoulderPressExercise(Exercise):
    """
    **Shoulder Press** - Push arms overhead.

    Post shoulder / rotator-cuff surgery.
    Angle: Elbow -> Shoulder -> Hip (right).  Target = 170 deg.
    Form error: arching back (nose drifts far forward of shoulder).
    """
    exercise_name  = "SHOULDER PRESS"
    _target_angle  = 170.0
    _start_angle   = 40.0

    def _get_landmarks(self, lms, w, h):
        return (_lm(lms, LM_RIGHT_ELBOW, w, h),
                _lm(lms, LM_RIGHT_SHOULDER, w, h),
                _lm(lms, LM_RIGHT_HIP, w, h))

    def check_form(self, lms, w, h):
        nose = _lm(lms, LM_NOSE, w, h)
        shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        if nose[0] - shld[0] > w * 0.10:
            return False, "Straighten your back"
        return True, ""


# ──────────────────────────────────────────────────────────────────────────────
#  Progress Bar Renderer
# ──────────────────────────────────────────────────────────────────────────────
class ProgressBar:
    """
    Vertical progress bar on the right edge of the frame.
    Fills bottom -> top.  Green >= 80%, yellow 40-80%, red < 40%.
    """
    BAR_W, MARGIN, TOP, BOT = 30, 20, 80, 40

    @classmethod
    def draw(cls, frame, progress):
        h, w = frame.shape[:2]
        x1 = w - cls.MARGIN - cls.BAR_W
        x2 = w - cls.MARGIN
        y1, y2 = cls.TOP, h - cls.BOT
        bar_h = y2 - y1

        cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), (50, 50, 50), -1)
        cv2.rectangle(frame, (x1 - 2, y1 - 2), (x2 + 2, y2 + 2), (200, 200, 200), 1)

        fill_h = int(bar_h * progress)
        fill_y = y2 - fill_h
        if progress >= 0.80:
            color = (0, 220, 100)
        elif progress >= 0.40:
            color = (0, 200, 255)
        else:
            color = (0, 80, 220)
        cv2.rectangle(frame, (x1, fill_y), (x2, y2), color, -1)

        cv2.putText(frame, f"{int(progress * 100)}%", (x1 - 5, y2 + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)


# ──────────────────────────────────────────────────────────────────────────────
#  Report Generator
# ──────────────────────────────────────────────────────────────────────────────
class ReportGenerator:
    """Generate a Matplotlib chart: Angle Depth vs. Rep Number."""

    @staticmethod
    def generate(exercises, save_path="rehab_report.png"):
        fig, ax = plt.subplots(figsize=(10, 5))
        has_data = False
        for _key, ex in exercises.items():
            if ex.angle_log:
                ax.plot(range(1, len(ex.angle_log) + 1), ex.angle_log,
                        marker="o",
                        label=f"{ex.exercise_name} ({ex.rep_count} reps)")
                has_data = True

        if not has_data:
            ax.text(0.5, 0.5, "No reps recorded this session",
                    ha="center", va="center", fontsize=14,
                    transform=ax.transAxes)

        ax.set_xlabel("Rep Number", fontsize=12)
        ax.set_ylabel("Peak Angle (deg)", fontsize=12)
        ax.set_title("Post-Surgery Rehab - Angle Depth vs. Rep Number",
                      fontsize=14, fontweight="bold")
        if has_data:
            ax.legend()
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        fig.savefig(save_path, dpi=150)
        plt.close(fig)
        abs_path = os.path.abspath(save_path)
        print(f"[INFO] Report saved -> {abs_path}")
        # Open with default image viewer (works on Windows)
        os.startfile(abs_path)


# ──────────────────────────────────────────────────────────────────────────────
#  Main Application - RehabAssistant
# ──────────────────────────────────────────────────────────────────────────────
class RehabAssistant:
    """
    Top-level controller.
    Camera -> PoseLandmarker (LIVE_STREAM) -> exercise logic ->
    UI overlay -> mouse/keyboard navigation.
    """

    EXERCISE_MAP = {
        ord("f"): ShoulderFlexionExercise,
        ord("a"): ShoulderAbductionExercise,
        ord("c"): CrossBodyReachExercise,
        ord("p"): ShoulderPressExercise,
    }

    MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "pose_landmarker_lite.task")

    def __init__(self):
        self.voice = VoiceFeedback()
        self.exercises = {}
        self.current_key = None
        self._latest_result = None
        self._result_lock = threading.Lock()
        self._back_button_rect = None
        self._menu_button_rects = {}

    def _on_mouse(self, event, x, y, flags, param):
        """Handle mouse clicks on screen buttons (Back button and menu cards)."""
        if event == cv2.EVENT_LBUTTONDOWN:
            self._handle_click(x, y)

    def _handle_click(self, x, y):
        """Dispatch mouse click actions."""
        if self.current_key is not None:
            # In exercise mode: click on Back button returns to menu
            if self._back_button_rect:
                bx1, by1, bx2, by2 = self._back_button_rect
                if bx1 <= x <= bx2 and by1 <= y <= by2:
                    self._return_to_menu()
        else:
            # In main menu mode: click on any exercise card launches it
            for key, (bx1, by1, bx2, by2) in self._menu_button_rects.items():
                if bx1 <= x <= bx2 and by1 <= y <= by2:
                    self._switch_exercise(key)
                    break

    def _return_to_menu(self):
        """Return to main menu."""
        if self.current_key is not None:
            self.current_key = None
            self.voice.say("Main menu")

    # ── PoseLandmarker Callback ──

    def _on_result(self, result, output_image, timestamp_ms):
        with self._result_lock:
            self._latest_result = result

    # ── Helpers ──

    @property
    def current_exercise(self):
        if self.current_key is None:
            return None
        return self.exercises.get(chr(self.current_key))

    def _switch_exercise(self, key):
        ch = chr(key)
        if ch not in self.exercises:
            self.exercises[ch] = self.EXERCISE_MAP[key]()
        self.current_key = key
        self.voice.say(f"{self.exercises[ch].exercise_name} mode")

    # ── Drawing ──

    @staticmethod
    def _draw_skeleton(frame, lms, w, h, color_ok):
        """Draw upper-body skeleton. Green = correct, Red = error."""
        c_dot  = (0, 220, 100) if color_ok else (0, 0, 255)
        c_line = (0, 180, 80)  if color_ok else (0, 0, 200)

        pts = {}
        for idx in (LM_NOSE, LM_RIGHT_EAR,
                    LM_RIGHT_SHOULDER, LM_RIGHT_ELBOW, LM_RIGHT_WRIST,
                    LM_RIGHT_HIP,
                    LM_LEFT_SHOULDER, LM_LEFT_ELBOW, LM_LEFT_WRIST,
                    LM_LEFT_HIP):
            pt = lms[idx]
            px = (int(pt.x * w), int(pt.y * h))
            pts[idx] = px
            cv2.circle(frame, px, 5, c_dot, -1)

        for a, b in POSE_CONNECTIONS:
            if a in pts and b in pts:
                cv2.line(frame, pts[a], pts[b], c_line, 2)

    @staticmethod
    def _draw_degree_badge(frame, center_pt, angle, label="", color=(0, 255, 255)):
        """Draw a clean semi-transparent badge displaying the joint angle next to the landmark."""
        x, y = center_pt
        text = f"{label}: {int(round(angle))}°" if label else f"{int(round(angle))}°"
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = 0.55
        thickness = 2
        (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
        pad_x, pad_y = 6, 4
        h, w = frame.shape[:2]

        bx = x + 15 if x + 15 + tw + pad_x * 2 < w else x - tw - pad_x * 2 - 15
        by = y - 10 if y - 10 - th - pad_y * 2 > 0 else y + 25
        bx = max(5, min(w - tw - pad_x * 2 - 5, bx))
        by = max(5 + th + pad_y * 2, min(h - 5, by))

        x1, y1 = bx, by - th - pad_y * 2
        x2, y2 = bx + tw + pad_x * 2, by

        overlay = frame.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), (20, 20, 20), -1)
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        cv2.putText(frame, text, (bx + pad_x, by - pad_y - 2),
                    font, scale, (255, 255, 255), thickness, cv2.LINE_AA)

    @staticmethod
    def _draw_joint_datapoints_and_angle(frame, p_base, p_vertex, p_arm, angle, label, is_active=False):
        """
        Highlight the shoulder joint datapoints (Base/Hip, Vertex/Shoulder, Arm),
        draw measurement ray lines, arc sweep, and degree badge.
        """
        accent_color = (0, 255, 200) if is_active else (0, 230, 255)
        ray_color = (0, 215, 255) if is_active else (255, 200, 0)

        # 1. Measurement ray lines (Hip -> Shoulder, Shoulder -> Arm)
        cv2.line(frame, p_vertex, p_base, ray_color, 3, cv2.LINE_AA)
        cv2.line(frame, p_vertex, p_arm, ray_color, 3, cv2.LINE_AA)

        # 2. Datapoints
        # Base point (Hip)
        cv2.circle(frame, p_base, 6, (255, 180, 0), -1, cv2.LINE_AA)
        cv2.circle(frame, p_base, 8, (255, 255, 255), 1, cv2.LINE_AA)
        # Arm point (Elbow / Wrist)
        cv2.circle(frame, p_arm, 6, (255, 180, 0), -1, cv2.LINE_AA)
        cv2.circle(frame, p_arm, 8, (255, 255, 255), 1, cv2.LINE_AA)

        # Vertex point (Shoulder joint) - highlighted prominent marker
        halo_radius = 12 if is_active else 10
        cv2.circle(frame, p_vertex, halo_radius, accent_color, 2, cv2.LINE_AA)
        cv2.circle(frame, p_vertex, 6, accent_color, -1, cv2.LINE_AA)
        cv2.circle(frame, p_vertex, 2, (255, 255, 255), -1, cv2.LINE_AA)

        # 3. Angle Arc at shoulder joint
        d1 = math.dist(p_vertex, p_base)
        d2 = math.dist(p_vertex, p_arm)
        if d1 > 10 and d2 > 10:
            v1 = (p_base[0] - p_vertex[0], p_base[1] - p_vertex[1])
            v2 = (p_arm[0] - p_vertex[0], p_arm[1] - p_vertex[1])
            ang1 = math.degrees(math.atan2(v1[1], v1[0]))
            ang2 = math.degrees(math.atan2(v2[1], v2[0]))
            diff = (ang2 - ang1) % 360
            if diff <= 180:
                start_ang, end_ang = ang1, ang1 + diff
            else:
                start_ang, end_ang = ang2, ang2 + (360 - diff)
            arc_radius = max(18, min(35, int(min(d1, d2) * 0.35)))
            cv2.ellipse(frame, p_vertex, (arc_radius, arc_radius), 0,
                        start_ang, end_ang, accent_color, 2, cv2.LINE_AA)

        # 4. Degree Badge
        RehabAssistant._draw_degree_badge(frame, p_vertex, angle, label=label, color=accent_color)

    @classmethod
    def _draw_shoulder_measurements(cls, frame, lms, w, h, exercise=None):
        """
        Measure both Left and Right shoulder angles and render datapoints + degrees.
        """
        # Right shoulder datapoints
        r_shld = _lm(lms, LM_RIGHT_SHOULDER, w, h)
        r_hip  = _lm(lms, LM_RIGHT_HIP, w, h)
        r_elb  = _lm(lms, LM_RIGHT_ELBOW, w, h)
        r_wri  = _lm(lms, LM_RIGHT_WRIST, w, h)

        # Left shoulder datapoints
        l_shld = _lm(lms, LM_LEFT_SHOULDER, w, h)
        l_hip  = _lm(lms, LM_LEFT_HIP, w, h)
        l_elb  = _lm(lms, LM_LEFT_ELBOW, w, h)
        l_wri  = _lm(lms, LM_LEFT_WRIST, w, h)

        # Use wrist if exercise specifically tracks wrist (like Shoulder Flexion/Abduction), else elbow
        use_wrist = isinstance(exercise, (ShoulderFlexionExercise, ShoulderAbductionExercise))
        r_arm = r_wri if use_wrist else r_elb
        l_arm = l_wri if use_wrist else l_elb

        r_angle = calculate_angle(r_hip, r_shld, r_arm)
        l_angle = calculate_angle(l_hip, l_shld, l_arm)

        r_active = exercise is not None and isinstance(exercise, (ShoulderFlexionExercise, ShoulderAbductionExercise, ShoulderPressExercise))
        l_active = False

        # Draw Left Shoulder datapoints, angle arc, and degree badge
        cls._draw_joint_datapoints_and_angle(frame, l_hip, l_shld, l_arm, l_angle, "L", is_active=l_active)
        # Draw Right Shoulder datapoints, angle arc, and degree badge
        cls._draw_joint_datapoints_and_angle(frame, r_hip, r_shld, r_arm, r_angle, "R", is_active=r_active)

        return l_angle, r_angle

    def _draw_hud(self, frame, angle, exercise, l_angle=None, r_angle=None):
        """Draw the heads-up display with exercise info, shoulder angles, and interactive Back button."""
        h, w = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 70), (30, 30, 30), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

        cv2.putText(frame, exercise.exercise_name,
                    (15, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.85, (0, 255, 200), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Reps: {exercise.rep_count}",
                    (15, 58), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Angle: {int(angle)} deg",
                    (w // 2 - 80, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.6, (200, 200, 200), 1, cv2.LINE_AA)

        if l_angle is not None and r_angle is not None:
            cv2.putText(frame, f"Shoulders: L:{int(l_angle)} deg | R:{int(r_angle)} deg",
                        (w // 2 - 120, 58), cv2.FONT_HERSHEY_SIMPLEX,
                        0.5, (0, 255, 255), 1, cv2.LINE_AA)

        # Status: shows if target has been hit during current rep
        if exercise._hit_target:
            status_text = "TARGET HIT - return!"
            status_clr = (0, 255, 255)
        else:
            status_text = "TRACKING"
            status_clr = (180, 180, 180)
        cv2.putText(frame, status_text,
                    (w // 2 + 70, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55, status_clr, 1, cv2.LINE_AA)

        # Draw interactive BACK Button at top-right
        btn_w, btn_h = 135, 46
        bx1 = w - btn_w - 20
        by1 = 12
        bx2 = bx1 + btn_w
        by2 = by1 + btn_h
        self._back_button_rect = (bx1, by1, bx2, by2)

        # Back button visual (dark fill + vibrant cyan border)
        btn_overlay = frame.copy()
        cv2.rectangle(btn_overlay, (bx1, by1), (bx2, by2), (40, 42, 52), -1)
        cv2.rectangle(btn_overlay, (bx1, by1), (bx2, by2), (0, 230, 255), 2)
        cv2.addWeighted(btn_overlay, 0.85, frame, 0.15, 0, frame)

        # Back button text
        cv2.putText(frame, "< BACK", (bx1 + 18, by1 + 27),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(frame, "[Esc / Click]", (bx1 + 24, by1 + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (180, 220, 220), 1, cv2.LINE_AA)

        # Form warning
        if not exercise.form_ok:
            cv2.putText(frame, f"!! {exercise.form_message} !!",
                        (15, h - 30), cv2.FONT_HERSHEY_SIMPLEX,
                        0.75, (0, 0, 255), 2, cv2.LINE_AA)

    def _draw_idle(self, frame, l_angle=None, r_angle=None):
        """Show interactive main menu for shoulder rehab exercises."""
        h, w = frame.shape[:2]
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 75), (30, 30, 30), -1)
        cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

        cv2.putText(frame, "SHOULDER REHABILITATION ASSISTANT",
                    (15, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    0.75, (0, 255, 200), 2, cv2.LINE_AA)

        if l_angle is not None and r_angle is not None:
            cv2.putText(frame, f"Shoulders Live: L:{int(l_angle)} deg | R:{int(r_angle)} deg",
                        (w - 440, 30), cv2.FONT_HERSHEY_SIMPLEX,
                        0.55, (0, 255, 255), 1, cv2.LINE_AA)

        cv2.putText(frame, "Select a Shoulder Exercise: Click card below or press key  |  Q = Quit",
                    (15, 60), cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (200, 200, 200), 1, cv2.LINE_AA)

        menu_items = [
            (ord("f"), "F", "Shoulder Flexion", "Forward Arm Raise (Target: 150 deg)"),
            (ord("a"), "A", "Shoulder Abduction", "Lateral Arm Raise to Side (Target: 150 deg)"),
            (ord("c"), "C", "Cross-Body Reach", "Horizontal Adduction Stretch (Target: 30 deg)"),
            (ord("p"), "P", "Shoulder Press", "Overhead Shoulder Press (Target: 170 deg)"),
        ]

        self._menu_button_rects = {}
        card_w, card_h = 540, 50
        start_x = 30
        start_y = 105

        for i, (key, key_char, name, desc) in enumerate(menu_items):
            bx1 = start_x
            by1 = start_y + i * 62
            bx2 = bx1 + card_w
            by2 = by1 + card_h
            self._menu_button_rects[key] = (bx1, by1, bx2, by2)

            # Draw semi-transparent button card
            card_overlay = frame.copy()
            cv2.rectangle(card_overlay, (bx1, by1), (bx2, by2), (25, 28, 35), -1)
            cv2.rectangle(card_overlay, (bx1, by1), (bx2, by2), (70, 100, 120), 1)
            cv2.addWeighted(card_overlay, 0.8, frame, 0.2, 0, frame)

            # Key badge
            badge_x = bx1 + 10
            badge_y = by1 + 10
            badge_w, badge_h = 36, 30
            cv2.rectangle(frame, (badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h), (0, 200, 160), -1)
            cv2.putText(frame, key_char, (badge_x + 11, badge_y + 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2, cv2.LINE_AA)

            # Exercise name & description
            cv2.putText(frame, name, (bx1 + 58, by1 + 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, desc, (bx1 + 58, by1 + 42),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 200, 200), 1, cv2.LINE_AA)

            # Right chevron
            cv2.putText(frame, ">", (bx2 - 25, by1 + 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 200), 2, cv2.LINE_AA)

    # ── Main Loop ──

    def run(self):
        """Open webcam and enter the real-time processing loop."""
        if not os.path.isfile(self.MODEL_PATH):
            print(f"[ERROR] Model file not found: {self.MODEL_PATH}")
            print("Download it with:")
            print('  python -c "import urllib.request; '
                  "urllib.request.urlretrieve("
                  "'https://storage.googleapis.com/mediapipe-models/"
                  "pose_landmarker/pose_landmarker_lite/float16/latest/"
                  "pose_landmarker_lite.task', "
                  "'pose_landmarker_lite.task')\"")
            return

        options = PoseLandmarkerOpt(
            base_options=BaseOptions(model_asset_path=self.MODEL_PATH),
            running_mode=RunningMode.LIVE_STREAM,
            num_poses=1,
            min_pose_detection_confidence=0.6,
            min_tracking_confidence=0.6,
            result_callback=self._on_result,
        )

        landmarker = PoseLandmarker.create_from_options(options)

        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[ERROR] Cannot open webcam.")
            landmarker.close()
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        win_name = "Rehab Assistant"
        cv2.namedWindow(win_name)
        cv2.setMouseCallback(win_name, self._on_mouse)

        print("=" * 55)
        print("  Shoulder Rehab Assistant  -  Running")
        print("  Click exercises or press: F / A / C / P to start")
        print("  Click [< BACK] or press Esc / M to return to menu | Q to quit")
        print("=" * 55)

        timestamp = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Send frame to PoseLandmarker (async)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp += 33   # ~30 fps increment
            landmarker.detect_async(mp_image, timestamp)

            # Read latest result
            with self._result_lock:
                result = self._latest_result

            exercise = self.current_exercise
            angle = 0.0

            if result and result.pose_landmarks:
                lms = result.pose_landmarks[0]   # first person
                if exercise is not None:
                    angle = exercise.process_frame(lms, w, h, self.voice)
                    self._draw_skeleton(frame, lms, w, h, exercise.form_ok)
                    l_ang, r_ang = self._draw_shoulder_measurements(frame, lms, w, h, exercise)
                    self._draw_hud(frame, angle, exercise, l_ang, r_ang)
                    ProgressBar.draw(frame, exercise.progress(angle))
                else:
                    self._draw_skeleton(frame, lms, w, h, True)
                    l_ang, r_ang = self._draw_shoulder_measurements(frame, lms, w, h, None)
                    self._draw_idle(frame, l_ang, r_ang)
            else:
                self._draw_idle(frame)

            cv2.imshow(win_name, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key in (27, ord("m"), ord("M"), 8):  # Esc, M, or Backspace returns to menu
                self._return_to_menu()
            elif key in self.EXERCISE_MAP:
                self._switch_exercise(key)

        # ── Cleanup ──
        cap.release()
        cv2.destroyAllWindows()
        landmarker.close()

        if self.exercises:
            ReportGenerator.generate(self.exercises)

        self.voice.shutdown()
        print("[INFO] Session ended.")


# ──────────────────────────────────────────────────────────────────────────────
#  Entry Point
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = RehabAssistant()
    app.run()
