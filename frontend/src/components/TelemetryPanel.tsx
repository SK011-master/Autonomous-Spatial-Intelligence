import React from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Box,
  Activity,
  Cpu,
  Database,
  ShieldAlert,
  Laptop,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  MapPin,
  Flame,
  Zap
} from 'lucide-react';
import { SpatialZone, TelemetryMetrics } from '../types';

interface TelemetryPanelProps {
  metrics: TelemetryMetrics;
  zones: SpatialZone[];
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ metrics, zones }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Occupancy (Big Bold Number) */}
        <div className="relative overflow-hidden rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-4 transition-all hover:border-emerald-500/40 shadow-xl group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Total Occupancy
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
              Live
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white tracking-tight">
              0{metrics.totalOccupancy}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +100% vs avg
            </span>
          </div>
          <p className="text-[10px] font-mono text-zinc-400 mt-2 uppercase tracking-wider">
            Humans actively tracked
          </p>
        </div>

        {/* 2. Room State Indicator */}
        <div className="relative overflow-hidden rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-4 transition-all hover:border-emerald-500/40 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Room State
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-base uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {metrics.roomState.toUpperCase()}
            </div>
          </div>
          <p className="text-[10px] font-mono text-zinc-400 mt-3 flex items-center justify-between uppercase tracking-wider">
            <span>Spatial Density</span>
            <span className="text-emerald-400 font-bold">OPTIMAL</span>
          </p>
        </div>

        {/* 3. Unique Objects Detected */}
        <div className="relative overflow-hidden rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-4 transition-all hover:border-emerald-500/40 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              Objects Tracked
            </span>
            <span className="text-xs font-mono text-emerald-300 font-bold">
              {Object.values(metrics.objectCounts).reduce((a, b) => a + b, 0)} Items
            </span>
          </div>

          {/* Categorized Pill Breakdown */}
          <div className="grid grid-cols-2 gap-1.5 mt-2 text-xs font-mono">
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-400 text-[10px] uppercase">Persons</span>
              <span className="text-emerald-400 font-bold">{metrics.objectCounts.persons}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-400 text-[10px] uppercase">Devices</span>
              <span className="text-purple-400 font-bold">{metrics.objectCounts.devices}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-400 text-[10px] uppercase">Furniture</span>
              <span className="text-emerald-400 font-bold">{metrics.objectCounts.furniture}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-400 text-[10px] uppercase">Accs.</span>
              <span className="text-amber-400 font-bold">{metrics.objectCounts.accessories}</span>
            </div>
          </div>
        </div>

        {/* 4. pgvector Database Telemetry */}
        <div className="relative overflow-hidden rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-4 transition-all hover:border-emerald-500/40 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              pgvector Index
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 uppercase">
              HNSW (1536d)
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics.vectorDbCount.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-zinc-400">embeddings</span>
          </div>

          <div className="mt-2 text-[10px] font-mono flex items-center justify-between text-zinc-400 uppercase tracking-wider">
            <span>Query Latency:</span>
            <span className="text-emerald-400 font-bold">{metrics.pgvectorLatencyMs.toFixed(1)}ms</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Spatial Zones & Hardware Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Spatial Zones Breakdown */}
        <div className="rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-mono text-white font-bold uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Monitored Spatial Zones ({zones.length})
            </h3>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Real-time occupancy</span>
          </div>

          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/10 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-white font-medium uppercase tracking-wider">{zone.name}</span>
                  {zone.isRestricted && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Restricted
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-[10px] uppercase">
                    Occupants: <strong className="text-emerald-300">{zone.activeOccupantsCount}</strong>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hardware & Inference Pipeline Specs */}
        <div className="rounded-xl bg-black/60 backdrop-blur-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-mono text-white font-bold uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Engine Pipeline Telemetry
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">NVIDIA TensorRT</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] uppercase block">YOLOv8 Latency</span>
              <span className="text-emerald-300 font-bold text-sm">{metrics.inferenceLatencyMs.toFixed(1)} ms</span>
            </div>
            <div className="p-2.5 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] uppercase block">VRAM Usage</span>
              <span className="text-purple-300 font-bold text-sm">{(metrics.gpuMemoryUsageMb / 1024).toFixed(2)} GB</span>
            </div>
            <div className="p-2.5 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] uppercase block">Stream Rate</span>
              <span className="text-emerald-400 font-bold text-sm">{metrics.fps} FPS</span>
            </div>
            <div className="p-2.5 rounded bg-white/5 border border-white/10">
              <span className="text-zinc-500 text-[10px] uppercase block">pgvector Cosine</span>
              <span className="text-amber-300 font-bold text-sm">{metrics.pgvectorLatencyMs.toFixed(1)} ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
