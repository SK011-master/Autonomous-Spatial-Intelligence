from ultralytics import YOLO

# Load PyTorch weights and compile to TensorRT Engine
model = YOLO('yolov8m.pt')
model.export(format='engine', half=True, device=0) # Generates yolov8s.engine