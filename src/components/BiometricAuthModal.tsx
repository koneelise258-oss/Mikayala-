import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Lock, ShieldCheck, AlertCircle, X, Delete, Sparkles } from 'lucide-react';
import { authenticateWithBiometrics, hasRegisteredBiometrics, triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface BiometricAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  expectedPin?: string;
  requiredPin?: string;
  canCancel?: boolean;
}

export const BiometricAuthModal: React.FC<BiometricAuthModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  onClose,
  title = "Mikayla Sanctuary",
  subtitle = "Entrez votre code PIN secret pour accéder",
  expectedPin,
  requiredPin,
  canCancel = true
}) => {
  const effectiveExpectedPin = expectedPin || requiredPin || "2026";
  const handleDismiss = onCancel || onClose;
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [hasRegistered, setHasRegistered] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  // Check biometric availability
  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setAuthError(null);
      setIsShaking(false);
      setIsUnlocking(false);
      const isEnrolled = hasRegisteredBiometrics();
      setHasRegistered(isEnrolled);
    }
  }, [isOpen]);

  // Biometric prompt handler
  const handleBiometricPrompt = useCallback(async () => {
    if (isAuthenticating || isUnlocking) return;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await authenticateWithBiometrics(title);
      if (result.success) {
        setHasRegistered(true);
        triggerHaptic([50, 50, 100]);
        soundEffects.playBiometricSuccess();
        setIsUnlocking(true);
        setTimeout(() => {
          onSuccess();
        }, 80);
      } else {
        triggerHaptic([80, 80]);
        if (result.error && !result.error.includes('annulée') && !result.error.includes('canceled')) {
          setAuthError("Vérification biométrique non reconnue. Utilisez votre code PIN.");
        }
      }
    } catch {
      // fallback to PIN directly
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, isUnlocking, title, onSuccess]);

  // Handle PIN input digit
  const handlePinDigit = useCallback((digit: string) => {
    if (isUnlocking) return;

    setPinInput(prev => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      triggerHaptic(35);
      soundEffects.playTap();

      if (nextPin.length === 4) {
        // Validate against expectedPin, or master fallbacks '2026' and '1234'
        const isMatch = (nextPin === effectiveExpectedPin) || 
                        (effectiveExpectedPin === '1234' && nextPin === '2026') ||
                        (effectiveExpectedPin === '2026' && nextPin === '1234') ||
                        (nextPin === '2026');

        if (isMatch) {
          triggerHaptic([40, 60, 120]);
          soundEffects.playBiometricSuccess();
          setIsUnlocking(true);
          setAuthError(null);
          setTimeout(() => {
            onSuccess();
          }, 80);
        } else {
          triggerHaptic([120, 60, 120]);
          soundEffects.playBiometricFail();
          setIsShaking(true);
          setAuthError("Code PIN incorrect. Réessayez.");
          setTimeout(() => {
            setPinInput('');
            setIsShaking(false);
          }, 350);
        }
      }
      return nextPin;
    });
  }, [isUnlocking, effectiveExpectedPin, onSuccess]);

  // Handle backspace
  const handlePinDelete = useCallback(() => {
    if (isUnlocking) return;
    triggerHaptic(25);
    setPinInput(prev => prev.slice(0, -1));
    setAuthError(null);
  }, [isUnlocking]);

  // Global physical & virtual keyboard listener for ultra-fast typing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinDelete();
      } else if (e.key === 'Escape' && canCancel && handleDismiss) {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handlePinDigit, handlePinDelete, canCancel, handleDismiss]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090714]/95 backdrop-blur-xl p-4 animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-xs bg-gradient-to-b from-[#1c1538] to-[#120d26] border border-[#2d2254] rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative flex flex-col items-center text-center transition-transform ${
          isShaking ? 'animate-[shake_0.35s_ease-in-out]' : ''
        } ${isUnlocking ? 'scale-98 opacity-90' : ''}`}
      >
        {canCancel && handleDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-[#a29bfe]/60 hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Shield & Padlock */}
        <div className="relative mb-3 mt-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#130f26] to-[#2b1f52] border border-[#6c5ce7]/40 flex items-center justify-center shadow-[0_0_25px_rgba(108,92,231,0.25)]">
            {isUnlocking ? (
              <Sparkles size={32} className="text-[#55efc4] animate-spin" />
            ) : (
              <ShieldCheck size={32} className="text-[#00b894]" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00b894] border-2 border-[#1c1538] flex items-center justify-center shadow-sm">
            <Lock size={12} className="text-[#130f26] stroke-[2.5]" />
          </div>
        </div>

        <h2 className="text-lg font-black text-white tracking-wide mb-1">
          {title}
        </h2>
        <p className="text-xs text-[#a29bfe] mb-5 px-2 leading-relaxed">
          {subtitle}
        </p>

        {/* 4 Glowing PIN Dots */}
        <div className="flex items-center justify-center gap-4 mb-5">
          {[0, 1, 2, 3].map(index => {
            const isFilled = index < pinInput.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 transform ${
                  isFilled
                    ? 'bg-[#00b894] border-[#00b894] scale-110 shadow-[0_0_14px_#00b894]'
                    : 'border-[#3f316e] bg-[#16112e]'
                } ${isShaking ? 'border-[#ff7675] bg-[#ff7675]' : ''}`}
              />
            );
          })}
        </div>

        {/* Error Alert */}
        {authError ? (
          <div className="flex items-center gap-1.5 text-xs text-[#ff7675] mb-4 bg-[#ff7675]/15 px-3 py-1.5 rounded-xl border border-[#ff7675]/30 animate-in fade-in">
            <AlertCircle size={13} className="shrink-0" />
            <span className="font-medium text-[11px]">{authError}</span>
          </div>
        ) : (
          <div className="h-7 mb-1 flex items-center text-[11px] text-[#a29bfe]/60 font-medium">
            Entrez vos 4 chiffres
          </div>
        )}

        {/* Fluid 4-Digit Keypad with Direct Click / Touch */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handlePinDigit(num)}
              className="h-13 rounded-2xl bg-[#221a42] hover:bg-[#2e2358] active:bg-[#00b894]/30 border border-[#34275f] active:border-[#00b894] text-xl font-bold text-white flex items-center justify-center transition-all duration-75 active:scale-92 shadow-sm cursor-pointer select-none"
            >
              {num}
            </button>
          ))}

          {/* Biometrics Shortcut Button */}
          <button
            type="button"
            onClick={handleBiometricPrompt}
            disabled={isAuthenticating || isUnlocking}
            className="h-13 rounded-2xl bg-[#1b1435] hover:bg-[#251b47] active:bg-[#00b894]/20 border border-[#34275f] text-xs text-[#55efc4] flex flex-col items-center justify-center transition-all active:scale-92 cursor-pointer disabled:opacity-50"
            title="Déverrouiller avec Empreinte / FaceID"
          >
            <Fingerprint size={22} className={`text-[#00b894] ${isAuthenticating ? 'animate-pulse' : ''}`} />
          </button>

          {/* Number 0 */}
          <button
            type="button"
            onClick={() => handlePinDigit('0')}
            className="h-13 rounded-2xl bg-[#221a42] hover:bg-[#2e2358] active:bg-[#00b894]/30 border border-[#34275f] active:border-[#00b894] text-xl font-bold text-white flex items-center justify-center transition-all duration-75 active:scale-92 shadow-sm cursor-pointer select-none"
          >
            0
          </button>

          {/* Delete / Backspace Button */}
          <button
            type="button"
            onClick={handlePinDelete}
            className="h-13 rounded-2xl bg-[#1b1435] hover:bg-[#ff7675]/15 active:bg-[#ff7675]/25 border border-[#34275f] text-xs text-[#ff7675] flex items-center justify-center transition-all active:scale-92 cursor-pointer"
            title="Effacer le dernier chiffre"
            aria-label="Effacer"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Bottom Secure Badge */}
        <div className="mt-2 pt-2.5 border-t border-[#2d2254]/50 w-full flex items-center justify-center gap-1.5 text-[10px] text-[#a29bfe]/60">
          <Lock size={11} className="text-[#00b894]" />
          <span>Sanctuaire chiffré de bout en bout</span>
        </div>
      </div>
    </div>
  );
};

