import { 
  AppThemeConfig, 
  CustomColors, 
  WallpaperConfig, 
  TypographyConfig, 
  AppIconPreset,
  FontFamilyOption
} from '../types';

export const THEME_STORAGE_KEY = 'mikayala_theme_config';

export const DEFAULT_COLORS: CustomColors = {
  // 1. EN-TÊTE & NAVIGATION
  headerBg: '#171230',
  headerText: '#f1f2f6',
  tabsBg: '#130f26',
  tabsActiveIndicator: '#00b894',

  // 2. BULLES DE MESSAGES ENVOYÉS (Moi)
  bubbleSentBg: '#005c4b',
  bubbleSentText: '#f1f2f6',
  bubbleSentTime: '#a29bfe',
  tickSingle: '#a29bfe',
  tickDelivered: '#cbd5e1',
  tickRead: '#55efc4',

  // 3. BULLES DE MESSAGES REÇUS (Partenaire)
  bubbleRecvBg: '#1e173e',
  bubbleRecvText: '#f1f2f6',
  bubbleRecvSender: '#55efc4',
  bubbleRecvTime: '#a29bfe',

  // 4. ÉLÉMENTS D'ACCENTUATION ET INTERFACE
  accentColor: '#00b894',
  inputBg: '#130f26',
  bottomNavBg: '#130f26'
};

export const DEFAULT_WALLPAPER: WallpaperConfig = {
  preset: 'doodle_dark',
  customColor: '#130f26',
  opacity: 85,
  blur: 0,
  darkOverlay: 35
};

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  fontSize: 15,
  fontFamily: 'system',
  bubbleBorderRadius: 16,
  bubbleShape: 'classic',
  iosEmojis: true
};

export const DEFAULT_THEME_CONFIG: AppThemeConfig = {
  id: 'mikayala_default',
  name: 'Mikayala Intime (Défaut)',
  colors: DEFAULT_COLORS,
  wallpaper: DEFAULT_WALLPAPER,
  typography: DEFAULT_TYPOGRAPHY,
  appIcon: 'mikayala_heart'
};

