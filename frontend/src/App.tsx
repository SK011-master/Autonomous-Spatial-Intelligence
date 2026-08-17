/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { MainStageVideoFeed } from './components/MainStageVideoFeed';
import { TelemetryPanel } from './components/TelemetryPanel';
import { IdentityStreamFeed } from './components/IdentityStreamFeed';
import { VectorInspectorModal } from './components/VectorInspectorModal';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import {
  DetectedObject,
  IdentityEvent,
  SpatialZone,
  SystemConfig,
  TelemetryMetrics,
} from './types';
import {
  INITIAL_DETECTED_OBJECTS,
  INITIAL_EVENTS,
  INITIAL_PEOPLE,
  INITIAL_TELEMETRY,
  INITIAL_ZONES,
} from './data/mockData';
import { audioEngine } from './lib/audio';

export default function App() {
  const [config, setConfig] = useState<SystemConfig>({
    isEngineActive: true,
    isWebsocketConnected: true,
    viewMode: 'rgb',
    useWebcam: false,
    nightVision: false,
    showBoundingBoxes: true,
    showVectorLines: true,
    showKeypoints: true,
    showZones: true,
    soundEnabled: true,
    detectionThreshold: 0.15,
    environmentMode: 'indoor',
  });

  const [objects, setObjects] = useState<DetectedObject[]>(INITIAL_DETECTED_OBJECTS);
  const [events, setEvents] = useState<IdentityEvent[]>(INITIAL_EVENTS);
  const [zones, setZones] = useState<SpatialZone[]>(INITIAL_ZONES);
  const [metrics, setMetrics] = useState<TelemetryMetrics>(INITIAL_TELEMETRY);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>('obj_01');
  const [inspectorPersonName, setInspectorPersonName] = useState<string | null>('Soumya Kushwaha');

  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Add this near your other state declarations
  const wsRef = React.useRef<WebSocket | null>(null);
  const isBackendBusy = React.useRef<boolean>(false);

 // REAL-TIME WEBSOCKET PIPELINE (WITH OFFLINE HANDLING)
  useEffect(() => {
    if (!config.isEngineActive) return;

    // Connect to FastAPI WebSocket
    const ws = new WebSocket('ws://localhost:8000/api/v1/ws/stream');
    wsRef.current = ws;

    // 🚀 UPDATE: Set connected state in UI when WS connects
    ws.onopen = () => {
      console.log('🟢 WebSocket Connected to Spatial Engine');
      setConfig((prev) => ({ ...prev, isWebsocketConnected: true }));
    };
    
    ws.onmessage = (event) => {
      isBackendBusy.current = false;

      const data = JSON.parse(event.data);

      // 1. Update Telemetry Metrics
      setMetrics((prev) => ({
        ...prev,
        totalOccupancy: data.room_state.occupancy,
        roomState: data.scene_context.status,
        objectCounts: {
          ...prev.objectCounts,
          persons: data.room_state.occupancy,
          devices: data.room_state.total_objects_detected - data.room_state.occupancy,
        },
      }));

      // 2. Update YOLOv8 Bounding Boxes
      const liveObjects: DetectedObject[] = data.detections
        .filter((d: any) => d.confidence >= config.detectionThreshold) // 🔥 ADD THIS LINE
        .map((d: any, idx: number) => ({
          id: `live_${d.label}_${idx}`,         
          trackingId: `YOLO-${d.label}-${idx}`,
          label: d.label,
          category: d.label === 'person' ? 'person' : 'device',
          confidence: d.confidence,
          bbox: {
            x: d.normalized_bbox[0] * 100,
            y: d.normalized_bbox[1] * 100,
            w: (d.normalized_bbox[2] - d.normalized_bbox[0]) * 100,
            h: (d.normalized_bbox[3] - d.normalized_bbox[1]) * 100,
          },
          spatial3D: { x: 0, y: 0, z: 2.5 }, 
          isPerson: d.label === 'person',
          identityName: d.identity !== 'Unknown' ? d.identity : null,
          demographics: d.demographics,
        }));
      
      setObjects(liveObjects);

      // 3. Trigger Identity Stream Feed Events
      data.detections.forEach((d: any) => {
        if (d.identity && d.identity !== 'Unknown') {
          // Prevent spamming the feed if they are already in the recent events
          setEvents((prev) => {
            const alreadyLogged = prev.some(e => e.subjectName.includes(d.identity) && (new Date().getTime() - e.fullTimestamp.getTime() < 5000));
            if (alreadyLogged) return prev;

            if (config.soundEnabled) audioEngine.playVectorMatch();
            
            const newEvent: IdentityEvent = {
              id: `evt_${Date.now()}`,
              timestamp: new Date().toTimeString().substring(0, 8),
              fullTimestamp: new Date(),
              subjectName: `🎯 ${d.identity}`,
              roleTitle: "Recognized Subject",
              confidence: d.confidence,
              pgvectorDistance: 0.12, 
              demographics: d.demographics,
              spatialPos: { x: 0, y: 0, z: 2.5 },
              avatarUrl: 'https://ui-avatars.com/api/?name=' + d.identity + '&background=0D8B93&color=fff',
              status: 'verified',
              vectorId: `vec_${Date.now()}`,
              detectedObjectId: 'obj_01',
            };
            return [newEvent, ...prev.slice(0, 19)];
          });
        }
      });
    };

    // 🚀 NEW: Clear stale mock objects & update UI state when backend goes offline
    ws.onerror = ws.onclose = () => {
      console.warn('🔴 WebSocket Disconnected / Backend Offline');
      setConfig((prev) => ({ ...prev, isWebsocketConnected: false }));
      setObjects([]); // Clears stale mock boxes on screen
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [config.isEngineActive, config.soundEnabled]);

  const handleOpenInspectorForPerson = (personName: string) => {
    setInspectorPersonName(personName);
    setIsInspectorOpen(true);
    if (config.soundEnabled) audioEngine.playTargetAcquired();
  };

  const handleAddSimulatedPerson = (name: string, role: string) => {
    const newPersonEvent: IdentityEvent = {
      id: `evt_custom_${Date.now()}`,
      timestamp: new Date().toTimeString().substring(0, 8),
      fullTimestamp: new Date(),
      subjectName: `🎯 ${name}`,
      roleTitle: role,
      confidence: 0.998,
      pgvectorDistance: 0.024,
      demographics: {
        age: 28,
        gender: 'Male',
        emotion: 'Focused',
        emotionConfidence: 0.96,
      },
      spatialPos: { x: 0.0, y: 0.0, z: 2.1 },
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      status: 'verified',
      vectorId: `vec_pgv_${Date.now()}`,
      detectedObjectId: 'obj_01',
    };

    setEvents((prev) => [newPersonEvent, ...prev]);

    // Also update main object list
    setObjects((prev) => [
      {
        id: `obj_${Date.now()}`,
        trackingId: `YOLO-${Math.floor(100 + Math.random() * 800)}`,
        label: 'Person',
        category: 'person',
        confidence: 0.998,
        bbox: { x: 38, y: 25, w: 24, h: 55 },
        spatial3D: { x: 0.1, y: 0.0, z: 2.1 },
        isPerson: true,
        identityName: name,
        pgvectorDistance: 0.024,
        matchConfidence: 0.998,
        demographics: {
          age: 28,
          gender: 'Male',
          emotion: 'Focused',
          emotionConfidence: 0.96,
        },
        facialKeypoints: [
          { x: 35, y: 28, name: 'left_eye' },
          { x: 65, y: 28, name: 'right_eye' },
          { x: 50, y: 45, name: 'nose' },
          { x: 38, y: 68, name: 'mouth_left' },
          { x: 62, y: 68, name: 'mouth_right' },
        ],
        vectorSample: [0.12, -0.45, 0.88, 0.23, -0.11, 0.67, 0.94, -0.05],
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header Navigation */}
      <HeaderNav
        config={config}
        setConfig={setConfig}
        onOpenInspector={() => setIsInspectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        fps={metrics.fps}
        latencyMs={metrics.inferenceLatencyMs + metrics.pgvectorLatencyMs}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 max-w-[1920px] mx-auto w-full">
        {/* Left Column (8/12 cols): Video Stage Feed & Telemetry Stats */}
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
          {/* Main Stage Video Feed */}
          <MainStageVideoFeed
            objects={objects}
            zones={zones}
            config={config}
            setConfig={setConfig}
            selectedObjectId={selectedObjectId}
            onSelectObject={(id) => setSelectedObjectId(id)}
            onInspectPersonVector={handleOpenInspectorForPerson}
            wsRef={wsRef}
            isBackendBusy={isBackendBusy}
          />

          {/* Telemetry Stats & Metrics Panel */}
          <TelemetryPanel metrics={metrics} zones={zones} />
        </div>

        {/* Right Column (4/12 cols): Identity Stream Feed */}
        <div className="lg:col-span-4 h-full min-h-[500px]">
          <IdentityStreamFeed
            events={events}
            selectedObjectId={selectedObjectId}
            onSelectEvent={(objId) => setSelectedObjectId(objId)}
            onInspectVector={handleOpenInspectorForPerson}
          />
        </div>
      </main>

      {/* Interactive Modals */}
      <VectorInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        selectedPersonName={inspectorPersonName}
      />

      <SystemSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        setConfig={setConfig}
        onAddSimulatedPerson={handleAddSimulatedPerson}
        onClearEvents={() => setEvents([])}
      />
    </div>
  );
}
