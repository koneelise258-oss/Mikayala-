/**
 * Production-ready Audio Recorder Service
 * - Captures audio stream using Web Audio API & MediaRecorder
 * - Auto-detects optimal supported MIME types across iOS / Android / Desktop browsers
 * - Real-time audio waveform extraction via AnalyserNode
 * - Provides start(), stop(), pause(), resume(), and cancel() methods
 */

export interface RecordingResult {
  blob: Blob;
  duration: number; // in seconds
  waveform: number[]; // normalized 0-100 amplitude values
  mimeType: string;
  url: string;
}

export type WaveformCallback = (levels: number[], currentVolume: number) => void;

class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private recordedChunks: Blob[] = [];
  
  private startTime = 0;
  private pauseTime = 0;
  private totalPausedDuration = 0;
  private isPaused = false;
  
  private animationFrameId: number | null = null;
  private sampledWaveform: number[] = [];
  private onWaveformUpdate: WaveformCallback | null = null;

  /**
   * Automatically detects the best supported audio MIME type for the user's browser
   */
  public getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') {
      return 'audio/mp4';
    }

    const preferredTypes = [
      'audio/mp4',
      'audio/aac',
      'audio/m4a',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav'
    ];

    for (const type of preferredTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return ''; // Browser default
  }

  /**
   * Starts microphone recording with live waveform analysis
   */
  public async start(onWaveform?: WaveformCallback): Promise<void> {
    // Clean up previous state if any
    this.cancel();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("L'accès au microphone n'est pas pris en charge par ce navigateur.");
    }

    try {
      // 1. Request microphone stream with voice-optimized constraints
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.recordedChunks = [];
      this.sampledWaveform = [];
      this.onWaveformUpdate = onWaveform || null;
      this.isPaused = false;
      this.totalPausedDuration = 0;
      this.startTime = Date.now();

      // 2. Setup Web Audio API AnalyserNode for live visualization
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 64;
        this.analyserNode.smoothingTimeConstant = 0.8;

        this.sourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
        this.sourceNode.connect(this.analyserNode);

        // Start waveform extraction loop
        this.startWaveformMonitoring();
      }

      // 3. Initialize MediaRecorder with detected MIME type
      const mimeType = this.getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Collect audio chunks every 100ms
      this.mediaRecorder.start(100);
    } catch (error: any) {
      this.cleanup();
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Permission microphone refusée. Veuillez autoriser le micro dans vos paramètres.');
      }
      throw error;
    }
  }

  /**
   * Monitors live microphone frequency and amplitude
   */
  private startWaveformMonitoring() {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let sampleCounter = 0;

    const sample = () => {
      if (!this.analyserNode || this.isPaused) {
        if (this.mediaRecorder?.state === 'recording') {
          this.animationFrameId = requestAnimationFrame(sample);
        }
        return;
      }

      this.analyserNode.getByteFrequencyData(dataArray);

      // Calculate average volume level (0 - 100)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = Math.round((sum / bufferLength / 255) * 100);
      const normalizedVolume = Math.min(100, Math.max(10, average * 1.5));

      // Sample a waveform point every ~150ms
      sampleCounter++;
      if (sampleCounter % 9 === 0) {
        this.sampledWaveform.push(normalizedVolume);
      }

      // Extract 16-24 frequency bars for visualizer
      const levels: number[] = [];
      const step = Math.max(1, Math.floor(bufferLength / 16));
      for (let i = 0; i < bufferLength; i += step) {
        const val = Math.round((dataArray[i] / 255) * 100);
        levels.push(Math.max(8, val));
      }

      if (this.onWaveformUpdate) {
        this.onWaveformUpdate(levels, normalizedVolume);
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.animationFrameId = requestAnimationFrame(sample);
      }
    };

    this.animationFrameId = requestAnimationFrame(sample);
  }

  /**
   * Pauses the audio recording
   */
  public pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.pauseTime = Date.now();
    }
  }

  /**
   * Resumes the paused audio recording
   */
  public resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.totalPausedDuration += Date.now() - this.pauseTime;
      this.isPaused = false;
      this.mediaRecorder.resume();
    }
  }

  /**
   * Stops recording and returns the final Blob, duration, and processed waveform
   */
  public async stop(): Promise<RecordingResult> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      const isActuallyRecording = this.audioStream !== null;
      this.cleanup();
      if (isActuallyRecording) {
        // Was cleaning up but had stream, probably already stopped
        throw new Error('STOP_ALREADY_CALLED');
      }
      throw new Error('NO_ACTIVE_RECORDING');
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder!;
      const mimeType = recorder.mimeType || this.getSupportedMimeType() || 'audio/webm';
      const rawDuration = (Date.now() - this.startTime - this.totalPausedDuration) / 1000;
      const duration = Math.max(1, Math.round(rawDuration));

      recorder.onstop = () => {
        try {
          if (this.recordedChunks.length === 0) {
            this.cleanup();
            reject(new Error('EMPTY_RECORDING'));
            return;
          }

          const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
          console.log('[Audio final]', {
            type: audioBlob.type,
            size: audioBlob.size,
          });
          const url = URL.createObjectURL(audioBlob);

          // Standardize waveform to 20 points
          const finalWaveform = this.normalizeWaveform(this.sampledWaveform, 20);

          const result: RecordingResult = {
            blob: audioBlob,
            duration,
            waveform: finalWaveform,
            mimeType,
            url
          };

          this.cleanup();
          resolve(result);
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Cancels the current recording without saving
   */
  public cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore stop error on cancellation
      }
    }
    this.cleanup();
  }

  /**
   * Normalizes an arbitrary sampled waveform array to a fixed number of bars (e.g. 20)
   */
  private normalizeWaveform(samples: number[], targetLength = 20): number[] {
    if (samples.length === 0) {
      return Array.from({ length: targetLength }, () => Math.floor(Math.random() * 50) + 25);
    }

    if (samples.length === targetLength) {
      return samples;
    }

    const result: number[] = [];
    const step = samples.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const startIndex = Math.floor(i * step);
      const endIndex = Math.min(samples.length, Math.floor((i + 1) * step));
      let sum = 0;
      let count = 0;

      for (let j = startIndex; j < endIndex; j++) {
        sum += samples[j];
        count++;
      }

      const avg = count > 0 ? Math.round(sum / count) : 30;
      result.push(Math.max(15, Math.min(100, avg)));
    }

    return result;
  }

  /**
   * Releases hardware streams and audio contexts
   */
  private cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.onWaveformUpdate = null;
  }

  /**
   * Returns current recording state
   */
  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}

export const audioRecorder = new AudioRecorderService();
export default audioRecorder;
