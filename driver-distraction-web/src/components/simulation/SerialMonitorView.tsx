import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Copy, Check } from 'lucide-react';
import { wokwiSimulator } from '../../services/wokwiSimulationService';
import { WokwiTelemetryLog } from '../../types';

interface SerialMonitorViewProps {
  latestTelemetry: WokwiTelemetryLog | null;
}

export const SerialMonitorView: React.FC<SerialMonitorViewProps> = ({ latestTelemetry }) => {
  const [logs, setLogs] = useState<WokwiTelemetryLog[]>([]);
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLogs([...wokwiSimulator.getHistory()]);
  }, [latestTelemetry]);

  const handleClear = () => {
    wokwiSimulator.clearHistory();
    setLogs([]);
  };

  const handleCopy = () => {
    const text = logs.map((l) => l.formattedSerialLine).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            DualSerialLogger UART Terminal (115200 Baud)
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            title="Copy logs"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleClear}
            title="Clear terminal"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="h-64 bg-slate-950/95 rounded-xl p-3.5 font-mono text-xs overflow-y-auto border border-slate-800 shadow-inner space-y-1.5">
        <div className="text-slate-500 text-[11px] pb-1 border-b border-slate-900 flex items-center justify-between">
          <span>--- RP2040 Chirale_TensorFlowLite Terminal Started ---</span>
          <span>Serial: GP0(TX) / GP1(RX)</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-slate-600 text-[11px] py-4 text-center">
            No UART packets received yet. Run camera or click dataset sample.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className={`leading-relaxed text-[11px] transition-colors ${
                log.isDistracted ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              <span className="text-slate-500">[{log.timestamp}]</span> {log.formattedSerialLine}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      <div className="mt-2.5 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>Protocol: Chirale_TensorFLowLite v2.0.0 Stream</span>
        <span>Packets Logged: {logs.length}</span>
      </div>
    </div>
  );
};
