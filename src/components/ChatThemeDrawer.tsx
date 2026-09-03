import React, { useState, useRef } from 'react';
import { 
  Palette, 
  Image as ImageIcon, 
  Type, 
  Sparkles, 
  Check, 
  RotateCcw, 
  X, 
  Upload, 
  Trash2, 
  Sliders, 
  Eye, 
  SunMedium,
  CheckCheck
} from 'lucide-react';
import { 
  AppThemeConfig, 
  WallpaperConfig, 
  TypographyConfig, 
  BubbleShape, 
  FontFamilyOption 
} from '../types';
import { 
  PRESET_THEMES, 
  DEFAULT_THEME_CONFIG, 
  compressImageForWallpaper,
  autoAdaptColorsToContrast
} from '../utils/themeEngine';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface ChatThemeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  themeConfig: AppThemeConfig;
  onThemeChange: (newTheme: AppThemeConfig) => void;
  partnerName?: string;
  partnerAvatar?: string;
}

const QUICK_COLORS = [
  { label: 'Vert Émeraude', hex: '#00b894' },
  { label: 'WhatsApp', hex: '#005c4b' },
  { label: 'Violet Mikayla', hex: '#6c5ce7' },
  { label: 'Rose Passion', hex: '#fd79a8' },
  { label: 'Framboise', hex: '#851e3e' },
  { label: 'Bleu Intense', hex: '#0984e3' },
  { label: 'Néon Cyan', hex: '#06b6d4' },
  { label: 'Violet Sombre', hex: '#4c1d95' },
  { label: 'Ardoise Dark', hex: '#202c33' },
  { label: 'Charbon Nuit', hex: '#1e173e' },
  { label: 'Or Ambré', hex: '#f59e0b' },
  { label: 'Rouge Rubis', hex: '#e11d48' },
];

const QUICK_BG_COLORS = [
  { label: 'Nuit Mikayla', hex: '#130f26' },
  { label: 'WhatsApp Nuit', hex: '#0b141a' },
  { label: 'Rose Profond', hex: '#1d0e1c' },
  { label: 'Cyber Violet', hex: '#0d081e' },
  { label: 'Abysse Vert', hex: '#0a1413' },
  { label: 'Ardoise Midnight', hex: '#0b1120' },
  { label: 'Noir Pur', hex: '#000000' },
  { label: 'Chocolat Doux', hex: '#1a0d16' },
];

const WALLPAPER_PRESETS: Array<{ id: string; label: string; previewClass: string; color: string }> = [
  { id: 'doodle_dark', label: 'Doodle Mikayla', previewClass: 'wallpaper-doodle-dark', color: '#130f26' },
  { id: 'doodle_light', label: 'Doodle WhatsApp', previewClass: 'wallpaper-doodle-light', color: '#e5ddd5' },
  { id: 'gradient_neon', label: 'Néon Cyber', previewClass: 'wallpaper-gradient-neon', color: '#0d081e' },
  { id: 'gradient_rose', label: 'Rose Nuit', previewClass: 'wallpaper-gradient-rose', color: '#1d0e1c' },
  { id: 'gradient_emerald', label: 'Émeraude Zen', previewClass: 'wallpaper-gradient-emerald', color: '#0a1413' },
  { id: 'gradient_slate', label: 'Dark Slate', previewClass: 'wallpaper-gradient-slate', color: '#0b1120' },
  { id: 'solid', label: 'Couleur Unie', previewClass: '', color: '#130f26' },
];

const BUBBLE_SHAPES: Array<{ id: BubbleShape; label: string; desc: string }> = [
  { id: 'classic', label: 'Classique', desc: 'Coins arrondis & encoche fine' },
  { id: 'capsule', label: 'Capsule', desc: 'Bulle ronde très douce' },
  { id: 'modern', label: 'Moderne', desc: 'Rayon régulier et élégant' },
  { id: 'comic', label: 'Bande-dessinée', desc: 'Style Manga & BD complice' },
];

const FONT_OPTIONS: Array<{ id: FontFamilyOption; label: string; sample: string }> = [
  { id: 'system', label: 'Système', sample: 'Aa - Standard iOS/Android' },
  { id: 'roboto', label: 'Élégante', sample: 'Aa - Police douce & raffinée' },
  { id: 'mono', label: 'Monospace', sample: 'Aa - Style tech & épuré' },
  { id: 'cursive', label: 'Cursive', sample: 'Aa - Manuscrit romantique' },
];

