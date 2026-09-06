import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, Zap, ZapOff, Sparkles, Eye, Circle, Image, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (mediaUrl: string, type: 'image' | 'video', isHD: boolean, isViewOnce: boolean, caption: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const [isHD, setIsHD] = useState(true);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [cameraError, setCameraError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPreview(null);
      setCaption('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, isFrontCamera]);

  const startCamera = async () => {
    setCameraError(false);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: isFrontCamera ? 'user' : 'environment' },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError(true);
      }
    } catch {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  if (!isOpen) return null;

  const handleTakeSnapshot = () => {
    if (videoRef.current && streamRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFrontCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', isHD ? 0.95 : 0.75);
        setCapturedPreview(dataUrl);
      }
    } else {
      // High quality fallback photo
      const fallbackUrl = isFrontCamera
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000&auto=format&fit=crop&q=80';
      setCapturedPreview(fallbackUrl);
    }
  };

  const handleSend = () => {
    if (!capturedPreview) return;
    onCapture(capturedPreview, mode, isHD, isViewOnce, caption.trim());
    onClose();
  };

  return (
    <div className="always-dark fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in">
      {/* Top Overlay Controls */}
      <div className="p-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
        >
          <X size={26} />
        </button>

        <div className="flex items-center gap-3">
          {/* Flash Toggle */}
          <button
            onClick={() => setFlash(!flash)}
            className={`p-2 rounded-full transition-colors ${flash ? 'text-[#ffeb3b] bg-white/20' : 'text-white hover:bg-white/10'}`}
          >
            {flash ? <Zap size={22} /> : <ZapOff size={22} />}
          </button>

          {/* HD Toggle */}
          <button
            onClick={() => setIsHD(!isHD)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
              isHD ? 'bg-[#00a884] border-[#00a884] text-[#111b21]' : 'border-white/40 text-white hover:bg-white/10'
            }`}
          >
            HD
          </button>

          {/* View Once ("1") Toggle */}
          <button
            onClick={() => setIsViewOnce(!isViewOnce)}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
              isViewOnce ? 'bg-[#00a884] border-[#00a884] text-[#111b21]' : 'border-white/50 text-white hover:bg-white/10'
            }`}
            title="Vue unique"
          >
            1
          </button>
        </div>
      </div>

      {/* Main Viewfinder / Captured Preview */}
      <div className="flex-1 relative flex items-center justify-center bg-[#111b21] overflow-hidden">
        {capturedPreview ? (
          <img
            src={capturedPreview}
            alt="Preview"
            className="w-full h-full object-contain max-h-[85vh]"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
            />
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] p-6 text-center">
                <Camera size={48} className="text-[#8696a0] mb-3" />
                <p className="text-sm font-semibold text-[#e9edef]">Aperçu Caméra Simulation</p>
                <p className="text-xs text-[#8696a0] mt-1">Cliquez sur le déclencheur pour capturer une photo de démonstration instantanée.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 flex flex-col gap-4">
        {capturedPreview ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-[#202c33] rounded-2xl px-4 py-2 border border-[#374248]">
              <input
                type="text"
                placeholder="Ajouter une légende..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => setIsViewOnce(!isViewOnce)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${
                  isViewOnce ? 'bg-[#00a884] border-[#00a884] text-[#111b21]' : 'border-[#8696a0] text-[#8696a0]'
                }`}
              >
                1
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCapturedPreview(null)}
                className="px-4 py-2 text-sm text-white/80 hover:text-white rounded-xl"
              >
                Reprendre
              </button>
              <button
                onClick={handleSend}
                className="px-6 py-2.5 bg-[#00a884] hover:bg-[#029070] text-[#111b21] font-bold text-sm rounded-full flex items-center gap-2 shadow-lg"
              >
                <Check size={18} />
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-around">
            {/* Gallery picker */}
            <label className="p-3 text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors">
              <Image size={24} />
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setCapturedPreview(event.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            {/* Shutter Button */}
            <button
              onClick={handleTakeSnapshot}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-white hover:bg-[#00a884] transition-colors" />
            </button>

            {/* Flip Camera */}
            <button
              onClick={() => setIsFrontCamera(!isFrontCamera)}
              className="p-3 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <RefreshCw size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
