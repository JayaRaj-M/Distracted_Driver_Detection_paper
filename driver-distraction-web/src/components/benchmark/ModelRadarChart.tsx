import React, { useState } from 'react';
import { STUDENT_MODELS } from '../../constants/paperMetrics';
import { Award, Zap } from 'lucide-react';

export const ModelRadarChart: React.FC = () => {
  const [activeModelId, setActiveModelId] = useState<string>('resnet50');

  // Radar metrics axes
  const metrics = [
    { key: 'accuracy', label: 'Val Accuracy', max: 70, unit: '%' },
    { key: 'precision', label: 'Precision', max: 70, unit: '%' },
    { key: 'recall', label: 'Recall', max: 70, unit: '%' },
    { key: 'macroF1', label: 'Macro F1', max: 70, unit: '%' },
    { key: 'rp2040Fps', label: 'RP2040 FPS', max: 30, unit: ' FPS' },
  ];

  const center = 140;
  const radius = 100;
  const numAxes = metrics.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Compute coordinate points for an axis
  const getCoordinates = (value: number, maxVal: number, axisIndex: number) => {
    const norm = Math.min(1, Math.max(0.1, value / maxVal));
    const angle = axisIndex * angleStep - Math.PI / 2;
    const x = center + radius * norm * Math.cos(angle);
    const y = center + radius * norm * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            4-Student Radar Performance Comparison
          </h3>
          <p className="text-[11px] text-slate-400">
            Reproducing Fig. 4 from Journal of Real-Time Image Processing manuscript
          </p>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Driver-Wise Split
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* SVG Radar Chart */}
        <div className="flex justify-center">
          <svg width="280" height="280" className="overflow-visible">
            {/* Background concentric web polygons */}
            {[0.25, 0.5, 0.75, 1.0].map((level, i) => {
              const points = metrics
                .map((_, idx) => {
                  const angle = idx * angleStep - Math.PI / 2;
                  const x = center + radius * level * Math.cos(angle);
                  const y = center + radius * level * Math.sin(angle);
                  return `${x},${y}`;
                })
                .join(' ');
              return (
                <polygon
                  key={i}
                  points={points}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray={level < 1 ? '3 3' : undefined}
                />
              );
            })}

            {/* Axes Lines and Labels */}
            {metrics.map((m, idx) => {
              const angle = idx * angleStep - Math.PI / 2;
              const xEnd = center + radius * Math.cos(angle);
              const yEnd = center + radius * Math.sin(angle);
              const xLabel = center + (radius + 20) * Math.cos(angle);
              const yLabel = center + (radius + 20) * Math.sin(angle);

              return (
                <g key={m.key}>
                  <line x1={center} y1={center} x2={xEnd} y2={yEnd} stroke="#475569" strokeWidth="1" />
                  <text
                    x={xLabel}
                    y={yLabel}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[10px] font-mono fill-slate-300 font-bold"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            {/* Render student polygons */}
            {STUDENT_MODELS.map((model) => {
              const isSelected = activeModelId === model.id;
              const points = metrics
                .map((m, idx) => {
                  const val = (model as any)[m.key] || 0;
                  const { x, y } = getCoordinates(val, m.max, idx);
                  return `${x},${y}`;
                })
                .join(' ');

              const color =
                model.id === 'resnet50'
                  ? '#10b981'
                  : model.id === 'mobilenetv3'
                  ? '#38bdf8'
                  : model.id === 'efficientnet'
                  ? '#f59e0b'
                  : '#a855f7';

              return (
                <g key={model.id}>
                  <polygon
                    points={points}
                    fill={color}
                    fillOpacity={isSelected ? 0.35 : 0.08}
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                    className="transition-all duration-300"
                  />
                  {isSelected &&
                    metrics.map((m, idx) => {
                      const val = (model as any)[m.key] || 0;
                      const { x, y } = getCoordinates(val, m.max, idx);
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={color}
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Model Selection and Comparative Cards */}
        <div className="space-y-2.5">
          {STUDENT_MODELS.map((model) => {
            const isSelected = activeModelId === model.id;
            const badgeColor =
              model.id === 'resnet50'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : model.id === 'mobilenetv3'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : model.id === 'efficientnet'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-purple-500 text-purple-400 bg-purple-500/10';

            return (
              <button
                key={model.id}
                onClick={() => setActiveModelId(model.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 ring-1 ring-cyan-500/30 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full border ${badgeColor}`} />
                    <span className="text-xs font-bold text-white">{model.name}</span>
                    {model.isTopPerformer && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-0.5">
                        <Award className="w-2.5 h-2.5" /> Best Teacher
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-white">{model.accuracy}% Acc</span>
                </div>

                <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-400">
                  <div>Prec: <b className="text-slate-200">{model.precision}%</b></div>
                  <div>Rec: <b className="text-slate-200">{model.recall}%</b></div>
                  <div>F1: <b className="text-slate-200">{model.macroF1}%</b></div>
                  <div>RP2040: <b className="text-emerald-400">{model.rp2040LatencyMs}ms</b></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
