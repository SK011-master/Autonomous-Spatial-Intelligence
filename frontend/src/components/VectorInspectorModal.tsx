import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  Search,
  Zap,
  Layers,
  Cpu,
  BarChart3,
  Sparkles,
  Check,
  SlidingScale,
  Sliders,
  Maximize2
} from 'lucide-react';
import { INITIAL_PEOPLE } from '../data/mockData';

interface VectorInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersonName: string | null;
}

export const VectorInspectorModal: React.FC<VectorInspectorModalProps> = ({
  isOpen,
  onClose,
  selectedPersonName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activePerson, setActivePerson] = useState<string>(
    selectedPersonName || 'Soumya Kushwaha'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceThreshold, setDistanceThreshold] = useState<number>(0.12);

  useEffect(() => {
    if (selectedPersonName) {
      setActivePerson(selectedPersonName);
    }
  }, [selectedPersonName]);

  // Draw 2D Vector Embedding t-SNE / PCA Spatial Scatter Canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background Grid
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Centered Clusters (t-SNE 2D Projection of 1536d ArcFace Face Vectors)
    const personClusters = [
      { name: 'Soumya Kushwaha', cx: width * 0.35, cy: height * 0.4, color: '#00F0FF' },
      { name: 'Dr. Elena Vance', cx: width * 0.65, cy: height * 0.35, color: '#10B981' },
      { name: 'Marcus Chen', cx: width * 0.5, cy: height * 0.7, color: '#A855F7' },
      { name: 'Subject #8412 (Guest)', cx: width * 0.8, cy: height * 0.75, color: '#F59E0B' },
    ];

    // Draw cluster scatter points for each person
    personClusters.forEach((cluster) => {
      const isSelected = cluster.name.includes(activePerson) || activePerson.includes(cluster.name);

      // Draw cluster boundary circle
      ctx.beginPath();
      ctx.arc(cluster.cx, cluster.cy, isSelected ? 45 : 30, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? `${cluster.color}20`
        : `${cluster.color}08`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? cluster.color : `${cluster.color}40`;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash(isSelected ? [4, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // Scatter 15 sample embedding vector points around center
      for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2 + (i % 3);
        const dist = (12 + (i * 7) % 20) * (isSelected ? 1.2 : 0.8);
        const px = cluster.cx + Math.cos(angle) * dist;
        const py = cluster.cy + Math.sin(angle) * dist;

        ctx.beginPath();
        ctx.arc(px, py, isSelected ? 3.5 : 2, 0, Math.PI * 2);
        ctx.fillStyle = cluster.color;
        ctx.fill();

        if (isSelected) {
          ctx.shadowColor = cluster.color;
          ctx.shadowBlur = 8;
        }
      }
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = isSelected ? '#FFFFFF' : '#9CA3AF';
      ctx.font = isSelected ? 'bold 11px monospace' : '10px monospace';
      ctx.fillText(cluster.name, cluster.cx - 35, cluster.cy + (isSelected ? 60 : 45));
    });

    // Draw Cosine Similarity Vector Rays between active selection and database
    const activeCluster = personClusters.find(
      (p) => p.name.includes(activePerson) || activePerson.includes(p.name)
    ) || personClusters[0];

    personClusters.forEach((other) => {
      if (other.name !== activeCluster.name) {
        ctx.beginPath();
        ctx.moveTo(activeCluster.cx, activeCluster.cy);
        ctx.lineTo(other.cx, other.cy);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Distance text on line
        const mx = (activeCluster.cx + other.cx) / 2;
        const my = (activeCluster.cy + other.cy) / 2;
        const dist = (
          Math.hypot(activeCluster.cx - other.cx, activeCluster.cy - other.cy) /
          400
        ).toFixed(3);

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(mx - 25, my - 9, 50, 16);
        ctx.fillStyle = '#00F0FF';
        ctx.font = '10px monospace';
        ctx.fillText(`L2: ${dist}`, mx - 20, my + 3);
      }
    });
  }, [isOpen, activePerson]);

  if (!isOpen) return null;

  const currentPersonData =
    INITIAL_PEOPLE.find(
      (p) => p.name.includes(activePerson) || activePerson.includes(p.name)
    ) || INITIAL_PEOPLE[0];

  // Generate 16 sample floats representing 512/1536-dim embedding vector
  const dummyFloats = [
    0.0428, -0.1284, 0.8921, 0.3341, -0.0912, 0.6542, -0.4412, 0.7812,
    -0.2219, 0.1194, 0.5482, -0.0128, 0.9412, 0.2811, -0.3120, 0.6128,
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col text-white"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/90">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  pgvector Embedding Inspector{' '}
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                    1536-dim ArcFace
                  </span>
                </h2>
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  Cosine Similarity & HNSW Projections
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
            {/* Left 2D t-SNE Projection Canvas */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider">
                  <BarChart3 className="w-4 h-4" />
                  PCA / t-SNE Vector Space (2D)
                </span>
                <span className="uppercase text-[10px]">HNSW Cosine Match</span>
              </div>

              <div className="relative rounded overflow-hidden border border-white/10 bg-black">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={320}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Similarity Threshold Tuner */}
              <div className="p-3.5 rounded bg-white/5 border border-white/10 text-xs font-mono flex flex-col gap-2">
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    Distance Match Cutoff
                  </span>
                  <span className="text-emerald-400 font-bold">{distanceThreshold} Cosine L2</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.40"
                  step="0.01"
                  value={distanceThreshold}
                  onChange={(e) => setDistanceThreshold(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 uppercase">
                  <span>Strict (0.01)</span>
                  <span>Recommended (0.12)</span>
                  <span>Loose (0.40)</span>
                </div>
              </div>
            </div>

            {/* Right Profile & Raw Vector Floats */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Select Person Profile Selector */}
              <div>
                <label className="text-xs font-mono text-zinc-400 mb-2 block uppercase tracking-wider font-bold">
                  Select Identity Profile:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {INITIAL_PEOPLE.map((person) => (
                    <button
                      key={person.vectorId}
                      onClick={() => setActivePerson(person.name)}
                      className={`p-2.5 rounded border transition-all text-left font-mono text-xs flex items-center justify-between ${
                        activePerson.includes(person.name) || person.name.includes(activePerson)
                          ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-8 h-8 rounded object-cover border border-white/20"
                        />
                        <div>
                          <p className="font-bold uppercase tracking-wider">{person.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase">{person.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 uppercase font-bold">
                        {(person.confidence * 100).toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Raw Float Array Chunk Preview */}
              <div className="p-3.5 rounded bg-white/5 border border-white/10 text-xs font-mono">
                <div className="flex items-center justify-between mb-2 text-zinc-300">
                  <span className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    1536-dim Float Array Preview
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase">JSONB</span>
                </div>

                <div className="bg-black/80 p-2.5 rounded border border-white/10 text-[11px] text-emerald-300 font-mono space-y-1">
                  <p className="text-zinc-500 text-[10px]">// Vector Embedding: {currentPersonData.vectorId}</p>
                  <p className="break-all">
                    [{dummyFloats.map((f) => (f > 0 ? `+${f}` : `${f}`)).join(', ')}, ...]
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-white/10 bg-black/90 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="uppercase text-[10px]">PostgreSQL 16 + pgvector (HNSW)</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Done Inspecting
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
