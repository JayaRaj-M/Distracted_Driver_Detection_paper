import React from 'react';
import { Play, Sparkles, Sliders, Shield, AlertTriangle } from 'lucide-react';
import { DISTRACTION_CLASSES } from '../../constants/classes';
import { WOKWI_PROFILE } from '../../constants/wokwiProfile';

interface SimulationControlsProps {
  onInjectClass: (classIndex: number) => void;
  selectedClassIndex: number | null;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  onInjectClass,
  selectedClassIndex,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Wokwi Firmware Injector & Trigger Controls
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Ratio: {WOKWI_PROFILE.wokwiEmulationSpeedMultiplier}x Speed
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Click any class state below to inject a simulated camera frame directly into the RP2040 firmware loop and watch GP12/GP13 toggle:
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DISTRACTION_CLASSES.map((cls, idx) => {
          const isSelected = selectedClassIndex === idx;
          const isSafe = cls.category === 'safe';

          return (
            <button
              key={cls.id}
              onClick={() => onInjectClass(idx)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-1.5 ${
                isSelected
                  ? isSafe
                    ? 'bg-emerald-950/70 border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-red-950/70 border-red-500 shadow-md shadow-red-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                {isSafe ? (
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <div className="truncate">
                  <div className="text-[11px] font-mono font-bold text-white truncate">
                    {cls.id.toUpperCase()}: {cls.name}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
