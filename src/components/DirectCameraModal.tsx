import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Image as ImageIcon, Video, Square } from 'lucide-react';

interface DirectCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (file: File) => void;
  onCaptureVideo?: (file: File, durationSeconds: number) => void;
  onOpenGalleryFallback: () => void;
}

export const DirectCameraModal: React.FC<DirectCameraModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
  onCaptureVideo,
  onOpenGalleryFallback
}) => {
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(false); // Default to environment (back) camera
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(true);

  // Video recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recordingDurationRef = useRef<number>(0);

  // Helper for supported MIME type for video recording
  const getSupportedMimeType = (): string => {
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
  };

  // Stop all camera media tracks
  const stopCameraTracks = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start Camera
  const startCamera = async () => {
    stopCameraTracks();
    setCameraError(null);
    setIsLoadingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Votre navigateur ne prend pas en charge l'accès direct à la caméra.");
      setIsLoadingCamera(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: isFrontCamera ? 'user' : { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: captureMode === 'video' ? true : false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // If audio fails for video mode, fallback to video-only
        if (captureMode === 'video') {
          stream = await navigator.mediaDevices.getUserMedia({ ...constraints, audio: false });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check if multiple video input devices are available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        setHasMultipleCameras(true);
      }

      setIsLoadingCamera(false);
    } catch (err: any) {
      console.warn('[DirectCameraModal] getUserMedia error:', err);
      setIsLoadingCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Autorisation d'accès à la caméra/micro refusée. Veuillez l'autoriser dans les paramètres du navigateur.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError("Aucun appareil photo détecté sur cet appareil.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError("La caméra est déjà utilisée par une autre application.");
      } else {
        setCameraError("Impossible d'activer la caméra. Veuillez réessayer ou choisir depuis la galerie.");
      }
    }
  };

  // Handle modal lifecycle & camera restart when mode or camera changes
  useEffect(() => {
    if (!isOpen) {
      stopCameraTracks();
      return;
    }

    // Lock background scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    startCamera();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      stopCameraTracks();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isFrontCamera, captureMode]);

  if (!isOpen) return null;

  // Capture current frame to a Photo File
  const handleCapturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isFrontCamera) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Erreur lors de la capture de l'image.");
          return;
        }

        const fileName = `camera_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });

        stopCameraTracks();
        onCapturePhoto(file);
      },
      'image/jpeg',
      0.95
    );
  };

  // Start Video Recording
  const startVideoRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    setRecordingDuration(0);
    recordingDurationRef.current = 0;

    const mimeType = getSupportedMimeType();
    const options = mimeType ? { mimeType } : undefined;

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || 'video/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMime });
        const fileName = `video_${Date.now()}.${ext}`;
        const videoFile = new File([blob], fileName, { type: finalMime });

        const finalDuration = recordingDurationRef.current || 1;

        stopCameraTracks();
        if (onCaptureVideo) {
          onCaptureVideo(videoFile, finalDuration);
        }
      };

      recorder.start(200);
      setIsRecording(true);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        recordingDurationRef.current = elapsed;
      }, 500);
    } catch (err: any) {
      console.error('[DirectCameraModal] Erreur démarrage enregistrement vidéo:', err);
      setCameraError("Impossible d'enregistrer une vidéo sur ce navigateur.");
    }
  };

  // Stop Video Recording
  const stopVideoRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const handleToggleCamera = () => {
    if (isRecording) return;
    setIsFrontCamera((prev) => !prev);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Appareil photo / caméra direct"
      className="always-dark fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="h-16 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/90 to-transparent">
        <button
          type="button"
          onClick={() => {
            if (isRecording) stopVideoRecording();
            onClose();
          }}
          aria-label="Fermer la caméra"
          className="p-2.5 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer active:scale-95"
          title="Fermer"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-1.5 text-white/90 font-medium text-sm">
          {captureMode === 'photo' ? (
            <>
              <Camera size={18} className="text-[#00b894]" />
              <span>Prendre une photo</span>
            </>
          ) : (
            <>
              <Video size={18} className="text-[#ff7675]" />
              <span>Enregistrer une vidéo</span>
            </>
          )}
        </div>

        {hasMultipleCameras && !isRecording ? (
          <button
            type="button"
            onClick={handleToggleCamera}
            aria-label="Changer de caméra (avant/arrière)"
            className="p-2.5 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer active:scale-95"
            title="Inverser la caméra"
          >
            <RefreshCw size={20} className="stroke-[2.2]" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Main Live Camera Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {/* Live video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
        />

        {/* Live Video Recording Badge */}
        {isRecording && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-red-600/90 text-white font-mono font-bold text-sm rounded-full flex items-center gap-2 backdrop-blur-md shadow-xl animate-pulse">
            <div className="w-3 h-3 rounded-full bg-white animate-ping" />
            <span>{formatDuration(recordingDuration)}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoadingCamera && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs gap-3 text-white">
            <div className="w-10 h-10 border-3 border-[#00b894] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[#a29bfe]">Activation de la caméra...</p>
          </div>
        )}

        {/* Camera Permission / Access Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0e0b1c]/95 p-6 text-center z-10">
            <div className="w-16 h-16 rounded-3xl bg-[#ff7675]/15 border border-[#ff7675]/30 flex items-center justify-center text-[#ff7675] mb-4">
              <AlertCircle size={32} />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Accès caméra indisponible</h4>
            <p className="text-xs text-[#a29bfe] max-w-sm mb-6 leading-relaxed">
              {cameraError}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGalleryFallback();
                }}
                aria-label="Choisir depuis la galerie"
                className="w-full py-3 px-4 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <ImageIcon size={18} />
                <span>Choisir depuis la galerie</span>
              </button>
              <button
                type="button"
                onClick={startCamera}
                aria-label="Réessayer l'accès à la caméra"
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-medium text-xs transition-colors cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter & Mode Controls */}
      <div className="pb-safe pt-2 px-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 flex flex-col items-center gap-3">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-center gap-4 bg-black/50 p-1 rounded-full border border-white/10 backdrop-blur-md">
          <button
            type="button"
            disabled={isRecording}
            onClick={() => setCaptureMode('photo')}
            className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              captureMode === 'photo'
                ? 'bg-white text-black shadow-md scale-105'
                : 'text-white/70 hover:text-white'
            }`}
          >
            PHOTO
          </button>
          <button
            type="button"
            disabled={isRecording}
            onClick={() => setCaptureMode('video')}
            className={`px-4 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              captureMode === 'video'
                ? 'bg-[#ff7675] text-white shadow-md scale-105'
                : 'text-white/70 hover:text-white'
            }`}
          >
            VIDÉO
          </button>
        </div>

        {/* Shutter Bar */}
        <div className="h-20 w-full flex items-center justify-around">
          {/* Gallery Shortcut Button */}
          <button
            type="button"
            disabled={isRecording}
            onClick={() => {
              onClose();
              onOpenGalleryFallback();
            }}
            aria-label="Galerie"
            className={`w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
              isRecording ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Ouvrir la galerie"
          >
            <ImageIcon size={22} />
          </button>

          {/* Capture / Record Trigger Button */}
          {captureMode === 'photo' ? (
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={!!cameraError || isLoadingCamera}
              aria-label="Capturer la photo"
              className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 shadow-2xl cursor-pointer ${
                cameraError || isLoadingCamera ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'
              }`}
              title="Prendre la photo"
            >
              <div className="w-full h-full rounded-full bg-white active:bg-[#00b894] transition-colors" />
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopVideoRecording : startVideoRecording}
              disabled={!!cameraError || isLoadingCamera}
              aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement vidéo"}
              className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 shadow-2xl cursor-pointer ${
                cameraError || isLoadingCamera ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'
              }`}
              title={isRecording ? "Arrêter la vidéo" : "Filmer la vidéo"}
            >
              <div
                className={`transition-all duration-200 ${
                  isRecording
                    ? 'w-8 h-8 bg-red-500 rounded-sm'
                    : 'w-full h-full rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700'
                }`}
              />
            </button>
          )}

          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={handleToggleCamera}
            disabled={!hasMultipleCameras || !!cameraError || isRecording}
            aria-label="Changer d'objectif"
            className={`w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
              !hasMultipleCameras || cameraError || isRecording ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title="Inverser caméra avant / arrière"
          >
            <RefreshCw size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};