export const ChatThemeDrawer: React.FC<ChatThemeDrawerProps> = ({
  isOpen,
  onClose,
  themeConfig,
  onThemeChange,
  partnerName = 'Partenaire'
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'wallpaper' | 'bubbles' | 'interface'>('presets');
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const updateTheme = (updated: Partial<AppThemeConfig>) => {
    const rawColors = { ...themeConfig.colors, ...(updated.colors || {}) };
    const adaptedColors = updated.colors ? autoAdaptColorsToContrast(rawColors) : rawColors;
    const merged: AppThemeConfig = {
      ...themeConfig,
      ...updated,
      colors: adaptedColors,
      wallpaper: { ...themeConfig.wallpaper, ...(updated.wallpaper || {}) },
      typography: { ...themeConfig.typography, ...(updated.typography || {}) }
    };
    onThemeChange(merged);
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

  const handleCustomWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingWallpaper(true);
    try {
      const compressedDataUrl = await compressImageForWallpaper(file);
      updateWallpaper({
        preset: 'custom_image',
        customImageUrl: compressedDataUrl
      });
      soundEffects.playReaction();
      triggerHaptic(40);
    } catch (err) {
      console.error('[ChatThemeDrawer] Erreur upload wallpaper:', err);
    } finally {
      setIsUploadingWallpaper(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_THEMES[0]) => {
    const rawColors = { ...DEFAULT_THEME_CONFIG.colors, ...(preset.config.colors || {}) };
    const adaptedColors = autoAdaptColorsToContrast(rawColors);
    const merged: AppThemeConfig = {
      ...DEFAULT_THEME_CONFIG,
      ...preset.config,
      id: preset.id,
      name: preset.name,
      colors: adaptedColors,
      wallpaper: { ...DEFAULT_THEME_CONFIG.wallpaper, ...(preset.config.wallpaper || {}) },
      typography: { ...DEFAULT_THEME_CONFIG.typography, ...(preset.config.typography || {}) }
    };
    onThemeChange(merged);
    soundEffects.playSent();
    triggerHaptic(50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop Click Dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Drawer / Modal Panel */}
      <div 
        className="relative z-10 w-full sm:max-w-xl max-h-[90vh] sm:max-h-[85vh] bg-[#171230] border border-[#3b2d66] rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle Bar for Mobile Touch Drag Visual */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[#3b2d66]" />
        </div>

        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#2d2254] flex items-center justify-between shrink-0 bg-[#130f26]/80 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] to-[#00b894] flex items-center justify-center shadow-md">
              <Palette size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-wide">Personnaliser le Chat</h2>
              <p className="text-[11px] text-[#a29bfe]">Modification directe & en temps réel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onThemeChange(DEFAULT_THEME_CONFIG);
                soundEffects.playSent();
                triggerHaptic(40);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#281e4b] hover:bg-[#342763] text-[#a29bfe] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Rétablir les réglages d'origine"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Rétablir</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#281e4b] hover:bg-[#342763] text-[#a29bfe] hover:text-white transition-all cursor-pointer"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 pt-2.5 pb-1 gap-1 border-b border-[#2d2254] bg-[#130f26] shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('presets'); triggerHaptic(20); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-[#00b894] text-[#0a1413] shadow-md shadow-[#00b894]/20'
                : 'text-[#a29bfe] hover:bg-[#281e4b] hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            <span>Thèmes 1-Clic</span>
          </button>

          <button
            onClick={() => { setActiveTab('wallpaper'); triggerHaptic(20); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'wallpaper'
                ? 'bg-[#00b894] text-[#0a1413] shadow-md shadow-[#00b894]/20'
                : 'text-[#a29bfe] hover:bg-[#281e4b] hover:text-white'
            }`}
          >
            <ImageIcon size={14} />
            <span>Fond d'écran</span>
          </button>

          <button
            onClick={() => { setActiveTab('bubbles'); triggerHaptic(20); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'bubbles'
                ? 'bg-[#00b894] text-[#0a1413] shadow-md shadow-[#00b894]/20'
                : 'text-[#a29bfe] hover:bg-[#281e4b] hover:text-white'
            }`}
          >
            <Type size={14} />
            <span>Bulles & Textes</span>
          </button>

          <button
            onClick={() => { setActiveTab('interface'); triggerHaptic(20); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'interface'
                ? 'bg-[#00b894] text-[#0a1413] shadow-md shadow-[#00b894]/20'
                : 'text-[#a29bfe] hover:bg-[#281e4b] hover:text-white'
            }`}
          >
            <Sliders size={14} />
            <span>Accents & UI</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 select-none">
          
          {/* ========================================================
              TAB 1: THÈMES EN 1 CLIC (PRESETS)
              ======================================================== */}
          {activeTab === 'presets' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <p className="text-xs text-[#a29bfe] mb-1">
                Choisissez une ambiance prête à l'emploi. Le chat et l'application s'harmonisent instantanément.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_THEMES.map((preset) => {
                  const isActive = themeConfig.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isActive
                          ? 'border-[#00b894] bg-[#1e173e] ring-2 ring-[#00b894]/30 shadow-lg'
                          : 'border-[#2d2254] bg-[#130f26] hover:border-[#6c5ce7] hover:bg-[#1a1435]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                            {preset.name}
                            {isActive && <Check size={14} className="text-[#00b894]" />}
                          </h4>
                          <p className="text-[11px] text-[#a29bfe] line-clamp-2 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      {/* Swatch dots preview */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {preset.previewColors.map((color, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full border border-black/40 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: FOND D'ÉCRAN (WALLPAPER)
              ======================================================== */}
          {activeTab === 'wallpaper' && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Presets Grid */}
              <div>
                <label className="block text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider mb-2">
                  Motif ou Dégradé
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {WALLPAPER_PRESETS.map((item) => {
                    const isSelected = themeConfig.wallpaper.preset === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          updateWallpaper({ preset: item.id as any });
                          triggerHaptic(20);
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col items-center justify-center gap-1.5 cursor-pointer h-20 ${
                          isSelected 
                            ? 'border-[#00b894] ring-2 ring-[#00b894]/30 bg-[#1e173e]' 
                            : 'border-[#2d2254] bg-[#130f26] hover:border-[#6c5ce7]'
                        }`}
                      >
                        <div 
                          className={`w-full h-8 rounded-xl border border-white/10 ${item.previewClass}`}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] font-medium text-white truncate max-w-full">
                          {item.label}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00b894] text-[#0a1413] flex items-center justify-center text-[10px] font-black">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Photo Personnalisée Upload */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-[#00b894]" />
                    Votre Propre Photo en Fond
                  </span>
                  {themeConfig.wallpaper.preset === 'custom_image' && (
                    <span className="text-[10px] bg-[#00b894]/20 text-[#55efc4] px-2 py-0.5 rounded-full font-bold">
                      Actif
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomWallpaperUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingWallpaper}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#281e4b] hover:bg-[#342763] text-white text-xs font-bold flex items-center justify-center gap-2 border border-[#3b2d66] transition-all cursor-pointer"
                  >
                    <Upload size={14} className="text-[#55efc4]" />
                    <span>{isUploadingWallpaper ? 'Optimisation...' : 'Importer une photo'}</span>
                  </button>

                  {themeConfig.wallpaper.customImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        updateWallpaper({ preset: 'doodle_dark', customImageUrl: undefined });
                        triggerHaptic(30);
                      }}
                      className="p-2.5 rounded-xl bg-[#ff7675]/20 hover:bg-[#ff7675]/30 text-[#ff7675] border border-[#ff7675]/30 transition-all cursor-pointer"
                      title="Supprimer la photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {themeConfig.wallpaper.customImageUrl && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-[#3b2d66]">
                    <img 
                      src={themeConfig.wallpaper.customImageUrl} 
                      alt="Aperçu fond" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-white bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        Photo chargée & compressée
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sliders: Opacity, Blur, Dark Overlay */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Eye size={14} className="text-[#00b894]" />
                  Ajustements de lisibilité en direct
                </h4>

                {/* Opacity */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#a29bfe]">Opacité du motif</span>
                    <span className="font-bold text-[#55efc4]">{themeConfig.wallpaper.opacity ?? 85}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={themeConfig.wallpaper.opacity ?? 85}
                    onChange={(e) => updateWallpaper({ opacity: Number(e.target.value) })}
                    className="w-full accent-[#00b894] cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#a29bfe]">Flou artistique (rend le texte ultra-net)</span>
                    <span className="font-bold text-[#55efc4]">{themeConfig.wallpaper.blur ?? 0} px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    value={themeConfig.wallpaper.blur ?? 0}
                    onChange={(e) => updateWallpaper({ blur: Number(e.target.value) })}
                    className="w-full accent-[#00b894] cursor-pointer"
                  />
                </div>

                {/* Dark Overlay */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#a29bfe]">Assombrissement (mode nuit reposant)</span>
                    <span className="font-bold text-[#55efc4]">{themeConfig.wallpaper.darkOverlay ?? 30}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={themeConfig.wallpaper.darkOverlay ?? 30}
                    onChange={(e) => updateWallpaper({ darkOverlay: Number(e.target.value) })}
                    className="w-full accent-[#00b894] cursor-pointer"
                  />
                </div>
              </div>

              {/* Wallpaper Background Color */}
              <div>
                <label className="block text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider mb-2">
                  Couleur du Fond Sombre
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {QUICK_BG_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        updateWallpaper({ customColor: c.hex });
                        triggerHaptic(15);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                        themeConfig.wallpaper.customColor === c.hex 
                          ? 'border-[#00b894] scale-110 shadow-md' 
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeConfig.wallpaper.customColor || '#130f26'}
                    onChange={(e) => updateWallpaper({ customColor: e.target.value })}
                    className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0"
                    title="Couleur personnalisée"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: BULLES & TEXTES (BUBBLES & TYPOGRAPHY)
              ======================================================== */}
          {activeTab === 'bubbles' && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Forme des Bulles */}
              <div>
                <label className="block text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider mb-2">
                  Forme des Bulles
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {BUBBLE_SHAPES.map((shape) => {
                    const isSelected = (themeConfig.typography.bubbleShape || 'classic') === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => {
                          updateTypography({ bubbleShape: shape.id });
                          triggerHaptic(20);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#00b894] bg-[#1e173e] ring-2 ring-[#00b894]/30'
                            : 'border-[#2d2254] bg-[#130f26] hover:border-[#6c5ce7]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{shape.label}</span>
                          {isSelected && <Check size={14} className="text-[#00b894]" />}
                        </div>
                        <p className="text-[10px] text-[#a29bfe]">{shape.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Taille du Texte */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Taille du texte des messages
                  </label>
                  <span className="text-xs font-bold text-[#55efc4]">
                    {themeConfig.typography.fontSize || 15} px
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[13, 14, 15, 16, 18].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        updateTypography({ fontSize: size });
                        triggerHaptic(20);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (themeConfig.typography.fontSize || 15) === size
                          ? 'bg-[#00b894] text-[#0a1413] shadow-md'
                          : 'bg-[#281e4b] text-[#a29bfe] hover:text-white'
                      }`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Police d'écriture */}
              <div>
                <label className="block text-[11px] font-bold text-[#a29bfe] uppercase tracking-wider mb-2">
                  Style de Police
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_OPTIONS.map((f) => {
                    const isSelected = (themeConfig.typography.fontFamily || 'system') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          updateTypography({ fontFamily: f.id });
                          triggerHaptic(20);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#00b894] bg-[#1e173e] ring-1 ring-[#00b894]'
                            : 'border-[#2d2254] bg-[#130f26] hover:border-[#6c5ce7]'
                        }`}
                      >
                        <div className="text-xs font-bold text-white mb-0.5">{f.label}</div>
                        <div className="text-[10px] text-[#a29bfe] truncate">{f.sample}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Couleur Bulle Envoyée (Moi) */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#005c4b] inline-block" />
                    Couleur Bulle Envoyée (Moi)
                  </span>
                  <span className="text-[11px] font-mono text-[#a29bfe]">
                    {themeConfig.colors.bubbleSentBg}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {QUICK_COLORS.map((c) => (
                    <button
                      key={`sent-${c.hex}`}
                      type="button"
                      onClick={() => {
                        updateTheme({ colors: { ...themeConfig.colors, bubbleSentBg: c.hex } });
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        themeConfig.colors.bubbleSentBg === c.hex 
                          ? 'border-[#00b894] scale-110 shadow-md' 
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleSentBg}
                    onChange={(e) => updateTheme({ colors: { ...themeConfig.colors, bubbleSentBg: e.target.value } })}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                    title="Pipette de couleur"
                  />
                </div>
              </div>

              {/* Couleur Bulle Reçue (Partenaire) */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#1e173e] inline-block" />
                    Couleur Bulle Reçue ({partnerName})
                  </span>
                  <span className="text-[11px] font-mono text-[#a29bfe]">
                    {themeConfig.colors.bubbleRecvBg}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {QUICK_COLORS.map((c) => (
                    <button
                      key={`recv-${c.hex}`}
                      type="button"
                      onClick={() => {
                        updateTheme({ colors: { ...themeConfig.colors, bubbleRecvBg: c.hex } });
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        themeConfig.colors.bubbleRecvBg === c.hex 
                          ? 'border-[#00b894] scale-110 shadow-md' 
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeConfig.colors.bubbleRecvBg}
                    onChange={(e) => updateTheme({ colors: { ...themeConfig.colors, bubbleRecvBg: e.target.value } })}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                    title="Pipette de couleur"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: ACCENTS & UI
              ======================================================== */}
          {activeTab === 'interface' && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Accent Color */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <SunMedium size={14} className="text-[#00b894]" />
                    Couleur d'Accent Globale (Boutons, Coches, Liens)
                  </span>
                  <span className="text-[11px] font-mono text-[#a29bfe]">
                    {themeConfig.colors.accentColor}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {QUICK_COLORS.map((c) => (
                    <button
                      key={`accent-${c.hex}`}
                      type="button"
                      onClick={() => {
                        updateTheme({ 
                          colors: { 
                            ...themeConfig.colors, 
                            accentColor: c.hex,
                            tickRead: c.hex,
                            tabsActiveIndicator: c.hex
                          } 
                        });
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        themeConfig.colors.accentColor === c.hex 
                          ? 'border-[#00b894] scale-110 shadow-md' 
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeConfig.colors.accentColor}
                    onChange={(e) => updateTheme({ 
                      colors: { 
                        ...themeConfig.colors, 
                        accentColor: e.target.value,
                        tickRead: e.target.value,
                        tabsActiveIndicator: e.target.value
                      } 
                    })}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>

              {/* Header Color */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Fond de l'En-Tête du Chat
                  </span>
                  <span className="text-[11px] font-mono text-[#a29bfe]">
                    {themeConfig.colors.headerBg}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {QUICK_BG_COLORS.map((c) => (
                    <button
                      key={`head-${c.hex}`}
                      type="button"
                      onClick={() => {
                        updateTheme({ colors: { ...themeConfig.colors, headerBg: c.hex } });
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        themeConfig.colors.headerBg === c.hex 
                          ? 'border-[#00b894] scale-110 shadow-md' 
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeConfig.colors.headerBg}
                    onChange={(e) => updateTheme({ colors: { ...themeConfig.colors, headerBg: e.target.value } })}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>

              {/* Input Bar Color */}
              <div className="p-3.5 rounded-2xl border border-[#2d2254] bg-[#130f26] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Fond de la Barre de Saisie
                  </span>
                  <span className="text-[11px] font-mono text-[#a29bfe]">
                    {themeConfig.colors.inputBg}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {QUICK_BG_COLORS.map((c) => (
                    <button
                      key={`input-${c.hex}`}
                      type="button"
                      onClick={() => {
                        updateTheme({ colors: { ...themeConfig.colors, inputBg: c.hex } });
                        triggerHaptic(15);
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        themeConfig.colors.inputBg === c.hex 
                          ? 'border-[#00b894] scale-110 shadow-md' 
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={themeConfig.colors.inputBg}
                    onChange={(e) => updateTheme({ colors: { ...themeConfig.colors, inputBg: e.target.value } })}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Done Action Bar */}
        <div className="px-5 py-3 border-t border-[#2d2254] bg-[#130f26] shrink-0 flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#a29bfe] truncate">
            Modifications appliquées instantanément
          </p>
          <button
            onClick={() => {
              triggerHaptic(30);
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#00b894] hover:bg-[#00a884] text-[#0a1413] text-xs font-bold shadow-lg shadow-[#00b894]/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <CheckCheck size={15} />
            <span>Terminé</span>
          </button>
        </div>

      </div>
    </div>
  );
};
