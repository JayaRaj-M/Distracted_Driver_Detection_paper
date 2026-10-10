import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, Play, Square, Crosshair, Sparkles } from 'lucide-react';
import { InferenceResult } from '../../types';

interface WebcamViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  hasPermission: boolean | null;
  errorMsg: string | null;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  onStartInference: () => void;
  onStopInference: () => void;
  result: InferenceResult | null;
  selectedSampleName?: string | null;
}

export const WebcamView: React.FC<WebcamViewProps> = ({
  videoRef,
  isActive,
  hasPermission,
  errorMsg,
  onStart,
  onStop,
  isRunning,
  onStartInference,
  onStopInference,
  result,
  selectedSampleName,
}) => {
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);

  // Draw 96x96 crop preview
  useEffect(() => {
    if (!videoRef.current || !canvasPreviewRef.current || !isRunning) return;

    let frameId: number;
    const ctx = canvasPreviewRef.current.getContext('2d');

    const updatePreview = () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 96, 96);
      }
      frameId = requestAnimationFrame(updatePreview);
    };

    frameId = requestAnimationFrame(updatePreview);
    return () => cancelAnimationFrame(frameId);
  }, [isRunning, videoRef]);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Driver Cabin Camera Feed
          </h3>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          {result && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {result.inferenceTimeMs}ms • {result.fps} FPS
            </span>
          )}
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">96×96 Input</span>
        </div>
      </div>

      {/* Video Stream Container */}
      <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        />

        {/* Bounding Box HUD Overlay */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-72 sm:w-80 h-56 border border-dashed border-cyan-400/50 rounded-xl flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-cyan-400/50" />
              <span className="absolute -top-2.5 left-3 bg-slate-900 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-cyan-500/40">
                Driver Cabin Zone: 96×96 RGB
              </span>
            </div>
          </div>
        )}

        {/* Fallback when webcam is off */}
        {!isActive && (
          <div className="text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-600">
              <CameraOff className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-300">Webcam Not Started</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                {errorMsg || 'Click "Start Camera" or select any dataset sample image below to run real-time inference.'}
              </p>
            </div>
            {selectedSampleName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Active Sample: {selectedSampleName}
              </div>
            )}
          </div>
        )}

        {/* Mini 96x96 Model Tensor View */}
        <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 flex flex-col items-center">
          <canvas
            ref={canvasPreviewRef}
            width={96}
            height={96}
            className="w-12 h-12 rounded bg-slate-950 object-cover border border-slate-800"
          />
          <span className="text-[9px] font-mono text-slate-400 mt-1">96×96 Tensor</span>
        </div>
      </div>

      {/* Camera Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          {!isActive ? (
            <button
              onClick={onStart}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition duration-150"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition duration-150"
            >
              <CameraOff className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}

          {isActive && (
            <>
              {!isRunning ? (
                <button
                  onClick={onStartInference}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition duration-150"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Inference</span>
                </button>
              ) : (
                <button
                  onClick={onStopInference}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 transition duration-150"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Pause Loop</span>
                </button>
              )}
            </>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>In-Browser TFLite WASM</span>
        </div>
      </div>
    </div>
  );
};
