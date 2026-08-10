from fastapi import FastAPI, File, UploadFile, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO, settings
import cv2
import base64
import numpy as np
import os
from typing import List, Dict, Any

from scene_graph import analyze_scene_context, determine_activity_status
from face_engine import extract_face_data
from database import init_db, register_face, recognize_face
from ultralytics import YOLOWorld

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

# Initialize database table on server startup
@app.on_event("startup")
def startup_event():
    init_db()

# Model Path Configuration
models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
settings.update({"weights_dir": models_dir})
model_path = os.path.join(models_dir, "yolov8m.pt") # or yolov8m.pt
#model_path = os.path.join(models_dir, "yolov8s-world.pt")

model = YOLO(model_path)
# model = YOLOWorld(model_path)

# #2. Define ANYTHING you want your spatial engine to recognize!
# model.set_classes([
#     "person", 
#     "eyeglasses", 
#     "screwdriver", 
#     "skincare box", 
#     "mechanical keyboard", 
#     "computer monitor", 
#     "mouse", 
#     "chair", 
#     "bottle",
#     "electric fan"
# ])

model.to('cuda')


@app.get("/")
def health_check() -> Dict[str, str]:
    return {
        "status": "online",
        "engine": "The Core - Autonomous Spatial Intelligence Pipeline",
        "model": "YOLOv8 Nano"
    }


@app.post("/api/v1/register")
async def register_identity(name: str = Form(...), file: UploadFile = File(...)):
    """
    Upload an image of a person to save their face vector into PostgreSQL.
    """
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
        results = model(frame)

        detections: List[Dict[str, Any]] = []
        labels_found: List[str] = []

        for r in results:
            for box in r.boxes:
                class_id = int(box.cls[0])
                label = model.names[class_id]
                confidence = float(box.conf[0])
                coords = box.xyxy[0].tolist()
                
                x1, y1, x2, y2 = map(int, coords)
                labels_found.append(label)
                
                detection_payload = {
                    "label": label,
                    "confidence": round(confidence, 3),
                    "bbox": [round(c, 1) for c in coords], 
                    "normalized_bbox": [
                        round(coords[0] / width, 4),
                        round(coords[1] / height, 4),
                        round(coords[2] / width, 4),
                        round(coords[3] / height, 4)
                    ]
                }

                # --- CASCADED INFERENCE + VECTOR DATABASE RECOGNITION ---
                if label == "person":
                    crop_y1, crop_y2 = max(0, y1), min(height, y2)
                    crop_x1, crop_x2 = max(0, x1), min(width, x2)
                    person_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                    
                    if person_crop.size > 0:
                        face_data = extract_face_data(person_crop)
                        if face_data.get("has_face"):
                            # Perform vector distance lookup in PostgreSQL
                            identity_name = recognize_face(face_data["embedding"])

                            detection_payload["identity"] = identity_name
                            detection_payload["demographics"] = {
                                "age": face_data["age"],
                                "gender": face_data["gender"],
                                "emotion": face_data["emotion"]
                            }
                # ---------------------------------------------------------

                detections.append(detection_payload)

        person_count = labels_found.count("person")
        inferred_room, room_confidence = analyze_scene_context(labels_found)
        activity_status = determine_activity_status(person_count, inferred_room)

        return {
            "frame_metadata": {"width": width, "height": height},
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.websocket("/api/v1/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("🟢 WebSocket Connection Established")
    
    try:
        while True:
            # 1. Receive the Base64 image frame from React
            data = await websocket.receive_text()
            
            # 2. Decode it back into a standard OpenCV image
            encoded_data = data.split(',')[1] if ',' in data else data
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            # 3. Run YOLOv8 Inference
            height, width, _ = frame.shape
            results = model(frame)
            
            detections = []
            labels_found = []

            for r in results:
                for box in r.boxes:
                    class_id = int(box.cls[0])
                    label = model.names[class_id]
                    confidence = float(box.conf[0])
                    coords = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = map(int, coords)
                    
                    labels_found.append(label)
                    
                    detection_payload = {
                        "label": label,
                        "confidence": round(confidence, 3),
                        "bbox": [round(c, 1) for c in coords],
                        "normalized_bbox": [
                            round(coords[0] / width, 4),
                            round(coords[1] / height, 4),
                            round(coords[2] / width, 4),
                            round(coords[3] / height, 4)
                        ]
                    }

                    # 4. Cascaded Vector Recognition for Persons
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

            # 5. Scene Context & Analytics
            person_count = labels_found.count("person")
            inferred_room, room_confidence = analyze_scene_context(labels_found)
            activity_status = determine_activity_status(person_count, inferred_room)

            # 6. Stream the results back to the frontend
            payload = {
                "frame_metadata": {"width": width, "height": height},
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
            
            await websocket.send_json(payload)

    except WebSocketDisconnect:
        print("🔴 Client disconnected from WebSocket stream.")
    except Exception as e:
        print(f"⚠️ WebSocket Error: {e}")