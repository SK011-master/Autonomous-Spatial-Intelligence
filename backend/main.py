from fastapi import FastAPI, File, UploadFile, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import settings, YOLOWorld
from pydantic import BaseModel
import cv2
import base64
import numpy as np
import os
from typing import List, Dict, Any
from transformers import pipeline
from PIL import Image

from scene_graph import analyze_scene_context, determine_activity_status
from face_engine import extract_face_data
from database import init_db, register_face, recognize_face

app = FastAPI(
    title="The Core - Spatial Intelligence Engine",
    description="Real-Time Perception & Room State Detection Endpoint",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

# Model Path Configuration
models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
settings.update({"weights_dir": models_dir})

# 🔥 NEW: Force HuggingFace models (like MiDaS) to download strictly into your local 'models' folder
os.environ["HF_HOME"] = models_dir
os.environ["TRANSFORMERS_CACHE"] = models_dir

model_path = os.path.join(models_dir, "yolov8s-world.pt")

# =====================================================================
# DUAL TAXONOMY MODELS: Pre-loaded into VRAM to prevent PyTorch crashes
# =====================================================================
print("⏳ Loading Spatial Engines into VRAM...")

# 1. Initialize Indoor Engine
model_indoor = YOLOWorld(model_path)
model_indoor.set_classes([
    "person", "eyeglasses", "screwdriver", "skincare box", 
    "mechanical keyboard", "computer monitor", "mouse", "chair", 
    "bottle", "electric fan", "laptop", "television", "cell phone", 
    "desk", "couch", "potted plant", "cup", "book", "remote", 
    "clock", "backpack", "scissors", "door", "box", "head"
])
model_indoor.to('cuda')

# 2. Initialize Outdoor Engine
model_outdoor = YOLOWorld(model_path)
model_outdoor.set_classes([
    "person", "car", "bicycle", "motorcycle", "bus", "truck", 
    "traffic light", "fire hydrant", "street sign", "backpack", 
    "handbag", "dog", "cat", "bench", "storefront", "trash can", 
    "street light", "building", "tree", "billboard", "fence"
])
model_outdoor.to('cuda')

# State management
models = {"indoor": model_indoor, "outdoor": model_outdoor}
current_mode = "indoor"
active_model = models[current_mode]


# NEW: Initialize 3D Depth Perception Engine on CUDA
print("⏳ Loading 3D Depth Perception Engine (MiDaS)...")
depth_estimator = pipeline(task="depth-estimation", model="Intel/dpt-hybrid-midas", device=0)

print("✅ Dual Spatial Engines Armed and Ready on CUDA:0")


class EngineModeRequest(BaseModel):
    mode: str

@app.get("/")
def health_check() -> Dict[str, str]:
    return {
        "status": "online",
        "engine": "The Core - Autonomous Spatial Intelligence Pipeline",
        "active_mode": current_mode,
        "model": "YOLO-World Dual Instances"
    }

@app.post("/api/v1/engine/mode")
async def set_engine_mode(payload: EngineModeRequest):
    global current_mode, active_model
    target_mode = payload.mode.lower()

    if target_mode not in models:
        raise HTTPException(status_code=400, detail="Invalid mode.")

    # INSTANT SWAP: Zero GPU/CPU tensor mismatch errors!
    current_mode = target_mode
    active_model = models[current_mode]
    
    print(f"🔄 Switched Spatial Engine Mode to [{current_mode.upper()}]")
    
    return {"status": "success", "mode": current_mode}


@app.post("/api/v1/register")
async def register_identity(name: str = Form(...), file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded must be an image.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    face_data = extract_face_data(frame)

    if not face_data.get("has_face") or not face_data.get("embedding"):
        raise HTTPException(status_code=400, detail="No face detected in the registration image.")

    result = register_face(name=name, embedding=face_data["embedding"])
    return {"message": f"Successfully registered identity: {name}", "details": result}

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
        # Use active_model dynamically
        results = active_model(frame, conf=0.15)

        detections: List[Dict[str, Any]] = []
        labels_found: List[str] = []

        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                label = active_model.names[class_id]
                confidence = float(box.conf[0])
                coords = box.xyxy[0].tolist()
                
                x1, y1, x2, y2 = map(int, coords)
                labels_found.append(label)
                
                detection_payload = {
                    "label": label,
                    "tracking_id": None,
                    "confidence": round(confidence, 3),
                    "bbox": [round(c, 1) for c in coords], 
                    "normalized_bbox": [
                        round(coords[0] / width, 4),
                        round(coords[1] / height, 4),
                        round(coords[2] / width, 4),
                        round(coords[3] / height, 4)
                    ]
                }

                if label == "person":
                    crop_y1, crop_y2 = max(0, y1), min(height, y2)
                    crop_x1, crop_x2 = max(0, x1), min(width, x2)
                    person_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                    
                    if person_crop.size > 0:
                        face_data = extract_face_data(person_crop)
                        if face_data.get("has_face"):
                            identity_name = recognize_face(face_data["embedding"])
                            detection_payload["identity"] = identity_name
                            detection_payload["demographics"] = {
                                "age": face_data["age"],
                                "gender": face_data["gender"],
                                "emotion": face_data["emotion"]
                            }

                detections.append(detection_payload)

        person_count = labels_found.count("person")
        inferred_room, room_confidence = analyze_scene_context(labels_found)
        activity_status = determine_activity_status(person_count, inferred_room)

        return {
            "frame_metadata": {"width": width, "height": height},
            "scene_context": {
                "inferred_location": inferred_room if current_mode == "indoor" else "Outdoor Environment",
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.websocket("/api/v1/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🟢 WebSocket Connection Established")
    
    try:
        while True:
            data = await websocket.receive_text()
            
            encoded_data = data.split(',')[1] if ',' in data else data
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            height, width, _ = frame.shape
            
            # Execute YOLO-World inference
            results = active_model(frame, conf=0.15)
            
            # 🔥 NEW: Run Depth Estimation only if objects are detected to save GPU cycles
            depth_map = None
            if len(results[0].boxes) > 0:
                pil_frame = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                depth_out = depth_estimator(pil_frame)
                # Convert the PIL image output to a Numpy array and resize to match webcam frame
                depth_map = np.array(depth_out["depth"])
                depth_map = cv2.resize(depth_map, (width, height))
            
            detections = []
            labels_found = []

            for r in results:
                for box in r.boxes:
                    class_id = int(box.cls[0])
                    label = active_model.names[class_id]
                    confidence = float(box.conf[0])
                    coords = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = map(int, coords)
                    
                    labels_found.append(label)

                    # 🔥 NEW: Calculate Real 3D Spatial Coordinates (X, Z)
                    z_meters = 2.5
                    x_meters = 0.0
                    
                    if depth_map is not None:
                        # Get center pixel of the bounding box
                        cx = int((x1 + x2) / 2)
                        cy = int((y1 + y2) / 2)
                        cx = max(0, min(cx, width - 1))
                        cy = max(0, min(cy, height - 1))
                        
                        # Extract disparity value from the depth map
                        disparity = depth_map[cy, cx]
                        
                        if disparity > 0:
                            # Convert disparity to approximate meters
                            raw_z = (255.0 / disparity) * 2.0
                            # Bound the distance between 0.5m and 30.0m for stability
                            z_meters = round(min(max(raw_z, 0.5), 30.0), 1)
                            
                            # Calculate X offset (Horizontal distance from camera center)
                            x_offset_px = cx - (width / 2)
                            x_meters = round((x_offset_px / width) * z_meters * 1.15, 1)

                    
                    detection_payload = {
                        "label": label,
                        "tracking_id": None,
                        "confidence": round(confidence, 3),
                        "bbox": [round(c, 1) for c in coords],
                        "normalized_bbox": [
                            round(coords[0] / width, 4),
                            round(coords[1] / height, 4),
                            round(coords[2] / width, 4),
                            round(coords[3] / height, 4)
                        ],
                        # 🔥 NEW: Pass the calculated 3D coordinates to the frontend
                        "spatial3D": {"x": x_meters, "y": 0.0, "z": z_meters}
                    }

                    if label == "person":
                        crop_y1, crop_y2 = max(0, y1), min(height, y2)
                        crop_x1, crop_x2 = max(0, x1), min(width, x2)
                        person_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                        
                        if person_crop.size > 0:
                            face_data = extract_face_data(person_crop)
                            if face_data.get("has_face"):
                                identity_name = recognize_face(face_data["embedding"])
                                detection_payload["identity"] = identity_name
                                detection_payload["demographics"] = {
                                    "age": face_data["age"],
                                    "gender": face_data["gender"],
                                    "emotion": face_data["emotion"]
                                }
                    detections.append(detection_payload)

            person_count = labels_found.count("person")
            inferred_room, room_confidence = analyze_scene_context(labels_found)
            activity_status = determine_activity_status(person_count, inferred_room)

            payload = {
                "frame_metadata": {"width": width, "height": height},
                "scene_context": {
                    "inferred_location": inferred_room if current_mode == "indoor" else "Outdoor Environment",
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
            
            await websocket.send_json(payload)

    except WebSocketDisconnect:
        print("🔴 Client disconnected from WebSocket stream.")
    except Exception as e:
        print(f"⚠️ WebSocket Error: {e}")