# Physical-Rehabilitation-Assistant
# 🏥 AI-Based Physical Rehabilitation Assistant

## 📌 Overview

This project is a real-time rehabilitation assistant that uses computer vision and pose estimation to monitor exercises using a webcam.

It helps patients perform post-surgery exercises correctly at home by providing real-time feedback.

---

## 🚀 Features

* 🎯 Real-time pose detection using MediaPipe
* 🔁 Automatic repetition counting
* ⚠️ Incorrect form detection
* 🔊 Voice feedback for guidance
* 📊 Progress report generation

---

## 🛠️ Tech Stack

* Python 3.14
* OpenCV
* MediaPipe
* NumPy
* Matplotlib
* Windows SAPI

---

## 🧠 How It Works

1. Webcam captures user movement
2. MediaPipe detects 33 body landmarks
3. Joint angles are calculated
4. Exercise logic tracks repetitions and posture
5. Feedback is given visually and via voice

---

## 🏋️ Shoulder Exercises Supported

* **Shoulder Flexion** (`F`) – Forward arm raise
* **Shoulder Abduction** (`A`) – Lateral arm raise
* **Cross-Body Reach** (`C`) – Horizontal adduction stretch
* **Shoulder Press** (`P`) – Overhead press

> Click the **[< BACK]** button or press `Esc` / `M` at any time to return to the main menu.

---

## ⚙️ Installation

```bash
git clone https://github.com/arpitago207/Physical-Rehabilitation-Assistant.git
cd Physical-Rehabilitation-Assistant
pip install -r requirements.txt
python post_surgery_rehab.py
```

---

## 📊 Output

* Real-time exercise tracking
* Voice coaching
* Progress chart (`rehab_report.png`)

---

## 📌 Future Improvements

* Mobile app version
* Cloud dashboard
* Multi-user profiles

---

## 👩‍💻 Author

Arpita

