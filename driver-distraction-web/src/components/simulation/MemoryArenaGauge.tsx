import React from 'react';
import { Database, HardDrive, Layers } from 'lucide-react';
import { WOKWI_PROFILE } from '../../constants/wokwiProfile';

export const MemoryArenaGauge: React.FC = () => {
  const sramTotal = WOKWI_PROFILE.sramTotalBytes; // 270,336
  const tensorArena = WOKWI_PROFILE.tensorArenaBytes; // 204,800
  const freeSram = sramTotal - tensorArena; // 65,536

  const arenaPct = Math.round((tensorArena / sramTotal) * 100);
  const flashModelBytes = WOKWI_PROFILE.flashUsageBytes; // 22,728
  const flashTotalBytes = 2 * 1024 * 1024; // 2 MB
  const flashPct = ((flashModelBytes / flashTotalBytes) * 100).toFixed(2);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            MCU Memory Allocation & Static Planning
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400">TensorFlow Lite Micro</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SRAM Tensor Arena Visualizer */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              SRAM Allocation (264 KB Total)
            </span>
            <span className="font-mono text-indigo-400 font-bold">{arenaPct}% Used</span>
          </div>

          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-3 flex">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-l-full"
              style={{ width: `${arenaPct}%` }}
              title="Tensor Arena: 204.8 KB"
            />
            <div
              className="h-full bg-slate-700/50 rounded-r-full"
              style={{ width: `${100 - arenaPct}%` }}
              title="Free SRAM / Stack: 59.2 KB"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-slate-400">Tensor Arena:</div>
              <div className="text-slate-200 font-bold">204,800 bytes (200 KB)</div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-slate-400">Available / Stack:</div>
              <div className="text-slate-200 font-bold">65,536 bytes (64 KB)</div>
            </div>
          </div>
        </div>

        {/* Flash ROM Visualizer */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              Flash ROM Storage (2 MB Total)
            </span>
            <span className="font-mono text-emerald-400 font-bold">{flashPct}% Used</span>
          </div>

          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-3 flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-l-full"
              style={{ width: `3%` }}
              title="Model Flash: 22.7 KB"
            />
            <div className="h-full bg-slate-800 rounded-r-full flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-slate-400">INT8 Model Size:</div>
              <div className="text-emerald-400 font-bold">22,728 bytes (22.2 KB)</div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-slate-400">Pico Flash Left:</div>
              <div className="text-slate-200 font-bold">2,024 KB Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
