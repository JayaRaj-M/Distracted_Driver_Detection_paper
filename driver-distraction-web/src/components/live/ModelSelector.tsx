import React from 'react';
import { STUDENT_MODELS } from '../../constants/paperMetrics';
import { StudentModelId, StudentModelMetadata } from '../../types';
import { CheckCircle2, Award, Zap } from 'lucide-react';

interface ModelSelectorProps {
  activeModelId: StudentModelId;
  onSelectModel: (id: StudentModelId) => void;
  activeModelMeta: StudentModelMetadata;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  activeModelId,
  onSelectModel,
  activeModelMeta,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            Active Student Network
          </h3>
          <p className="text-[11px] text-slate-400">
            Compare student behavior derived from 4 different teacher architectures
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          96×96 RGB INT8
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {STUDENT_MODELS.map((model) => {
          const isSelected = activeModelId === model.id;
          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={`text-left p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white">{model.name}</span>
                    {model.isTopPerformer && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                        <Award className="w-2.5 h-2.5" /> Best
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Teacher: {model.teacherName}</p>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                )}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  Acc: <b className="text-slate-200">{model.accuracy}%</b>
                </span>
                <span className="text-slate-400">
                  F1: <b className="text-slate-200">{model.macroF1}%</b>
                </span>
                <span className="text-slate-400">
                  RP2040: <b className="text-emerald-400">{model.rp2040LatencyMs}ms</b>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 bg-slate-950/70 rounded-xl p-2.5 border border-slate-800/60 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>Shared Deployment Profile: <b>17 layers</b> (10 learnable)</span>
        <span>Params: <b>0.00553M (5,530)</b></span>
        <span>Compute: <b>7.81 MFLOPs</b></span>
        <span>Model Size: <b>22,728 bytes</b></span>
      </div>
    </div>
  );
};
