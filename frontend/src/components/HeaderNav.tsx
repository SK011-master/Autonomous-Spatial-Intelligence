import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Radio,
  Clock,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Box,
  Eye,
  Camera,
  Layers,
  Database,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SystemConfig, ViewMode } from '../types';
import { audioEngine } from '../lib/audio';

interface HeaderNavProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onOpenInspector: () => void;
  onOpenSettings: () => void;
  fps: number;
  latencyMs: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  config,
  setConfig,
  onOpenInspector,
  onOpenSettings,
  fps,
  latencyMs,
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !config.soundEnabled;
    setConfig((prev) => ({ ...prev, soundEnabled: next }));
    audioEngine.setMuted(!next);
    if (next) audioEngine.playTargetAcquired();
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setConfig((prev) => ({ ...prev, viewMode: mode }));
    if (config.soundEnabled) audioEngine.playTargetAcquired();
  };

  return (
    <header className="relative z-30 w-full h-16 bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 lg:px-6 flex flex-wrap items-center justify-between gap-4">
      {/* Left Branding & Live Indicator */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center relative">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold tracking-[0.3em] uppercase text-white font-mono flex items-center gap-2">
              AURA / SPATIAL ENGINE <span className="text-[10px] tracking-normal px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-normal">v4.2-YOLOv8</span>
            </h1>
          </div>
          <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
            <span>FastAPI + pgvector (HNSW)</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-semibold">{latencyMs.toFixed(1)}ms pipeline</span>
          </p>
        </div>

        {/* Live WebSocket Status Tag */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 tracking-widest uppercase">
          <motion.span
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]"
          />
          <span className="font-semibold">WEBSOCKET: CONNECTED</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">{fps} FPS</span>
        </div>
      </div>

      {/* Middle View Mode Switchers */}
      <div className="hidden lg:flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
        <button
          onClick={() => handleViewModeChange('rgb')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider uppercase transition-all flex items-center gap-1.5 ${
            config.viewMode === 'rgb'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-emerald-400" />
          RGB + YOLO
        </button>

        <button
          onClick={() => handleViewModeChange('depth')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider uppercase transition-all flex items-center gap-1.5 ${
            config.viewMode === 'depth'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Spatial Depth
        </button>

        <button
          onClick={() => handleViewModeChange('vector')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider uppercase transition-all flex items-center gap-1.5 ${
            config.viewMode === 'vector'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          Facial Vector
        </button>

        <button
          onClick={() => handleViewModeChange('infrared')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wider uppercase transition-all flex items-center gap-1.5 ${
            config.viewMode === 'infrared'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          Infrared
        </button>
      </div>

      {/* Right Controls & Clock */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="h-4 w-[1px] bg-white/20 hidden sm:block"></div>
        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-white/70">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{timeString || '23:41:04 UTC'}</span>
        </div>

        {/* Vector DB Inspector Button */}
        <button
          onClick={onOpenInspector}
          className="px-3 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          title="Inspect pgvector 1536-dim face embeddings"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">pgvector</span> Store
        </button>

        {/* Audio Sound Toggle */}
        <button
          onClick={toggleSound}
          className={`p-1.5 rounded border transition-all ${
            config.soundEnabled
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
          }`}
          title={config.soundEnabled ? 'Mute Audio UI Alerts' : 'Unmute Audio UI Alerts'}
        >
          {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Settings Modal Toggle */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all"
          title="Engine Configuration"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
