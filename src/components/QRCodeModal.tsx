import React, { useState, useRef, useEffect } from 'react';
import { X, QrCode, Camera, Share2, Download, ShieldCheck, Check } from 'lucide-react';
import { User } from '../types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'my_code' | 'scan_code'>('my_code');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (activeTab === 'scan_code' && isOpen) {
      startCameraScan();
    } else {
      stopCameraScan();
    }

    return () => {
      stopCameraScan();
    };
  }, [activeTab, isOpen]);

  const startCameraScan = async () => {
    setIsScanning(true);
    setScanSuccess(false);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch {
      // Fallback
    }
  };

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSimulateScan = () => {
    setScanSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#202c33] text-[#e9edef] rounded-2xl w-full max-w-sm overflow-hidden border border-[#374248] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#374248]">
          <h3 className="font-semibold text-base text-[#e9edef]">Code QR WhatsApp</h3>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#374248] text-sm">
          <button
            onClick={() => setActiveTab('my_code')}
            className={`flex-1 py-3 text-center font-medium transition-colors border-b-2 ${
              activeTab === 'my_code' ? 'text-[#00a884] border-[#00a884]' : 'text-[#8696a0] border-transparent hover:text-[#e9edef]'
            }`}
          >
            Mon code
          </button>
          <button
            onClick={() => setActiveTab('scan_code')}
            className={`flex-1 py-3 text-center font-medium transition-colors border-b-2 ${
              activeTab === 'scan_code' ? 'text-[#00a884] border-[#00a884]' : 'text-[#8696a0] border-transparent hover:text-[#e9edef]'
            }`}
          >
            Scanner un code
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'my_code' ? (
          <div className="p-6 flex flex-col items-center text-center">
            {/* White QR Code Card */}
            <div className="bg-white p-5 rounded-2xl shadow-xl w-64 flex flex-col items-center text-[#111b21] relative mb-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md -mt-10 mb-2"
              />
              <h4 className="font-bold text-base">{currentUser.name}</h4>
              <p className="text-xs text-[#54656f] mb-3">Contact WhatsApp</p>

              {/* Realistic SVG QR Code graphic */}
              <div className="w-44 h-44 border-4 border-[#00a884] p-1 rounded-xl flex items-center justify-center relative bg-white">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#111b21] fill-current">
                  {/* Outer corner squares */}
                  <rect x="5" y="5" width="28" height="28" rx="4" fill="#111b21" />
                  <rect x="9" y="9" width="20" height="20" rx="2" fill="white" />
                  <rect x="13" y="13" width="12" height="12" rx="1" fill="#00a884" />

                  <rect x="67" y="5" width="28" height="28" rx="4" fill="#111b21" />
                  <rect x="71" y="9" width="20" height="20" rx="2" fill="white" />
                  <rect x="75" y="13" width="12" height="12" rx="1" fill="#00a884" />

                  <rect x="5" y="67" width="28" height="28" rx="4" fill="#111b21" />
                  <rect x="9" y="71" width="20" height="20" rx="2" fill="white" />
                  <rect x="13" y="75" width="12" height="12" rx="1" fill="#00a884" />

                  {/* QR Pattern dots */}
                  <rect x="38" y="10" width="6" height="6" rx="1" />
                  <rect x="50" y="10" width="6" height="6" rx="1" />
                  <rect x="38" y="22" width="6" height="6" rx="1" />
                  <rect x="50" y="26" width="6" height="6" rx="1" />
                  
                  <rect x="10" y="38" width="6" height="6" rx="1" />
                  <rect x="22" y="44" width="6" height="6" rx="1" />
                  <rect x="38" y="38" width="8" height="8" rx="2" fill="#00a884" />
                  <rect x="52" y="40" width="6" height="6" rx="1" />
                  <rect x="65" y="38" width="6" height="6" rx="1" />
                  <rect x="80" y="42" width="6" height="6" rx="1" />

                  <rect x="38" y="52" width="6" height="6" rx="1" />
                  <rect x="52" y="54" width="8" height="8" rx="2" fill="#00a884" />
                  <rect x="70" y="52" width="6" height="6" rx="1" />
                  <rect x="84" y="52" width="6" height="6" rx="1" />

                  <rect x="38" y="68" width="6" height="6" rx="1" />
                  <rect x="50" y="74" width="6" height="6" rx="1" />
                  <rect x="42" y="84" width="6" height="6" rx="1" />
                  <rect x="68" y="70" width="6" height="6" rx="1" />
                  <rect x="82" y="78" width="6" height="6" rx="1" />
                </svg>
              </div>
            </div>

            <p className="text-xs text-[#8696a0] max-w-xs">
              Votre code QR est privé. Si vous le partagez avec quelqu'un, cette personne pourra vous envoyer des messages.
            </p>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center text-center">
            {/* Viewfinder scanner box */}
            <div className="w-64 h-64 bg-[#111b21] rounded-2xl overflow-hidden relative border-2 border-[#00a884] flex items-center justify-center mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Scan target reticle */}
              <div className="absolute inset-4 border border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-[#00a884] shadow-[0_0_8px_#00a884] animate-pulse" />
              </div>

              {scanSuccess && (
                <div className="absolute inset-0 bg-[#00a884]/90 flex flex-col items-center justify-center text-[#111b21] z-20">
                  <Check size={48} className="stroke-[3]" />
                  <p className="font-bold text-base mt-2">Code reconnu !</p>
                </div>
              )}
            </div>

            <p className="text-xs text-[#8696a0] mb-3">
              Pointez votre appareil vers le code QR WhatsApp d'un contact pour le scanner.
            </p>

            <button
              onClick={handleSimulateScan}
              className="px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] border border-[#374248] rounded-xl text-xs font-semibold text-[#00a884] transition-colors"
            >
              Simuler la détection du code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
