import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, ShieldCheck, KeyRound, AlertCircle, X } from 'lucide-react';
import { authenticateWithBiometrics, triggerHaptic } from '../utils/security';
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
  title = "Authentification Mikayla",
  subtitle = "Vérification biométrique (Empreinte / FaceID) requise",
  expectedPin,
  requiredPin,
  canCancel = true
}) => {
  const effectiveExpectedPin = expectedPin || requiredPin || "2026";
  const handleDismiss = onCancel || onClose;
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [mode, setMode] = useState<'biometric' | 'pin'>('biometric');

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setAuthError(null);
      // Auto-trigger biometric prompt on open
      handleBiometricPrompt();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBiometricPrompt = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await authenticateWithBiometrics(title);
      if (result.success) {
        triggerHaptic([50, 50, 100]);
        soundEffects.playSent();
        onSuccess();
      } else {
        triggerHaptic([100, 100]);
        setAuthError("Validation biométrique annulée. Entrez votre code PIN.");
        setMode('pin');
      }
    } catch {
      setMode('pin');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      triggerHaptic(40);
      
      if (newPin.length === 4) {
        if (newPin === effectiveExpectedPin) {
          triggerHaptic([50, 50, 100]);
          soundEffects.playSent();
          setAuthError(null);
          setTimeout(() => {
            onSuccess();
          }, 150);
        } else {
          triggerHaptic([150, 80, 150]);
          setAuthError(`Code PIN incorrect (par défaut : ${effectiveExpectedPin})`);
          setTimeout(() => {
            setPinInput('');
          }, 600);
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    triggerHaptic(30);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/95 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#1b1435] border border-[#2d2254] rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center">
        {canCancel && handleDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-[#a29bfe]/60 hover:text-[#f1f2f6] rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        )}

        {/* Security Shield Icon with Emerald Glow */}
        <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#130f26] to-[#2d2254] border-2 border-[#00b894]/40 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(0,184,148,0.25)]">
          <ShieldCheck size={36} className="text-[#00b894]" />
        </div>

        <h2 className="text-xl font-bold text-[#f1f2f6] tracking-wide mb-1">
          {title}
        </h2>
        <p className="text-xs text-[#a29bfe] mb-6 px-4">
          {subtitle}
        </p>

        {mode === 'biometric' ? (
          <div className="w-full flex flex-col items-center">
            {/* Biometric Interactive Sensor */}
            <button
              onClick={handleBiometricPrompt}
              disabled={isAuthenticating}
              className="group w-28 h-28 rounded-full bg-gradient-to-b from-[#281e4b] to-[#171230] border border-[#6c5ce7]/50 hover:border-[#00b894] flex flex-col items-center justify-center shadow-lg transition-all active:scale-95 mb-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#00b894]/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
              <Fingerprint
                size={48}
                className={`text-[#00b894] transition-transform ${isAuthenticating ? 'animate-pulse scale-110' : 'group-hover:scale-110'}`}
              />
              <span className="text-[10px] text-[#55efc4] font-medium mt-1">
                Toucher / FaceID
              </span>
            </button>

            {authError && (
              <div className="flex items-center gap-1.5 text-xs text-[#ff7675] mb-4 bg-[#ff7675]/10 px-3 py-1.5 rounded-lg border border-[#ff7675]/20">
                <AlertCircle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={() => {
                setMode('pin');
                setAuthError(null);
              }}
              className="flex items-center gap-2 text-xs font-semibold text-[#a29bfe] hover:text-[#00b894] transition-colors py-2 px-4 rounded-xl hover:bg-[#281e4b]"
            >
              <KeyRound size={15} />
              <span>Utiliser le code PIN de secours</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* PIN Code Dots Indicator */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map(index => {
                const isFilled = index < pinInput.length;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      isFilled
                        ? 'bg-[#00b894] border-[#00b894] shadow-[0_0_12px_#00b894]'
                        : 'border-[#4a3b7a] bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {authError && (
              <div className="flex items-center gap-1.5 text-xs text-[#ff7675] mb-4 bg-[#ff7675]/10 px-3 py-1.5 rounded-lg border border-[#ff7675]/20">
                <AlertCircle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Custom 4-Digit Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinDigit(num)}
                  className="h-14 rounded-2xl bg-[#231a44] hover:bg-[#2f225c] active:bg-[#00b894]/20 border border-[#372863] text-lg font-semibold text-[#f1f2f6] flex items-center justify-center transition-all active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => {
                  setMode('biometric');
                  setAuthError(null);
                }}
                className="h-14 rounded-2xl bg-[#1b1435] text-xs text-[#a29bfe] flex flex-col items-center justify-center border border-transparent hover:border-[#372863]"
                title="Retour biométrie"
              >
                <Fingerprint size={18} className="text-[#00b894]" />
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                className="h-14 rounded-2xl bg-[#231a44] hover:bg-[#2f225c] active:bg-[#00b894]/20 border border-[#372863] text-lg font-semibold text-[#f1f2f6] flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="h-14 rounded-2xl bg-[#1b1435] text-xs text-[#ff7675] hover:bg-[#ff7675]/10 flex items-center justify-center font-medium transition-colors"
                title="Effacer"
              >
                Effacer
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[#2d2254]/60 w-full flex items-center justify-center gap-1.5 text-[11px] text-[#a29bfe]/60">
          <Lock size={12} className="text-[#00b894]" />
          <span>Chiffrement bout-en-bout & coffre-fort isolé</span>
        </div>
      </div>
    </div>
  );
};
