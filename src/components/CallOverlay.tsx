import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  User as UserIcon, 
  Volume2, 
  VolumeX,
  RefreshCw,
  Minimize2,
  Maximize2,
  Activity,
  ShieldCheck,
  Headphones,
  Sliders,
  ChevronDown,
  Sparkles,
  Wifi
} from 'lucide-react';
import { User, CallType, CallNetworkStats, AudioDeviceOption } from '../types';
import { formatDuration } from '../utils/formatters';
import { callService } from '../services/callService';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface CallOverlayProps {
  isOpen: boolean;
  type: CallType;
  status: 'connecting' | 'ringing' | 'ongoing' | 'incoming';
  partnerUser: User;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onHangup: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  isOpen,
  type,
  status,
  partnerUser,
  localStream,
  remoteStream,
  onHangup,
  onAccept,
  onDecline
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pipLocalVideoRef = useRef<HTMLVideoElement>(null);
  const pipRemoteVideoRef = useRef<HTMLVideoElement>(null);

  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isPipMode, setIsPipMode] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAudioDevicesOpen, setIsAudioDevicesOpen] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string>('default');
  const [currentCallType, setCurrentCallType] = useState<CallType>(type);
  const [isFlippingCamera, setIsFlippingCamera] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Network quality stats
  const [networkStats, setNetworkStats] = useState<CallNetworkStats>({
    quality: 'excellent',
    rttMs: 28,
    packetLossPercent: 0,
    bitrateKbps: 180,
    frameRate: 30,
    resolution: '640x480',
    audioCodec: 'Opus 48kHz (E2EE)',
    videoCodec: 'VP8 / H.264 HD'
  });

  // Keep internal call type synced
  useEffect(() => {
    setCurrentCallType(type);
  }, [type]);

  // Handle local video element binding
  useEffect(() => {
    const bindLocalStream = (videoEl: HTMLVideoElement | null) => {
      if (videoEl && localStream) {
        videoEl.srcObject = localStream;
      }
    };
    bindLocalStream(localVideoRef.current);
    bindLocalStream(pipLocalVideoRef.current);
  }, [localStream, isOpen, isPipMode, isCameraOff, currentCallType]);

  // Handle remote video element binding
  useEffect(() => {
    const bindRemoteStream = (videoEl: HTMLVideoElement | null) => {
      if (videoEl && remoteStream) {
        videoEl.srcObject = remoteStream;
      }
    };
    bindRemoteStream(remoteVideoRef.current);
    bindRemoteStream(pipRemoteVideoRef.current);
  }, [remoteStream, isOpen, isPipMode, currentCallType]);

  // Handle remote audio element binding & autoplay check
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (audioEl && remoteStream) {
      audioEl.srcObject = remoteStream;
      audioEl.play()
        .then(() => {
          setAudioBlocked(false);
        })
        .catch((err) => {
          console.warn('[Call] Audio autoplay blocked:', err);
          setAudioBlocked(true);
        });
    } else if (audioEl) {
      audioEl.srcObject = null;
    }

    return () => {
      if (audioEl) {
        audioEl.srcObject = null;
      }
    };
  }, [remoteStream, isOpen]);

  // Duration Timer
  useEffect(() => {
    let interval: number;
    if (status === 'ongoing') {
      interval = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Network stats monitoring and audio device listener
  useEffect(() => {
    if (status === 'ongoing') {
      callService.startNetworkStatsMonitoring((stats) => {
        setNetworkStats(stats);
      });

      // Load available audio devices (headset, Bluetooth, etc.)
      callService.getAudioDevices().then(devices => {
        setAudioDevices(devices as AudioDeviceOption[]);
      });

      const handleDeviceChange = () => {
        callService.getAudioDevices().then(devices => {
          console.log('[Call] Périphériques audio modifiés (branchement/déconnexion)');
          setAudioDevices(devices as AudioDeviceOption[]);
        });
      };

      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      }

      return () => {
        callService.stopNetworkStatsMonitoring();
        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        }
      };
    }
  }, [status]);

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = callService.toggleMute();
    setIsMuted(muted);
    triggerHaptic(30);
  };

  // Toggle Camera
  const handleToggleCamera = () => {
    const cameraOff = callService.toggleCamera();
    setIsCameraOff(cameraOff);
    triggerHaptic(30);
  };

  // Flip Camera (Front / Back)
  const handleSwitchCamera = async () => {
    setIsFlippingCamera(true);
    triggerHaptic(40);
    await callService.switchCamera();
    setTimeout(() => {
      setIsFlippingCamera(false);
    }, 500);
  };

  // Switch Voice <-> Video Call
  const handleSwitchCallType = async () => {
    const targetType = currentCallType === 'video' ? 'audio' : 'video';
    triggerHaptic([30, 40]);
    const success = await callService.switchCallType(targetType);
    if (success) {
      setCurrentCallType(targetType);
      if (targetType === 'video') {
        setIsCameraOff(false);
      }
    }
  };

  // Change Audio Output
  const handleSelectAudioDevice = async (deviceId: string) => {
    setSelectedOutputDeviceId(deviceId);
    if (remoteAudioRef.current) {
      await callService.setAudioOutputDevice(remoteAudioRef.current, deviceId);
    }
    setIsAudioDevicesOpen(false);
    triggerHaptic(30);
  };

  // Toggle Speaker simulation
  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 0.3 : 1.0;
    }
    triggerHaptic(30);
  };

  const handleManualAudioEnable = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play()
        .then(() => setAudioBlocked(false))
        .catch(e => console.error('[Call] Manual audio play error:', e));
    }
  };

  if (!isOpen) return null;

  // 1. MINIATURISATION PICTURE-IN-PICTURE (PIP)
  if (isPipMode) {
    return (
      <motion.div
        drag
        dragConstraints={{ left: 10, right: 300, top: 10, bottom: 600 }}
        className="fixed bottom-6 right-6 z-[250] w-48 sm:w-56 bg-[#171230] border-2 border-[#6c5ce7] rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.8)] overflow-hidden cursor-move select-none flex flex-col"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* PIP Video or Avatar */}
        <div className="h-32 bg-[#0e0b1c] relative flex items-center justify-center overflow-hidden">
          {currentCallType === 'video' && remoteStream && !isCameraOff ? (
            <video
              ref={pipRemoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2">
              <div className="w-12 h-12 rounded-full bg-[#2d2254] flex items-center justify-center text-white font-bold text-lg mb-1">
                {partnerUser.name[0]}
              </div>
              <span className="text-[11px] font-bold text-white truncate max-w-[130px]">{partnerUser.name}</span>
              <span className="text-[10px] text-[#00b894] font-medium">{formatDuration(duration)}</span>
            </div>
          )}

          {/* Local miniature preview in PIP */}
          {currentCallType === 'video' && localStream && !isCameraOff && (
            <div className="absolute top-2 right-2 w-12 h-16 bg-black rounded-lg overflow-hidden border border-white/30 shadow-md">
              <video
                ref={pipLocalVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          )}

          {/* Maximize PIP back to full screen */}
          <button
            onClick={() => {
              setIsPipMode(false);
              triggerHaptic(30);
            }}
            className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm"
            title="Agrandir l'appel"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Mini Controls Bar */}
        <div className="p-2 bg-[#1f1742] flex items-center justify-between gap-1 border-t border-[#2d2254]">
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-full text-xs font-bold transition-all ${isMuted ? 'bg-[#ff7675] text-white' : 'bg-[#2d2254] text-white hover:bg-[#372863]'}`}
            title={isMuted ? 'Micro coupé' : 'Micro actif'}
          >
            {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          {currentCallType === 'video' && (
            <button
              onClick={handleToggleCamera}
              className={`p-2 rounded-full text-xs font-bold transition-all ${isCameraOff ? 'bg-[#ff7675] text-white' : 'bg-[#2d2254] text-white hover:bg-[#372863]'}`}
              title={isCameraOff ? 'Caméra coupée' : 'Caméra active'}
            >
              {isCameraOff ? <VideoOff size={14} /> : <Video size={14} />}
            </button>
          )}

          <button
            onClick={onHangup}
            className="p-2 rounded-full bg-[#ff7675] text-white hover:bg-[#ff5e5c] shadow-md active:scale-95"
            title="Raccrocher"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  // 2. INTERFACE PLEIN ÉCRAN STANDARD / WHATSAPP STYLE
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="always-dark fixed inset-0 z-[200] bg-[#0a0714] flex flex-col items-center justify-between overflow-hidden select-none"
    >
      {/* Remote Audio Track */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Unmute Autoplay Prompt if blocked */}
      {audioBlocked && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleManualAudioEnable}
            className="px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-semibold rounded-full shadow-2xl flex items-center gap-2 animate-bounce border border-white/20 text-sm"
          >
            <Volume2 size={18} />
            Activer le son de l'appel
          </button>
        </div>
      )}

      {/* TOP BAR : Informations, E2EE, Réseau & Picture-in-Picture */}
      <div className="w-full z-20 px-4 sm:px-6 pt-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Network Quality & E2EE Badges */}
        <div className="flex items-center gap-2">
          {/* E2EE Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171230]/80 backdrop-blur-md rounded-full border border-[#2d2254] text-[11px] font-semibold text-[#00b894]">
            <ShieldCheck size={14} />
            <span>Chiffré E2EE</span>
          </div>

          {/* Live Network Quality Pill */}
          <button
            onClick={() => setIsStatsOpen(!isStatsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171230]/80 backdrop-blur-md rounded-full border border-[#2d2254] text-[11px] font-semibold hover:bg-[#20183e] transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                networkStats.quality === 'excellent' ? 'bg-[#00b894]' :
                networkStats.quality === 'good' ? 'bg-[#55efc4]' :
                networkStats.quality === 'fair' ? 'bg-[#fdcb6e]' : 'bg-[#ff7675]'
              }`}
            />
            <span className="text-white capitalize">
              {networkStats.quality === 'excellent' ? 'Signal HD' :
               networkStats.quality === 'good' ? 'Signal Bon' :
               networkStats.quality === 'fair' ? 'Signal Moyen' : 'Signal Faible'}
            </span>
          </button>
        </div>

        {/* Header Action Buttons (Stats & Minimize PIP) */}
        <div className="flex items-center gap-2">
          {status === 'ongoing' && (
            <button
              onClick={() => {
                setIsPipMode(true);
                triggerHaptic(30);
              }}
              className="p-2.5 bg-[#171230]/80 hover:bg-[#20183e] text-white rounded-full backdrop-blur-md border border-[#2d2254] transition-colors"
              title="Réduire l'appel (Picture-in-Picture)"
            >
              <Minimize2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* STATS DRAWER OVERLAY */}
      <AnimatePresence>
        {isStatsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 z-30 w-11/12 max-w-sm bg-[#171230]/95 backdrop-blur-xl border border-[#372863] rounded-3xl p-4 text-xs text-white shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2d2254]">
              <span className="font-bold text-[#a29bfe] flex items-center gap-1.5">
                <Activity size={15} className="text-[#00b894]" /> Métriques de transmission WebRTC
              </span>
              <button onClick={() => setIsStatsOpen(false)} className="text-[#a29bfe] hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#130f26] p-2 rounded-xl border border-[#2d2254]">
                <span className="text-[#a29bfe] block">Latence (RTT) :</span>
                <span className="font-bold text-[#55efc4]">{networkStats.rttMs} ms</span>
              </div>
              <div className="bg-[#130f26] p-2 rounded-xl border border-[#2d2254]">
                <span className="text-[#a29bfe] block">Débit direct :</span>
                <span className="font-bold text-[#55efc4]">{networkStats.bitrateKbps} kbps</span>
              </div>
              <div className="bg-[#130f26] p-2 rounded-xl border border-[#2d2254]">
                <span className="text-[#a29bfe] block">Perte de paquets :</span>
                <span className="font-bold text-white">{networkStats.packetLossPercent}%</span>
              </div>
              <div className="bg-[#130f26] p-2 rounded-xl border border-[#2d2254]">
                <span className="text-[#a29bfe] block">Résolution vidéo :</span>
                <span className="font-bold text-white">{networkStats.resolution || '640x480'}</span>
              </div>
            </div>
            <p className="text-[10px] text-[#a29bfe] mt-2 text-center">Flux sécurisé de bout en bout avec TLS/SRTP</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUDIO OUTPUT DEVICE SELECTOR POPOVER */}
      <AnimatePresence>
        {isAudioDevicesOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-36 z-30 w-11/12 max-w-xs bg-[#171230]/95 backdrop-blur-xl border border-[#372863] rounded-3xl p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3 border-b border-[#2d2254] pb-2">
              <span className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
                <Headphones size={15} className="text-[#00b894]" /> Sortie Audio
              </span>
              <button onClick={() => setIsAudioDevicesOpen(false)} className="text-[#a29bfe] hover:text-white text-xs">✕</button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {audioDevices.length === 0 ? (
                <div className="text-xs text-[#a29bfe] text-center py-2">Haut-parleur & écouteur par défaut</div>
              ) : (
                audioDevices.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => handleSelectAudioDevice(device.deviceId)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      selectedOutputDeviceId === device.deviceId
                        ? 'bg-[#6c5ce7] text-white font-bold'
                        : 'bg-[#130f26] text-[#dfe6e9] hover:bg-[#20183e]'
                    }`}
                  >
                    <span className="truncate pr-2">{device.label}</span>
                    {device.isBluetooth && <span className="text-[10px] px-1.5 py-0.5 bg-[#00b894]/30 text-[#00b894] rounded-md font-bold">BT</span>}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN BACKGROUND / VIDEO / AVATAR STAGE */}
      <div className="absolute inset-0 bg-[#0a0714] flex items-center justify-center">
        {currentCallType === 'video' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#1b1435] via-[#130f26] to-[#0a0714]">
            {/* Animated Profile Avatar Ring */}
            <div className="w-36 h-36 rounded-full border-4 border-[#372863] p-1.5 mb-6 relative shadow-2xl">
              {partnerUser.avatar ? (
                <img src={partnerUser.avatar} alt="" className="w-full h-full rounded-full object-cover shadow-inner" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#6c5ce7] to-[#00b894] flex items-center justify-center text-white text-5xl font-bold">
                  {partnerUser.name[0]}
                </div>
              )}

              {/* Pulsing Ring Animation while Calling */}
              {(status === 'ringing' || status === 'connecting') && (
                <div className="absolute inset-0 rounded-full border-4 border-[#00b894] animate-ping opacity-30" />
              )}
            </div>

            <h2 className="text-3xl font-extrabold text-white mb-2">{partnerUser.name}</h2>
            <p className="text-sm font-semibold text-[#a29bfe] tracking-wide">
              {status === 'connecting' ? 'Connexion en cours...' :
               status === 'ringing' ? 'Appel en cours...' :
               status === 'incoming' ? 'Appel entrant...' :
               formatDuration(duration)}
            </p>
          </div>
        )}
      </div>

      {/* LOCAL PREVIEW PIP WINDOW (for Video Calls) */}
      {currentCallType === 'video' && localStream && (
        <motion.div 
          drag
          dragConstraints={{ left: 10, right: 300, top: 10, bottom: 500 }}
          className="absolute top-20 right-4 w-28 h-40 sm:w-36 sm:h-52 bg-black rounded-3xl overflow-hidden border-2 border-white/25 shadow-2xl z-20 cursor-move"
        >
          {isCameraOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1b1435] text-[#a29bfe] p-2 text-center">
              <VideoOff size={24} className="mb-1 text-[#ff7675]" />
              <span className="text-[10px] font-medium">Caméra coupée</span>
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isFlippingCamera ? 'opacity-30' : 'opacity-100'} scale-x-[-1] transition-opacity`}
            />
          )}

          {/* Quick flip button inside local PIP */}
          <button
            onClick={handleSwitchCamera}
            className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm active:rotate-180 transition-transform"
            title="Changer de caméra"
          >
            <RefreshCw size={12} className={isFlippingCamera ? 'animate-spin' : ''} />
          </button>
        </motion.div>
      )}

      {/* BOTTOM CONTROLS BAR (Full WhatsApp Suite) */}
      <div className="w-full z-20 px-6 pb-12 pt-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-6">
        {status === 'incoming' ? (
          /* Incoming Call Accept / Decline Buttons */
          <div className="flex items-center gap-14">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onDecline}
                className="w-18 h-18 rounded-full bg-[#ff7675] hover:bg-[#ff5e5c] flex items-center justify-center text-white shadow-[0_10px_25px_rgba(255,118,117,0.5)] active:scale-95 transition-transform"
              >
                <PhoneOff size={30} />
              </button>
              <span className="text-xs font-semibold text-white">Refuser</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAccept}
                className="w-18 h-18 rounded-full bg-[#00b894] hover:bg-[#00a884] flex items-center justify-center text-white shadow-[0_10px_25px_rgba(0,184,148,0.5)] active:scale-95 transition-transform animate-pulse"
              >
                {currentCallType === 'video' ? <Video size={30} /> : <Phone size={30} />}
              </button>
              <span className="text-xs font-semibold text-white">Répondre</span>
            </div>
          </div>
        ) : (
          /* Active Call Controls (Mute, Camera, Audio Output, Switch Type, Flip, Hangup) */
          <div className="flex items-center gap-3 sm:gap-4 p-3.5 bg-black/60 backdrop-blur-2xl rounded-full border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
            {/* 1. MUTE MICROPHONE */}
            <button
              onClick={handleToggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted 
                  ? 'bg-[#ff7675] text-white shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isMuted ? 'Activer le micro' : 'Couper le micro'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* 2. CAMERA TOGGLE (if in video call) */}
            {currentCallType === 'video' && (
              <button
                onClick={handleToggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isCameraOff 
                    ? 'bg-[#ff7675] text-white shadow-lg' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isCameraOff ? 'Allumer la caméra' : 'Couper la caméra'}
              >
                {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            {/* 3. SWITCH FRONT / BACK CAMERA (Flip) */}
            {currentCallType === 'video' && (
              <button
                onClick={handleSwitchCamera}
                className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all active:rotate-180"
                title="Bascule caméra avant / arrière"
              >
                <RefreshCw size={20} className={isFlippingCamera ? 'animate-spin' : ''} />
              </button>
            )}

            {/* 4. SWITCH VOICE <-> VIDEO MID-CALL */}
            <button
              onClick={handleSwitchCallType}
              className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
              title={currentCallType === 'video' ? "Passer en appel vocal" : "Passer en appel vidéo"}
            >
              {currentCallType === 'video' ? <Phone size={20} /> : <Video size={20} />}
            </button>

            {/* 5. AUDIO OUTPUT ROUTING / SPEAKER */}
            <button
              onClick={() => setIsAudioDevicesOpen(!isAudioDevicesOpen)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isSpeakerOn ? 'bg-[#6c5ce7] text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Sélection sortie audio / Bluetooth"
            >
              <Volume2 size={20} />
            </button>

            {/* 6. HANGUP / END CALL */}
            <button
              onClick={onHangup}
              className="w-14 h-14 rounded-full bg-[#ff7675] hover:bg-[#ff5e5c] flex items-center justify-center text-white shadow-[0_8px_25px_rgba(255,118,117,0.6)] active:scale-95 transition-all ml-1"
              title="Raccrocher l'appel"
            >
              <PhoneOff size={26} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