// ==========================================
// PRE-INTEGRATED THEME PRESETS
// ==========================================
export const PRESET_THEMES: Array<{
  id: string;
  name: string;
  description: string;
  previewColors: string[];
  config: Partial<AppThemeConfig>;
}> = [
  {
    id: 'mikayala_default',
    name: 'Mikayala Intime',
    description: 'Dark Violet & Émeraude étincelant avec motifs nocturnes',
    previewColors: ['#130f26', '#00b894', '#6c5ce7', '#005c4b'],
    config: {
      colors: { ...DEFAULT_COLORS },
      wallpaper: {
        preset: 'doodle_dark',
        customColor: '#130f26',
        opacity: 85,
        blur: 0,
        darkOverlay: 30
      }
    }
  },
  {
    id: 'whatsapp_dark',
    name: 'WhatsApp Dark Classic',
    description: 'Style officiel WhatsApp sombre avec coches cyan & doodle',
    previewColors: ['#111b21', '#005c4b', '#202c33', '#53bdeb'],
    config: {
      colors: {
        headerBg: '#202c33',
        headerText: '#e9edef',
        tabsBg: '#111b21',
        tabsActiveIndicator: '#00a884',
        bubbleSentBg: '#005c4b',
        bubbleSentText: '#e9edef',
        bubbleSentTime: '#8696a0',
        tickSingle: '#8696a0',
        tickDelivered: '#8696a0',
        tickRead: '#53bdeb',
        bubbleRecvBg: '#202c33',
        bubbleRecvText: '#e9edef',
        bubbleRecvSender: '#53bdeb',
        bubbleRecvTime: '#8696a0',
        accentColor: '#00a884',
        inputBg: '#202c33',
        bottomNavBg: '#111b21'
      },
      wallpaper: {
        preset: 'doodle_dark',
        customColor: '#0b141a',
        opacity: 70,
        blur: 0,
        darkOverlay: 40
      }
    }
  },
  {
    id: 'rose_nuit',
    name: 'Rose Nuit Romantique',
    description: 'Ambiance intime douce, framboise velours et rose passion',
    previewColors: ['#1d0e1c', '#fd79a8', '#ff7675', '#2d142c'],
    config: {
      colors: {
        headerBg: '#261226',
        headerText: '#fff0f5',
        tabsBg: '#1d0e1c',
        tabsActiveIndicator: '#fd79a8',
        bubbleSentBg: '#851e3e',
        bubbleSentText: '#ffffff',
        bubbleSentTime: '#ffb8d2',
        tickSingle: '#ffb8d2',
        tickDelivered: '#ffb8d2',
        tickRead: '#ffeaa7',
        bubbleRecvBg: '#341530',
        bubbleRecvText: '#fce4ec',
        bubbleRecvSender: '#fd79a8',
        bubbleRecvTime: '#d48bb5',
        accentColor: '#fd79a8',
        inputBg: '#261226',
        bottomNavBg: '#1d0e1c'
      },
      wallpaper: {
        preset: 'gradient_rose',
        customColor: '#1d0e1c',
        opacity: 90,
        blur: 0,
        darkOverlay: 25
      }
    }
  },
  {
    id: 'cyber_neon',
    name: 'Cyber Neon Purple',
    description: 'Contraste cyberpunk électrique, violet néon & touches cyan',
    previewColors: ['#0d081e', '#a855f7', '#06b6d4', '#4c1d95'],
    config: {
      colors: {
        headerBg: '#140c30',
        headerText: '#f3e8ff',
        tabsBg: '#0d081e',
        tabsActiveIndicator: '#a855f7',
        bubbleSentBg: '#6b21a8',
        bubbleSentText: '#ffffff',
        bubbleSentTime: '#e9d5ff',
        tickSingle: '#c084fc',
        tickDelivered: '#c084fc',
        tickRead: '#06b6d4',
        bubbleRecvBg: '#1e1145',
        bubbleRecvText: '#f3e8ff',
        bubbleRecvSender: '#38bdf8',
        bubbleRecvTime: '#c084fc',
        accentColor: '#a855f7',
        inputBg: '#140c30',
        bottomNavBg: '#0d081e'
      },
      wallpaper: {
        preset: 'gradient_neon',
        customColor: '#0d081e',
        opacity: 90,
        blur: 0,
        darkOverlay: 20
      }
    }
  },
  {
    id: 'emerald_abyss',
    name: 'Vert Émeraude Profond',
    description: 'Ardoise sombre minérale et vert émeraude pur apaisant',
    previewColors: ['#0a1413', '#10b981', '#064e3b', '#34d399'],
    config: {
      colors: {
        headerBg: '#0e1f1e',
        headerText: '#ecfdf5',
        tabsBg: '#0a1413',
        tabsActiveIndicator: '#10b981',
        bubbleSentBg: '#065f46',
        bubbleSentText: '#ffffff',
        bubbleSentTime: '#a7f3d0',
        tickSingle: '#6ee7b7',
        tickDelivered: '#6ee7b7',
        tickRead: '#34d399',
        bubbleRecvBg: '#132826',
        bubbleRecvText: '#ecfdf5',
        bubbleRecvSender: '#34d399',
        bubbleRecvTime: '#6ee7b7',
        accentColor: '#10b981',
        inputBg: '#0e1f1e',
        bottomNavBg: '#0a1413'
      },
      wallpaper: {
        preset: 'gradient_emerald',
        customColor: '#0a1413',
        opacity: 85,
        blur: 0,
        darkOverlay: 25
      }
    }
  },
  {
    id: 'slate_midnight',
    name: 'Dark Slate & Indigo',
    description: 'Sobriété et élégance moderne en nuances ardoise & indigo',
    previewColors: ['#0b1120', '#6366f1', '#1e293b', '#38bdf8'],
    config: {
      colors: {
        headerBg: '#111827',
        headerText: '#f8fafc',
        tabsBg: '#0b1120',
        tabsActiveIndicator: '#6366f1',
        bubbleSentBg: '#3730a3',
        bubbleSentText: '#ffffff',
        bubbleSentTime: '#c7d2fe',
        tickSingle: '#a5b4fc',
        tickDelivered: '#a5b4fc',
        tickRead: '#38bdf8',
        bubbleRecvBg: '#1f2937',
        bubbleRecvText: '#f8fafc',
        bubbleRecvSender: '#818cf8',
        bubbleRecvTime: '#94a3b8',
        accentColor: '#6366f1',
        inputBg: '#111827',
        bottomNavBg: '#0b1120'
      },
      wallpaper: {
        preset: 'gradient_slate',
        customColor: '#0b1120',
        opacity: 90,
        blur: 0,
        darkOverlay: 25
      }
    }
  }
];

// Helper to map font-family option to CSS font stack
export const getFontFamilyCSS = (option: FontFamilyOption): string => {
  switch (option) {
    case 'roboto':
      return 'Roboto, "Helvetica Neue", Arial, sans-serif';
    case 'mono':
      return 'ui-monospace, "Fira Code", "SF Mono", Menlo, Consolas, monospace';
    case 'cursive':
      return '"Caveat", "Dancing Script", "Playfair Display", cursive, sans-serif';
    case 'system':
    default:
      return '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  }
};

// ==========================================
// CSS ROOT INJECTION ENGINE
// ==========================================
export const applyThemeToDOM = (theme: AppThemeConfig) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { colors, typography } = theme;

  // Header & Tabs
  root.style.setProperty('--mk-header-bg', colors.headerBg);
  root.style.setProperty('--mk-header-text', colors.headerText);
  root.style.setProperty('--mk-tabs-bg', colors.tabsBg);
  root.style.setProperty('--mk-tabs-active', colors.tabsActiveIndicator);

  // Sent Messages
  root.style.setProperty('--mk-bubble-sent-bg', colors.bubbleSentBg);
  root.style.setProperty('--mk-bubble-sent-text', colors.bubbleSentText);
  root.style.setProperty('--mk-bubble-sent-time', colors.bubbleSentTime);
  root.style.setProperty('--mk-tick-single', colors.tickSingle);
  root.style.setProperty('--mk-tick-delivered', colors.tickDelivered);
  root.style.setProperty('--mk-tick-read', colors.tickRead);

  // Received Messages
  root.style.setProperty('--mk-bubble-recv-bg', colors.bubbleRecvBg);
  root.style.setProperty('--mk-bubble-recv-text', colors.bubbleRecvText);
  root.style.setProperty('--mk-bubble-recv-sender', colors.bubbleRecvSender);
  root.style.setProperty('--mk-bubble-recv-time', colors.bubbleRecvTime);

  // Accent & Interface
  root.style.setProperty('--mk-accent', colors.accentColor);
  root.style.setProperty('--mk-input-bg', colors.inputBg);
  root.style.setProperty('--mk-bottom-nav-bg', colors.bottomNavBg);

  // Typography & Bubble Shape
  root.style.setProperty('--mk-msg-font-size', `${typography.fontSize || 15}px`);
  root.style.setProperty('--mk-msg-font-family', getFontFamilyCSS(typography.fontFamily));
  root.style.setProperty('--mk-bubble-radius', `${typography.bubbleBorderRadius || 16}px`);

  // Update Favicon based on app icon
  if (theme.appIcon) {
    generateDynamicFavicon(theme.appIcon);
  }
};

