import { WOKWI_PROFILE } from '../constants/wokwiProfile';
import { DISTRACTION_CLASSES } from '../constants/classes';
import { WokwiTelemetryLog } from '../types';

export class WokwiSimulationService {
  private cycleCount = 0;
  private logHistory: WokwiTelemetryLog[] = [];
  private maxHistory = 100;

  processInference(classIndex: number, confidence: number, inferenceLatencyMs?: number): WokwiTelemetryLog {
    this.cycleCount++;
    const isDistracted = classIndex > 0;
    const cls = DISTRACTION_CLASSES[classIndex] || DISTRACTION_CLASSES[0];

    // Hardware pin logic matching src/main.cpp:77-80
    const greenLed = !isDistracted;
    const redLed = isDistracted;

    const calibratedHardwareMs = inferenceLatencyMs ?? WOKWI_PROFILE.calibratedHardwareLatencyMs;
    const simLatencyMs = +(calibratedHardwareMs * WOKWI_PROFILE.wokwiEmulationSpeedMultiplier).toFixed(1);

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const formattedSerialLine = `[UART] #${String(this.cycleCount).padStart(4, '0')} | Class: ${cls.id}_${cls.name.toLowerCase().replace(/[\s\(\)\/-]+/g, '_')} (${(confidence * 100).toFixed(1)}%) | TensorArena: 200KB/264KB | HW: ${calibratedHardwareMs}ms (${(1000 / calibratedHardwareMs).toFixed(1)} FPS) | Pins: [GP12=${greenLed ? 'HIGH' : 'LOW '}, GP13=${redLed ? 'HIGH' : 'LOW '}]`;

    const logEntry: WokwiTelemetryLog = {
      timestamp: timeStr,
      cycleCount: this.cycleCount,
      classIndex,
      className: cls.name,
      confidence,
      isDistracted,
      greenLed,
      redLed,
      simLatencyMs,
      calibratedHardwareMs,
      formattedSerialLine,
    };

    this.logHistory.unshift(logEntry);
    if (this.logHistory.length > this.maxHistory) {
      this.logHistory.pop();
    }

    return logEntry;
  }

  getHistory(): WokwiTelemetryLog[] {
    return this.logHistory;
  }

  clearHistory() {
    this.logHistory = [];
  }
}

export const wokwiSimulator = new WokwiSimulationService();
