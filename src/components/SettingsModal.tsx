import React, { useState } from 'react';
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
  QrCode
} from 'lucide-react';
import { User, ChatSettings, AppThemeConfig, PairingState } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { ThemeCustomizer } from './ThemeCustomizer';
import { clearPairingState, getStoredPairingState } from '../services/authService';

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
  onClearAllData
}) => {
  const [activeSection, setActiveSection] = useState<'main' | 'couple' | 'appearance' | 'profile' | 'privacy' | 'supabase'>('main');
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(settings.supabaseConfig?.url || '');
  const [supabaseKey, setSupabaseKey] = useState(settings.supabaseConfig?.anonKey || '');

  // PIN code change
  const [pinCode, setPinCode] = useState(settings.pinCode || '1234');

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    onUpdateCurrentUser({
      ...currentUser,
      name: name.trim() || currentUser.name,
      bio: bio.trim() || currentUser.bio,
      avatar: avatar.trim() || currentUser.avatar
    });
    triggerHaptic(40);
    setActiveSection('main');
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
    setActiveSection('main');
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
                  setActiveSection('main');
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
              {activeSection === 'supabase' && 'Synchronisation Cloud Supabase'}
            </h3>
          </div>
          <button
            onClick={() => {
              if (activeSection !== 'main') {
                setShowResetConfirm(false);
                setActiveSection('main');
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
              {/* Profile Card */}
              <div
                onClick={() => setActiveSection('appearance')}
                className="flex items-center gap-4 p-3.5 bg-[#130f26] rounded-2xl border border-[#2d2254] cursor-pointer hover:bg-[#20183e] transition-colors group"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#00b894] shadow-md group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-base text-white truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-xs font-normal text-[#a29bfe]">avec {partnerUser.name}</span>
                  </h4>
                  <p className="text-xs text-[#a29bfe] truncate">{currentUser.bio}</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-2 pt-2">
                {/* 1. ESPACE COUPLE & JUMELAGE */}
                <button
                  onClick={() => setActiveSection('couple')}
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

                {/* 2. MOTEUR DE PERSONNALISATION ET DESIGN SYSTEM */}
                <button
                  onClick={() => setActiveSection('appearance')}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#1b1435] to-[#251846] hover:from-[#231846] hover:to-[#2e1e57] border border-[#6c5ce7]/40 flex items-center gap-3.5 text-left transition-all cursor-pointer shadow-md group"
                >
                  <div className="p-2.5 rounded-xl bg-[#6c5ce7]/25 text-[#a29bfe] group-hover:text-[#55efc4] transition-colors">
                    <Palette size={22} className="text-[#a29bfe]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-white">Apparence & Style (Design System)</p>
                      <span className="text-[10px] bg-[#00b894]/20 text-[#55efc4] px-1.5 py-0.2 rounded-full font-extrabold">
                        Complet
                      </span>
                    </div>
                    <p className="text-xs text-[#a29bfe] truncate">
                      Couleurs CSS :root, Fond d'écran, Bulles, Typographie & Icône PWA
                    </p>
                  </div>
                </button>

                {/* 3. Biométrie & Sécurité */}
                <button
                  onClick={() => setActiveSection('privacy')}
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

                {/* 4. Supabase Cloud */}
                <button
                  onClick={() => setActiveSection('supabase')}
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
                      <span>Code secret :</span>
                      <span className="font-mono font-black text-[#55efc4] text-sm bg-[#1e173e] px-2 py-0.5 rounded-lg border border-[#2d2254]">
                        {currentPairing.pairingCode}
                      </span>
                    </div>
                  )}
                  {currentPairing?.coupleId && (
                    <div className="flex items-center justify-between text-[#a29bfe]">
                      <span>ID Espace Couple :</span>
                      <span className="font-mono text-[11px] text-[#f1f2f6] truncate max-w-[180px]">
                        {currentPairing.coupleId}
                      </span>
                    </div>
                  )}
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

