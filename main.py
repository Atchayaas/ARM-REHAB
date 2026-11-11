"""
Web wrapper around post_surgery_rehab.py using FastAPI and WebSocket.

Flow for every frame:
  browser camera -> JPEG over WebSocket -> this file -> MediaPipe (pose_landmarker_lite.task)
  -> Exercise.process_frame() (same angle + rep logic) -> JSON back to browser

Run:  uvicorn main:app --host 0.0.0.0 --port 8000
"""
import time

import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Original rehab code
import post_surgery_rehab as rehab

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Same keys as keyboard shortcuts (F / A / C / P)
EXERCISES = {
    "f": rehab.ShoulderFlexionExercise,
    "a": rehab.ShoulderAbductionExercise,
    "c": rehab.CrossBodyReachExercise,
    "p": rehab.ShoulderPressExercise,
}


class CollectVoice:
    """Replaces Windows SAPI. Exercise code calls say()/say_now();
    we collect the text and send it to the browser, which speaks it."""

    def __init__(self):
        self.messages = []

    def say(self, text):
        self.messages.append(text)

    def say_now(self, text):
        self.messages = [text]


def make_landmarker():
    options = rehab.PoseLandmarkerOpt(
        base_options=rehab.BaseOptions(model_asset_path=rehab.RehabAssistant.MODEL_PATH),
        running_mode=rehab.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.6,
        min_tracking_confidence=0.6,
    )
    return rehab.PoseLandmarker.create_from_options(options)


def shoulder_angles(lms, w, h, exercise):
    L = lambda i: rehab._lm(lms, i, w, h)
    use_wrist = exercise is None or isinstance(exercise, (rehab.ShoulderFlexionExercise, rehab.ShoulderAbductionExercise))
    r_arm = L(rehab.LM_RIGHT_WRIST) if use_wrist else L(rehab.LM_RIGHT_ELBOW)
    l_arm = L(rehab.LM_LEFT_WRIST) if use_wrist else L(rehab.LM_LEFT_ELBOW)
    r_angle = rehab.calculate_angle(L(rehab.LM_RIGHT_HIP), L(rehab.LM_RIGHT_SHOULDER), r_arm)
    l_angle = rehab.calculate_angle(L(rehab.LM_LEFT_HIP), L(rehab.LM_LEFT_SHOULDER), l_arm)
    r_active = isinstance(exercise, (rehab.ShoulderFlexionExercise,
                                     rehab.ShoulderAbductionExercise,
                                     rehab.ShoulderPressExercise))
    return l_angle, r_angle, use_wrist, r_active


@app.get("/health")
def health():
    return {"ok": True, "service": "FlexRehab AI Python CV2/MediaPipe WebSocket Service"}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    landmarker = make_landmarker()   # one per connected user
    exercises = {}                   # one set of rep counters per connected user
    current = None                   # which exercise key is active
    last_ts = 0

    try:
        while True:
            msg = await ws.receive()
            if msg.get("type") == "websocket.disconnect":
                break

            # ---- Text message = a button click (choose exercise / menu / report)
            if msg.get("text") is not None:
                import json
                data = json.loads(msg["text"])
                if data["action"] == "select" and data["key"] in EXERCISES:
                    current = data["key"]
                    exercises.setdefault(current, EXERCISES[current]())
                    if "target" in data and data["target"]:
                        try:
                            exercises[current]._target_angle = float(data["target"])
                        except Exception:
                            pass
                    await ws.send_json({"type": "speak", "text": f"{exercises[current].exercise_name} mode"})
                elif data["action"] == "target":
                    if current and current in exercises and "target" in data:
                        try:
                            exercises[current]._target_angle = float(data["target"])
                        except Exception:
                            pass
                elif data["action"] == "menu":
                    if current is not None:
                        await ws.send_json({"type": "speak", "text": "Main menu"})
                    current = None
                elif data["action"] == "report":
                    await ws.send_json({"type": "report", "items": [
                        {"name": ex.exercise_name, "reps": ex.rep_count,
                         "peaks": [round(a) for a in ex.angle_log]}
                        for ex in exercises.values()]})
                continue

            # ---- Binary message = one camera frame (JPEG)
            frame = cv2.imdecode(np.frombuffer(msg["bytes"], np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w = rgb.shape[:2]

            last_ts = max(last_ts + 1, int(time.time() * 1000))
            result = landmarker.detect_for_video(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), last_ts)

            out = {"type": "frame", "found": False, "landmarks": [], "key": current,
                   "exercise": None, "angle": 0, "reps": 0, "progress": 0,
                   "form_ok": True, "form_message": "", "hit_target": False,
                   "l_angle": 0, "r_angle": 0, "use_wrist": False, "r_active": False,
                   "speak": []}

            if result.pose_landmarks:
                lms = result.pose_landmarks[0]
                out["found"] = True
                out["landmarks"] = [[p.x, p.y] for p in lms]   # normalised 0..1
                ex = exercises[current] if current else None

                l_ang, r_ang, use_wrist, r_active = shoulder_angles(lms, w, h, ex)
                out.update(l_angle=l_ang, r_angle=r_ang, use_wrist=use_wrist, r_active=r_active)

                if ex:
                    try:
                        voice = CollectVoice()
                        angle = ex.process_frame(lms, w, h, voice)
                        out.update(exercise=ex.exercise_name, angle=round(angle, 1),
                                   reps=ex.rep_count, progress=ex.progress(angle),
                                   form_ok=ex.form_ok, form_message=ex.form_message,
                                   hit_target=ex._hit_target, speak=voice.messages)
                    except Exception as err:
                        print(f"[Exercise Frame Processing Error]: {err}")
                        fallback_ang = round(min(l_ang, r_ang) if (l_ang > 0 and r_ang > 0) else max(l_ang, r_ang), 1)
                        out.update(exercise=ex.exercise_name, angle=fallback_ang,
                                   reps=getattr(ex, 'rep_count', 0), progress=getattr(ex, 'progress', lambda a: 0)(fallback_ang),
                                   form_ok=True, form_message="Tracking active", speak=[])

            await ws.send_json(out)
    except WebSocketDisconnect:
        pass
    finally:
        landmarker.close()
