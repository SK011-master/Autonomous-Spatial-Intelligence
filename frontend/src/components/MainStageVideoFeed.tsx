import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Video,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Layers,
  Crosshair,
  User,
  Shield,
  Activity,
  Zap,
  Target,
  Sparkles,
  Wifi,
  Compass,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { DetectedObject, SpatialZone, SystemConfig, ViewMode } from '../types';
import { audioEngine } from '../lib/audio';

interface MainStageVideoFeedProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  isBackendBusy: React.MutableRefObject<boolean>;
  objects: DetectedObject[];
  zones: SpatialZone[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onInspectPersonVector: (personName: string) => void;
}

export const MainStageVideoFeed: React.FC<MainStageVideoFeedProps> = ({
  objects,
  zones,
  config,
  setConfig,
  selectedObjectId,
  onSelectObject,
  onInspectPersonVector,
  wsRef,
  isBackendBusy,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [hoveredObjId, setHoveredObjId] = useState<string | null>(null);

  // Initialize webcam if config.useWebcam is enabled
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (config.useWebcam) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
          setWebcamActive(true);
          setCameraError(null);
        })
        .catch((err) => {
          console.warn('Webcam permission denied or unavailable:', err);
          setCameraError('Webcam unavailable. Switched to high-tech simulated feed.');
          setWebcamActive(false);
          setConfig((prev) => ({ ...prev, useWebcam: false }));
        });
    } else {
      setWebcamActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [config.useWebcam, setConfig]);

  // =========================================================
  // FRAME STREAMING PIPELINE (NOW SMART & SYNCHRONIZED)
  // =========================================================
  useEffect(() => {
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 640; 
    captureCanvas.height = 360;
    const captureCtx = captureCanvas.getContext('2d');

    const streamInterval = setInterval(() => {
      // 🔥 If backend is still chewing on the last frame, SKIP this interval!
      if (isBackendBusy.current) return;

      if (
        config.useWebcam && 
        config.isEngineActive && 
        videoRef.current && 
        captureCtx && 
        wsRef.current && 
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        
        isBackendBusy.current = true; // 🔥 LOCK THE GATE until FastAPI replies

        captureCtx.drawImage(videoRef.current, 0, 0, captureCanvas.width, captureCanvas.height);
        const base64Frame = captureCanvas.toDataURL('image/jpeg', 0.6);
        wsRef.current.send(base64Frame);
      }
    }, 100); // Back to 10 FPS!

    return () => clearInterval(streamInterval);
  }, [config.useWebcam, config.isEngineActive, wsRef, isBackendBusy]);

  // Synthetic / Canvas Render Loop for Depth, Thermal, Grid overlays & Vector Rays
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanY = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // If NOT using real webcam, draw simulated background room grid & spatial graphics
      if (!webcamActive) {
        // Base dark grid background
        const gradient = ctx.createRadialGradient(
          width / 2,
          height / 2,
          50,
          width / 2,
          height / 2,
          width / 1.2
        );

        if (config.viewMode === 'infrared') {
          gradient.addColorStop(0, '#002B1B');
          gradient.addColorStop(0.5, '#001A10');
          gradient.addColorStop(1, '#000804');
        } else if (config.viewMode === 'depth') {
          gradient.addColorStop(0, '#1E1B4B');
          gradient.addColorStop(0.5, '#0F172A');
          gradient.addColorStop(1, '#020617');
        } else if (config.viewMode === 'vector') {
          gradient.addColorStop(0, '#1E1035');
          gradient.addColorStop(0.5, '#0B061A');
          gradient.addColorStop(1, '#05020D');
        } else {
          // RGB Mode
          gradient.addColorStop(0, '#0F172A');
          gradient.addColorStop(0.6, '#090D16');
          gradient.addColorStop(1, '#030712');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw Perspective 3D Grid Lines
        ctx.strokeStyle =
          config.viewMode === 'infrared'
            ? 'rgba(0, 255, 136, 0.12)'
            : config.viewMode === 'vector'
            ? 'rgba(168, 85, 247, 0.15)'
            : 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;

        const horizonY = height * 0.4;
        const gridSpacing = 40;

        // Vertical perspective rays
        for (let x = -width; x < width * 2; x += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(width / 2, horizonY);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal floor grid
        for (let y = horizonY; y < height; y += (y - horizonY) * 0.25 + 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Depth Heatmap blobs for depth mode
        if (config.viewMode === 'depth') {
          objects.forEach((obj) => {
            const cx = (obj.bbox.x + obj.bbox.w / 2) * (width / 100);
            const cy = (obj.bbox.y + obj.bbox.h / 2) * (height / 100);
            const radius = (obj.bbox.w / 2) * (width / 100) * 1.5;

            const depthGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            depthGrad.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
            depthGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.3)');
            depthGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

            ctx.fillStyle = depthGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      // Draw Spatial Zones if enabled
      if (config.showZones) {
        zones.forEach((zone) => {
          if (zone.points.length < 3) return;
          ctx.beginPath();
          ctx.moveTo(
            (zone.points[0].x / 100) * width,
            (zone.points[0].y / 100) * height
          );
          for (let i = 1; i < zone.points.length; i++) {
            ctx.lineTo(
              (zone.points[i].x / 100) * width,
              (zone.points[i].y / 100) * height
            );
          }
          ctx.closePath();

          ctx.fillStyle = zone.isRestricted
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(0, 240, 255, 0.06)';
          ctx.fill();

          ctx.strokeStyle = zone.borderColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Zone Tag Label
          const labelX = (zone.points[0].x / 100) * width + 10;
          const labelY = (zone.points[0].y / 100) * height + 20;

          ctx.fillStyle = 'rgba(9, 10, 15, 0.8)';
          ctx.fillRect(labelX - 4, labelY - 14, zone.name.length * 7 + 16, 20);

          ctx.fillStyle = zone.color;
          ctx.font = '11px monospace';
          ctx.fillText(`ZONE: ${zone.name}`, labelX, labelY);
        });
      }

      // Draw Inter-Object Vector Connection Lines if enabled
      if (config.showVectorLines && objects.length >= 2) {
        const persons = objects.filter((o) => o.isPerson);
        const devices = objects.filter((o) => o.category === 'device');

        persons.forEach((p) => {
          const px = (p.bbox.x + p.bbox.w / 2) * (width / 100);
          const py = (p.bbox.y + p.bbox.h / 2) * (height / 100);

          devices.forEach((d) => {
            const dx = (d.bbox.x + d.bbox.w / 2) * (width / 100);
            const dy = (d.bbox.y + d.bbox.h / 2) * (height / 100);

            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(dx, dy);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Midpoint distance label
            const mx = (px + dx) / 2;
            const my = (py + dy) / 2;
            const distM = Math.hypot(
              p.spatial3D.x - d.spatial3D.x,
              p.spatial3D.z - d.spatial3D.z
            ).toFixed(2);

            ctx.fillStyle = 'rgba(11, 6, 26, 0.85)';
            ctx.fillRect(mx - 24, my - 10, 48, 16);
            ctx.fillStyle = '#C084FC';
            ctx.font = '10px monospace';
            ctx.fillText(`${distM}m`, mx - 18, my + 2);
          });
        });
      }

      // Radar Scan Line effect
      if (config.isEngineActive) {
        scanY = (scanY + 2.5) % height;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);

        const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
        scanGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        scanGrad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');

        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 30, width, 30);

        ctx.strokeStyle =
          config.viewMode === 'infrared'
            ? 'rgba(0, 255, 136, 0.6)'
            : 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [config, objects, zones, webcamActive]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden border transition-all duration-500 bg-black/90 shadow-2xl flex flex-col justify-between select-none ${
        config.isEngineActive
          ? 'border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.15)]'
          : 'border-white/10'
      }`}
      style={{ minHeight: '440px', aspectRatio: '16/9' }}
    >
      {/* Real Webcam Hidden Video Element */}
      {config.useWebcam && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover rounded-xl z-0"
          playsInline
          muted
        />
      )}

      {/* Synthetic Canvas Background & Vector Rays Layer */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* Camera Filter Overlay (Night Vision / Thermal / Depth shaders) */}
      {config.viewMode === 'infrared' && (
        <div className="absolute inset-0 bg-emerald-950/30 mix-blend-color-dodge z-0 pointer-events-none" />
      )}
      {config.viewMode === 'vector' && (
        <div className="absolute inset-0 bg-purple-950/25 mix-blend-overlay z-0 pointer-events-none" />
      )}

      {/* Top Overlay HUD Bar */}
      <div className="relative z-20 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/95 via-black/60 to-transparent">
        <div className="flex items-center gap-2">
          {/* Active Glowing Pulse Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded border font-mono text-[10px] font-bold tracking-widest uppercase backdrop-blur-md ${
              config.isEngineActive
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-black/80 border-white/10 text-zinc-400'
            }`}
          >
            <motion.div
              animate={config.isEngineActive ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
              className={`w-2 h-2 rounded-full ${
                config.isEngineActive ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-zinc-500'
              }`}
            />
            <span>{config.isEngineActive ? 'STREAM ACTIVE' : 'PAUSED'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/80 border border-white/10 text-[10px] font-mono tracking-wider uppercase text-zinc-300 backdrop-blur-md">
            <Compass className="w-3 h-3 text-emerald-400" />
            <span>CAM_01: SPATIAL_NORTH</span>
          </div>
        </div>

        {/* Viewport Control Quick Action Buttons */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10 backdrop-blur-md">
          {/* Toggle Webcam vs Simulated */}
          <button
            onClick={() => {
              const next = !config.useWebcam;
              setConfig((prev) => ({ ...prev, useWebcam: next }));
              if (config.soundEnabled) audioEngine.playTargetAcquired();
            }}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
              config.useWebcam
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Toggle Live Webcam Input"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{config.useWebcam ? 'Webcam' : 'Simulated'}</span>
          </button>

          {/* Toggle Bounding Boxes */}
          <button
            onClick={() =>
              setConfig((prev) => ({ ...prev, showBoundingBoxes: !prev.showBoundingBoxes }))
            }
            className={`p-1.5 rounded text-xs font-mono transition-all ${
              config.showBoundingBoxes
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle YOLO Bounding Boxes"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Keypoints */}
          <button
            onClick={() =>
              setConfig((prev) => ({ ...prev, showKeypoints: !prev.showKeypoints }))
            }
            className={`p-1.5 rounded text-xs font-mono transition-all ${
              config.showKeypoints
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Facial Landmark Keypoints"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Engine Play/Pause */}
          <button
            onClick={() =>
              setConfig((prev) => ({ ...prev, isEngineActive: !prev.isEngineActive }))
            }
            className={`p-1.5 rounded text-xs font-mono transition-all ${
              config.isEngineActive
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
            title={config.isEngineActive ? 'Pause Stream' : 'Resume Stream'}
          >
            {config.isEngineActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded text-zinc-400 hover:text-white transition-all"
            title="Fullscreen Stream"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Camera Error Alert Banner if user declined webcam */}
      {cameraError && !config.useWebcam && (
        <div className="relative z-20 mx-4 my-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
          <button
            onClick={() => setCameraError(null)}
            className="text-amber-400 hover:text-amber-200 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bounding Box Interactive Overlays */}
      <div className="relative z-10 w-full h-full flex-1">
        {config.showBoundingBoxes &&
          objects.map((obj) => {
            const isSelected = selectedObjectId === obj.id;
            const isHovered = hoveredObjId === obj.id;
            const isPerson = obj.isPerson;

            return (
              <motion.div
                key={obj.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  onSelectObject(isSelected ? null : obj.id);
                  if (config.soundEnabled) audioEngine.playTargetAcquired();
                }}
                onMouseEnter={() => setHoveredObjId(obj.id)}
                onMouseLeave={() => setHoveredObjId(null)}
                className={`absolute cursor-pointer rounded-lg border group ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(0,240,255,0.4)] z-30'
                    : isPerson
                    ? 'border-emerald-400/80 bg-emerald-500/5 hover:border-emerald-300 z-20'
                    : 'border-zinc-500/60 bg-zinc-900/10 hover:border-cyan-400/60 z-10'
                }`}
                style={{
                  left: `${obj.bbox.x}%`,
                  top: `${obj.bbox.y}%`,
                  width: `${obj.bbox.w}%`,
                  height: `${obj.bbox.h}%`,
                }}
              >
                {/* Tactical Corner Bounding Reticles */}
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
                <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />

                {/* Person Facial Keypoints Overlay */}
                {config.showKeypoints && isPerson && obj.facialKeypoints && (
                  <div className="absolute inset-0 pointer-events-none">
                    {obj.facialKeypoints.map((kp, idx) => (
                      <span
                        key={idx}
                        className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300 ring-2 ring-cyan-500/60 shadow-[0_0_6px_#00F0FF] transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${kp.x}%`, top: `${kp.y}%` }}
                      />
                    ))}
                  </div>
                )}

                {/* Top Label Badge */}
                <div className="absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950/90 border border-zinc-700/90 text-[11px] font-mono text-white whitespace-nowrap shadow-md">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPerson ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-cyan-400'
                    }`}
                  />
                  <span className="font-bold">
                    {obj.isPerson && obj.identityName ? obj.identityName : obj.label}
                  </span>
                  <span className="text-zinc-400 font-normal">
                    {(obj.confidence * 100).toFixed(0)}%
                  </span>
                  {obj.pgvectorDistance !== undefined && (
                    <span className="text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-500/30 text-[10px]">
                      dist:{obj.pgvectorDistance.toFixed(3)}
                    </span>
                  )}
                </div>

                {/* Bottom Coordinates & Demographics Badge */}
                <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-between text-[10px] font-mono text-zinc-300 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 whitespace-nowrap">
                  <span>
                    3D: ({obj.spatial3D.x.toFixed(1)}m, {obj.spatial3D.z.toFixed(1)}m)
                  </span>
                  {isPerson && obj.demographics && (
                    <span className="text-emerald-400">
                      {obj.demographics.age}y • {obj.demographics.emotion}
                    </span>
                  )}
                </div>

                {/* Click Action: Inspect Vector button when selected */}
                {isSelected && isPerson && obj.identityName && (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectPersonVector(obj.identityName!);
                    }}
                    className="absolute inset-x-2 bottom-2 py-1 px-2 rounded bg-cyan-500/90 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-bold shadow-[0_0_12px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-1 z-40"
                  >
                    <Zap className="w-3 h-3" />
                    Inspect pgvector
                  </motion.button>
                )}
              </motion.div>
            );
          })}
      </div>

      {/* Bottom Spatial Coordinates HUD Footer */}
      <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-t from-zinc-950/90 via-zinc-950/50 to-transparent flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>OBJECTS IN FRAME: <strong className="text-white">{objects.length}</strong></span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="hidden md:flex items-center gap-1.5 text-zinc-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>RECOGNITION ENGINE: <strong className="text-emerald-400">pgvector Cosine L2</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">CLICK BOX TO INSPECT VECTOR</span>
        </div>
      </div>
    </div>
  );
};
