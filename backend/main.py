from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO, settings
import cv2
import numpy as np
import os
from typing import List, Dict, Any
from scene_graph import analyze_scene_context, determine_activity_status

app = FastAPI(
    title="The Core - Spatial Intelligence Engine",
    description="Real-Time Perception & Room State Detection Endpoint",
    version="1.0.0"
)

# Enable CORS for React Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# MODEL INITIALIZATION & PATH CONFIGURATION
# ---------------------------------------------------------
# Define the absolute path to your custom models directory
models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# Update Ultralytics global settings to force weight downloads here
settings.update({"weights_dir": models_dir})

# Load the model. 
# It will check 'backend/models/' first. If not found, it will download it directly into 'backend/models/'.
model_path = os.path.join(models_dir, "yolov8n.pt")
model = YOLO(model_path)

# ---------------------------------------------------------


@app.get("/")
def health_check() -> Dict[str, str]:
    return {
        "status": "online",
        "engine": "The Core - Autonomous Spatial Intelligence Pipeline",
        "model": "YOLOv8 Nano",
        "weights_path": model_path
    }


@app.post("/api/v1/detect")
async def detect_objects(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded must be an image.")

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding.")

        height, width, _ = frame.shape
        results = model(frame)

        detections: List[Dict[str, Any]] = []
        labels_found: List[str] = []

        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                label = model.names[class_id]
                confidence = float(box.conf[0])
                coords = box.xyxy[0].tolist()  

                labels_found.append(label)

                detections.append({
                    "label": label,
                    "confidence": round(confidence, 3),
                    "bbox": [round(c, 1) for c in coords], 
                    "normalized_bbox": [
                        round(coords[0] / width, 4),
                        round(coords[1] / height, 4),
                        round(coords[2] / width, 4),
                        round(coords[3] / height, 4)
                    ]
                })

        # Calculate initial spatial room state
        person_count = labels_found.count("person")
        
        # --- NEW: SCENE GRAPH INTELLIGENCE ---
        inferred_room, room_confidence = analyze_scene_context(labels_found)
        activity_status = determine_activity_status(person_count, inferred_room)
        # --------------------------------------

        spatial_state = {
            "frame_metadata": {
                "width": width,
                "height": height
            },
            "scene_context": {
                "inferred_location": inferred_room,
                "confidence_score": room_confidence,
                "status": activity_status
            },
            "room_state": {
                "occupancy": person_count,
                "is_occupied": person_count > 0,
                "unique_object_count": len(set(labels_found)),
                "total_objects_detected": len(detections)
            },
            "detections": detections
        }

        return spatial_state

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")