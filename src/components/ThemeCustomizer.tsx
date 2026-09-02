import React, { useState, useRef } from 'react';
import { 
  Palette, 
  Image as ImageIcon, 
  Type, 
  Sparkles, 
  Smartphone, 
  User as UserIcon, 
  Upload, 
  Check, 
  RotateCcw, 
  Sliders, 
  SlidersHorizontal,
  CheckCheck, 
  Heart, 
  Smile, 
  Send,
  Eye,
  Layers,
  Sparkle
} from 'lucide-react';
import { 
  AppThemeConfig, 
  CustomColors, 
  WallpaperConfig, 
  TypographyConfig, 
  AppIconPreset, 
  User,
  BubbleShape,
  FontFamilyOption,
  WallpaperPreset
} from '../types';
import { 
  PRESET_THEMES, 
  DEFAULT_THEME_CONFIG, 
  applyThemeToDOM, 
  saveThemeConfig, 
  generateDynamicFavicon,
  getFontFamilyCSS,
  APP_ICON_PATHS
} from '../utils/themeEngine';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { IOSEmoji } from './IOSEmoji';

interface ThemeCustomizerProps {
  themeConfig: AppThemeConfig;
  onThemeChange: (theme: AppThemeConfig) => void;
  currentUser: User;
  partnerUser: User;
  onUpdateCurrentUser: (user: User) => void;
  onUpdatePartnerUser: (user: User) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  themeConfig,
  onThemeChange,
  currentUser,
  partnerUser,
  onUpdateCurrentUser,
  onUpdatePartnerUser
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'wallpaper' | 'typography' | 'branding' | 'profile'>('colors');
  const [partnerNickname, setPartnerNickname] = useState(partnerUser.name);
  const [partnerCustomStatus, setPartnerCustomStatus] = useState(partnerUser.customStatus || 'En train de penser à toi... 💓');
  const [partnerAvatar, setPartnerAvatar] = useState(partnerUser.avatar);

  const [userName, setUserName] = useState(currentUser.name);
  const [userBio, setUserBio] = useState(currentUser.bio);
  const [userAvatar, setUserAvatar] = useState(currentUser.avatar);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const partnerAvatarInputRef = useRef<HTMLInputElement>(null);
  const userAvatarInputRef = useRef<HTMLInputElement>(null);

  // Helper to update parts of theme and trigger live preview
  const updateTheme = (updated: Partial<AppThemeConfig>) => {
    const nextTheme: AppThemeConfig = {
      ...themeConfig,
      ...updated,
      colors: { ...themeConfig.colors, ...(updated.colors || {}) },
      wallpaper: { ...themeConfig.wallpaper, ...(updated.wallpaper || {}) },
      typography: { ...themeConfig.typography, ...(updated.typography || {}) }
    };
    onThemeChange(nextTheme);
    saveThemeConfig(nextTheme);
    triggerHaptic(15);
  };

  const updateColors = (newColors: Partial<CustomColors>) => {
    updateTheme({
      colors: { ...themeConfig.colors, ...newColors }
    });
  };

  const updateWallpaper = (newWall: Partial<WallpaperConfig>) => {
    updateTheme({
      wallpaper: { ...themeConfig.wallpaper, ...newWall }
    });
  };

  const updateTypography = (newTypo: Partial<TypographyConfig>) => {
    updateTheme({
      typography: { ...themeConfig.typography, ...newTypo }
    });
  };

