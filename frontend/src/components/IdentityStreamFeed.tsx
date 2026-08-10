import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Zap,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  UserX,
  Target
} from 'lucide-react';
import { IdentityEvent } from '../types';

interface IdentityStreamFeedProps {
  events: IdentityEvent[];
  selectedObjectId: string | null;
  onSelectEvent: (eventId: string) => void;
  onInspectVector: (subjectName: string) => void;
}

export const IdentityStreamFeed: React.FC<IdentityStreamFeedProps> = ({
  events,
  selectedObjectId,
  onSelectEvent,
  onInspectVector,
}) => {
  return (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Feed Header */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              Identity Stream Feed
            </h2>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              pgvector facial matches
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE
          </span>
        </div>
      </div>

      {/* Identity Event List Stack */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar max-h-[640px] lg:max-h-none">
        <AnimatePresence initial={false}>
          {events.map((evt) => {
            const isSelected = selectedObjectId === evt.detectedObjectId;

            return (
              <motion.div
                key={evt.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                onClick={() => onSelectEvent(evt.detectedObjectId)}
                className={`relative group p-3 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : evt.status === 'flagged'
                    ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400'
                    : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {/* Accent Status Strip */}
                <div
                  className={`absolute top-0 bottom-0 left-0 w-1 rounded-l ${
                    evt.status === 'verified'
                      ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                      : evt.status === 'flagged'
                      ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B]'
                      : 'bg-emerald-400'
                  }`}
                />

                <div className="pl-2 flex items-start justify-between gap-2">
                  {/* Left Avatar & Details */}
                  <div className="flex items-start gap-3">
                    {/* Facial Avatar Crop */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={
                          evt.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
                        }
                        alt={evt.subjectName}
                        className="w-11 h-11 rounded object-cover border border-white/20 group-hover:border-emerald-400 transition-all"
                      />
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded bg-black border border-white/20 text-emerald-400">
                        <Target className="w-3 h-3" />
                      </span>
                    </div>

                    <div>
                      {/* Name & Role */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white group-hover:text-emerald-300 transition-colors">
                          {evt.subjectName}
                        </h3>
                      </div>
                      {evt.roleTitle && (
                        <p className="text-[10px] font-mono uppercase text-zinc-400">
                          {evt.roleTitle}
                        </p>
                      )}

                      {/* Score Metrics */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                          {(evt.confidence * 100).toFixed(1)}% match
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10 uppercase">
                          L2: {evt.pgvectorDistance.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    {evt.timestamp}
                  </div>
                </div>

                {/* Demographics & Spatial Footprint */}
                <div className="mt-2.5 pl-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-medium">
                      Age {evt.demographics.age} • {evt.demographics.gender}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-semibold uppercase">
                      {evt.demographics.emotion} ({Math.round(evt.demographics.emotionConfidence * 100)}%)
                    </span>
                  </div>

                  <span className="text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                    Z: {evt.spatialPos.z.toFixed(1)}m
                  </span>
                </div>

                {/* Inspect Vector Deep Button */}
                <div className="mt-2 pl-2 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">
                    ID: {evt.vectorId}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectVector(evt.subjectName);
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                    Inspect Embedding
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 bg-black/80 text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
        <span>pgvector ArcFace 1536d</span>
        <span className="text-emerald-400 font-bold">0.082 Threshold</span>
      </div>
    </div>
  );
};
