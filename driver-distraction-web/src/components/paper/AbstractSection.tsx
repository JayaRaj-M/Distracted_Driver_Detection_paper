import React from 'react';
import { BookOpen, FileText, CheckCircle2, Download } from 'lucide-react';

export const AbstractSection: React.FC = () => {
  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono uppercase text-cyan-400 font-bold tracking-wider">
            Journal Manuscript Summary
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Compact Transfer-Learned Student Networks for Real-Time Driver Distraction Classification on RP2040-Class Hardware
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Target: Springer Journal of Real-Time Image Processing (JRTIP)
          </p>
        </div>

        <a
          href="/docs/paper_f.pdf"
          download="Compact_TinyML_Driver_Distraction_JRTIP_Manuscript.pdf"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 self-start md:self-auto transition"
        >
          <Download className="w-4 h-4" />
          <span>Download Complete PDF (5.7 MB)</span>
        </a>
      </div>

      {/* Abstract Content */}
      <div className="space-y-3.5 text-sm text-slate-300 leading-relaxed text-justify">
        <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
          Abstract
        </h3>
        <p>
          Driver distraction detection is an important component of intelligent transportation systems, but conventional deep visual models are often mismatched to microcontroller-class deployment. This research presents a response-based teacher-student knowledge distillation approach to construct ultra-compact TensorFlow Lite Micro students for ten-class driver-behavior classification on the State Farm dataset.
        </p>
        <p>
          Four offline teacher configurations—<b>ConvNeXt</b>, <b>EfficientNet-B0</b>, <b>MobileNetV3-Small</b>, and <b>ResNet50</b>—are evaluated while sharing a compact 17-layer student deployment profile containing <b>5,530 parameters (0.00553 M)</b>, <b>7.81 MFLOPs</b>, and an INT8 model size of <b>22,728 bytes</b>.
        </p>
        <p>
          On a driver-wise validation split of 5,042 images across unseen drivers, the ResNet50-derived student achieves <b>59.28% validation accuracy</b> and <b>58.71% macro F1-score</b>. Physical and cycle-accurate simulation on the <b>Raspberry Pi Pico (RP2040)</b> demonstrates <b>43.4 ms latency</b>, delivering a real-time throughput of <b>23.04 FPS</b> inside a 204.8 KB Tensor Arena.
        </p>
      </div>

      {/* Core Scientific Contributions */}
      <div className="pt-4 border-t border-slate-800">
        <h4 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-3">
          Key Research Contributions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-white">Microcontroller-First Student CNN:</b>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Depthwise separable architecture scaled to 5.53K parameters to fit in SRAM without requiring external DRAM.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-white">Multi-Teacher Distillation Benchmarking:</b>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Comparative analysis isolating teacher representation effects under a fixed student hardware budget.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-white">Full INT8 Quantization Pipeline:</b>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Post-training quantization achieving 22.7 KB flash footprint with 43.4 ms latency on ARM Cortex-M0+.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <b className="text-white">100% Traceable Research Evidence:</b>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Full transparency with driver-wise splits, memory arenas, and physical hardware timings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
