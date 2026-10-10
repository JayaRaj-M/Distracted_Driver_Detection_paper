import React, { useRef } from 'react';
import { DISTRACTION_CLASSES } from '../../constants/classes';
import { Upload, ImageIcon, RefreshCw } from 'lucide-react';

interface ImageUploaderProps {
  onSelectSample: (classIndex: number) => void;
  onCustomImageUpload: (file: File) => void;
  selectedSampleIndex: number | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onSelectSample,
  onCustomImageUpload,
  selectedSampleIndex,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCustomImageUpload(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            Dataset Sample Evaluation
          </h3>
          <p className="text-[11px] text-slate-400">
            Select a State Farm distraction class to simulate cabin camera input
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Image</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {DISTRACTION_CLASSES.map((cls, idx) => {
          const isSelected = selectedSampleIndex === idx;
          return (
            <button
              key={cls.id}
              onClick={() => onSelectSample(idx)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400/80 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    cls.category === 'safe'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {cls.id.toUpperCase()}
                </span>
                {isSelected && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
              </div>
              <div className="text-xs font-medium text-slate-200 truncate">{cls.name}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{cls.subLabel}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
