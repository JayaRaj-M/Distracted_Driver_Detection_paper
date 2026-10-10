import React from 'react';
import { DISTRACTION_CLASSES } from '../../constants/classes';
import { InferenceResult } from '../../types';

interface ClassProbabilityBarProps {
  result: InferenceResult | null;
}

export const ClassProbabilityBar: React.FC<ClassProbabilityBarProps> = ({ result }) => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-800">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <span>10-Class Softmax Probability Distribution</span>
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">State Farm Dataset (c0–c9)</span>
      </div>

      <div className="space-y-2.5">
        {DISTRACTION_CLASSES.map((cls, idx) => {
          const classProb = result?.probabilities.find((p) => p.id === cls.id)?.score ?? 0;
          const isTop = result?.topClassId === cls.id;
          const pct = Math.round(classProb * 100);

          return (
            <div key={cls.id} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold ${
                      isTop
                        ? cls.category === 'safe'
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : 'bg-red-500 text-white font-extrabold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cls.id.toUpperCase()}
                  </span>
                  <span
                    className={`text-xs font-medium truncate max-w-[200px] sm:max-w-xs ${
                      isTop ? 'text-white font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {cls.name}
                  </span>
                </div>
                <span
                  className={`font-mono text-xs ${
                    isTop
                      ? cls.category === 'safe'
                        ? 'text-emerald-400 font-bold'
                        : 'text-red-400 font-bold'
                      : 'text-slate-500'
                  }`}
                >
                  {pct}%
                </span>
              </div>

              {/* Progress Track */}
              <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    isTop
                      ? cls.category === 'safe'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                        : 'bg-gradient-to-r from-red-600 to-rose-400 shadow-sm shadow-red-500/50'
                      : 'bg-slate-700/60'
                  }`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
