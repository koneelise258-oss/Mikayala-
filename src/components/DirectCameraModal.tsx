import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';

interface DirectCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (file: File) => void;
  onOpenGalleryFallback: () => void;
}

export const DirectCameraModal: React.FC<DirectCameraModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
  onOpenGalleryFallback
}) => {
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(false); // Default to environment (back) camera
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop all camera media tracks
  const stopCameraTracks = () => {
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
        audio: false // Pure photo capture only, no audio recording
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
        setCameraError("Autorisation d'accès à la caméra refusée. Veuillez autoriser la caméra dans les paramètres de votre navigateur.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError("Aucun appareil photo détecté sur cet appareil.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError("La caméra est déjà utilisée par une autre application.");
      } else {
        setCameraError("Impossible d'activer la caméra. Veuillez réessayer ou choisir une photo depuis la galerie.");
      }
    }
  };

  // Handle modal lifecycle, scroll lock and Escape key
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
  }, [isOpen, isFrontCamera]);

  if (!isOpen) return null;

  // Capture current frame to a File
  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if using front-facing camera for natural mirror effect
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

        // Stop camera tracks before navigating to preview
        stopCameraTracks();

        // Pass captured file to the photo preview workflow
        onCapturePhoto(file);
      },
      'image/jpeg',
      0.95
    );
  };

  const handleToggleCamera = () => {
    setIsFrontCamera((prev) => !prev);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Appareil photo direct"
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-200"
    >
      {/* Top Header Bar */}
      <div className="h-16 px-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/90 to-transparent">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la caméra"
          className="p-2.5 rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer active:scale-95"
          title="Fermer"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-1.5 text-white/90 font-medium text-sm">
          <Camera size={18} className="text-[#00b894]" />
          <span>Prendre une photo</span>
        </div>

        {hasMultipleCameras ? (
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

      {/* Bottom Shutter Controls */}
      <div className="h-28 pb-safe px-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex items-center justify-around">
        {/* Gallery Shortcut Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenGalleryFallback();
          }}
          aria-label="Galerie photo"
          className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer"
          title="Ouvrir la galerie"
        >
          <ImageIcon size={22} />
        </button>

        {/* Round Shutter Button */}
        <button
          type="button"
          onClick={handleCapture}
          disabled={!!cameraError || isLoadingCamera}
          aria-label="Capturer la photo"
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 transition-transform active:scale-90 shadow-2xl cursor-pointer ${
            cameraError || isLoadingCamera ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'
          }`}
          title="Prendre la photo"
        >
          <div className="w-full h-full rounded-full bg-white active:bg-[#00b894] transition-colors" />
        </button>

        {/* Flip Camera Button */}
        <button
          type="button"
          onClick={handleToggleCamera}
          disabled={!hasMultipleCameras || !!cameraError}
          aria-label="Changer d'objectif"
          className={`w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
            !hasMultipleCameras || cameraError ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title="Inverser caméra avant / arrière"
        >
          <RefreshCw size={22} />
        </button>
      </div>
    </div>
  );
};
