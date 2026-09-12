import React, { useState } from 'react';
import { ShieldCheck, Smartphone, Check, X, AlertTriangle, KeyRound } from 'lucide-react';
import { DeviceAuthRequest, approveDeviceRequest, rejectDeviceRequest } from '../../services/deviceSyncService';
import { triggerHaptic } from '../../utils/security';
import { soundEffects } from '../../utils/audio';

interface DeviceApprovalPromptModalProps {
  request: DeviceAuthRequest | null;
  onClose: () => void;
  onApproved: () => void;
  onRejected: () => void;
}

export const DeviceApprovalPromptModal: React.FC<DeviceApprovalPromptModalProps> = ({
  request,
  onClose,
  onApproved,
  onRejected
}) => {
  const [loading, setLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!request) return null;

  const handleApprove = async () => {
    // Vérification du PIN local si enregistré
    const storedPin = localStorage.getItem('mikayla_vault_pin') || localStorage.getItem('mikayla_user_pin');
    if (storedPin && pinInput && pinInput !== storedPin) {
      triggerHaptic([150, 100]);
      setErrorMsg('Code PIN incorrect. Veuillez vérifier.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await approveDeviceRequest(request.id);
      if (res.success) {
        triggerHaptic([100, 50, 100]);
        soundEffects.playSent();
        onApproved();
        onClose();
      } else {
        setErrorMsg(res.error || "Échec de l'approbation.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur inconnue.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    await rejectDeviceRequest(request.id);
    setLoading(false);
    triggerHaptic(50);
    onRejected();
    onClose();
  };

  const storedPin = localStorage.getItem('mikayla_vault_pin') || localStorage.getItem('mikayla_user_pin');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#1b1435] border-2 border-[#fdcb6e] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
        
        {/* Pulsing Icon */}
        <div className="w-16 h-16 rounded-full bg-[#fdcb6e]/20 border border-[#fdcb6e] flex items-center justify-center text-[#fdcb6e] animate-pulse">
          <Smartphone size={32} />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#fdcb6e] bg-[#fdcb6e]/10 px-2.5 py-1 rounded-full border border-[#fdcb6e]/30">
            Connexion WhatsApp Sécurisée
          </span>
          <h3 className="text-lg font-black text-white mt-2">
            Nouvel appareil détecté 📱
          </h3>
          <p className="text-xs text-[#a29bfe] mt-1 leading-relaxed">
            Un appareil (<strong className="text-white">{request.device_name}</strong>) souhaite se synchroniser avec <strong className="text-[#55efc4]">votre compte personnel</strong>.
          </p>
        </div>

        {storedPin && (
          <div className="w-full text-left space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider flex items-center gap-1">
              <KeyRound size={12} className="text-[#fdcb6e]" />
              Entrez votre code PIN pour autoriser :
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-[#130f26] border border-[#2d2254] focus:border-[#fdcb6e] rounded-xl py-2 px-3 text-center text-xl font-mono tracking-widest text-white outline-none"
            />
          </div>
        )}

        {errorMsg && (
          <div className="w-full p-2 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2 text-left">
            <AlertTriangle size={14} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-2.5 bg-[#130f26] rounded-xl border border-[#2d2254] text-[11px] text-[#a29bfe] text-left flex items-start gap-2">
          <ShieldCheck size={14} className="text-[#00b894] shrink-0 mt-0.5" />
          <span>Cet appareil aura accès à vos messages et au coffre en temps réel sous votre nom exclusif.</span>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleReject}
            className="w-full py-3 rounded-xl bg-[#2d2254] hover:bg-red-500/20 text-white hover:text-red-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <X size={16} />
            Refuser
          </button>
          <button
            type="button"
            disabled={loading || (storedPin ? pinInput.length < 4 : false)}
            onClick={handleApprove}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00b894] to-[#00cec9] text-[#130f26] font-black text-xs flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-lg disabled:opacity-40"
          >
            <Check size={16} />
            {loading ? 'Connexion...' : 'Approuver'}
          </button>
        </div>

      </div>
    </div>
  );
};
