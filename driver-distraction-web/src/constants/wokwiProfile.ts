export interface WokwiBoardProfile {
  boardType: 'Raspberry Pi Pico (RP2040)';
  microcontroller: 'RP2040 Dual ARM Cortex-M0+';
  clockFrequencyMhz: 133;
  sramTotalBytes: 270336; // 264 KB
  tensorArenaBytes: 204800; // 200 KB
  flashUsageBytes: 22728; // 22.7 KB INT8
  pins: {
    greenLed: number; // GP12: Safe Driving
    redLed: number; // GP13: Distraction Warning
    uartTx: number; // GP0
    uartRx: number; // GP1
  };
  calibratedHardwareLatencyMs: 43.4;
  calibratedFps: 23.04;
  wokwiEmulationSpeedMultiplier: 20.0; // from src/main.cpp:52
}

export const WOKWI_PROFILE: WokwiBoardProfile = {
  boardType: 'Raspberry Pi Pico (RP2040)',
  microcontroller: 'RP2040 Dual ARM Cortex-M0+',
  clockFrequencyMhz: 133,
  sramTotalBytes: 270336,
  tensorArenaBytes: 204800,
  flashUsageBytes: 22728,
  pins: {
    greenLed: 12,
    redLed: 13,
    uartTx: 0,
    uartRx: 1,
  },
  calibratedHardwareLatencyMs: 43.4,
  calibratedFps: 23.04,
  wokwiEmulationSpeedMultiplier: 20.0,
};
