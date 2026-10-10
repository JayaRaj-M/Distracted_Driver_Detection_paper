import { useState, useRef, useCallback, useEffect } from 'react';
import { tfliteEngine } from '../services/tfliteEngine';
import { wokwiSimulator } from '../services/wokwiSimulationService';
import { soundAlert } from '../services/soundAlert';
import { InferenceResult, StudentModelId, WokwiTelemetryLog } from '../types';
import { DISTRACTION_CLASSES } from '../constants/classes';

export function useModelInference() {
  const [activeModelId, setActiveModelId] = useState<StudentModelId>('resnet50');
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<WokwiTelemetryLog | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);

  const changeModel = useCallback((modelId: StudentModelId) => {
    setActiveModelId(modelId);
    tfliteEngine.setModel(modelId);
  }, []);

  const runSingleInference = useCallback(async (
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    forcedClassIndex?: number
  ) => {
    try {
      const result = await tfliteEngine.predictFromSource(source, forcedClassIndex);
      setInferenceResult(result);

      // Find numeric class index
      const classIdx = DISTRACTION_CLASSES.findIndex(c => c.id === result.topClassId);
      const telemetry = wokwiSimulator.processInference(classIdx >= 0 ? classIdx : 0, result.confidence, result.inferenceTimeMs);
      setLatestTelemetry(telemetry);

      if (result.isDistracted && isAudioEnabled) {
        soundAlert.playDistractionWarning();
      }

      return result;
    } catch (err) {
      console.error('Inference error:', err);
      return null;
    }
  }, [isAudioEnabled]);

  const startInferenceLoop = useCallback((videoElement: HTMLVideoElement) => {
    setIsRunning(true);
    setSelectedSampleIndex(null);

    const loop = async () => {
      const now = performance.now();
      // Target ~20-25 FPS inference rate to match RP2040 speed (43.4 ms)
      if (now - lastInferenceTimeRef.current >= 45 && videoElement.readyState >= 2) {
        lastInferenceTimeRef.current = now;
        await runSingleInference(videoElement);
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [runSingleInference]);

  const stopInferenceLoop = useCallback(() => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopInferenceLoop();
    };
  }, [stopInferenceLoop]);

  return {
    activeModelId,
    changeModel,
    activeModelMeta: tfliteEngine.getActiveModel(),
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
  };
}
