export type TabMode = 'live' | 'simulation' | 'benchmark';

export type StudentModelId = 'resnet50' | 'mobilenetv3' | 'efficientnet' | 'convnext';

export interface DistractionClass {
  id: string; // 'c0' to 'c9'
  name: string;
  category: 'safe' | 'distraction';
  description: string;
  subLabel: string;
  iconName: string;
  color: string;
}

export interface InferenceResult {
  topClassId: string;
  topClassName: string;
  confidence: number;
  isDistracted: boolean;
  probabilities: { id: string; name: string; score: number }[];
  inferenceTimeMs: number;
  fps: number;
}

export interface WokwiTelemetryLog {
  timestamp: string;
  cycleCount: number;
  classIndex: number;
  className: string;
  confidence: number;
  isDistracted: boolean;
  greenLed: boolean;
  redLed: boolean;
  simLatencyMs: number;
  calibratedHardwareMs: number;
  formattedSerialLine: string;
}

export interface StudentModelMetadata {
  id: StudentModelId;
  name: string;
  teacherName: string;
  accuracy: number;
  precision: number;
  recall: number;
  macroF1: number;
  paramsM: number;
  learnableLayers: number;
  mflops: number;
  modelBytes: number;
  rp2040LatencyMs: number;
  rp2040Fps: number;
  file: string;
  isTopPerformer?: boolean;
}
