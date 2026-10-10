import React from 'react';
import { ARCHITECTURE_LAYERS } from '../../constants/paperMetrics';
import { Layers, Box } from 'lucide-react';

export const ArchitectureExplorer: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            Compact Student Architecture (17 Layers, 10 Learnable)
          </h3>
          <p className="text-[11px] text-slate-400">
            Depthwise separable CNN optimized for microcontrollers (Table 2 from paper)
          </p>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          5,530 Parameters • 7.81 MFLOPs
        </span>
      </div>

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left font-mono text-xs">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10 border-b border-slate-800">
            <tr className="text-slate-400">
              <th className="py-2 px-2.5">#</th>
              <th className="py-2 px-2.5">Layer Name</th>
              <th className="py-2 px-2.5">Type</th>
              <th className="py-2 px-2.5">Output Shape</th>
              <th className="py-2 px-2.5">Kernel / Filters</th>
              <th className="py-2 px-2.5">Parameters</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {ARCHITECTURE_LAYERS.map((layer) => (
              <tr
                key={layer.layer}
                className={`hover:bg-slate-900/50 transition ${
                  layer.learnable ? 'text-slate-200' : 'text-slate-400 opacity-80'
                }`}
              >
                <td className="py-2 px-2.5 font-bold text-cyan-400">{layer.layer}</td>
                <td className="py-2 px-2.5 flex items-center space-x-1.5">
                  <Box className={`w-3.5 h-3.5 ${layer.learnable ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span className="font-semibold">{layer.name}</span>
                </td>
                <td className="py-2 px-2.5 text-[11px] text-slate-400">{layer.type}</td>
                <td className="py-2 px-2.5 text-slate-300 font-bold">{layer.outputShape}</td>
                <td className="py-2 px-2.5 text-slate-400">{layer.kernel}</td>
                <td className="py-2 px-2.5 font-bold text-emerald-400">
                  {layer.params > 0 ? layer.params.toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
        <div>Total Parameters: <b className="text-white">5,530 (0.00553M)</b></div>
        <div>Multiply-Adds: <b className="text-white">3.905M (7.81 MFLOPs)</b></div>
        <div>Quantized Size: <b className="text-emerald-400">22,728 bytes INT8</b></div>
      </div>
    </div>
  );
};
