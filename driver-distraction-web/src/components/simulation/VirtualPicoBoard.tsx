import React from 'react';
import { WOKWI_PROFILE } from '../../constants/wokwiProfile';
import { WokwiTelemetryLog } from '../../types';
import { Cpu, Zap, Activity } from 'lucide-react';

interface VirtualPicoBoardProps {
  telemetry: WokwiTelemetryLog | null;
}

export const VirtualPicoBoard: React.FC<VirtualPicoBoardProps> = ({ telemetry }) => {
  const isGreenOn = telemetry ? telemetry.greenLed : false;
  const isRedOn = telemetry ? telemetry.redLed : false;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Virtual Raspberry Pi Pico (RP2040)
            </h3>
            <p className="text-[11px] text-slate-400">
              Grounded in diagram.json & platformio.ini (-D WOKWI=1)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            ARM Cortex-M0+ @ 133MHz
          </span>
        </div>
      </div>

      {/* Schematic Container */}
      <div className="relative bg-slate-950/90 rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
        {/* Visual RP2040 Board Card */}
        <div className="w-full max-w-sm rounded-xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border-2 border-emerald-500/40 p-5 relative shadow-lg">
          {/* Micro USB Port */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-3 bg-slate-400 rounded-sm border border-slate-300 shadow-sm" />

          {/* RP2040 Chip */}
          <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-lg mx-auto mb-4 flex flex-col items-center justify-center shadow-md relative">
            <div className="text-[9px] font-mono font-bold text-slate-400">RP2040</div>
            <div className="text-[8px] font-mono text-slate-500">Raspberry Pi</div>
            <Activity className="w-3.5 h-3.5 text-cyan-400 mt-1 animate-pulse" />
          </div>

          {/* Board Labels */}
          <div className="text-center font-mono text-xs font-bold text-emerald-300 mb-4">
            Raspberry Pi Pico
          </div>

          {/* Pin Telemetry Indicators */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
            {/* GP12 Green Pin */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all duration-200 ${
                isGreenOn
                  ? 'bg-emerald-950/80 border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 border-slate-800 opacity-60'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full mb-1 transition-all ${
                  isGreenOn ? 'bg-emerald-400 led-glow-green' : 'bg-slate-700'
                }`}
              />
              <span className="text-[11px] font-mono font-bold text-emerald-300">GP12 (Green)</span>
              <span className="text-[9px] font-mono text-slate-400">Safe Driving LED</span>
              <span
                className={`text-[9px] font-mono mt-0.5 px-1 rounded ${
                  isGreenOn ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
                }`}
              >
                {isGreenOn ? 'HIGH (3.3V)' : 'LOW (0V)'}
              </span>
            </div>

            {/* GP13 Red Pin */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col items-center justify-center transition-all duration-200 ${
                isRedOn
                  ? 'bg-red-950/80 border-red-500 shadow-md shadow-red-500/30'
                  : 'bg-slate-900 border-slate-800 opacity-60'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full mb-1 transition-all ${
                  isRedOn ? 'bg-red-500 led-glow-red' : 'bg-slate-700'
                }`}
              />
              <span className="text-[11px] font-mono font-bold text-red-300">GP13 (Red)</span>
              <span className="text-[9px] font-mono text-slate-400">Distraction Alert LED</span>
              <span
                className={`text-[9px] font-mono mt-0.5 px-1 rounded ${
                  isRedOn ? 'bg-red-500/20 text-red-300' : 'text-slate-500'
                }`}
              >
                {isRedOn ? 'HIGH (3.3V)' : 'LOW (0V)'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Hardware Telemetry Stats */}
        <div className="w-full flex-1 space-y-3 font-mono">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Calibrated Latency:</span>
            <span className="text-sm font-bold text-emerald-400">
              {WOKWI_PROFILE.calibratedHardwareLatencyMs} ms
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Hardware Throughput:</span>
            <span className="text-sm font-bold text-cyan-400">
              {WOKWI_PROFILE.calibratedFps} FPS
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">SRAM Tensor Arena:</span>
            <span className="text-sm font-bold text-indigo-400">
              204,800 bytes (200 KB)
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">TFLite Model Flash:</span>
            <span className="text-sm font-bold text-yellow-400">
              22,728 bytes (22.2 KB)
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">UART Baud Rate:</span>
            <span className="text-xs font-bold text-slate-300">115,200 baud (GP0 / GP1)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
