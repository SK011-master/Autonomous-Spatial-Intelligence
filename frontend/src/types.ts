export type ViewMode = 'rgb' | 'depth' | 'vector' | 'infrared';

export type SystemStatusMode = 'ACTIVE' | 'STANDBY' | 'ANALYZING' | 'ALERT';

export interface Spatial3DCoordinates {
  x: number; // meters from camera center
  y: number; // meters height relative to floor
  z: number; // depth meters from camera lens
}

export interface Demographics {
  age: number;
  gender: 'Male' | 'Female' | 'Non-Binary';
  emotion: 'Focused' | 'Calm' | 'Happy' | 'Surprised' | 'Neutral' | 'Alert';
  emotionConfidence: number; // e.g. 0.92
}

export interface FacialKeypoint {
  x: number; // relative 0-100% inside box
  y: number; // relative 0-100% inside box
  name: 'left_eye' | 'right_eye' | 'nose' | 'mouth_left' | 'mouth_right';
}

export interface DetectedObject {
  id: string;
  trackingId: string; // e.g. "YOLO-#104"
  label: string; // e.g. "Person", "Laptop", "Cell Phone", "Chair"
  category: 'person' | 'device' | 'furniture' | 'accessory';
  confidence: number; // e.g. 0.985
  bbox: {
    x: number; // % left
    y: number; // % top
    w: number; // % width
    h: number; // % height
  };
  spatial3D: Spatial3DCoordinates;
  
  // Person specific details (Facial recognition / pgvector match)
  isPerson?: boolean;
  identityName?: string; // e.g. "Soumya Kushwaha"
  pgvectorDistance?: number; // e.g. 0.042 (cosine distance)
  matchConfidence?: number; // e.g. 0.994
  demographics?: Demographics;
  facialKeypoints?: FacialKeypoint[];
  vectorSample?: number[]; // 8-16 visual sample floats representing 512d embedding
  avatarUrl?: string;
  isThreat?: boolean;
}

export interface IdentityEvent {
  id: string;
  timestamp: string; // e.g. "14:13:52"
  fullTimestamp: Date;
  subjectName: string; // "🎯 Soumya Kushwaha" or "👤 Unknown Subject"
  roleTitle?: string; // "Lead Spatial Architect"
  confidence: number; // 0.998
  pgvectorDistance: number; // 0.041
  demographics: Demographics;
  spatialPos: Spatial3DCoordinates;
  avatarUrl?: string;
  status: 'verified' | 'analyzing' | 'flagged' | 'unknown';
  vectorId: string; // e.g. "vec_99a82f0c"
  detectedObjectId: string;
}

export interface SpatialZone {
  id: string;
  name: string;
  color: string; // e.g. "#00F0FF"
  borderColor: string;
  points: { x: number; y: number }[]; // % normalized coordinates
  activeOccupantsCount: number;
  isRestricted: boolean;
}

export interface TelemetryMetrics {
  totalOccupancy: number;
  roomState: 'Empty' | 'Occupied' | 'Active' | 'High Activity' | 'Restricted Access';
  objectCounts: {
    persons: number;
    devices: number;
    furniture: number;
    accessories: number;
  };
  fps: number;
  inferenceLatencyMs: number;
  pgvectorLatencyMs: number;
  vectorDbCount: number;
  hnswIndexBuildMs: number;
  gpuMemoryUsageMb: number;
  activeZonesCount: number;
}

export interface SystemConfig {
  isEngineActive: boolean;
  isWebsocketConnected: boolean;
  viewMode: ViewMode;
  useWebcam: boolean;
  nightVision: boolean;
  showBoundingBoxes: boolean;
  showVectorLines: boolean;
  showKeypoints: boolean;
  showZones: boolean;
  soundEnabled: boolean;
  detectionThreshold: number; // 0.5 to 0.99
}
