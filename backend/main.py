import asyncio
import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Setup FastAPI App
app = FastAPI(
    title="Kinesis - AI Gait Tracking & Public Safety Alert Platform",
    description="Local-first AI surveillance, gait recognition, ReID tracking, and emergency alert dispatch.",
    version="1.0.0"
)

# CORS Configuration for local access from Web App and Mobile App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Local network friendly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# IN-MEMORY DATABASE & MODELS
# ----------------------------------------------------
class Location(BaseModel):
    lat: float
    lng: float

class AlertModel(BaseModel):
    id: str
    type: str
    severity: str  # "CRITICAL" | "HIGH" | "MEDIUM" | "WARNING" | "INFO"
    message: str
    location: Location
    timestamp: str
    person_id: Optional[str] = None
    confidence: Optional[float] = None

class BackupRequest(BaseModel):
    officer_id: str
    location: Location
    message: Optional[str] = "Immediate assistance required at coordinates."

# Store recent alerts in memory (and SQLite if configured)
alerts_db: List[dict] = [
    {
        "id": "init-001",
        "type": "GAIT_ANOMALY",
        "severity": "WARNING",
        "message": "Irregular gait pattern identified for Subject #G-104",
        "location": {"lat": 34.0522, "lng": -118.2437},
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "person_id": "SUB-104",
        "confidence": 0.87
    }
]

# ----------------------------------------------------
# WEBSOCKET MANAGER FOR REAL-TIME ALERTS & DISPATCH
# ----------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send WebSocket message: {e}")

manager = ConnectionManager()

# ----------------------------------------------------
# REST API ROUTES
# ----------------------------------------------------

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "Kinesis Public Safety & Gait Tracking Platform",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/alerts")
def get_alerts():
    """Retrieve all recent alerts for dashboard and mobile client sync."""
    return {"alerts": alerts_db}

@app.post("/api/backup/call")
async def call_for_backup(req: BackupRequest):
    """Triggered by Field Officers via the Mobile App 'Call for Backup' button."""
    alert_payload = {
        "id": f"backup-{uuid.uuid4().hex[:6]}",
        "type": "BACKUP_REQUEST",
        "severity": "CRITICAL",
        "message": f"🚨 BACKUP REQUESTED: Officer {req.officer_id} - {req.message}",
        "location": {"lat": req.location.lat, "lng": req.location.lng},
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "person_id": req.officer_id,
        "confidence": 1.0
    }
    alerts_db.insert(0, alert_payload)
    await manager.broadcast(json.dumps({"type": "ALERT", **alert_payload}))
    return {"status": "dispatched", "alert": alert_payload}

@app.post("/api/demo/trigger_alert")
async def trigger_demo_alert():
    """Simulates an AI Gait Recognition detection triggering an alert."""
    demo_alert = {
        "id": f"alert-{uuid.uuid4().hex[:6]}",
        "type": "ALERT",
        "severity": "HIGH",
        "message": "Watchlist person identified via CASIA-B gait pattern",
        "location": {
            "lat": 34.0522 + (0.005 * (len(alerts_db) % 5)),
            "lng": -118.2437 + (0.005 * (len(alerts_db) % 5))
        },
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "person_id": f"P_{uuid.uuid4().hex[:4].upper()}",
        "confidence": 0.94
    }
    alerts_db.insert(0, demo_alert)
    await manager.broadcast(json.dumps(demo_alert))
    return {"status": "broadcasted", "alert": demo_alert}

# ----------------------------------------------------
# WEBSOCKET ENDPOINTS
# ----------------------------------------------------
@app.websocket("/ws")
@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "backup":
                    alert_payload = {
                        "id": f"backup-{uuid.uuid4().hex[:6]}",
                        "type": "ALERT",
                        "severity": "CRITICAL",
                        "message": f"🚨 EMERGENCY BACKUP REQUEST: {parsed.get('officer_id', 'Officer')}",
                        "location": parsed.get("location", {"lat": 34.0522, "lng": -118.2437}),
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    alerts_db.insert(0, alert_payload)
                    await manager.broadcast(json.dumps(alert_payload))
                else:
                    await manager.broadcast(data)
            except json.JSONDecodeError:
                if "backup" in data.lower():
                    alert_payload = {
                        "id": f"backup-{uuid.uuid4().hex[:6]}",
                        "type": "ALERT",
                        "severity": "CRITICAL",
                        "message": "🚨 BACKUP REQUESTED BY FIELD OFFICER",
                        "location": {"lat": 34.0522, "lng": -118.2437},
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    alerts_db.insert(0, alert_payload)
                    await manager.broadcast(json.dumps(alert_payload))
                else:
                    await manager.broadcast(f"Echo: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
