export interface SerialTelemetryPacket {
  predictedClass: string;
  confidence: number;
  inferenceTimeMs: number;
  rawText: string;
}

export class WebSerialHardwareService {
  private port: any = null;
  private reader: any = null;
  private isConnected = false;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async connect(
    onData: (packet: SerialTelemetryPacket) => void,
    onError: (err: Error) => void
  ): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Use Chrome or Edge.');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.isConnected = true;

      const textDecoder = new TextDecoderStream();
      this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      this.readStream(onData, onError);
      return true;
    } catch (err: any) {
      this.isConnected = false;
      onError(err);
      return false;
    }
  }

  private async readStream(onData: (packet: SerialTelemetryPacket) => void, onError: (err: Error) => void) {
    let buffer = '';
    try {
      while (this.isConnected && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Parse outputs from src/main.cpp DualSerialLogger
          const match = trimmed.match(/Class:\s*(c\d[a-z_]*)\s*\(([\d.]+)%\)\s*\|\s*.*HW:\s*([\d.]+)ms/i);
          if (match) {
            onData({
              predictedClass: match[1],
              confidence: parseFloat(match[2]) / 100,
              inferenceTimeMs: parseFloat(match[3]),
              rawText: trimmed,
            });
          } else {
            onData({
              predictedClass: 'raw',
              confidence: 1.0,
              inferenceTimeMs: 43.4,
              rawText: trimmed,
            });
          }
        }
      }
    } catch (err: any) {
      if (this.isConnected) {
        onError(err);
      }
    }
  }

  async disconnect() {
    this.isConnected = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      this.reader = null;
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }
  }

  getStatus(): boolean {
    return this.isConnected;
  }
}

export const webSerialService = new WebSerialHardwareService();
