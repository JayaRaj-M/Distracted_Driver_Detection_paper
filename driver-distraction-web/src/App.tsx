import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { TabMode } from './types';

// Tab 1 Components (Live Vision Demo)
import { WebcamView } from './components/live/WebcamView';
import { StatusIndicator } from './components/live/StatusIndicator';
import { ClassProbabilityBar } from './components/live/ClassProbabilityBar';
import { ModelSelector } from './components/live/ModelSelector';
import { ImageUploader } from './components/live/ImageUploader';

// Tab 2 Components (Wokwi Hardware Simulation)
import { VirtualPicoBoard } from './components/simulation/VirtualPicoBoard';
import { SerialMonitorView } from './components/simulation/SerialMonitorView';
import { MemoryArenaGauge } from './components/simulation/MemoryArenaGauge';
import { SimulationControls } from './components/simulation/SimulationControls';

// Tab 3 Components (4-Student Benchmark)
import { ModelRadarChart } from './components/benchmark/ModelRadarChart';
import { ConfusionMatrixViewer } from './components/benchmark/ConfusionMatrixViewer';
import { HardwareComparisonTable } from './components/benchmark/HardwareComparisonTable';
import { ArchitectureExplorer } from './components/benchmark/ArchitectureExplorer';

// Hooks & Services
import { useWebcam } from './hooks/useWebcam';
import { useModelInference } from './hooks/useModelInference';
import { DISTRACTION_CLASSES } from './constants/classes';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('live');

  // Webcam Hook
  const {
    videoRef,
    isActive: isWebcamActive,
    hasPermission,
    errorMsg,
    startWebcam,
    stopWebcam,
  } = useWebcam();

  // ML Inference & Simulation Hook
  const {
    activeModelId,
    changeModel,
    activeModelMeta,
    inferenceResult,
    latestTelemetry,
    isAudioEnabled,
    setIsAudioEnabled,
    isRunning,
    startInferenceLoop,
    stopInferenceLoop,
    runSingleInference,
    selectedSampleIndex,
    setSelectedSampleIndex,
  } = useModelInference();

  // Handle sample image click
  const handleSelectSample = async (classIndex: number) => {
    setSelectedSampleIndex(classIndex);
    // Create an offscreen synthetic canvas simulating the selected class image
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background tint
      ctx.fillStyle = classIndex === 0 ? '#10b981' : '#ef4444';
      ctx.fillRect(0, 0, 96, 96);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(DISTRACTION_CLASSES[classIndex].id.toUpperCase(), 48, 54);
    }
    await runSingleInference(canvas, classIndex);
  };

  // Handle custom image file upload
  const handleCustomUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        runSingleInference(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Auto-run single baseline prediction on mount for initial telemetry
  useEffect(() => {
    handleSelectSample(0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30">
      <div>
        <Header />
        <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* TAB 1: LIVE VISION HUD */}
          {activeTab === 'live' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Status Alert HUD */}
              <StatusIndicator
                result={inferenceResult}
                isAudioEnabled={isAudioEnabled}
                onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
                isRunning={isRunning}
              />

              {/* Main 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Camera Feed & Sample Uploader (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <WebcamView
                    videoRef={videoRef}
                    isActive={isWebcamActive}
                    hasPermission={hasPermission}
                    errorMsg={errorMsg}
                    onStart={startWebcam}
                    onStop={stopWebcam}
                    isRunning={isRunning}
                    onStartInference={() => {
                      if (videoRef.current) startInferenceLoop(videoRef.current);
                    }}
                    onStopInference={stopInferenceLoop}
                    result={inferenceResult}
                    selectedSampleName={
                      selectedSampleIndex !== null
                        ? DISTRACTION_CLASSES[selectedSampleIndex]?.name
                        : null
                    }
                  />

                  <ImageUploader
                    onSelectSample={handleSelectSample}
                    onCustomImageUpload={handleCustomUpload}
                    selectedSampleIndex={selectedSampleIndex}
                  />
                </div>

                {/* Right Column: Model Selector & Probability Distribution (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <ModelSelector
                    activeModelId={activeModelId}
                    onSelectModel={changeModel}
                    activeModelMeta={activeModelMeta}
                  />

                  <ClassProbabilityBar result={inferenceResult} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WOKWI HARDWARE SIMULATION */}
          {activeTab === 'simulation' && (
            <div className="space-y-6 animate-fadeIn">
              <VirtualPicoBoard telemetry={latestTelemetry} />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <SerialMonitorView latestTelemetry={latestTelemetry} />
                  <SimulationControls
                    onInjectClass={handleSelectSample}
                    selectedClassIndex={selectedSampleIndex}
                  />
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <MemoryArenaGauge />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 4-STUDENT BENCHMARK */}
          {activeTab === 'benchmark' && (
            <div className="space-y-6 animate-fadeIn">
              <ModelRadarChart />
              <ConfusionMatrixViewer />
              <HardwareComparisonTable />
              <ArchitectureExplorer />
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};
