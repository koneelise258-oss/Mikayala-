import React, { useEffect, useState } from 'react';
import { Heart, X, Send, Sparkles, Flame, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface HeartbeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: User;
  onSendHeartbeat: (customText?: string) => void;
}

export const HeartbeatModal: React.FC<HeartbeatModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  onSendHeartbeat
}) => {
  const [pulseCount, setPulseCount] = useState<number>(0);
  const [customMsg, setCustomMsg] = useState<string>('Tu me manques fort mon amour... 💓');

  useEffect(() => {
    if (!isOpen) return;

    // Trigger immediate sound and haptic vibration
    soundEffects.playHeartbeat();
    triggerHaptic([120, 60, 220, 60, 350]);

    const interval = setInterval(() => {
      soundEffects.playHeartbeat();
      triggerHaptic([120, 60, 220, 60, 350]);
      setPulseCount(prev => prev + 1);
    }, 1400);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#fd79a8', '#ff7675', '#00b894', '#6c5ce7']
    });
    soundEffects.playMatchSound();
    triggerHaptic([150, 80, 250]);
    onSendHeartbeat(customMsg);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#0e0b1c]/95 backdrop-blur-2xl p-4 animate-in fade-in">
      <div className="w-full max-w-sm flex flex-col items-center text-center relative">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 text-[#a29bfe] hover:text-white rounded-full bg-[#1b1435] border border-[#2d2254] transition-colors"
        >
          <X size={20} />
        </button>

        {/* Ambient Glow Aura */}
        <div className="absolute w-72 h-72 rounded-full bg-[#fd79a8]/20 blur-3xl pointer-events-none animate-ambient-glow" />

        <div className="mb-4">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#55efc4] bg-[#00b894]/20 border border-[#00b894]/40 px-3 py-1 rounded-full">
            Connexion Cardiaque Instantanée
          </span>
        </div>

        {/* 3D Pulsating Heart */}
        <div
          onClick={() => {
            soundEffects.playHeartbeat();
            triggerHaptic([150, 80, 250]);
          }}
          className="w-44 h-44 my-4 flex items-center justify-center cursor-pointer relative"
        >
          <Heart
            size={140}
            className="text-[#fd79a8] fill-[#fd79a8] animate-heart-thump transition-transform"
          />
          <Sparkles size={28} className="absolute text-[#ffeaa7] top-2 right-4 animate-spin duration-3000" />
        </div>

        <h3 className="text-2xl font-black text-white tracking-wide">
          Battements pour {partnerUser.name}
        </h3>
        <p className="text-xs text-[#a29bfe] mt-1 mb-6 px-4">
          Fais vibrer son téléphone en direct avec le rythme de ton cœur
        </p>

        {/* Message Presets */}
        <div className="w-full space-y-2 mb-4">
          {[
            'Tu me manques fort mon amour... 💓',
            'Je pense très fort à toi en ce moment ✨',
            'J\'ai hâte d\'être blotti(e) contre toi ce soir 🌙🔥',
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCustomMsg(preset);
                triggerHaptic(30);
              }}
              className={`w-full text-xs text-left p-2.5 rounded-xl border transition-all ${
                customMsg === preset
                  ? 'bg-[#6c5ce7] border-[#6c5ce7] text-white font-semibold shadow-md'
                  : 'bg-[#1b1435] border-[#2d2254] text-[#a29bfe] hover:text-white'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Send Heartbeat Action */}
        <button
          onClick={handleSend}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#fd79a8] to-[#00b894] hover:from-[#e84393] hover:to-[#00a884] text-[#130f26] font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(253,121,168,0.4)] transition-transform active:scale-95 cursor-pointer"
        >
          <Send size={18} className="stroke-[2.5]" />
          <span>Envoyer le battement de cœur 💓</span>
        </button>
      </div>
    </div>
  );
};
