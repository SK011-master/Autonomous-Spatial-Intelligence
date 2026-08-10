import os
import numpy as np
import logging
import traceback
from typing import Dict, Any
import insightface
from insightface.app import FaceAnalysis

models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.environ["DEEPFACE_HOME"] = models_dir

# from deepface import DeepFace

# Initialize InsightFace with CUDA execution on RTX 3050
app = FaceAnalysis(name='buffalo_l', providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# Suppress heavy TensorFlow/DeepFace logs
# logging.getLogger("deepface").setLevel(logging.ERROR)

def extract_face_data(frame: np.ndarray):
    # InsightFace detects and generates 512d ArcFace vectors in a single GPU pass
    try:
        faces = app.get(frame)
        if not faces:
            return {"has_face": False}
        
        # Grab the primary detected face
        face = faces[0]
        
        # Extract ArcFace 512-dim normalized vector
        embedding = face.embedding.tolist()
        
        # Estimate demographics directly from ONNX tensors
        age = int(face.age)
        gender = "Male" if face.gender == 1 else "Female"
        
        return {
            "has_face": True,
            "age": age,
            "gender": gender,
            "emotion": "Focused", # Default fallback or add emotion classifier model
            "embedding": embedding
        }

    except Exception as e:
        print("\n" + "="*50)
        print("💥 DEEPFACE CRASH REPORT:")
        traceback.print_exc()
        print("="*50 + "\n")
        return {"has_face": False}