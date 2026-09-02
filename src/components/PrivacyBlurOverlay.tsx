import React from 'react';
import { ShieldCheck, Fingerprint, Lock, Eye } from 'lucide-react';
import { triggerHaptic } from '../utils/security';

interface PrivacyBlurOverlayProps {
  isBlurred: boolean;
  onUnlock: () => void;
}

export const PrivacyBlurOverlay: React.FC<PrivacyBlurOverlayProps> = ({
  isBlurred,
  onUnlock
}) => {
  if (!isBlurred) return null;

  return (
    <div 
      onClick={() => {
        triggerHaptic(40);
        onUnlock();
      }}
      className="fixed inset-0 z-50 bg-[#0e0b1c]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none animate-in fade-in duration-150"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#130f26] to-[#2d2254] border-2 border-[#00b894] flex items-center justify-center shadow-[0_0_35px_rgba(0,184,148,0.3)] mb-4 animate-pulse">
        <ShieldCheck size={40} className="text-[#00b894]" />
      </div>

      <h2 className="text-xl font-bold text-[#f1f2f6] tracking-wide mb-1">
        Mikayla Protégé
      </h2>
      <p className="text-xs text-[#a29bfe] max-w-xs mb-6">
        Écran flouté par mesure de discrétion anti-regards indiscrets.
      </p>

      <button
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic(50);
          onUnlock();
        }}
        className="flex items-center gap-2 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs px-5 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer"
      >
        <Fingerprint size={18} />
        <span>Toucher pour déverrouiller</span>
      </button>

      <div className="mt-8 flex items-center gap-1.5 text-[11px] text-[#a29bfe]/60">
        <Lock size={12} className="text-[#00b894]" />
        <span>Chiffrement intime actif</span>
      </div>
    </div>
  );
};
