/**
 * Production-ready Video Recorder Service
 * - Captures video stream using MediaRecorder
 * - Auto-detects optimal supported MIME types (webm/mp4)
 * - Enforces duration and size limits
 */

export interface VideoRecordingResult {
  blob: Blob;
  duration: number; // in seconds
  mimeType: string;
  url: string;
  size: number; // in bytes
}

class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private videoStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private startTime = 0;
  private maxDuration = 60000; // 60 seconds
  private maxSize = 25 * 1024 * 1024; // 25 MB
  private durationTimeout: number | null = null;

  public getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4'
    ];
    if (typeof MediaRecorder !== 'undefined') {
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
    }
    return '';
  }

  public async start(previewElement?: HTMLVideoElement): Promise<void> {
    this.cleanup();
    
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("L'accès à la caméra n'est pas pris en charge.");
    }

    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user'
        },
        audio: true
      });

      if (previewElement) {
        previewElement.srcObject = this.videoStream;
        previewElement.muted = true;
        await previewElement.play();
      }

      this.recordedChunks = [];
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.videoStream, mimeType ? { mimeType } : {});

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
          const currentSize = this.recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0);
          if (currentSize > this.maxSize) {
            this.stop().catch(console.error);
          }
        }
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(500);

      this.durationTimeout = window.setTimeout(() => {
        this.stop().catch(console.error);
      }, this.maxDuration);

    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  public async stop(): Promise<VideoRecordingResult> {
    if (this.durationTimeout) {
      window.clearTimeout(this.durationTimeout);
      this.durationTimeout = null;
    }

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      const hadStream = !!this.videoStream;
      this.cleanup();
      if (hadStream) throw new Error('STOP_ALREADY_CALLED');
      throw new Error('NO_ACTIVE_RECORDING');
    }

    return new Promise((resolve, reject) => {
      const recorder = this.mediaRecorder!;
      const mimeType = recorder.mimeType;
      const duration = Math.round((Date.now() - this.startTime) / 1000);

      recorder.onstop = () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          console.log('[Video final]', {
            type: blob.type,
            size: blob.size,
            mimeType: mimeType,
            durationSeconds: duration
          });
          const url = URL.createObjectURL(blob);
          const result: VideoRecordingResult = {
            blob,
            duration,
            mimeType,
            url,
            size: blob.size
          };
          this.cleanup();
          resolve(result);
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };
      recorder.stop();
    });
  }

  public cancel(): void {
    if (this.mediaRecorder?.state !== 'inactive') {
      try { this.mediaRecorder?.stop(); } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.durationTimeout) {
      window.clearTimeout(this.durationTimeout);
      this.durationTimeout = null;
    }
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(t => t.stop());
      this.videoStream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}

export const videoRecorder = new VideoRecorderService();
