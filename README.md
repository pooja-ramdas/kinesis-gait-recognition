# Kinesis: Gait Tracking + Person ReID + Public Safety Alert Platform

A complete, production-quality, local-first AI surveillance and public safety alert platform with real-time gait tracking, Person Re-Identification (ReID), OpenStreetMap integration, and multi-client dispatch across Web and Mobile applications.

---

## 🎯 Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              AI Video Stream                │
                        │        (Webcam / RTSP / Video file)          │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │       Kinesis AI Processing Engine           │
                        │                                              │
                        │  1. Preprocess Frame                         │
                        │  2. Custom YOLO (CASIA-B) Gait Detection     │
                        │  3. ByteTrack / ReID Feature Extraction      │
                        │  4. Anomaly & Watchlist Evaluation           │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │          Kinesis FastAPI Hub (:8000)         │
                        │                                              │
                        │  - WebSocket Real-Time Alert Broadcast       │
                        │  - Incident Event Database (SQLite/Memory)   │
                        │  - Tactical Dispatch & "Call for Backup" API │
                        └──────────────┬───────────────────────────────┘
                                       │
                 ┌─────────────────────┴──────────────────────┐
                 │                                            │
                 ▼                                            ▼
  ┌───────────────────────────────┐           ┌───────────────────────────────┐
  │       Web Dashboard (:3000)   │           │    Mobile Field App (Expo)    │
  │                               │           │                               │
  │ - React + TypeScript + Vite   │           │ - React Native + Expo         │
  │ - OpenStreetMap (Leaflet)     │           │ - Real-time Incident Feed     │
  │ - Live Alert Feed & Severity  │           │ - "Call for Backup" Button    │
  │ - UI: #92b0fc & #CCCCFF       │           │ - Simulated Voice Dispatch    │
  └───────────────────────────────┘           └───────────────────────────────┘
```

---

## 🔴 Custom Model Integration (Jupyter Notebook → Python Module)

If you trained your YOLO model inside a Jupyter Notebook (`.ipynb`) using datasets like CASIA-B:

1. **Model Weights**: Place your exported weights file (`.pt`) into `backend/models/yolo_casia.pt`.
2. **Module Integration**: `backend/ai_engine/model.py` is pre-architected with:
   - `load_model()`: Loads your custom weights.
   - `preprocess()`: Custom gait bounding box crop, aspect-ratio normalization, and color conversion.
   - `predict()`: Runs inference and produces bounding boxes, confidence, class IDs, and ReID embeddings.
3. **Pipeline**: `backend/ai_engine/pipeline.py` wires the model directly into real-time tracking and alert generation.

👉 **See [MODEL_INTEGRATION_GUIDE.md](./MODEL_INTEGRATION_GUIDE.md) for full step-by-step instructions and independent testing.**

---

## 🚀 Quickstart & Run Instructions

### 1. Backend (FastAPI + AI Engine)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python main.py
# Or with uvicorn:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will be live at `http://localhost:8000`. Test the endpoint at `http://localhost:8000/docs`.

---

### 2. Web Application (React + Vite + Leaflet)

```bash
cd web-app

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:3000` in your browser. The dashboard connects automatically to `ws://localhost:8000/ws`.

---

### 3. Mobile Field App (React Native + Expo)

```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```
Scan the QR code with **Expo Go** on Android or iOS.

---

## 📱 Local Network Configuration for Mobile

To test on physical devices over local Wi-Fi:

1. Find your laptop's local IPv4 address:
   - **Windows**: Run `ipconfig` in PowerShell (e.g. `192.168.1.105`)
   - **macOS / Linux**: Run `ifconfig` or `ip a`
2. In the Mobile App:
   - Tap the **OFFLINE / LIVE** status badge in the top right header to expand network settings.
   - Enter your laptop's IP address (e.g., `192.168.1.105`).
   - Tap **Connect**.
3. Ensure your firewall permits incoming connections on port `8000`.

---

## 🚨 Alert & Dispatch Features

- **Gait Anomaly & Watchlist Alerts**: Automatic alerts with timestamp, bounding coordinates, confidence score, and location.
- **Color Coded UI**:
  - Primary: `#92b0fc`
  - Secondary: `#CCCCFF`
  - Critical Alerts: Red accent `#ef4444`
- **Call for Backup**: Field officers can press the red `CALL FOR BACKUP` button on mobile to instantly dispatch a high-priority emergency broadcast across all connected web and mobile screens.
- **Dispatch Voice Simulation**: Tactical audio connection modal for immediate command coordination.

---

## 🧪 Demo Mode Walkthrough

1. Start both **Backend** and **Web App**.
2. Open `http://localhost:3000`.
3. Click the **"Simulate Alert"** button in the top right of the Web Dashboard.
4. Watch the alert card animate onto the live feed and the incident marker appear on the OpenStreetMap Leaflet map.
5. On the Mobile app, watch the push notification and incident card appear simultaneously with zero latency.