// ==========================================
// STORAGE HELPERS
// ==========================================
export const getStoredThemeConfig = (): AppThemeConfig => {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME_CONFIG;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(DEFAULT_THEME_CONFIG));
      return DEFAULT_THEME_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_THEME_CONFIG,
      ...parsed,
      colors: { ...DEFAULT_COLORS, ...(parsed.colors || {}) },
      wallpaper: { ...DEFAULT_WALLPAPER, ...(parsed.wallpaper || {}) },
      typography: { ...DEFAULT_TYPOGRAPHY, ...(parsed.typography || {}) }
    };
  } catch {
    return DEFAULT_THEME_CONFIG;
  }
};

export const saveThemeConfig = (config: AppThemeConfig) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  applyThemeToDOM(config);
};

// ==========================================
// DYNAMIC PWA ICON & FAVICON CANVAS GENERATOR
// ==========================================
export const generateDynamicFavicon = (iconPreset: AppIconPreset, partnerInitials = 'M & K'): string => {
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Clear background
    ctx.clearRect(0, 0, 64, 64);

    if (iconPreset === 'whatsapp_green') {
      // WhatsApp style: Vibrant green circle + white phone
      ctx.fillStyle = '#25D366';
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();

      // Phone handle symbol
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(32, 32, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#25D366';
      ctx.beginPath();
      ctx.arc(32, 32, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (iconPreset === 'calc_camouflage') {
      // Calculator Camouflage: Dark background with orange/gray buttons
      ctx.fillStyle = '#1e1e24';
      ctx.beginPath();
      ctx.roundRect(4, 4, 56, 56, 12);
      ctx.fill();

      // Math symbol cross / grid
      ctx.fillStyle = '#ff9f0a';
      ctx.font = 'bold 22px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+ −', 32, 23);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('× =', 32, 45);
    } else if (iconPreset === 'monogram') {
      // Monogram Initials of Couple
      ctx.fillStyle = '#171230';
      ctx.beginPath();
      ctx.roundRect(4, 4, 56, 56, 14);
      ctx.fill();
      ctx.strokeStyle = '#fd79a8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#55efc4';
      ctx.font = 'bold 18px "Caveat", "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(partnerInitials || 'M & K', 32, 33);
    } else if (iconPreset === 'neon_minimal') {
      // Neon glowing 'M' on pure dark
      ctx.fillStyle = '#0a0714';
      ctx.beginPath();
      ctx.roundRect(4, 4, 56, 56, 14);
      ctx.fill();

      ctx.strokeStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(18, 44);
      ctx.lineTo(18, 20);
      ctx.lineTo(32, 34);
      ctx.lineTo(46, 20);
      ctx.lineTo(46, 44);
      ctx.stroke();
    } else {
      // Default: Mikayala Intime Heart with Dark Violet & Emerald
      ctx.fillStyle = '#130f26';
      ctx.beginPath();
      ctx.roundRect(4, 4, 56, 56, 14);
      ctx.fill();

      // Emerald Heart
      ctx.fillStyle = '#00b894';
      ctx.beginPath();
      ctx.moveTo(32, 48);
      ctx.bezierCurveTo(20, 36, 12, 28, 12, 21);
      ctx.bezierCurveTo(12, 14, 18, 11, 24, 11);
      ctx.bezierCurveTo(28, 11, 31, 14, 32, 16);
      ctx.bezierCurveTo(33, 14, 36, 11, 40, 11);
      ctx.bezierCurveTo(46, 11, 52, 14, 52, 21);
      ctx.bezierCurveTo(52, 28, 44, 36, 32, 48);
      ctx.fill();

      // Violet inner sparkle
      ctx.fillStyle = '#fd79a8';
      ctx.beginPath();
      ctx.arc(38, 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const dataUrl = canvas.toDataURL('image/png');

    // Update Favicon in DOM
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.type = 'image/png';
    link.href = dataUrl;

    return dataUrl;
  } catch {
    return '';
  }
};
