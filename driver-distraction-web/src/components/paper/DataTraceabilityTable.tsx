import React from 'react';
import { Database, FileCheck, ExternalLink } from 'lucide-react';

export const DataTraceabilityTable: React.FC = () => {
  const traceabilityRows = [
    {
      item: 'Dataset Class Counts',
      value: '22,424 total images; c0–c9 driver classes',
      source: 'res/tables/dataset_class_image_counts.docx',
      notes: 'State Farm Kaggle benchmark dataset',
    },
    {
      item: 'Driver-Wise Validation Split',
      value: '17,382 train images; 5,042 validation images',
      source: 'distilled_from_*_outputs/driver_wise_split_summary.csv',
      notes: 'Unseen driver partition evaluated across all 4 student models',
    },
    {
      item: 'Four-Model Classification Metrics',
      value: 'ResNet50 (59.28%), MobileNetV3 (54.92%), EfficientNet (52.28%), ConvNeXt (44.90%)',
      source: 'res/tables/Our_Four_Distilled_Model_Accuracy_Precision_Recall_F1.docx',
      notes: 'Authoritative validation accuracy, precision, recall, and macro F1',
    },
    {
      item: 'Shared Student Profile',
      value: '17 layers; 10 learnable; 0.00553M params (5,530); 7.81M FLOPs',
      source: 'res/tables/Four_Distilled_Models_Performance_on_Each_Hardware.docx',
      notes: 'Standard depthwise-separable conv convention (multiply-add = 2 FLOPs)',
    },
    {
      item: 'Quantized INT8 Model Size',
      value: '22,728 bytes (22.2 KB)',
      source: 'model/student_*_96_rgb_int8.tflite',
      notes: 'Matches all four shared-profile 96x96 RGB student binaries',
    },
    {
      item: 'RP2040 Microcontroller Timing',
      value: '43.4 ms latency; 23.04 FPS throughput',
      source: 'res/tables/Representational_Four_Model_Hardware_Performance.docx',
      notes: 'Physical hardware timing running at 133 MHz in 204.8 KB Tensor Arena',
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            Artifact Data Traceability Matrix
          </h3>
          <p className="text-[11px] text-slate-400">
            Mapping all manuscript claims, numbers, and figures to verifiable repository files (DATA_TRACEABILITY.md)
          </p>
        </div>

        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <FileCheck className="w-3.5 h-3.5" /> 100% Traceable
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
              <th className="py-2.5 px-3">Manuscript Item</th>
              <th className="py-2.5 px-3">Authoritative Value</th>
              <th className="py-2.5 px-3">Source Repository File</th>
              <th className="py-2.5 px-3">Traceability Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {traceabilityRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-900/40 transition">
                <td className="py-3 px-3 font-semibold text-white">{row.item}</td>
                <td className="py-3 px-3 text-cyan-300 font-bold">{row.value}</td>
                <td className="py-3 px-3 text-slate-400 text-[11px] underline decoration-slate-700">
                  {row.source}
                </td>
                <td className="py-3 px-3 text-slate-400 text-[11px]">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
