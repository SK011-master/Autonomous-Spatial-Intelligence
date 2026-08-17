import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sliders,
  Settings,
  Plus,
  RefreshCw,
  Trash2,
  Bell,
  Cpu,
  Check,
  Shield,
  Zap,
  Layers
} from 'lucide-react';
import { SystemConfig } from '../types';
import { audioEngine } from '../lib/audio';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onAddSimulatedPerson: (name: string, role: string) => void;
  onClearEvents: () => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  setConfig,
  onAddSimulatedPerson,
  onClearEvents,
}) => {
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    onAddSimulatedPerson(
      newPersonName.trim(),
      newPersonRole.trim() || 'Spatial Operator'
    );
    setNewPersonName('');
    setNewPersonRole('');
    setAddSuccessMsg(true);
    if (config.soundEnabled) audioEngine.playVectorMatch();

    setTimeout(() => {
      setAddSuccessMsg(false);
    }, 2500);
  };

  const handleModeSwitch = async (mode: 'indoor' | 'outdoor') => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/engine/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setConfig((prev) => ({ ...prev, environmentMode: mode }));
        if (config.soundEnabled) audioEngine.playTargetAcquired();
      }
    } catch (error) {
      console.error("Mode switch failed:", error);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col text-white"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/90">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-mono font-bold text-white uppercase tracking-widest">
                  Spatial Engine Configuration
                </h2>
                <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  YOLOv8 & pgvector Parameters
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

          {/* Form Content */}
          <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar font-mono text-xs">
            {/* Detection Threshold Slider */}
            <div className="space-y-2 p-4 rounded bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold flex items-center gap-2 uppercase tracking-wider text-[10px]">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  YOLOv8 Confidence Cutoff
                </span>
                <span className="text-emerald-400 font-bold font-mono">
                  {(config.detectionThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.99"
                step="0.01"
                value={config.detectionThreshold}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    detectionThreshold: parseFloat(e.target.value),
                  }))
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                Higher threshold eliminates false positives in dark conditions.
              </p>
            </div>

            {/* Environment Mode Switcher */}
            <div className="space-y-3 p-4 rounded bg-white/5 border border-white/10">
              <span className="text-white font-bold flex items-center gap-2 uppercase tracking-wider text-[10px]">
                <Layers className="w-4 h-4 text-emerald-400" />
                Environment Taxonomy Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['indoor', 'outdoor'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeSwitch(mode)}
                    className={`py-2 px-3 rounded border font-bold uppercase tracking-wider text-[10px] transition-all flex justify-center items-center gap-2 ${
                      config.environmentMode === mode
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-black/50 border-white/10 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {mode} {config.environmentMode === mode && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Feature Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    showVectorLines: !prev.showVectorLines,
                  }))
                }
                className={`p-3 rounded border text-left flex items-center justify-between transition-all uppercase tracking-wider text-[10px] ${
                  config.showVectorLines
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                <span>Vector Rays</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    config.showVectorLines ? 'bg-purple-400' : 'bg-zinc-600'
                  }`}
                />
              </button>

              <button
                onClick={() =>
                  setConfig((prev) => ({ ...prev, showZones: !prev.showZones }))
                }
                className={`p-3 rounded border text-left flex items-center justify-between transition-all uppercase tracking-wider text-[10px] ${
                  config.showZones
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                <span>Spatial Zones</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    config.showZones ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
              </button>
            </div>

            {/* Add New Identity to Database */}
            <form onSubmit={handleAddPerson} className="p-4 rounded bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2 uppercase tracking-wider text-[10px]">
                <Plus className="w-4 h-4 text-emerald-400" />
                Register New Identity in pgvector
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Soumya Kushwaha"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-white/20 text-white focus:outline-none focus:border-emerald-400 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 uppercase tracking-wider">Role / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Architect"
                    value={newPersonRole}
                    onChange={(e) => setNewPersonRole(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-white/20 text-white focus:outline-none focus:border-emerald-400 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {addSuccessMsg && (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Check className="w-4 h-4" />
                    Identity & vector saved!
                  </span>
                )}
                {!addSuccessMsg && <span />}

                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Add to Store
                </button>
              </div>
            </form>

            {/* Event Log Reset */}
            <div className="p-4 rounded bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-white font-bold block uppercase tracking-wider text-[10px]">Clear Recognition Log</span>
                <span className="text-zinc-400 text-[10px] uppercase">Resets event feed stack</span>
              </div>
              <button
                type="button"
                onClick={onClearEvents}
                className="px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Feed
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/90 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
