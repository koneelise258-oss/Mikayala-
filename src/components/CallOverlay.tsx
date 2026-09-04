import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User as UserIcon, Volume2 } from 'lucide-react';
import { User, CallType } from '../types';
import { formatDuration } from '../utils/formatters';

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
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('[CallOverlay] Attaching local stream to <video>. Video tracks:', localStream.getVideoTracks().length);
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('[CallOverlay] Attaching remote stream to <video>. Video tracks:', remoteStream.getVideoTracks().length);
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isOpen]);

  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (audioEl && remoteStream) {
      const audioTracks = remoteStream.getAudioTracks();
      console.log('[CallOverlay] Remote stream audio tracks:', audioTracks.length, audioTracks);
      audioEl.srcObject = remoteStream;
      audioEl.play()
        .then(() => {
          console.log('[CallOverlay] Remote audio playing successfully');
          setAudioBlocked(false);
        })
        .catch((err) => {
          console.warn('[CallOverlay] Remote audio play blocked by browser policy or failed:', err);
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

  const handleEnableAudio = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play()
        .then(() => {
          console.log('[CallOverlay] Manual audio enable succeeded');
          setAudioBlocked(false);
        })
        .catch((err) => {
          console.error('[CallOverlay] Manual audio enable failed:', err);
        });
    }
  };

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

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="always-dark fixed inset-0 z-[200] bg-[#0a0714] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Audio Element for Remote Stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Unmute / Enable Audio Prompt if autoplay is blocked */}
      {audioBlocked && (
        <button
          onClick={handleEnableAudio}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-semibold rounded-full shadow-lg flex items-center gap-2 animate-bounce"
        >
          <Volume2 size={20} />
          Activer le son
        </button>
      )}

      {/* Background/Remote Video */}
      <div className="absolute inset-0 bg-[#130f26]">
        {type === 'video' && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#1b1435] to-[#0a0714]">
            <div className="w-32 h-32 rounded-full border-4 border-[#2d2254] p-1 mb-6 relative">
              {partnerUser.avatar ? (
                <img src={partnerUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-[#2d2254] flex items-center justify-center text-white text-4xl font-bold">
                  {partnerUser.name[0]}
                </div>
              )}
              {status === 'ringing' || status === 'connecting' ? (
                <div className="absolute inset-0 rounded-full border-4 border-[#00b894] animate-ping opacity-20" />
              ) : null}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{partnerUser.name}</h2>
            <p className="text-[#a29bfe] font-medium animate-pulse">
              {status === 'connecting' ? 'Connexion...' :
               status === 'ringing' ? 'Appel en cours...' :
               status === 'incoming' ? 'Appel entrant...' :
               formatDuration(duration)}
            </p>
          </div>
        )}
      </div>

      {/* Local Preview (Small PIP) */}
      {type === 'video' && localStream && (
        <motion.div 
          drag
          dragConstraints={{ left: 20, right: 20, top: 20, bottom: 20 }}
          className="absolute top-6 right-6 w-32 h-48 bg-black rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10"
        >
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center bg-[#1b1435] text-[#a29bfe]">
              <VideoOff size={24} />
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
        </motion.div>
      )}

      {/* Controls */}
      <div className="absolute bottom-12 left-0 right-0 px-6 flex flex-col items-center gap-8">
        {status === 'incoming' ? (
          <div className="flex gap-12">
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-[#ff7675] flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
            >
              <PhoneOff size={28} />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-[#00b894] flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
            >
              {type === 'video' ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-6 p-4 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-[#ff7675] text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            {type === 'video' && (
              <button
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCameraOff ? 'bg-[#ff7675] text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            <button
              onClick={onHangup}
              className="w-16 h-16 rounded-full bg-[#ff7675] flex items-center justify-center text-white shadow-lg hover:bg-[#ff5e5c] active:scale-95 transition-all"
            >
              <PhoneOff size={28} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
