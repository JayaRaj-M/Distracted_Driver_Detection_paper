import React from 'react';
import { ShieldCheck, AlertTriangle, Volume2, VolumeX, Radio } from 'lucide-react';
import { InferenceResult } from '../../types';

interface StatusIndicatorProps {
  result: InferenceResult | null;
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  isRunning: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  result,
  isAudioEnabled,
  onToggleAudio,
  isRunning,
}) => {
  if (!result) {
    return (
      <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-300">Awaiting Video Frame</h4>
            <p className="text-xs text-slate-500">Start webcam or select a sample image</p>
          </div>
        </div>
      </div>
    );
  }

  const isDistracted = result.isDistracted;
  const confidencePct = (result.confidence * 100).toFixed(1);

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 border ${
        isDistracted
          ? 'bg-gradient-to-r from-red-950/70 via-slate-900/80 to-slate-900/80 border-red-500/50 shadow-lg shadow-red-500/10'
          : 'bg-gradient-to-r from-emerald-950/70 via-slate-900/80 to-slate-900/80 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
              isDistracted
                ? 'bg-red-600 animate-pulse led-glow-red'
                : 'bg-emerald-600 led-glow-green'
            }`}
          >
            {isDistracted ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isDistracted
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-mono'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono'
                }`}
              >
                {isDistracted ? 'CRITICAL ALERT: DISTRACTED' : 'STATUS: SAFE ATTENTIVE'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {result.topClassId.toUpperCase()}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {result.topClassName}
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:self-center">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">Confidence</div>
            <div
              className={`text-lg sm:text-xl font-mono font-bold ${
                isDistracted ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {confidencePct}%
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <button
            onClick={onToggleAudio}
            title={isAudioEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
            className={`p-2 rounded-xl border transition-colors ${
              isAudioEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