  // Custom Wallpaper Upload
  const handleWallpaperFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateWallpaper({
        preset: 'custom_image',
        customImageUrl: dataUrl
      });
      soundEffects.playReaction();
      triggerHaptic(40);
    };
    reader.readAsDataURL(file);
  };

  // Partner Avatar Upload
  const handlePartnerAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPartnerAvatar(dataUrl);
      onUpdatePartnerUser({ ...partnerUser, avatar: dataUrl });
      triggerHaptic(35);
    };
    reader.readAsDataURL(file);
  };

  // User Avatar Upload
  const handleUserAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUserAvatar(dataUrl);
      onUpdateCurrentUser({ ...currentUser, avatar: dataUrl });
      triggerHaptic(35);
    };
    reader.readAsDataURL(file);
  };

  // Preset Color Palettes
  const QUICK_PALETTES = [
    { label: 'Mikayla Intime', hex: '#00b894' },
    { label: 'WhatsApp Vert', hex: '#25D366' },
    { label: 'Rose Passion', hex: '#fd79a8' },
    { label: 'Violet Mystique', hex: '#6c5ce7' },
    { label: 'Bleu Nuit', hex: '#0984e3' },
    { label: 'Cyber Cyan', hex: '#06b6d4' },
    { label: 'Or Ambré', hex: '#f59e0b' },
    { label: 'Rouge Rubis', hex: '#e11d48' },
  ];

  const PARTNER_STATUS_PRESETS = [
    'En train de penser à toi... 💓',
    'Écrit un mot doux... ✍️',
    'En ligne ✨',
    'Occupé(e) mais je t\'aime ❤️',
    'Mon cœur ne bat que pour toi 🌸',
    'Toujours près de toi 🌙'
  ];

  return (
    <div className="space-y-4 text-sm select-none">
      {/* ========================================================
          LIVE PREVIEW INTERACTIVE HEADER & BUBBLES
          ======================================================== */}
      <div className="rounded-2xl border border-[#3b2d66] bg-[#0c0819] overflow-hidden shadow-xl">
        <div className="bg-[#1b1435] px-3 py-1.5 flex items-center justify-between border-b border-[#2d2254]">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider">
            <Eye size={13} className="text-[#00b894]" />
            <span>Aperçu en Direct (Instant Live Preview)</span>
          </div>
          <button
            onClick={() => {
              updateTheme(DEFAULT_THEME_CONFIG);
              soundEffects.playSent();
              triggerHaptic(40);
            }}
            className="text-[10px] text-[#a29bfe] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw size={11} />
            <span>Réinitialiser</span>
          </button>
        </div>

        {/* Mini Chat Window Preview */}
        <div 
          className="p-3 relative overflow-hidden"
          style={{ 
            backgroundColor: themeConfig.wallpaper.customColor || '#130f26',
            minHeight: '190px'
          }}
        >
          {/* Wallpaper Layer Preview */}
          <div 
            className={`absolute inset-0 pointer-events-none transition-all ${
              themeConfig.wallpaper.preset === 'doodle_dark' ? 'wallpaper-doodle-dark' :
              themeConfig.wallpaper.preset === 'doodle_light' ? 'wallpaper-doodle-light' :
              themeConfig.wallpaper.preset === 'gradient_neon' ? 'wallpaper-gradient-neon' :
              themeConfig.wallpaper.preset === 'gradient_rose' ? 'wallpaper-gradient-rose' :
              themeConfig.wallpaper.preset === 'gradient_emerald' ? 'wallpaper-gradient-emerald' :
              themeConfig.wallpaper.preset === 'gradient_slate' ? 'wallpaper-gradient-slate' : ''
            }`}
            style={{
              opacity: (themeConfig.wallpaper.opacity || 85) / 100,
              filter: `blur(${themeConfig.wallpaper.blur || 0}px)`,
              backgroundImage: themeConfig.wallpaper.preset === 'custom_image' && themeConfig.wallpaper.customImageUrl
                ? `url(${themeConfig.wallpaper.customImageUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />

          {/* Dark Overlay Layer */}
          <div 
            className="absolute inset-0 pointer-events-none bg-black"
            style={{ opacity: (themeConfig.wallpaper.darkOverlay || 30) / 100 }}
          />

          {/* Mini Header Bar */}
          <div 
            className="relative z-10 p-2 rounded-xl flex items-center justify-between mb-3 shadow-md transition-colors"
            style={{ 
              backgroundColor: themeConfig.colors.headerBg,
              color: themeConfig.colors.headerText
            }}
          >
            <div className="flex items-center gap-2">
              <img 
                src={partnerAvatar} 
                alt="Partner" 
                className="w-7 h-7 rounded-full object-cover border border-white/20" 
              />
              <div>
                <p className="text-xs font-bold leading-tight">{partnerNickname}</p>
                <p className="text-[9px] opacity-80 leading-tight">{partnerCustomStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeConfig.colors.accentColor }} />
            </div>
          </div>

          {/* Received Bubble */}
          <div className="relative z-10 flex flex-col items-start mb-2.5 max-w-[85%]">
            <div 
              className={`p-2.5 shadow-md transition-all ${
                themeConfig.typography.bubbleShape === 'capsule' ? 'rounded-full px-4' :
                themeConfig.typography.bubbleShape === 'comic' ? 'bubble-shape-comic-recv rounded-xl' : 'rounded-2xl rounded-tl-xs'
              }`}
              style={{
                backgroundColor: themeConfig.colors.bubbleRecvBg,
                color: themeConfig.colors.bubbleRecvText,
                borderRadius: themeConfig.typography.bubbleShape === 'capsule' ? 9999 : `${themeConfig.typography.bubbleBorderRadius}px`,
                fontFamily: getFontFamilyCSS(themeConfig.typography.fontFamily)
              }}
            >
              <p 
                className="font-bold text-[10px] mb-0.5"
                style={{ color: themeConfig.colors.bubbleRecvSender }}
              >
                {partnerNickname}
              </p>
              <p style={{ fontSize: `${themeConfig.typography.fontSize}px` }} className="leading-snug">
                Tu me manques tellement... À quelle heure on se retrouve ce soir ? 💕
              </p>
              <p 
                className="text-[9px] text-right mt-1 font-sans"
                style={{ color: themeConfig.colors.bubbleRecvTime }}
              >
                12:42
              </p>
            </div>
          </div>

          {/* Sent Bubble */}
          <div className="relative z-10 flex flex-col items-end max-w-[85%] ml-auto">
            <div 
              className={`p-2.5 shadow-md transition-all ${
                themeConfig.typography.bubbleShape === 'capsule' ? 'rounded-full px-4' :
                themeConfig.typography.bubbleShape === 'comic' ? 'bubble-shape-comic-sent rounded-xl' : 'rounded-2xl rounded-tr-xs'
              }`}
              style={{
                backgroundColor: themeConfig.colors.bubbleSentBg,
                color: themeConfig.colors.bubbleSentText,
                borderRadius: themeConfig.typography.bubbleShape === 'capsule' ? 9999 : `${themeConfig.typography.bubbleBorderRadius}px`,
                fontFamily: getFontFamilyCSS(themeConfig.typography.fontFamily)
              }}
            >
              <p style={{ fontSize: `${themeConfig.typography.fontSize}px` }} className="leading-snug">
                Dès 19h mon amour ! J'ai préparé une petite surprise intime 🕯️✨
              </p>
              <div className="flex items-center justify-end gap-1 mt-1 font-sans">
                <span 
                  className="text-[9px]"
                  style={{ color: themeConfig.colors.bubbleSentTime }}
                >
                  12:43
                </span>
                <CheckCheck size={13} style={{ color: themeConfig.colors.tickRead }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SUB-NAVIGATION TABS (Design System Advanced)
          ======================================================== */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-[#130f26] rounded-2xl border border-[#2d2254]">
        {[
          { id: 'colors', label: 'Couleurs', icon: Palette },
          { id: 'wallpaper', label: 'Fond', icon: ImageIcon },
          { id: 'typography', label: 'Bulles', icon: Type },
          { id: 'branding', label: 'Icône', icon: Smartphone },
          { id: 'profile', label: 'Profils', icon: UserIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                triggerHaptic(15);
              }}
              className={`py-2 px-1 rounded-xl font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-[#00b894] text-[#130f26] shadow-md scale-102' 
                  : 'text-[#a29bfe] hover:text-white hover:bg-[#1d163a]'
              }`}
            >
              <Icon size={16} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          TAB 1: MOTEUR DE COULEURS AVANCÉ
          ======================================================== */}
      {activeTab === 'colors' && (
        <div className="space-y-4">
          {/* Preset Palettes */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#00b894]" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                Thèmes Prédéfinis (1 Clic)
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {PRESET_THEMES.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    updateTheme({
                      ...preset.config,
                      name: preset.name
                    });
                    soundEffects.playReaction();
                  }}
                  className="p-2.5 rounded-xl bg-[#1c1538] hover:bg-[#261d4a] border border-[#2d2254] text-left transition-all cursor-pointer flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1">
                    {preset.previewColors.map((col, idx) => (
                      <span 
                        key={idx} 
                        className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs" 
                        style={{ backgroundColor: col }} 
                      />
                    ))}
                  </div>
                  <span className="font-bold text-xs text-white truncate">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: En-tête & Navigation */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2.5">
            <h4 className="font-bold text-xs text-[#55efc4] uppercase tracking-wider flex items-center gap-1.5">
              <span>En-tête & Navigation</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Header BG */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Fond du Header</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.headerBg}
                    onChange={(e) => updateColors({ headerBg: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.headerBg}</span>
                </div>
              </div>

              {/* Header Text */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Texte & Icônes Header</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.headerText}
                    onChange={(e) => updateColors({ headerText: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.headerText}</span>
                </div>
              </div>

              {/* Tabs BG */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Barre d'onglets</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.tabsBg}
                    onChange={(e) => updateColors({ tabsBg: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.tabsBg}</span>
                </div>
              </div>

              {/* Tabs Active Indicator */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Indicateur onglet actif</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.tabsActiveIndicator}
                    onChange={(e) => updateColors({ tabsActiveIndicator: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.tabsActiveIndicator}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bulles de Messages Envoyés (Moi) */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2.5">
            <h4 className="font-bold text-xs text-[#00b894] uppercase tracking-wider flex items-center gap-1.5">
              <span>Bulles de Messages Envoyés (Moi)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Sent Bubble BG */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Fond de la bulle</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleSentBg}
                    onChange={(e) => updateColors({ bubbleSentBg: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleSentBg}</span>
                </div>
              </div>

              {/* Sent Bubble Text */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Texte du message</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleSentText}
                    onChange={(e) => updateColors({ bubbleSentText: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleSentText}</span>
                </div>
              </div>

              {/* Sent Time */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Horodatage</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleSentTime}
                    onChange={(e) => updateColors({ bubbleSentTime: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleSentTime}</span>
                </div>
              </div>

              {/* Read Ticks (Double Bleue) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Coche de lecture (Lue)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.tickRead}
                    onChange={(e) => updateColors({ tickRead: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.tickRead}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bulles de Messages Reçus (Partenaire) */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2.5">
            <h4 className="font-bold text-xs text-[#fd79a8] uppercase tracking-wider flex items-center gap-1.5">
              <span>Bulles de Messages Reçus (Partenaire)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Recv Bubble BG */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Fond de la bulle</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleRecvBg}
                    onChange={(e) => updateColors({ bubbleRecvBg: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleRecvBg}</span>
                </div>
              </div>

              {/* Recv Bubble Text */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Texte du message</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleRecvText}
                    onChange={(e) => updateColors({ bubbleRecvText: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleRecvText}</span>
                </div>
              </div>

              {/* Recv Sender Name */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Nom de l'expéditeur</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleRecvSender}
                    onChange={(e) => updateColors({ bubbleRecvSender: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleRecvSender}</span>
                </div>
              </div>

              {/* Recv Time */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Horodatage reçu</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleRecvTime}
                    onChange={(e) => updateColors({ bubbleRecvTime: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bubbleRecvTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Éléments d'accentuation & Interface */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2.5">
            <h4 className="font-bold text-xs text-[#a855f7] uppercase tracking-wider flex items-center gap-1.5">
              <span>Éléments d'Accentuation & Interface</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Accent Color */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Accentuation globale</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.accentColor}
                    onChange={(e) => updateColors({ accentColor: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.accentColor}</span>
                </div>
              </div>

              {/* Input Bar BG */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254]">
                <span className="text-xs text-white">Barre de saisie (Input)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.inputBg}
                    onChange={(e) => updateColors({ inputBg: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.inputBg}</span>
                </div>
              </div>

              {/* Bottom Couple Nav BG */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1538] border border-[#2d2254] sm:col-span-2">
                <span className="text-xs text-white">Barre de navigation inférieure</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeConfig.colors.bottomNavBg}
                    onChange={(e) => updateColors({ bottomNavBg: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-[#a29bfe]">{themeConfig.colors.bottomNavBg}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: GESTIONNAIRE D'ARRIÈRE-PLAN (WALLPAPER MANAGER)
          ======================================================== */}
      {activeTab === 'wallpaper' && (
        <div className="space-y-4">
          {/* Library of Pre-integrated Themes */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-2.5">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">
              Bibliothèque de Thèmes Pré-intégrés
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'doodle_dark', label: 'Doodle Sombre', bgClass: 'wallpaper-doodle-dark', color: '#130f26' },
                { id: 'doodle_light', label: 'Doodle Clair', bgClass: 'wallpaper-doodle-light', color: '#e5ddd5' },
                { id: 'gradient_neon', label: 'Neon Violet', bgClass: 'wallpaper-gradient-neon', color: '#0d081e' },
                { id: 'gradient_rose', label: 'Rose Nuit', bgClass: 'wallpaper-gradient-rose', color: '#1d0e1c' },
                { id: 'gradient_emerald', label: 'Vert Émeraude', bgClass: 'wallpaper-gradient-emerald', color: '#0a1413' },
                { id: 'gradient_slate', label: 'Dark Slate', bgClass: 'wallpaper-gradient-slate', color: '#0b1120' },
                { id: 'solid', label: 'Aplat Couleur Uni', bgClass: '', color: themeConfig.wallpaper.customColor },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => updateWallpaper({ preset: item.id as any, customColor: item.color })}
                  className={`h-20 rounded-xl border-2 relative overflow-hidden transition-all flex flex-col justify-end p-2 cursor-pointer ${
                    themeConfig.wallpaper.preset === item.id ? 'border-[#00b894] scale-102 shadow-lg' : 'border-[#2d2254]'
                  } ${item.bgClass}`}
                  style={{ backgroundColor: item.color }}
                >
                  <div className="bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white truncate">
                    {item.label}
                  </div>
                  {themeConfig.wallpaper.preset === item.id && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center shadow-md">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Solid Color Picker if Solid is selected */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#130f26] border border-[#2d2254]">
            <div>
              <p className="font-bold text-xs text-white">Couleur de fond personnalisée</p>
              <p className="text-[10px] text-[#a29bfe]">Teinte de base de l'espace de discussion</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeConfig.wallpaper.customColor}
                onChange={(e) => updateWallpaper({ customColor: e.target.value })}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
              />
              <span className="text-xs font-mono text-white">{themeConfig.wallpaper.customColor}</span>
            </div>
          </div>

          {/* Custom Background Image Upload */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                  Image de Fond Personnalisée (Galerie)
                </h4>
                <p className="text-[11px] text-[#a29bfe]">Photo intime de couple ou souvenir</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#00b894] text-[#130f26] font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#00a884] transition-colors cursor-pointer shadow-md"
              >
                <Upload size={13} />
                <span>Importer photo</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleWallpaperFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            {themeConfig.wallpaper.customImageUrl && (
              <div className="relative rounded-xl overflow-hidden h-24 border border-[#372863]">
                <img
                  src={themeConfig.wallpaper.customImageUrl}
                  alt="Custom Wallpaper"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-between px-3">
                  <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-lg">
                    Photo importée active
                  </span>
                  <button
                    onClick={() => updateWallpaper({ customImageUrl: undefined, preset: 'doodle_dark' })}
                    className="text-xs text-[#ff7675] hover:text-white bg-black/60 px-2 py-1 rounded-lg cursor-pointer"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}

            {/* Sliders: Opacity, Blur, Dark Overlay */}
            <div className="space-y-3 pt-2 border-t border-[#2d2254]">
              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-medium">Opacité de l'image / motif</span>
                  <span className="font-bold text-[#55efc4]">{themeConfig.wallpaper.opacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={themeConfig.wallpaper.opacity}
                  onChange={(e) => updateWallpaper({ opacity: Number(e.target.value) })}
                  className="w-full accent-[#00b894] cursor-pointer"
                />
              </div>

              {/* Blur Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-medium">Effet de flou (Flou artistique)</span>
                  <span className="font-bold text-[#55efc4]">{themeConfig.wallpaper.blur} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={themeConfig.wallpaper.blur}
                  onChange={(e) => updateWallpaper({ blur: Number(e.target.value) })}
                  className="w-full accent-[#00b894] cursor-pointer"
                />
              </div>

              {/* Dark Overlay Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-medium">Assombrissement (Dark overlay pour lisibilité)</span>
                  <span className="font-bold text-[#55efc4]">{themeConfig.wallpaper.darkOverlay}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={themeConfig.wallpaper.darkOverlay}
                  onChange={(e) => updateWallpaper({ darkOverlay: Number(e.target.value) })}
                  className="w-full accent-[#00b894] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: TYPOGRAPHIE, FORME DES BULLES & ÉMOJIS
          ======================================================== */}
      {activeTab === 'typography' && (
        <div className="space-y-4">
          {/* Bubble Radius & Shape */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">
              Forme & Arrondi des Bulles (Custom Bubble Shapes)
            </h4>

            {/* Bubble Shape Preset */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'classic', label: 'Classique Arrondi' },
                { id: 'capsule', label: 'Capsule Pilule' },
                { id: 'comic', label: 'Style BD (Flèche)' },
              ].map(shape => (
                <button
                  key={shape.id}
                  onClick={() => updateTypography({ bubbleShape: shape.id as any })}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    themeConfig.typography.bubbleShape === shape.id
                      ? 'bg-[#00b894] border-[#00b894] text-[#130f26] shadow-md'
                      : 'bg-[#1c1538] border-[#2d2254] text-[#a29bfe] hover:text-white'
                  }`}
                >
                  {shape.label}
                </button>
              ))}
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white font-medium">Rayon des angles (Border Radius)</span>
                <span className="font-bold text-[#55efc4]">{themeConfig.typography.bubbleBorderRadius} px</span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                value={themeConfig.typography.bubbleBorderRadius}
                onChange={(e) => updateTypography({ bubbleBorderRadius: Number(e.target.value) })}
                className="w-full accent-[#00b894] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#a29bfe] px-1 mt-0.5">
                <span>0px (Carré)</span>
                <span>12px</span>
                <span>24px (Très arrondi)</span>
              </div>
            </div>
          </div>

          {/* Typography & Font Family */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">
              Typographie & Taille du Texte
            </h4>

            {/* Font Size Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white font-medium">Taille de police des messages</span>
                <span className="font-bold text-[#55efc4]">{themeConfig.typography.fontSize} px</span>
              </div>
              <input
                type="range"
                min={12}
                max={22}
                value={themeConfig.typography.fontSize}
                onChange={(e) => updateTypography({ fontSize: Number(e.target.value) })}
                className="w-full accent-[#00b894] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#a29bfe] px-1 mt-0.5">
                <span>12px (Compact)</span>
                <span>15px (Idéal)</span>
                <span>22px (Grand)</span>
              </div>
            </div>

            {/* Font Family Selector */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#a29bfe] mb-1.5">
                Famille de Police
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'system', label: 'iOS System (SF Pro)', sample: 'Amour & Complice' },
                  { id: 'roboto', label: 'Android Roboto', sample: 'Amour & Complice' },
                  { id: 'mono', label: 'Monospace / Code', sample: '<3 forever' },
                  { id: 'cursive', label: 'Cursive Romantique', sample: 'Mon petit mot doux ✨' },
                ].map(font => (
                  <button
                    key={font.id}
                    onClick={() => updateTypography({ fontFamily: font.id as any })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      themeConfig.typography.fontFamily === font.id
                        ? 'border-[#00b894] bg-[#20183e] shadow-md'
                        : 'border-[#2d2254] bg-[#1c1538] hover:bg-[#251d48]'
                    }`}
                  >
                    <p className="font-bold text-xs text-white truncate">{font.label}</p>
                    <p 
                      className="text-xs text-[#55efc4] mt-0.5 truncate"
                      style={{ fontFamily: getFontFamilyCSS(font.id as any) }}
                    >
                      {font.sample}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* iOS Emojis Style */}
          <div className="p-3 rounded-2xl bg-[#130f26] border border-[#2d2254] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smile size={18} className="text-[#ffeaa7]" />
                <div>
                  <p className="font-bold text-xs text-white">Émojis Style Apple / iOS</p>
                  <p className="text-[10px] text-[#a29bfe]">Rendu officiel Apple en PNG HD (emoji-datasource-apple)</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={themeConfig.typography.iosEmojis}
                  onChange={(e) => updateTypography({ iosEmojis: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#2d2254] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00b894]"></div>
              </label>
            </div>

            {/* Live Apple Emojis Sample Showcase */}
            {themeConfig.typography.iosEmojis && (
              <div className="pt-2 border-t border-[#2d2254]/50 flex items-center justify-between gap-1 overflow-x-auto p-1 bg-[#1a1435]/60 rounded-xl">
                {['❤️', '🔥', '✨', '💋', '🔒', '🎁', '🎟️', '🎲', '👑', '🥰'].map(em => (
                  <div key={em} className="p-1.5 rounded-lg bg-[#20183e] flex items-center justify-center hover:scale-110 transition-transform">
                    <IOSEmoji emoji={em} size={22} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: ÉDITEUR D'ICÔNE D'APPLICATION & BRANDING (PWA)
          ======================================================== */}
      {activeTab === 'branding' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
            <div>
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                Sélecteur d'Icônes de l'Application & Favicon Dynamique
              </h4>
              <p className="text-xs text-[#a29bfe] mt-0.5 leading-relaxed">
                Changez instantanément l'icône de l'écran d'accueil et le Favicon du navigateur grâce au moteur Canvas HTML5.
              </p>
            </div>

            {/* 5 Icons Preset */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                { 
                  id: 'purple', 
                  name: 'Mikayla Papillon', 
                  desc: 'Papillon violet cristallin officiel', 
                  renderIcon: () => (
                    <div className="w-10 h-10 rounded-xl bg-[#130f26] border border-[#2d2254] flex items-center justify-center shadow-md overflow-hidden relative">
                      <img 
                        src={APP_ICON_PATHS.purple} 
                        alt="Purple" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Sparkle size={18} className="text-[#a29bfe]/40" />
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'neon', 
                  name: 'Mikayla Néon Glow', 
                  desc: 'Papillon néon vibrant violet & vert', 
                  renderIcon: () => (
                    <div className="w-10 h-10 rounded-xl bg-[#0a0714] border border-[#a855f7] flex items-center justify-center shadow-md overflow-hidden relative">
                      <img 
                        src={APP_ICON_PATHS.neon} 
                        alt="Neon" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Sparkle size={18} className="text-[#a855f7]/40" />
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'pink', 
                  name: 'Mikayla Rose Poudré', 
                  desc: 'Papillon délicat rose & violet', 
                  renderIcon: () => (
                    <div className="w-10 h-10 rounded-xl bg-[#1e1e24] border border-[#fd79a8]/30 flex items-center justify-center shadow-md overflow-hidden relative">
                      <img 
                        src={APP_ICON_PATHS.pink} 
                        alt="Pink" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Sparkle size={18} className="text-[#fd79a8]/40" />
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'blue', 
                  name: 'Mikayla Bleu Cristal', 
                  desc: 'Papillon cristallin bleu pur', 
                  renderIcon: () => (
                    <div className="w-10 h-10 rounded-xl bg-[#171230] border-2 border-[#74b9ff] flex items-center justify-center shadow-md overflow-hidden relative">
                      <img 
                        src={APP_ICON_PATHS.blue} 
                        alt="Blue" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Sparkle size={18} className="text-[#74b9ff]/40" />
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'gold', 
                  name: 'Mikayla Éclat Or', 
                  desc: 'Papillon émeraude & précieux', 
                  renderIcon: () => (
                    <div className="w-10 h-10 rounded-xl bg-[#14140a] border border-[#ffeaa7] flex items-center justify-center shadow-md overflow-hidden relative">
                      <img 
                        src={APP_ICON_PATHS.gold} 
                        alt="Gold" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Sparkle size={18} className="text-[#ffeaa7]/40" />
                      </div>
                    </div>
                  )
                }
              ].map(iconItem => (
                <button
                  key={iconItem.id}
                  onClick={() => {
                    updateTheme({ appIcon: iconItem.id as any });
                    generateDynamicFavicon(iconItem.id as any, `${userName[0] || 'M'} & ${partnerNickname[0] || 'K'}`);
                    soundEffects.playSent();
                  }}
                  className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    themeConfig.appIcon === iconItem.id
                      ? 'border-[#00b894] bg-[#20183e] shadow-lg'
                      : 'border-[#2d2254] bg-[#1c1538] hover:bg-[#251d48]'
                  }`}
                >
                  {iconItem.renderIcon()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-white truncate">{iconItem.name}</p>
                      {themeConfig.appIcon === iconItem.id && (
                        <Check size={14} className="text-[#00b894] shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-[#a29bfe] truncate">{iconItem.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: PROFIL & PERSONNALISATION DU PARTENAIRE ET COMPTE
          ======================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          {/* Partner Customization */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
            <h4 className="font-bold text-xs text-[#fd79a8] uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={14} />
              <span>Personnalisation du Partenaire</span>
            </h4>

            {/* Partner Avatar */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={partnerAvatar}
                  alt="Partner Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#fd79a8] shadow-md"
                />
                <button
                  onClick={() => partnerAvatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#fd79a8] text-[#130f26] shadow-md hover:scale-105 transition-transform cursor-pointer"
                  title="Changer la photo"
                >
                  <Upload size={12} />
                </button>
                <input
                  type="file"
                  ref={partnerAvatarInputRef}
                  onChange={handlePartnerAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-[#a29bfe] uppercase mb-1">
                  Surnom Intime du Partenaire
                </label>
                <input
                  type="text"
                  value={partnerNickname}
                  onChange={(e) => {
                    setPartnerNickname(e.target.value);
                    onUpdatePartnerUser({ ...partnerUser, name: e.target.value });
                  }}
                  placeholder="Ex: Mon Cœur ❤️, Bébé, Mikayla..."
                  className="w-full bg-[#1c1538] border border-[#2d2254] rounded-xl px-3 py-2 text-white text-xs focus:border-[#fd79a8] focus:outline-none"
                />
              </div>
            </div>

            {/* Partner Status */}
            <div>
              <label className="block text-xs font-bold text-[#a29bfe] uppercase mb-1">
                Statut Personnalisé Dynamique
              </label>
              <input
                type="text"
                value={partnerCustomStatus}
                onChange={(e) => {
                  setPartnerCustomStatus(e.target.value);
                  onUpdatePartnerUser({ ...partnerUser, customStatus: e.target.value });
                }}
                className="w-full bg-[#1c1538] border border-[#2d2254] rounded-xl px-3 py-2 text-white text-xs focus:border-[#fd79a8] focus:outline-none"
              />

              {/* Status Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PARTNER_STATUS_PRESETS.map((stat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPartnerCustomStatus(stat);
                      onUpdatePartnerUser({ ...partnerUser, customStatus: stat });
                      triggerHaptic(15);
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-[#1c1538] hover:bg-[#251d48] border border-[#2d2254] text-[#a29bfe] hover:text-white transition-colors cursor-pointer"
                  >
                    {stat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* User Account Customization */}
          <div className="p-3 bg-[#130f26] rounded-2xl border border-[#2d2254] space-y-3">
            <h4 className="font-bold text-xs text-[#00b894] uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon size={14} />
              <span>Mon Profil Utilisateur</span>
            </h4>

            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={userAvatar}
                  alt="User Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#00b894] shadow-md"
                />
                <button
                  onClick={() => userAvatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#00b894] text-[#130f26] shadow-md hover:scale-105 transition-transform cursor-pointer"
                  title="Changer ma photo"
                >
                  <Upload size={12} />
                </button>
                <input
                  type="file"
                  ref={userAvatarInputRef}
                  onChange={handleUserAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-[#a29bfe] uppercase mb-1">
                  Mon Nom
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    onUpdateCurrentUser({ ...currentUser, name: e.target.value });
                  }}
                  className="w-full bg-[#1c1538] border border-[#2d2254] rounded-xl px-3 py-2 text-white text-xs focus:border-[#00b894] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#a29bfe] uppercase mb-1">
                Ma Bio Intime
              </label>
              <input
                type="text"
                value={userBio}
                onChange={(e) => {
                  setUserBio(e.target.value);
                  onUpdateCurrentUser({ ...currentUser, bio: e.target.value });
                }}
                className="w-full bg-[#1c1538] border border-[#2d2254] rounded-xl px-3 py-2 text-white text-xs focus:border-[#00b894] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
