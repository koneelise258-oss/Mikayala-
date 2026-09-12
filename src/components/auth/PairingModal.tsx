import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Sparkles, 
  QrCode, 
  Camera, 
  Copy, 
  Check, 
  Share2, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle,
  Smartphone,
  X,
  Info,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  createCoupleSpace, 
  joinCoupleSpace, 
  subscribeToCouplePairing, 
  saveStoredPairingState,
  restoreCoupleSpaceOnNewDevice
} from '../../services/authService';
import { 
  createDeviceApprovalRequest, 
  listenForDeviceApproval 
} from '../../services/deviceSyncService';
import { CoupleSpace, PairingState } from '../../types';
import { triggerHaptic } from '../../utils/security';
import { soundEffects } from '../../utils/audio';

interface PairingModalProps {
  isOpen: boolean;
  onPairingComplete: (pin: string, pairingState: PairingState) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

type Step = 'choice' | 'create' | 'join' | 'restore' | 'waiting_approval' | 'pin_setup';

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onPairingComplete,
  onClose,
  canDismiss = false
}) => {
  const [step, setStep] = useState<Step>('choice');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Create space state
  const [createdCouple, setCreatedCouple] = useState<CoupleSpace | null>(null);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Join space state
  const [inputCode, setInputCode] = useState<string>('');
  const [isScanningCamera, setIsScanningCamera] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Restore space state (Changer de téléphone / Tablette)
  const [restoreCode, setRestoreCode] = useState<string>('');
  const [restoreRole, setRestoreRole] = useState<'user1' | 'user2'>('user1');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [approvalCountdown, setApprovalCountdown] = useState<number>(180);

  // PIN creation state
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [tempPairingState, setTempPairingState] = useState<PairingState | null>(null);

  // Reset errors when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
  }, [isOpen]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Listen to pairing when in "create" mode via Supabase Realtime
  useEffect(() => {
    if (step === 'create' && createdCouple?.id) {
      const unsubscribe = subscribeToCouplePairing(createdCouple.id, (pairedCouple) => {
        triggerHaptic([100, 50, 100]);
        soundEffects.playSent();
        launchConfetti();
        setTempPairingState({
          isPaired: true,
          coupleId: pairedCouple.id,
          pairingCode: pairedCouple.pairingCode,
          role: 'user1',
          partnerId: pairedCouple.user2Id,
          pairedAt: pairedCouple.pairedAt || Date.now()
        });
        setStep('pin_setup');
      });

      return () => {
        unsubscribe();
      };
    }
  }, [step, createdCouple]);

  if (!isOpen) return null;

  const launchConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00b894', '#fd79a8', '#6c5ce7', '#ffeaa7']
      });
    } catch {
      // safe fallback
    }
  };

  const handleStartCreate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await createCoupleSpace();
      setCreatedCouple(result.couple);
      setPairingCode(result.pairingCode);
      setStep('create');
      triggerHaptic(30);
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible d'initialiser l'espace de couple sur Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartJoin = () => {
    setStep('join');
    setInputCode('');
    setErrorMsg(null);
    triggerHaptic(30);
  };

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setIsCopied(true);
      triggerHaptic(40);
      soundEffects.playSent();
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareCode = async () => {
    if (!pairingCode) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Rejoins notre espace secret Mikayla 🔒💜',
          text: `Mon amour, voici notre code de jumelage secret pour notre espace : ${pairingCode}`,
          url: window.location.href
        });
      } else {
        handleCopyCode();
      }
    } catch {
      handleCopyCode();
    }
  };

  // Camera preview handlers
  const startCameraStream = async () => {
    setIsScanningCamera(true);
    setErrorMsg(null);
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
      setIsScanningCamera(false);
      setErrorMsg("Impossible d'accéder à la caméra. Saisissez le code manuellement ci-dessous.");
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanningCamera(false);
  };

  const handleSubmitJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Veuillez renseigner un code de jumelage à 6 caractères.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await joinCoupleSpace(clean);
      if (res.success && res.couple) {
        stopCameraStream();
        triggerHaptic([100, 50, 100]);
        soundEffects.playSent();
        launchConfetti();

        setTempPairingState({
          isPaired: true,
          coupleId: res.couple.id,
          pairingCode: clean,
          role: 'user2',
          partnerId: res.couple.user1Id,
          pairedAt: res.couple.pairedAt || Date.now()
        });

        setStep('pin_setup');
      } else {
        triggerHaptic([150, 100]);
        setErrorMsg(res.error || 'Code invalide ou introuvable sur Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la communication avec Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRestore = () => {
    triggerHaptic(20);
    setErrorMsg(null);
    setRestoreCode('');
    setStep('restore');
  };

  const handleSubmitRestore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = restoreCode.trim();
    if (!clean) {
      setErrorMsg("Veuillez saisir votre Code Couple ou le Code de Liaison.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await restoreCoupleSpaceOnNewDevice(clean, restoreRole);
      if (res.success && res.couple) {
        const actualRole = res.forcedRole || restoreRole;
        const targetUserId = actualRole === 'user1' ? res.couple.user1Id : res.couple.user2Id;

        const nextPairingState: PairingState = {
          isPaired: true,
          coupleId: res.couple.id,
          pairingCode: res.couple.pairingCode,
          role: actualRole,
          partnerId: actualRole === 'user1' ? res.couple.user2Id : res.couple.user1Id,
          pairedAt: res.couple.pairedAt || Date.now()
        };

        // Si l'utilisateur a renseigné un code de liaison MIK-LINK, accès direct
        if (clean.startsWith('MIK-LINK-')) {
          triggerHaptic([100, 50, 100]);
          soundEffects.playSent();
          launchConfetti();
          setTempPairingState(nextPairingState);
          setStep('pin_setup');
          return;
        }

        // Sinon (WhatsApp style) : Envoyer une demande d'approbation au téléphone principal
        if (targetUserId) {
          const reqRes = await createDeviceApprovalRequest(res.couple.id, targetUserId, actualRole);
          if (reqRes.success && reqRes.requestId) {
            setPendingRequestId(reqRes.requestId);
            setTempPairingState(nextPairingState);
            setApprovalCountdown(180);
            setStep('waiting_approval');
            return;
          }
        }

        // Fallback standard sécurisé si pas de targetUserId disponible
        triggerHaptic([100, 50, 100]);
        soundEffects.playSent();
        launchConfetti();
        setTempPairingState(nextPairingState);
        setStep('pin_setup');
      } else {
        triggerHaptic([150, 100]);
        setErrorMsg(res.error || "Espace couple introuvable. Vérifiez votre Code Couple.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la récupération de l'espace.");
    } finally {
      setLoading(false);
    }
  };

  // Écoute de l'approbation en temps réel sur la tablette/nouveau téléphone
  useEffect(() => {
    if (step !== 'waiting_approval' || !pendingRequestId) return;

    const interval = setInterval(() => {
      setApprovalCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMsg("Délai d'approbation expiré. Veuillez relancer la demande.");
          setStep('restore');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const cleanup = listenForDeviceApproval(
      pendingRequestId,
      (authPayload) => {
        clearInterval(interval);
        triggerHaptic([100, 50, 100]);
        soundEffects.playSent();
        launchConfetti();

        if (authPayload.pairingState) {
          setTempPairingState(authPayload.pairingState);
          saveStoredPairingState(authPayload.pairingState);
        }

        setStep('pin_setup');
      },
      () => {
        clearInterval(interval);
        triggerHaptic([150, 100]);
        setErrorMsg("Connexion refusée depuis votre téléphone principal.");
        setStep('restore');
      }
    );

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, [step, pendingRequestId]);

  // PIN Keyboard Input Handlers
  const handlePinDigit = (digit: string) => {
    triggerHaptic(30);
    soundEffects.playTap();

    if (pinStep === 'create') {
      if (firstPin.length < 4) {
        const next = firstPin + digit;
        setFirstPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            setPinStep('confirm');
            triggerHaptic(50);
          }, 250);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === firstPin) {
            triggerHaptic([50, 50, 100]);
            soundEffects.playSent();
            launchConfetti();

            if (!tempPairingState) {
              setErrorMsg('Session de jumelage expirée. Veuillez réinitialiser.');
              return;
            }

            saveStoredPairingState(tempPairingState);

            setTimeout(() => {
              onPairingComplete(next, tempPairingState);
            }, 500);
          } else {
            triggerHaptic([150, 80, 150]);
            setErrorMsg('Les codes PIN ne correspondent pas. Recommencez.');
            setTimeout(() => {
              setConfirmPin('');
              setPinStep('create');
              setFirstPin('');
              setErrorMsg(null);
            }, 1000);
          }
        }
      }
    }
  };

  const handlePinDelete = () => {
    triggerHaptic(20);
    if (pinStep === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0714]/95 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#171230] border border-[#2d2254] rounded-3xl w-full max-w-md p-6 text-[#f1f2f6] shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Close Button if dismissible */}
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#a29bfe] hover:text-white rounded-full bg-[#130f26] border border-[#2d2254] transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-[#d63031]/20 border border-[#d63031]/40 rounded-2xl flex items-center gap-2.5 text-xs text-[#ff7675]">
            <AlertCircle size={16} className="shrink-0" />
            <p className="flex-1 font-medium leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: CHOICE SCREEN (Créer ou Rejoindre) */}
        {/* ========================================================================= */}
        {step === 'choice' && (
          <div className="flex flex-col items-center text-center space-y-5 py-2">
            {/* Emblem Badge */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] to-[#fd79a8] flex items-center justify-center shadow-[0_0_25px_rgba(253,121,168,0.4)]">
                <Heart size={32} className="text-white fill-white animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-[#130f26] rounded-full border border-[#2d2254]">
                <Sparkles size={14} className="text-[#ffeaa7]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Sanctuaire de Couple
              </h2>
              <p className="text-xs text-[#a29bfe] max-w-xs mx-auto leading-relaxed">
                Espace privé sans inscription complexe. Appairage direct via votre serveur Supabase.
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              {/* Option 1: Créer notre espace */}
              <button
                onClick={handleStartCreate}
                disabled={loading}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#00b894] to-[#00cec9] text-[#130f26] font-bold text-sm flex items-center justify-between hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(0,184,148,0.3)] cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#130f26]/15 flex items-center justify-center">
                    {loading ? <RefreshCw size={20} className="animate-spin text-[#130f26]" /> : <Sparkles size={20} className="text-[#130f26]" />}
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-sm leading-tight">Créer notre espace</p>
                    <p className="text-[11px] font-medium opacity-80">Générer un QR code & code de jumelage</p>
                  </div>
                </div>
                <ArrowRight size={18} />
              </button>

              {/* Option 2: Rejoindre mon partenaire */}
              <button
                onClick={handleStartJoin}
                disabled={loading}
                className="w-full p-4 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:border-[#6c5ce7] text-white font-bold text-sm flex items-center justify-between hover:bg-[#1f183d] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6c5ce7]/20 flex items-center justify-center text-[#a29bfe]">
                    <Smartphone size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-extrabold text-sm leading-tight">Rejoindre mon partenaire</p>
                    <p className="text-[11px] text-[#a29bfe]">Scanner le QR ou saisir le code secret</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[#a29bfe]" />
              </button>

              {/* Option 3: Changer de téléphone / Récupérer mon espace */}
              <button
                onClick={handleStartRestore}
                disabled={loading}
                className="w-full p-3.5 rounded-2xl bg-[#130f26]/70 border border-[#a29bfe]/20 hover:border-[#ffeaa7] text-white font-semibold text-xs flex items-center justify-between hover:bg-[#1f183d] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#ffeaa7]/15 flex items-center justify-center text-[#ffeaa7]">
                    <RefreshCw size={16} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs text-white">Changer de téléphone / Tablette</p>
                    <p className="text-[10px] text-[#a29bfe]">Récupérer un espace couple existant</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-[#ffeaa7]" />
              </button>
            </div>

            {/* Privacy Guarantee Footer */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-[#a29bfe]/70">
              <ShieldCheck size={14} className="text-[#00b894]" />
              <span>Espace privé réservé à votre couple</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CREATE SCREEN (Affiche QR Code & Code 6 Caractères) */}
        {/* ========================================================================= */}
        {step === 'create' && (
          <div className="flex flex-col items-center text-center space-y-4 py-1 overflow-y-auto">
            <div className="flex items-center justify-between w-full pb-2 border-b border-[#2d2254]">
              <button
                onClick={() => setStep('choice')}
                className="p-1.5 text-[#a29bfe] hover:text-white rounded-xl hover:bg-[#130f26] flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft size={16} />
                <span>Retour</span>
              </button>
              <span className="text-xs font-bold text-[#ffeaa7] flex items-center gap-1">
                <Sparkles size={14} /> Espace initié
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Invitez votre moitié 💜</h3>
              <p className="text-xs text-[#a29bfe] max-w-xs mx-auto">
                Montrez ce QR Code à votre partenaire ou partagez-lui le code secret à 6 caractères.
              </p>
            </div>

            {/* QR Code Card */}
            <div className="bg-white p-4 rounded-3xl shadow-2xl flex flex-col items-center text-[#130f26] relative">
              <div className="w-44 h-44 border-4 border-[#00b894] p-1.5 rounded-2xl flex items-center justify-center bg-white relative">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#130f26] fill-current">
                  {/* Outer corner squares */}
                  <rect x="5" y="5" width="28" height="28" rx="4" fill="#130f26" />
                  <rect x="9" y="9" width="20" height="20" rx="2" fill="white" />
                  <rect x="13" y="13" width="12" height="12" rx="1" fill="#00b894" />

                  <rect x="67" y="5" width="28" height="28" rx="4" fill="#130f26" />
                  <rect x="71" y="9" width="20" height="20" rx="2" fill="white" />
                  <rect x="75" y="13" width="12" height="12" rx="1" fill="#00b894" />

                  <rect x="5" y="67" width="28" height="28" rx="4" fill="#130f26" />
                  <rect x="9" y="71" width="20" height="20" rx="2" fill="white" />
                  <rect x="13" y="75" width="12" height="12" rx="1" fill="#00b894" />

                  {/* QR Pattern dots */}
                  <rect x="38" y="10" width="6" height="6" rx="1" />
                  <rect x="50" y="10" width="6" height="6" rx="1" />
                  <rect x="38" y="22" width="6" height="6" rx="1" fill="#fd79a8" />
                  <rect x="50" y="26" width="6" height="6" rx="1" />
                  
                  <rect x="10" y="38" width="6" height="6" rx="1" />
                  <rect x="22" y="44" width="6" height="6" rx="1" />
                  <rect x="38" y="38" width="8" height="8" rx="2" fill="#00b894" />
                  <rect x="52" y="40" width="6" height="6" rx="1" />
                  <rect x="65" y="38" width="6" height="6" rx="1" />
                  <rect x="80" y="42" width="6" height="6" rx="1" />

                  <rect x="38" y="52" width="6" height="6" rx="1" />
                  <rect x="52" y="54" width="8" height="8" rx="2" fill="#fd79a8" />
                  <rect x="70" y="52" width="6" height="6" rx="1" />
                  <rect x="84" y="52" width="6" height="6" rx="1" />

                  <rect x="38" y="68" width="6" height="6" rx="1" />
                  <rect x="50" y="74" width="6" height="6" rx="1" />
                  <rect x="42" y="84" width="6" height="6" rx="1" />
                  <rect x="68" y="70" width="6" height="6" rx="1" fill="#00b894" />
                  <rect x="82" y="78" width="6" height="6" rx="1" />
                </svg>

                {/* Center Heart Emblem */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="p-1.5 rounded-full bg-white shadow-md">
                    <Heart size={20} className="text-[#fd79a8] fill-[#fd79a8]" />
                  </div>
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6c5ce7]">
                  MIKAYLA PAIRING KEY
                </span>
              </div>
            </div>

            {/* 6-Character Code Display & Action Buttons */}
            <div className="w-full space-y-2">
              <div className="p-3 bg-[#130f26] border border-[#2d2254] rounded-2xl flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[10px] text-[#a29bfe] font-medium">Code de jumelage :</p>
                  <p className="text-2xl font-black text-[#00b894] tracking-wider font-mono">
                    {pairingCode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-xl bg-[#20183e] hover:bg-[#2d2254] text-[#a29bfe] hover:text-white transition-colors cursor-pointer"
                    title="Copier le code"
                  >
                    {isCopied ? <Check size={18} className="text-[#00b894]" /> : <Copy size={18} />}
                  </button>
                  <button
                    onClick={handleShareCode}
                    className="p-2.5 rounded-xl bg-[#00b894] text-[#130f26] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    title="Partager"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              {/* Waiting Live Status Animation */}
              <div className="p-3 rounded-2xl bg-[#20183e]/70 border border-[#2d2254] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#a29bfe]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00b894] animate-ping" />
                  <span className="font-semibold text-white text-xs">En attente de votre partenaire (Realtime)...</span>
                </div>
                <RefreshCw size={14} className="animate-spin text-[#a29bfe]" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: JOIN SCREEN (Scan QR ou Saisie du Code 6 caractères) */}
        {/* ========================================================================= */}
        {step === 'join' && (
          <div className="flex flex-col items-center text-center space-y-4 py-1 overflow-y-auto">
            <div className="flex items-center justify-between w-full pb-2 border-b border-[#2d2254]">
              <button
                onClick={() => {
                  stopCameraStream();
                  setStep('choice');
                }}
                className="p-1.5 text-[#a29bfe] hover:text-white rounded-xl hover:bg-[#130f26] flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft size={16} />
                <span>Retour</span>
              </button>
              <span className="text-xs font-bold text-[#6c5ce7] flex items-center gap-1">
                <Smartphone size={14} /> Rejoindre
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Rejoindre votre moitié 💚</h3>
              <p className="text-xs text-[#a29bfe] max-w-xs mx-auto">
                Saisissez le code secret à 6 caractères ou utilisez la vue caméra pour viser le QR Code.
              </p>
            </div>

            {/* Camera Viewfinder or Scanner Switch */}
            {isScanningCamera ? (
              <div className="w-full relative rounded-2xl overflow-hidden border-2 border-[#00b894] bg-black h-48 flex items-center justify-center flex-col">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-4 border border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-[#00b894] shadow-[0_0_8px_#00b894] animate-pulse" />
                </div>
                <div className="absolute top-2 left-2 right-2 bg-[#130f26]/90 backdrop-blur-md rounded-xl p-2 text-[10px] text-white flex items-center gap-1.5">
                  <Info size={14} className="text-[#ffeaa7] shrink-0" />
                  <span>Viseur actif. Vous pouvez également saisir directement le code à 6 caractères ci-dessous.</span>
                </div>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-[#130f26]/80 backdrop-blur-md rounded-lg text-[10px] text-white font-bold cursor-pointer"
                >
                  Fermer caméra
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startCameraStream}
                className="w-full p-3 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:border-[#00b894] flex items-center justify-center gap-2 text-xs font-bold text-[#00b894] transition-colors cursor-pointer"
              >
                <Camera size={18} />
                <span>Ouvrir le viseur caméra</span>
              </button>
            )}

            {/* Manual Code Input Form */}
            <form onSubmit={handleSubmitJoin} className="w-full space-y-3">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider block">
                  Code secret à 6 caractères
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="MIK-N54V"
                    maxLength={10}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    className="w-full bg-[#130f26] border-2 border-[#2d2254] focus:border-[#00b894] rounded-2xl py-3 px-4 text-center font-mono text-xl font-black text-white uppercase tracking-widest placeholder-[#a29bfe]/30 outline-none transition-all"
                  />
                  {inputCode && (
                    <button
                      type="button"
                      onClick={() => setInputCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a29bfe] hover:text-white cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00b894] to-[#00cec9] text-[#130f26] font-black text-sm hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,184,148,0.3)]"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Valider et rejoindre notre espace</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3B: RESTORE SCREEN (Changement de téléphone / Récupération d'espace) */}
        {/* ========================================================================= */}
        {step === 'restore' && (
          <div className="flex flex-col items-center text-center space-y-4 py-1 overflow-y-auto">
            <div className="flex items-center justify-between w-full pb-2 border-b border-[#2d2254]">
              <button
                onClick={() => setStep('choice')}
                className="p-1.5 text-[#a29bfe] hover:text-white rounded-xl hover:bg-[#130f26] flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft size={16} />
                <span>Retour</span>
              </button>
              <span className="text-xs font-bold text-[#ffeaa7] flex items-center gap-1">
                <RefreshCw size={14} /> Récupérer mon espace
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Changement d'appareil 📱</h3>
              <p className="text-xs text-[#a29bfe] max-w-xs mx-auto">
                Entrez le Code Couple (ex: MIK-7842) ou l'identifiant de votre espace pour reconnecter ce téléphone.
              </p>
            </div>

            <form onSubmit={handleSubmitRestore} className="w-full space-y-3.5 pt-1">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider block">
                  Code Couple ou Code de Liaison
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={restoreCode}
                    onChange={(e) => setRestoreCode(e.target.value)}
                    placeholder="MIK-7842 ou MIK-LINK-..."
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full bg-[#130f26] border-2 border-[#2d2254] focus:border-[#ffeaa7] rounded-2xl py-3 px-4 text-center font-mono text-sm md:text-lg font-black text-white tracking-widest placeholder-[#a29bfe]/30 outline-none transition-all"
                  />
                  {restoreCode && (
                    <button
                      type="button"
                      onClick={() => setRestoreCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a29bfe] hover:text-white cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Rôle sur cet appareil */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider block">
                  Votre profil dans le couple
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreRole('user1')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      restoreRole === 'user1'
                        ? 'bg-[#00b894]/20 border-[#00b894] text-[#55efc4]'
                        : 'bg-[#130f26] border-[#2d2254] text-[#a29bfe]'
                    }`}
                  >
                    <span>Partenaire 1</span>
                    <span className="text-[10px] font-normal opacity-70">Créateur de l'espace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreRole('user2')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      restoreRole === 'user2'
                        ? 'bg-[#6c5ce7]/20 border-[#6c5ce7] text-[#a29bfe]'
                        : 'bg-[#130f26] border-[#2d2254] text-[#a29bfe]'
                    }`}
                  >
                    <span>Partenaire 2</span>
                    <span className="text-[10px] font-normal opacity-70">Second membre</span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-[#130f26] rounded-xl border border-[#2d2254] text-[11px] text-[#a29bfe] text-left flex items-start gap-2">
                <Info size={14} className="text-[#ffeaa7] shrink-0 mt-0.5" />
                <span>Tous vos messages, photos du coffre-fort et souvenirs partagés seront automatiquement synchronisés sur ce nouvel appareil.</span>
              </div>

              <button
                type="submit"
                disabled={loading || !restoreCode.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ffeaa7] to-[#fdcb6e] text-[#130f26] font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(253,203,110,0.3)] cursor-pointer disabled:opacity-40"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin text-[#130f26]" />
                ) : (
                  <>
                    <span>Demander l'accès & Synchroniser</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3C: WAITING APPROVAL SCREEN (Attente d'autorisation WhatsApp) */}
        {/* ========================================================================= */}
        {step === 'waiting_approval' && (
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            {/* Animated Radio Signal Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#6c5ce7]/20 border-2 border-[#6c5ce7] flex items-center justify-center text-[#a29bfe]">
                <Smartphone size={36} />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#fdcb6e] flex items-center justify-center text-[#130f26] font-black animate-pulse shadow-md">
                <Radio size={16} />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#fdcb6e] bg-[#fdcb6e]/10 px-3 py-1 rounded-full border border-[#fdcb6e]/30">
                Validation WhatsApp
              </span>
              <h3 className="text-xl font-black text-white">
                Vérifiez votre téléphone 📱
              </h3>
              <p className="text-xs text-[#a29bfe] max-w-xs mx-auto leading-relaxed">
                Une notification de sécurité a été envoyée sur votre téléphone principal. Ouvrez l'application et confirmez avec votre code PIN pour autoriser cet appareil.
              </p>
            </div>

            {/* Countdown timer & Realtime pulse */}
            <div className="p-4 bg-[#130f26] border border-[#2d2254] rounded-2xl w-full max-w-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a29bfe] font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00b894] animate-ping" />
                  En attente du signal...
                </span>
                <span className="font-mono font-black text-[#ffeaa7]">
                  {Math.floor(approvalCountdown / 60)}:{(approvalCountdown % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="w-full bg-[#2d2254] h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#ffeaa7] to-[#00b894] h-full transition-all duration-1000"
                  style={{ width: `${(approvalCountdown / 180) * 100}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('restore');
                setPendingRequestId(null);
              }}
              className="text-xs text-[#a29bfe] hover:text-white font-semibold py-2 px-4 rounded-xl hover:bg-[#130f26] transition-colors cursor-pointer"
            >
              Annuler la demande
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: PIN SETUP SCREEN (Création et confirmation du code PIN à 4 chiffres) */}
        {/* ========================================================================= */}
        {step === 'pin_setup' && (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            {/* Success Badge */}
            <div className="w-12 h-12 rounded-full bg-[#00b894]/20 border border-[#00b894] flex items-center justify-center text-[#00b894] animate-bounce">
              <Lock size={22} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                {pinStep === 'create' ? 'Créez votre Code PIN secret' : 'Confirmez votre Code PIN'}
              </h3>
              <p className="text-xs text-[#a29bfe] max-w-xs mx-auto">
                {pinStep === 'create'
                  ? 'Ce code à 4 chiffres protégera votre sanctuaire et vos photos intimes.'
                  : 'Saisissez à nouveau les 4 chiffres pour valider la protection.'}
              </p>
            </div>

            {/* 4-Digit Indicators */}
            <div className="flex gap-4 my-2">
              {[0, 1, 2, 3].map((index) => {
                const currentLength = pinStep === 'create' ? firstPin.length : confirmPin.length;
                const isFilled = index < currentLength;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-[#00b894] scale-125 shadow-[0_0_12px_#00b894]'
                        : 'bg-[#2d2254] border border-[#a29bfe]/30'
                    }`}
                  />
                );
              })}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinDigit(num)}
                  className="h-13 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:bg-[#20183e] hover:border-[#6c5ce7] active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer shadow-sm"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                className="h-13 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:bg-[#20183e] hover:border-[#6c5ce7] active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="h-13 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:bg-[#20183e] active:scale-95 text-[#a29bfe] hover:text-[#ff7675] font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              >
                Effacer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairingModal;
