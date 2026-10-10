import React from 'react';
import { HARDWARE_COMPARISON_DATA } from '../../constants/paperMetrics';
import { Microchip, Cpu, CheckCircle } from 'lucide-react';

export const HardwareComparisonTable: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Microchip className="w-4 h-4 text-cyan-400" />
            Hardware Deployment Performance Comparison
          </h3>
          <p className="text-[11px] text-slate-400">
            Authoritative evaluation across target edge architectures (Table 3 from paper)
          </p>
        </div>

        <span className="text-xs font-mono text-slate-400">TFLite Micro Runtime</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
              <th className="py-2.5 px-3">Target Microcontroller</th>
              <th className="py-2.5 px-3">Architecture</th>
              <th className="py-2.5 px-3">SRAM / Arena</th>
              <th className="py-2.5 px-3">Latency (ms)</th>
              <th className="py-2.5 px-3">Throughput (FPS)</th>
              <th className="py-2.5 px-3">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {HARDWARE_COMPARISON_DATA.map((hw, idx) => {
              const isPico = hw.platform.includes('Pico');
              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-900/40 transition-colors ${
                    isPico ? 'bg-emerald-950/20 font-medium' : ''
                  }`}
                >
                  <td className="py-3 px-3 flex items-center space-x-2 text-white">
                    <Cpu className={`w-4 h-4 ${isPico ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{hw.platform}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{hw.architecture}</td>
                  <td className="py-3 px-3 text-slate-300">
                    {hw.sram} / <span className="text-indigo-400">{hw.tensorArena}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        isPico
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-amber-400'
                      }`}
                    >
                      {hw.latencyMs} ms
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-bold ${
                        isPico ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      {hw.fps} FPS
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      {hw.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>FPS Derived Formula: <code>FPS = 1000 / Latency(ms)</code></span>
        <span>Peak Memory Footprint: <b>204,800 bytes</b> static buffer</span>
      </div>
    </div>
  );
};
