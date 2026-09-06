import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User as UserIcon, 
  MessageSquare, 
  Bell, 
  Shield, 
  Paintbrush, 
  Check, 
  RefreshCw,
  Fingerprint,
  Lock,
  EyeOff,
  Database,
  Trash2,
  Sparkles,
  Flame,
  KeyRound,
  Palette,
  Sliders,
  Heart,
  Unlink,
  AlertTriangle,
  QrCode,
  Camera,
  Loader2,
  Clock,
  Copy,
  Smartphone
} from 'lucide-react';
import { User, ChatSettings, AppThemeConfig, PairingState, UserProfile } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { ThemeCustomizer } from './ThemeCustomizer';
import { clearPairingState, getStoredPairingState, default as authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { NotificationService, PushNotificationService } from '../services/notificationService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  settings: ChatSettings;
  themeConfig?: AppThemeConfig;
  pairingState?: PairingState;
  onOpenPairingModal?: () => void;
  onResetPairing?: () => void;
  onUpdateCurrentUser: (user: User) => void;
  onUpdatePartnerUser?: (user: User) => void;
  onUpdateSettings: (settings: ChatSettings) => void;
  onThemeChange?: (theme: AppThemeConfig) => void;
  onClearAllData?: () => void;
  myProfile?: UserProfile | null;
  onProfileUpdated?: () => void;
  // Centralized section management
  activeSection: 'main' | 'couple' | 'appearance' | 'profile' | 'privacy' | 'supabase' | 'security_auth' | 'notifications' | 'link_device';
  onSetActiveSection: (section: 'main' | 'couple' | 'appearance' | 'profile' | 'privacy' | 'supabase' | 'security_auth' | 'notifications' | 'link_device') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  settings,
  themeConfig,
  pairingState,
  onOpenPairingModal,
  onResetPairing,
  onUpdateCurrentUser,
  onUpdatePartnerUser,
  onUpdateSettings,
  onThemeChange,
  onClearAllData,
  myProfile,
  onProfileUpdated,
  activeSection,
  onSetActiveSection
}) => {
  const [name, setName] = useState(myProfile?.display_name || currentUser.name);
  const [bio, setBio] = useState(myProfile?.bio || currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Profile update states
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);
  const [tempAvatarPreview, setTempAvatarPreview] = useState<string | null>(null);

  // Auth / Security states
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'link' | 'recover'>('link');

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseConfig?.url || '');
  const [supabaseKey, setSupabaseKey] = useState(settings.supabaseConfig?.anonKey || '');

  // PIN code change
  const [pinCode, setPinCode] = useState(settings.securityPin || '1234');

  // Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => 
    NotificationService.getPermissionStatus()
  );
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      NotificationService.getPushSubscription().then(sub => {
        setPushSubscribed(Boolean(sub));
      });
    }
  }, [isOpen]);

  const handleEnableNotifications = async () => {
    setIsSubscribingPush(true);
    setPushFeedback(null);
    try {
      // Direct call to PushNotificationService.subscribeUser() (Objective 2)
      const res = await PushNotificationService.subscribeUser();
      setNotificationPermission(NotificationService.getPermissionStatus());
      triggerHaptic(30);

      if (res.success) {
        setPushSubscribed(true);
        setPushFeedback('Notifications Push activées et synchronisées dans Supabase ! ✨');
      } else {
        setPushFeedback(res.error || 'Notifications locales accordées');
      }
    } catch (err: any) {
      setPushFeedback(err?.message || 'Erreur d’activation');
    } finally {
      setIsSubscribingPush(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeSection === 'security_auth') {
      const fetchEmail = async () => {
        const email = await authService.getCurrentUserEmail();
        const pending = await authService.getPendingEmail();
        setLinkedEmail(email);
        setPendingEmail(pending);
        
        if (email) {
          setRecoveryEmail(email);
          setAuthMode('link');
        } else if (pending) {
          setRecoveryEmail(pending);
          setAuthMode('link');
        }
      };
      fetchEmail();
    }
  }, [isOpen, activeSection]);

  if (!isOpen) return null;

  const handleLinkEmail = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setAuthError('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await authService.linkEmailToAccount(recoveryEmail.trim());
      if (res.success) {
        setAuthSuccess('Un e-mail de confirmation a été envoyé. Veuillez cliquer sur le lien pour sécuriser votre accès.');
        const pending = await authService.getPendingEmail();
        setPendingEmail(pending);
        triggerHaptic(40);
        soundEffects.playReaction();
      } else {
        setAuthError(res.error || "Échec de l'envoi de l'e-mail de confirmation.");
      }
    } catch (err: any) {
      setAuthError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setAuthError('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await authService.sendMagicLink(recoveryEmail.trim());
      if (res.success) {
        setAuthSuccess('Lien magique envoyé ! Vérifiez votre boîte de réception pour vous reconnecter.');
        triggerHaptic(40);
        soundEffects.playReaction();
      } else {
        setAuthError(res.error || "Échec de l'envoi du lien magique.");
      }
    } catch (err: any) {
      setAuthError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCancelProfile = () => {
    if (myProfile) {
      setName(myProfile.display_name);
      setBio(myProfile.bio || '');
    }
    setTempAvatarFile(null);
    if (tempAvatarPreview) {
      URL.revokeObjectURL(tempAvatarPreview);
      setTempAvatarPreview(null);
    }
    setProfileError(null);
    setProfileSuccess(null);
    onSetActiveSection('main');
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      // 1. Update text profile info
      const result = await profileService.updateProfile({
        display_name: name.trim(),
        bio: bio.trim()
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour du profil');
      }

      // 2. Handle avatar upload if a new file was selected
      if (tempAvatarFile) {
        setUploadProgress(true);
        const uploadResult = await profileService.uploadAvatar(tempAvatarFile);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Erreur lors de l'upload de l'avatar");
        }
        setTempAvatarFile(null);
        if (tempAvatarPreview) {
          URL.revokeObjectURL(tempAvatarPreview);
          setTempAvatarPreview(null);
        }
      }

      triggerHaptic(40);
      soundEffects.playReaction();
      setProfileSuccess('Profil mis à jour avec succès');
      if (onProfileUpdated) onProfileUpdated();
      
      // Keep in section for a moment to show success, then return
      setTimeout(() => {
        if (activeSection === 'profile') {
          onSetActiveSection('main');
          setProfileSuccess(null);
        }
      }, 1500);

    } catch (err: any) {
      setProfileError(err.message || 'Une erreur est survenue');
    } finally {
      setIsUpdating(false);
      setUploadProgress(false);
    }
  };

  const handleAvatarSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setProfileError('Format non supporté (JPG, PNG, WebP uniquement)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image trop volumineuse (max 5 Mo)');
      return;
    }

    setProfileError(null);
    setTempAvatarFile(file);
    if (tempAvatarPreview) URL.revokeObjectURL(tempAvatarPreview);
    setTempAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveSupabase = () => {
    onUpdateSettings({
      ...settings,
      supabaseConfig: {
        url: supabaseUrl.trim(),
        anonKey: supabaseKey.trim(),
        enabled: Boolean(supabaseUrl.trim() && supabaseKey.trim())
      }
    });
    triggerHaptic(50);
    soundEffects.playReaction();
    onSetActiveSection('main');
  };

  const handleConfirmResetPairing = () => {
    // Clear only the local pairing state
    clearPairingState();
    triggerHaptic([50, 100]);
    setShowResetConfirm(false);
    
    if (onResetPairing) {
      onResetPairing();
    } else {
      onClose();
      if (onOpenPairingModal) {
        onOpenPairingModal();
      }
    }
  };

  const currentPairing = pairingState || getStoredPairingState();

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-lg overflow-hidden border border-[#2d2254] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#1f1742] flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-2">
            {activeSection !== 'main' && (
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  window.history.back();
                }}
                className="text-xs text-[#a29bfe] hover:text-white px-2 py-1 rounded-lg bg-[#281e4b] mr-1 cursor-pointer font-medium"
              >
                ← Retour
              </button>
            )}
            <h3 className="font-bold text-base text-white">
              {activeSection === 'main' && 'Paramètres & Personnalisation'}
              {activeSection === 'couple' && 'Espace couple'}
              {activeSection === 'appearance' && 'Apparence & Design System'}
              {activeSection === 'profile' && 'Profil de Couple'}
              {activeSection === 'privacy' && 'Biométrie & Anti-Discrétion'}
              {activeSection === 'notifications' && 'Notifications Push & Alertes'}
              {activeSection === 'security_auth' && 'Sécurité & Accès'}
              {activeSection === 'supabase' && 'Synchronisation Cloud Supabase'}
              {activeSection === 'link_device' && 'Appareils Connectés'}
            </h3>
          </div>
          <button
            onClick={() => {
              if (activeSection !== 'main') {
                setShowResetConfirm(false);
                onSetActiveSection('main');
              } else {
                onClose();
              }
            }}
            className="p-1.5 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 text-sm">
          {activeSection === 'main' && (
            <>
              {/* Profile Card / Button */}
              <button
                onClick={() => onSetActiveSection('profile')}
                className="w-full flex items-center gap-4 p-3.5 bg-[#130f26] rounded-2xl border border-[#2d2254] cursor-pointer hover:bg-[#20183e] transition-all group relative overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00b894] shadow-md group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#00b894] text-white p-1 rounded-lg shadow-lg border border-[#130f26]">
                    <Camera size={10} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="font-bold text-base text-white truncate flex items-center gap-1.5">
                    <span>{myProfile?.display_name || currentUser.name}</span>
                    <span className="text-xs font-normal text-[#a29bfe]">avec {partnerUser.name}</span>
                  </h4>
                  <p className="text-xs text-[#a29bfe] truncate">{myProfile?.bio || currentUser.bio}</p>
                </div>
                <div className="p-2 rounded-xl bg-[#281e4b] text-[#a29bfe] group-hover:text-white transition-colors">
                  <Sliders size={18} />
                </div>
              </button>

              {/* Menu items */}
              <div className="space-y-2 pt-2">
                {/* 1. ESPACE COUPLE & JUMELAGE */}
                <button
                  onClick={() => onSetActiveSection('couple')}
                  className="w-full p-3.5 rounded-2xl bg-[#130f26] hover:bg-[#20183e] border border-[#fd79a8]/40 flex items-center gap-3.5 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-2.5 rounded-xl bg-[#fd79a8]/15 text-[#fd79a8] group-hover:scale-105 transition-transform">
                    <Heart size={22} className="fill-[#fd79a8]/20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">Espace couple</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#00b894]/20 text-[#55efc4]">
                        {currentPairing?.isPaired ? (currentPairing.pairingCode || 'Jumelé') : 'Non jumelé'}
                      </span>
                    </div>
                    <p className="text-xs text-[#a29bfe] truncate">
                      {currentPairing?.isPaired 
                        ? `Connecté avec ${partnerUser.name} • Code secret & Réinitialisation` 
                        : 'Jumeler par code secret ou QR code'}
                    </p>
                  </div>
                </button>

                {/* 1.5 Appareils Connectés */}
                {currentPairing?.isPaired && (
                  <button
                    onClick={() => onSetActiveSection('link_device')}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#171235] to-[#241747] hover:from-[#211949] hover:to-[#2c1d56] border border-[#6c5ce7]/50 flex items-center gap-3.5 text-left transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="p-2.5 rounded-xl bg-[#0984e3]/20 text-[#74b9ff] group-hover:text-white transition-transform">
                      <Smartphone size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-white">Appareils Connectés & Web</p>
                      </div>
                      <p className="text-xs text-[#a29bfe] truncate">
                        Connecter un PC, une tablette ou un autre téléphone
                      </p>
                    </div>
                  </button>
                )}

                {/* 2. MOTEUR DE PERSONNALISATION ET DESIGN SYSTEM */}
                <button
                  onClick={() => onSetActiveSection('appearance')}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#1b1435] to-[#251846] hover:from-[#231846] hover:to-[#2e1e57] border border-[#6c5ce7]/40 flex items-center gap-3.5 text-left transition-all cursor-pointer shadow-md group"
                >
                  <div className="p-2.5 rounded-xl bg-[#6c5ce7]/25 text-[#a29bfe] group-hover:text-[#55efc4] transition-colors">
                    <Palette size={22} className="text-[#a29bfe]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-white">Apparence & Thème (Mode Sombre / Clair)</p>
                      <span className="text-[10px] bg-[#00b894]/20 text-[#55efc4] px-1.5 py-0.2 rounded-full font-extrabold">
                        Nouveau
                      </span>
                    </div>
                    <p className="text-xs text-[#a29bfe] truncate">
                      Mode Sombre/Clair, Couleurs :root, Fond d'écran, Bulles, Typographie & Icônes
                    </p>
                  </div>
                </button>

                {/* 3. Biométrie & Sécurité */}
                <button
                  onClick={() => onSetActiveSection('privacy')}
                  className="w-full p-3.5 rounded-2xl bg-[#130f26] hover:bg-[#20183e] border border-[#2d2254] flex items-center gap-3.5 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-[#00b894]/15 text-[#00b894]">
                    <Fingerprint size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">Biométrie & Anti-Discrétion</p>
                    <p className="text-xs text-[#a29bfe] truncate">FaceID / Empreinte, Code PIN & Floutage</p>
                  </div>
                </button>

                {/* 4. Notifications Push & Alertes */}
                <button
                  onClick={() => onSetActiveSection('notifications')}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#171235] to-[#241747] hover:from-[#211949] hover:to-[#2c1d56] border border-[#6c5ce7]/50 flex items-center gap-3.5 text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="p-2.5 rounded-xl bg-[#6c5ce7]/25 text-[#a29bfe] group-hover:text-white group-hover:scale-105 transition-transform">
                    <Bell size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">Notifications Push & Alertes</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        notificationPermission === 'granted' && pushSubscribed
                          ? 'bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/30'
                          : notificationPermission === 'granted'
                          ? 'bg-[#ffeaa7]/20 text-[#ffeaa7] border border-[#ffeaa7]/30'
                          : notificationPermission === 'denied'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-[#6c5ce7]/25 text-[#a29bfe] border border-[#6c5ce7]/30'
                      }`}>
                        {notificationPermission === 'granted' && pushSubscribed
                          ? 'Push Actif ✨'
                          : notificationPermission === 'granted'
                          ? 'Autorisées'
                          : notificationPermission === 'denied'
                          ? 'Bloquées'
                          : 'À configurer'}
                      </span>
                    </div>
                    <p className="text-xs text-[#a29bfe] truncate">
                      Clé VAPID, messages en arrière-plan & tests immédiats
                    </p>
                  </div>
                </button>

                {/* 5. Sécurité & Accès (Session Recovery) */}
                <button
                  onClick={() => onSetActiveSection('security_auth')}
                  className="w-full p-3.5 rounded-2xl bg-[#130f26] hover:bg-[#20183e] border border-[#6c5ce7]/30 flex items-center gap-3.5 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-2.5 rounded-xl bg-[#6c5ce7]/15 text-[#a29bfe] group-hover:text-[#55efc4] transition-colors">
                    <Shield size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">Sécuriser mon accès</p>
                      {linkedEmail && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#00b894]/20 text-[#55efc4]">
                          Protégé
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#a29bfe] truncate">
                      Lier un e-mail pour récupérer votre session à tout moment
                    </p>
                  </div>
                </button>

                {/* 6. Supabase Cloud */}
                <button
                  onClick={() => onSetActiveSection('supabase')}
                  className="w-full p-3.5 rounded-2xl bg-[#130f26] hover:bg-[#20183e] border border-[#2d2254] flex items-center gap-3.5 text-left transition-colors cursor-pointer"
                >
                  <div className="p-2.5 rounded-xl bg-[#0984e3]/15 text-[#0984e3]">
                    <Database size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">Cloud Supabase (Temps Réel)</p>
                    <p className="text-xs text-[#a29bfe] truncate">Synchronisation Postgres & Websockets</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Section: Espace couple */}
          {activeSection === 'couple' && (
            <div className="space-y-4">
              {/* Couple info card */}
              <div className="p-4 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider">
                    Statut du jumelage
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    currentPairing?.isPaired 
                      ? 'bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/30' 
                      : 'bg-[#ffeaa7]/20 text-[#ffeaa7] border border-[#ffeaa7]/30'
                  }`}>
                    {currentPairing?.isPaired ? 'Appareils jumelés' : 'Non jumelé'}
                  </span>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between text-[#a29bfe]">
                    <span>Partenaire :</span>
                    <span className="font-semibold text-white">{partnerUser.name}</span>
                  </div>
                  {currentPairing?.pairingCode && (
                    <div className="flex items-center justify-between text-[#a29bfe]">
                      <span>Code secret de couple :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[#55efc4] text-sm bg-[#1e173e] px-2 py-0.5 rounded-lg border border-[#2d2254]">
                          {currentPairing.pairingCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentPairing.pairingCode) {
                              navigator.clipboard?.writeText(currentPairing.pairingCode);
                              triggerHaptic(20);
                            }
                          }}
                          className="p-1 hover:text-white text-[#a29bfe] cursor-pointer"
                          title="Copier le code"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  {currentPairing?.coupleId && (
                    <div className="flex items-center justify-between text-[#a29bfe]">
                      <span>Clé d'espace unique :</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#f1f2f6] truncate max-w-[140px] bg-[#1e173e] px-1.5 py-0.5 rounded border border-[#2d2254]">
                          {currentPairing.coupleId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentPairing.coupleId) {
                              navigator.clipboard?.writeText(currentPairing.coupleId);
                              triggerHaptic(20);
                            }
                          }}
                          className="p-1 hover:text-white text-[#a29bfe] cursor-pointer"
                          title="Copier la clé"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transfer Info */}
                <div className="p-3 bg-[#1e173e]/70 rounded-xl border border-[#ffeaa7]/20 text-[11px] text-[#a29bfe] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Smartphone size={14} className="text-[#ffeaa7]" />
                    <span>Changement de téléphone ou tablette</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Sur votre nouveau téléphone, lancez Mikayla et choisissez <strong className="text-white">"Changer de téléphone / Récupérer mon espace"</strong> en saisissant votre Code <strong className="text-[#55efc4]">{currentPairing?.pairingCode || 'de jumelage'}</strong>.
                  </p>
                </div>

                {onOpenPairingModal && (
                  <button
                    onClick={() => {
                      onOpenPairingModal();
                      onClose();
                    }}
                    className="w-full mt-2 py-2.5 px-3 bg-[#1e173e] hover:bg-[#281e4b] border border-[#6c5ce7]/40 rounded-xl text-xs font-bold text-[#a29bfe] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <QrCode size={15} />
                    <span>Ouvrir l'écran de jumelage (Code secret / QR Code)</span>
                  </button>
                )}
              </div>

              {/* Reset Section */}
              <div className="p-4 bg-[#1f1122] rounded-2xl border border-red-500/30 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-red-300">Dissociation locale</p>
                    <p className="text-[11px] text-[#d6a5b8] leading-relaxed">
                      Permet de dissocier cet appareil de l'espace couple actuel pour repartir sur un nouveau jumelage (ou après suppression d'un couple de test). Vos identifiants de sécurité et code PIN sont conservés.
                    </p>
                  </div>
                </div>

                {showResetConfirm ? (
                  <div className="p-3 bg-red-950/60 rounded-xl border border-red-500/50 space-y-3 animate-in fade-in">
                    <p className="text-xs font-bold text-red-200 text-center">
                      Voulez-vous vraiment dissocier cet appareil de l’espace couple actuel ?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="py-2 px-3 bg-[#1e173e] hover:bg-[#281e4b] border border-[#2d2254] text-xs font-bold text-[#a29bfe] rounded-xl transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmResetPairing}
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Unlink size={14} />
                        <span>Confirmer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Unlink size={16} />
                    <span>Réinitialiser le jumelage</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Appearance & Advanced Design System Section */}
          {activeSection === 'appearance' && themeConfig && onThemeChange && (
            <ThemeCustomizer
              themeConfig={themeConfig}
              onThemeChange={onThemeChange}
              currentUser={currentUser}
              partnerUser={partnerUser}
              onUpdateCurrentUser={onUpdateCurrentUser}
              onUpdatePartnerUser={onUpdatePartnerUser || (() => {})}
            />
          )}

          {/* Section: Mon Profil Personnel */}
          {activeSection === 'profile' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className={`w-28 h-28 rounded-[2rem] overflow-hidden border-4 border-[#2d2254] shadow-2xl relative bg-[#130f26] flex items-center justify-center ${uploadProgress ? 'opacity-50' : ''}`}>
                    {tempAvatarPreview || currentUser.avatar ? (
                      <img
                        src={tempAvatarPreview || currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <UserIcon size={48} className="text-[#a29bfe]/40" />
                    )}
                    {uploadProgress && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 size={32} className="text-[#55efc4] animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-[#6c5ce7] hover:bg-[#5849be] text-white p-2.5 rounded-2xl shadow-xl border-4 border-[#171230] cursor-pointer transition-all hover:scale-110 active:scale-95">
                    <Camera size={20} />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarSelection}
                      disabled={uploadProgress || isUpdating}
                    />
                  </label>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Photo de profil</p>
                  <p className="text-[10px] text-[#a29bfe] uppercase tracking-widest mt-0.5">Bucket Privé Sécurisé</p>
                </div>
              </div>

              {/* Profile Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-[#a29bfe] uppercase tracking-[0.2em] mb-2 ml-1">
                    Nom d'affichage
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a29bfe]" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Votre nom..."
                      className="w-full bg-[#130f26] border border-[#2d2254] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#a29bfe] uppercase tracking-[0.2em] mb-2 ml-1">
                    Bio / Statut
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Dites quelque chose de doux..."
                    rows={3}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-2xl px-4 py-3.5 text-sm text-white focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] outline-none transition-all resize-none"
                  />
                </div>

                {profileError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs">
                    <AlertTriangle size={14} />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-[#00b894]/10 border border-[#00b894]/30 flex items-center gap-2 text-[#55efc4] text-xs">
                    <Check size={14} />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleCancelProfile}
                    className="py-4 bg-[#130f26] hover:bg-[#1f1742] text-[#a29bfe] font-bold rounded-2xl border border-[#2d2254] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <span>Annuler</span>
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating || uploadProgress || !name.trim()}
                    className="py-4 bg-[#6c5ce7] hover:bg-[#5849be] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-[#6c5ce7]/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {isUpdating ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Check size={20} />
                    )}
                    <span>Enregistrer</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-[11px] text-blue-300/80 leading-relaxed text-center">
                  Ces informations sont stockées dans la table <code className="bg-blue-500/10 px-1 rounded text-blue-200">public.profiles</code>. 
                  Votre partenaire pourra voir ces changements.
                </p>
              </div>
            </div>
          )}

          {/* Privacy & Security */}
          {activeSection === 'privacy' && (
            <div className="space-y-4">
              {/* Biometric Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#130f26] border border-[#2d2254]">
                <div>
                  <p className="font-bold text-sm text-white">Verrouillage Biométrique (WebAuthn)</p>
                  <p className="text-xs text-[#a29bfe]">FaceID / Empreinte au lancement</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isBiometricEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, isBiometricEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2d2254] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b894]"></div>
                </label>
              </div>

              {/* Anti-Discretion Blur */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#130f26] border border-[#2d2254]">
                <div>
                  <p className="font-bold text-sm text-white">Floutage Anti-Discrétion</p>
                  <p className="text-xs text-[#a29bfe]">Floute l'écran quand vous quittez l'app</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.blurOnBackground}
                    onChange={(e) => onUpdateSettings({ ...settings, blurOnBackground: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2d2254] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b894]"></div>
                </label>
              </div>

              {/* Hide Chat Previews */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#130f26] border border-[#2d2254]">
                <div>
                  <p className="font-bold text-sm text-white">Masquer aperçu des messages</p>
                  <p className="text-xs text-[#a29bfe]">Cache le texte dans la liste des discussions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.hideChatPreview}
                    onChange={(e) => onUpdateSettings({ ...settings, hideChatPreview: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2d2254] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b894]"></div>
                </label>
              </div>

              {/* Link to Notifications Push Section */}
              <div
                onClick={() => onSetActiveSection('notifications')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-[#171235] to-[#241747] border border-[#6c5ce7]/40 flex items-center justify-between cursor-pointer hover:border-[#6c5ce7] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#6c5ce7]/20 text-[#a29bfe] group-hover:scale-105 transition-transform">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">Notifications Push & Alertes</p>
                    <p className="text-xs text-[#a29bfe]">Messages en arrière-plan, VAPID & alertes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    notificationPermission === 'granted' && pushSubscribed
                      ? 'bg-[#00b894]/20 text-[#55efc4] border border-[#00b894]/30'
                      : 'bg-[#ffeaa7]/20 text-[#ffeaa7] border border-[#ffeaa7]/30'
                  }`}>
                    {notificationPermission === 'granted' && pushSubscribed ? 'Push Actif ✨' : 'Gérer →'}
                  </span>
                </div>
              </div>

              {/* 4-digit PIN setting */}
              <div className="p-3 rounded-2xl bg-[#130f26] border border-[#2d2254]">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound size={16} className="text-[#00b894]" />
                  <span className="font-bold text-sm text-white">Code PIN de secours</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  value={pinCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPinCode(val);
                    if (val.length === 4) {
                      onUpdateSettings({ ...settings, securityPin: val });
                      triggerHaptic(40);
                    }
                  }}
                  placeholder="2026"
                  className="w-full bg-[#1e173e] border border-[#2d2254] rounded-xl px-3.5 py-2 text-center text-lg font-mono tracking-widest text-[#55efc4] focus:outline-none"
                />
              </div>

              {/* Ephemeral Timer Duration */}
              <div className="p-3 rounded-2xl bg-[#130f26] border border-[#2d2254]">
                <label className="block text-xs font-bold text-[#a29bfe] uppercase tracking-wider mb-2">
                  Messages Éphémères (Auto-suppression)
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                  {[
                    { label: 'Désactivé', value: 0 },
                    { label: '5 min', value: 300 },
                    { label: '24 h', value: 86400 },
                    { label: '7 jours', value: 604800 },
                  ].map(item => (
                    <button
                      key={item.value}
                      onClick={() => onUpdateSettings({ ...settings, ephemeralDuration: item.value })}
                      className={`py-2 px-1 rounded-xl border transition-all ${
                        settings.ephemeralDuration === item.value
                          ? 'bg-[#00b894] border-[#00b894] text-[#130f26] font-bold shadow-md'
                          : 'bg-[#1e173e] border-[#2d2254] text-[#a29bfe] hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section: Notifications Push & Alertes */}
          {activeSection === 'notifications' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              {/* Main Status Header Card */}
              <div className="p-4 bg-gradient-to-br from-[#1b1435] to-[#251846] rounded-2xl border border-[#6c5ce7]/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-[#6c5ce7]/25 text-[#a29bfe]">
                      <Bell size={24} className="text-[#a29bfe]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-white">Notifications Push Web</h4>
                      <p className="text-xs text-[#a29bfe]">Alertes instantanées en arrière-plan</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    notificationPermission === 'granted' && pushSubscribed
                      ? 'bg-[#00b894]/25 text-[#55efc4] border border-[#00b894]/40'
                      : notificationPermission === 'granted'
                      ? 'bg-[#ffeaa7]/25 text-[#ffeaa7] border border-[#ffeaa7]/40'
                      : notificationPermission === 'denied'
                      ? 'bg-red-500/25 text-red-400 border border-red-500/40'
                      : 'bg-[#6c5ce7]/25 text-[#a29bfe] border border-[#6c5ce7]/40'
                  }`}>
                    {notificationPermission === 'granted' && pushSubscribed
                      ? 'Push Actif ✨'
                      : notificationPermission === 'granted'
                      ? 'Autorisées'
                      : notificationPermission === 'denied'
                      ? 'Bloquées'
                      : 'Non configuré'}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Recevez immédiatement une alerte sur votre écran de verrouillage lorsque votre partenaire vous envoie un message, une photo ou un battement de cœur.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {pushFeedback && (
                  <div className="p-3 rounded-xl bg-[#6c5ce7]/15 border border-[#6c5ce7]/30 text-xs text-[#a29bfe] flex items-center gap-2">
                    <Sparkles size={16} className="text-[#a29bfe] shrink-0" />
                    <span>{pushFeedback}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSubscribingPush}
                  onClick={handleEnableNotifications}
                  className="w-full py-4 px-4 bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] hover:opacity-90 text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#6c5ce7]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSubscribingPush ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Activation en cours...</span>
                    </>
                  ) : pushSubscribed ? (
                    <>
                      <Check size={18} className="text-[#2ed573]" />
                      <span>Notifications Push actives ✨ (Cliquez pour resynchroniser)</span>
                    </>
                  ) : (
                    <>
                      <Bell size={18} />
                      <span>Activer les Notifications Push (1 clic)</span>
                    </>
                  )}
                </button>

                {notificationPermission === 'granted' && (
                  <button
                    type="button"
                    onClick={() => {
                      NotificationService.sendLocalNotification('Mikayla — Test de notification 💌', {
                        body: 'Super ! Les notifications fonctionnent sur votre appareil ! ✨',
                        tag: 'test-notification',
                        data: {
                          type: 'test',
                          id: 'test-notification',
                          url: '/'
                        }
                      });
                      triggerHaptic(30);
                      setPushFeedback('Notification de test envoyée ! Regardez le haut de votre écran.');
                    }}
                    className="w-full py-3 px-4 bg-[#1e173e] hover:bg-[#281e4b] border border-[#2d2254] text-[#55efc4] font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Sparkles size={16} />
                    <span>Envoyer une notification de test immédiate</span>
                  </button>
                )}
              </div>

              {/* Instructions Guide */}
              <div className="p-4 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2.5 text-xs">
                <p className="font-bold text-[#a29bfe] uppercase tracking-wider text-[11px]">
                  Instructions par appareil
                </p>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#a29bfe]">📱 iPhone :</span>
                    <span>Ouvrez dans Safari, appuyez sur <strong>Partager</strong> ⬆️ puis sur <strong>« Sur l'écran d'accueil »</strong>. Ouvrez ensuite l'icône depuis votre écran pour activer le Push.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#55efc4]">🤖 Android :</span>
                    <span>Fonctionne directement dans Chrome. Cliquez sur « Activer les Notifications Push » puis acceptez la demande du navigateur.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Sécurité & Accès */}
          {activeSection === 'security_auth' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-4">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-4 rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">
                    {authMode === 'link' ? <Shield size={40} /> : <RefreshCw size={40} />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-white">
                      {authMode === 'link' ? 'Sécurisation du compte' : 'Récupération du compte'}
                    </h4>
                    <p className="text-xs text-[#a29bfe] leading-relaxed">
                      {authMode === 'link' 
                        ? 'Liez un e-mail à votre session actuelle pour ne jamais perdre vos données.' 
                        : 'Utilisez votre e-mail pour retrouver votre session sur un nouvel appareil.'}
                    </p>
                  </div>
                </div>

                {/* Mode Selector */}
                {!linkedEmail && !pendingEmail && (
                  <div className="flex p-1 bg-[#130f26] rounded-xl border border-[#2d2254]">
                    <button
                      onClick={() => setAuthMode('link')}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                        authMode === 'link' ? 'bg-[#6c5ce7] text-white shadow-md' : 'text-[#a29bfe] hover:text-white'
                      }`}
                    >
                      Lier
                    </button>
                    <button
                      onClick={() => setAuthMode('recover')}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                        authMode === 'recover' ? 'bg-[#6c5ce7] text-white shadow-md' : 'text-[#a29bfe] hover:text-white'
                      }`}
                    >
                      Récupérer
                    </button>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#a29bfe] uppercase tracking-[0.2em] ml-1">
                      {authMode === 'link' ? 'E-mail de récupération' : 'E-mail du compte à récupérer'}
                    </label>
                    <div className="relative">
                      <Bell className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a29bfe]" size={18} />
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="exemple@email.com"
                        disabled={isAuthLoading || (!!linkedEmail && authMode === 'link')}
                        className="w-full bg-[#130f26] border border-[#2d2254] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] outline-none transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs">
                      <AlertTriangle size={14} />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3 rounded-xl bg-[#00b894]/10 border border-[#00b894]/30 flex items-center gap-2 text-[#55efc4] text-xs">
                      <Check size={14} />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  {authMode === 'link' ? (
                    <div className="space-y-4">
                      {linkedEmail ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-[#00b894]/10 border border-[#00b894]/30 flex items-center justify-center gap-2 text-[#55efc4] font-bold text-xs">
                            <Check size={16} />
                            <span>Compte protégé par {linkedEmail}</span>
                          </div>
                          <button
                            onClick={handleSendMagicLink}
                            disabled={isAuthLoading}
                            className="w-full py-4 bg-[#130f26] hover:bg-[#20183e] text-white font-bold rounded-2xl border border-[#2d2254] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                          >
                            {isAuthLoading ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <RefreshCw size={20} />
                            )}
                            <span>Renvoyer un lien de connexion</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {pendingEmail && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-300 text-xs">
                              <Clock size={14} />
                              <span>Confirmation en attente ({pendingEmail}).</span>
                            </div>
                          )}
                          <button
                            onClick={handleLinkEmail}
                            disabled={isAuthLoading || !recoveryEmail.includes('@')}
                            className="w-full py-4 bg-[#6c5ce7] hover:bg-[#5849be] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                          >
                            {isAuthLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                            <span>{pendingEmail ? 'Renvoyer la confirmation' : 'Lier mon e-mail'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handleSendMagicLink}
                      disabled={isAuthLoading || !recoveryEmail.includes('@')}
                      className="w-full py-4 bg-[#6c5ce7] hover:bg-[#5849be] text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isAuthLoading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                      <span>M'envoyer un lien de récupération</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                  <Lock size={14} />
                  <span>Confidentialité</span>
                </div>
                <p className="text-[10px] text-blue-300/80 leading-relaxed">
                  Votre e-mail sert uniquement à la récupération technique. Il n'est jamais visible par votre partenaire ni utilisé pour des notifications non sollicitées.
                </p>
              </div>
            </div>
          )}

          {/* Appareils Connectés & Web */}
          {activeSection === 'link_device' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-[#1b1435] to-[#251846] rounded-2xl border border-[#6c5ce7]/30 shadow-lg">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Smartphone size={18} className="text-[#0984e3]" />
                  Connecter un nouvel appareil
                </h4>
                <p className="text-xs text-[#a29bfe] leading-relaxed mb-4">
                  Pour utiliser Mikayla sur votre PC, votre tablette ou un autre téléphone sans perdre votre compte actuel, suivez ces étapes simples :
                </p>
                <ol className="text-xs text-white space-y-3 list-decimal list-inside opacity-90 mb-4">
                  <li>Ouvrez <strong className="text-[#74b9ff]">mikayla.app</strong> sur le nouvel appareil.</li>
                  <li>Cliquez sur <strong>"J'ai déjà un espace"</strong> (Code Secret).</li>
                  <li>Saisissez exactement le <strong>Code de Liaison</strong> généré ci-dessous.</li>
                </ol>
                
                <div className="bg-[#0a0714] border border-[#2d2254] rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-[10px] text-[#a29bfe] uppercase tracking-wider mb-2 font-bold">
                    Votre Code de Liaison (PC / Tablette)
                  </span>
                  
                  <button 
                    onClick={async () => {
                      try {
                        const code = await authService.generateDeviceLinkCode();
                        if (code) {
                          await navigator.clipboard.writeText(code);
                          alert('Code copié ! Envoyez-le vous de manière sécurisée (Notes, Email...) pour le coller sur votre PC/Tablette.');
                        } else {
                          alert('Synchronisation cloud requise pour cette fonctionnalité.');
                        }
                      } catch (err) {
                        alert('Erreur de génération');
                      }
                    }}
                    className="py-2.5 px-4 bg-gradient-to-r from-[#ffeaa7] to-[#fdcb6e] text-[#130f26] font-bold rounded-xl text-xs hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Copy size={16} />
                    Générer & Copier le Code de Liaison
                  </button>
                  
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] bg-[#6c5ce7]/20 text-[#a29bfe] px-2 py-1 rounded-md font-bold text-center">
                      Ce code permet de cloner votre session en cours. Ne le partagez à personne d'autre.
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-200 leading-relaxed">
                  <strong>Attention :</strong> Utilisez bien le <strong>Code de Liaison</strong> généré. Si vous utilisez votre ancien <strong>Code Couple</strong> classique pour vous reconnecter, cela déconnectera ce téléphone principal !
                </p>
              </div>
            </div>
          )}

          {/* Supabase Realtime Setup */}
          {activeSection === 'supabase' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254]">
                <p className="text-xs text-[#a29bfe] leading-relaxed">
                  Connectez votre base Supabase pour une synchronisation temps réel instantanée entre vos deux téléphones.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a29bfe] uppercase tracking-wider mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#00b894] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a29bfe] uppercase tracking-wider mb-1">
                  Supabase Anon API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#00b894] focus:outline-none font-mono"
                />
              </div>

              <button
                onClick={handleSaveSupabase}
                className="w-full py-3 bg-[#00b894] text-[#130f26] font-bold rounded-2xl hover:bg-[#00a884] transition-colors mt-2 shadow-md cursor-pointer"
              >
                Sauvegarder & Synchroniser
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

