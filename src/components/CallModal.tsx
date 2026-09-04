import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ShieldCheck,
  Monitor,
  MonitorOff,
  MessageSquare,
  X,
  Send,
  Heart,
  Smile,
  Flame,
  Sparkles
} from 'lucide-react';
import { User, CallType } from '../types';
import { formatDuration } from '../utils/formatters';
import { soundEffects } from '../utils/audio';
import { triggerHaptic } from '../utils/security';

interface CallChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
}

interface CallModalProps {
  isOpen: boolean;
  callType: CallType;
  partnerUser: User;
  onEndCall: (duration: number) => void;
  onSendMessageDuringCall?: (text: string) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  callType,
  partnerUser,
  onEndCall,
  onSendMessageDuringCall
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'calling' | 'connected'>('calling');
  
  // Live In-Call Chat Overlay
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);
  const [overlayMessages, setOverlayMessages] = useState<CallChatMessage[]>([
    {
      id: 'welcome',
      senderName: 'Mikayla E2EE',
      text: 'Appel chiffré en direct 🔒',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: false
    }
  ]);
  const [inCallInput, setInCallInput] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      stopStreams();
      setCallDuration(0);
      setCallStatus('calling');
      setIsScreenSharing(false);
      setIsChatOverlayOpen(false);
      return;
    }

    // Play ringing tone
    const stopRing = soundEffects.playRingTone();

    // Auto connect after 2.5 seconds to simulate partner answering
    const connectTimer = setTimeout(() => {
      stopRing();
      setCallStatus('connected');
    }, 2500);

    // Setup local video if video call
    if (callType === 'video') {
      startCamera();
    }

    return () => {
      clearTimeout(connectTimer);
      stopRing();
      stopStreams();
    };
  }, [isOpen, callType, isFrontCamera]);

  // Duration counter when connected
  useEffect(() => {
    if (callStatus !== 'connected' || !isOpen) return;

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus, isOpen]);

  // Scroll chat overlay on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [overlayMessages, isChatOverlayOpen]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: isFrontCamera ? 'user' : 'environment',
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 20 }
            },
            audio: true
          });
        } catch (error: any) {
          console.error(`[CallModal] getUserMedia error: ${error.name} - ${error.message}`);
          throw error;
        }
        cameraStreamRef.current = stream;
        if (localVideoRef.current && !isScreenSharing) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch {
      // Browser fallback or permission decline
    }
  };

  const handleToggleScreenShare = async () => {
    triggerHaptic(30);
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (localVideoRef.current && cameraStreamRef.current) {
        localVideoRef.current.srcObject = cameraStreamRef.current;
      }
    } else {
      // Start screen sharing
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
          screenStreamRef.current = screenStream;
          setIsScreenSharing(true);
          
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = screenStream;
          }

          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach(t => t.stop());
              screenStreamRef.current = null;
            }
          };
        }
      } catch {
        // User cancelled share
        setIsScreenSharing(false);
      }
    }
  };

  const stopStreams = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
  };

  const handleSendInCallMessage = () => {
    if (!inCallInput.trim()) return;
    const newMsg: CallChatMessage = {
      id: `call_msg_${Date.now()}`,
      senderName: 'Moi',
      text: inCallInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };
    setOverlayMessages(prev => [...prev, newMsg]);
    if (onSendMessageDuringCall) {
      onSendMessageDuringCall(inCallInput.trim());
    }
    setInCallInput('');
    soundEffects.playSent();
  };

  const handleSendQuickReaction = (emoji: string) => {
    triggerHaptic(20);
    const newMsg: CallChatMessage = {
      id: `call_msg_${Date.now()}`,
      senderName: 'Moi',
      text: emoji,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };
    setOverlayMessages(prev => [...prev, newMsg]);
    if (onSendMessageDuringCall) {
      onSendMessageDuringCall(emoji);
    }
    soundEffects.playTap();
  };

  if (!isOpen) return null;

  const handleHangUp = () => {
    stopStreams();
    onEndCall(callDuration);
  };

  return (
    <div className="always-dark fixed inset-0 z-50 bg-[#0f0c20] flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200">
      {/* Background for Video Call vs Audio Call vs Screen Share */}
      {callType === 'video' || isScreenSharing ? (
        <div className="absolute inset-0 z-0 bg-[#0a0717]">
          {/* Main Remote Partner Video (Simulated / Realistic Avatar view) */}
          <div className="relative w-full h-full flex items-center justify-center">
            {isScreenSharing ? (
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <>
                <img
                  src={partnerUser.avatar}
                  alt={partnerUser.name}
                  className="w-full h-full object-cover filter brightness-75 scale-105 transition-all"
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              </>
            )}
          </div>

          {/* Picture in Picture Local Camera feed */}
          {isVideoOn && !isScreenSharing && (
            <div className="absolute top-16 right-4 w-28 h-40 sm:w-36 sm:h-52 bg-black rounded-2xl overflow-hidden border-2 border-[#6c5ce7] shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-[#110d24] flex flex-col items-center justify-center p-8">
          <div className="relative mb-6">
            <img
              src={partnerUser.avatar}
              alt={partnerUser.name}
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-[#00b894] shadow-2xl animate-pulse"
            />
            <div className="absolute inset-0 rounded-full border-4 border-[#00b894]/40 animate-ping" />
          </div>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="p-4 sm:p-6 text-center z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
        <div className="w-10" />
        <div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#a29bfe] mb-0.5">
            <ShieldCheck size={14} className="text-[#00b894]" />
            <span>Chiffré de bout en bout P2P</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#f1f2f6] drop-shadow-md">{partnerUser.name}</h2>
          <p className="text-xs sm:text-sm font-medium text-[#00b894] mt-0.5 drop-shadow">
            {callStatus === 'calling' ? 'Appel en cours...' : formatDuration(callDuration)}
          </p>
        </div>

        {/* Live Chat Overlay Toggle */}
        <button
          onClick={() => {
            triggerHaptic(20);
            setIsChatOverlayOpen(!isChatOverlayOpen);
          }}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
            isChatOverlayOpen
              ? 'bg-[#6c5ce7] text-white border-[#6c5ce7]'
              : 'bg-[#1b1435]/80 text-[#a29bfe] border-[#372863] hover:bg-[#281e4b]'
          }`}
          title="Ouvrir le Chat en Direct"
        >
          <MessageSquare size={18} />
        </button>
      </div>

      {/* Live In-Call Chat Drawer (Overlay) */}
      {isChatOverlayOpen && (
        <div className="absolute right-4 top-20 bottom-32 w-72 sm:w-80 bg-[#16102e]/95 backdrop-blur-xl border border-[#372863] rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          <div className="p-3 bg-[#1e153d] border-b border-[#2d2254] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-[#00b894]" />
              <span className="text-xs font-bold text-[#f1f2f6]">Chat Live pendant l'appel</span>
            </div>
            <button
              onClick={() => setIsChatOverlayOpen(false)}
              className="p-1 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center justify-around py-1.5 px-2 bg-[#130f26]/60 border-b border-[#2d2254]">
            {['❤️', '🔥', '💋', '✨', '😂', '👀'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendQuickReaction(emoji)}
                className="text-lg hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
            {overlayMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                    msg.isSelf
                      ? 'bg-gradient-to-r from-[#6c5ce7] to-[#8075ea] text-white rounded-tr-none'
                      : 'bg-[#251b47] text-[#f1f2f6] rounded-tl-none border border-[#372863]'
                  }`}
                >
                  <p className="text-xs break-words">{msg.text}</p>
                  <span className="text-[9px] opacity-70 mt-0.5 block text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-2.5 bg-[#1e153d] border-t border-[#2d2254] flex items-center gap-2">
            <input
              type="text"
              placeholder="Écrire un message..."
              value={inCallInput}
              onChange={(e) => setInCallInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendInCallMessage();
              }}
              className="flex-1 bg-[#130f26] border border-[#372863] rounded-xl px-3 py-1.5 text-xs text-[#f1f2f6] placeholder-[#a29bfe]/60 focus:outline-none focus:border-[#6c5ce7]"
            />
            <button
              onClick={handleSendInCallMessage}
              disabled={!inCallInput.trim()}
              className="p-2 bg-[#00b894] hover:bg-[#00a884] disabled:opacity-40 text-[#130f26] font-bold rounded-xl transition-all cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions Floating Bar */}
      <div className="p-4 sm:p-8 z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-3 sm:gap-4 bg-[#1b1435]/95 backdrop-blur-xl px-4 sm:px-6 py-3 rounded-3xl border border-[#372863] shadow-2xl max-w-full overflow-x-auto">
          {/* Mute Toggle */}
          <button
            onClick={() => {
              triggerHaptic(20);
              setIsMuted(!isMuted);
            }}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              isMuted ? 'bg-[#ff7675] text-white' : 'bg-[#281e4b] text-[#f1f2f6] hover:bg-[#372863]'
            }`}
            title={isMuted ? 'Activer micro' : 'Couper micro'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Video Toggle (if Video Call) */}
          {callType === 'video' && (
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsVideoOn(!isVideoOn);
              }}
              className={`p-3 rounded-full transition-colors cursor-pointer ${
                !isVideoOn ? 'bg-[#ff7675] text-white' : 'bg-[#281e4b] text-[#f1f2f6] hover:bg-[#372863]'
              }`}
              title={isVideoOn ? 'Couper caméra' : 'Activer caméra'}
            >
              {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          )}

          {/* Screen Share Toggle */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              isScreenSharing ? 'bg-[#00b894] text-[#130f26]' : 'bg-[#281e4b] text-[#f1f2f6] hover:bg-[#372863]'
            }`}
            title={isScreenSharing ? 'Arrêter le partage d’écran' : 'Partager l’écran'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          {/* Flip Camera (if Video Call) */}
          {callType === 'video' && !isScreenSharing && (
            <button
              onClick={() => {
                triggerHaptic(20);
                setIsFrontCamera(!isFrontCamera);
              }}
              className="p-3 rounded-full bg-[#281e4b] text-[#f1f2f6] hover:bg-[#372863] transition-colors cursor-pointer"
              title="Basculer caméra avant/arrière"
            >
              <RefreshCw size={20} />
            </button>
          )}

          {/* Speaker Toggle */}
          <button
            onClick={() => {
              triggerHaptic(20);
              setIsSpeakerOn(!isSpeakerOn);
            }}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              !isSpeakerOn ? 'bg-[#ff7675] text-white' : 'bg-[#281e4b] text-[#f1f2f6] hover:bg-[#372863]'
            }`}
            title="Haut-parleur"
          >
            {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Hang Up Button */}
          <button
            onClick={handleHangUp}
            className="p-3.5 rounded-full bg-[#ff7675] hover:bg-[#d63031] text-white shadow-lg transition-transform active:scale-95 cursor-pointer ml-1"
            title="Raccrocher"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
