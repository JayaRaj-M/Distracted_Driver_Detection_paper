import React from 'react';
import { ShieldCheck, Microchip, Layers, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 text-xs py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-slate-800/60">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-1.5 mb-2">
              <Microchip className="w-4 h-4 text-cyan-400" />
              Microcontroller TinyML
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Shared student architecture deployed with full INT8 quantization on Raspberry Pi Pico RP2040 and ESP32 platforms.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold flex items-center gap-1.5 mb-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Knowledge Distillation
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Offline supervision from ConvNeXt, EfficientNet-B0, MobileNetV3-Small, and ResNet50 teachers on State Farm dataset.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Hardware Verification
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              22,728 bytes INT8 flash footprint, 204.8 KB Tensor Arena, and physical RP2040 execution time of 43.4 ms (23.04 FPS).
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold flex items-center gap-1.5 mb-2">
              <Award className="w-4 h-4 text-yellow-400" />
              Publication Target
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Manuscript formatted for Journal of Real-Time Image Processing (Springer JRTIP). All data 100% traceable.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div>
            © 2026 TinyDistract Research Group • Microcontroller-Scale Driver Distraction Detection
          </div>
          <div className="flex items-center space-x-4">
            <span>State Farm 10-Class Dataset</span>
            <span>•</span>
            <span>TensorFlow Lite Micro</span>
            <span>•</span>
            <span>Wokwi RP2040 Sim</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
