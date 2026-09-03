import { 
  AppThemeConfig, 
  CustomColors, 
  WallpaperConfig, 
  TypographyConfig, 
  AppIconPreset,
  FontFamilyOption
} from '../types';

export const THEME_STORAGE_KEY = 'mikayla_theme_config';

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
  iosEmojis: false
};

/**
 * Calculates relative luminance according to WCAG 2.1 specs (0 to 1)
 */
export const getLuminance = (hexColor: string): number => {
  try {
    if (!hexColor) return 0.2;
    let cleanHex = hexColor.replace('#', '').trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return 0.2;
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const a = [r, g, b].map(v => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  } catch {
    return 0.2;
  }
};

/**
 * Automatically computes high-contrast text, timestamp, and sender colors
 * for any given background color (ensuring total legibility across dark and light palettes)
 */
export const getContrastingTextColor = (bgHex: string): { 
  text: string; 
  time: string; 
  sender: string;
  isLight: boolean;
} => {
  const lum = getLuminance(bgHex);
  const isLight = lum > 0.42;

  if (isLight) {
    return {
      text: '#0f172a', // Deep dark slate
      time: 'rgba(15, 23, 42, 0.72)',
      sender: '#0369a1', // Deep rich cyan/blue
      isLight: true
    };
  } else {
    return {
      text: '#f8fafc', // Clean bright white
      time: 'rgba(241, 242, 246, 0.75)',
      sender: '#55efc4', // Emerald / mint
      isLight: false
    };
  }
};

/**
 * Automatically adapts typography and text colors across an entire CustomColors object
 */
export const autoAdaptColorsToContrast = (colors: CustomColors): CustomColors => {
  const sentBg = colors.bubbleSentBg || DEFAULT_COLORS.bubbleSentBg;
  const recvBg = colors.bubbleRecvBg || DEFAULT_COLORS.bubbleRecvBg;
  const headerBg = colors.headerBg || DEFAULT_COLORS.headerBg;

  const sentContrast = getContrastingTextColor(sentBg);
  const recvContrast = getContrastingTextColor(recvBg);
  const headerContrast = getContrastingTextColor(headerBg);

  return {
    ...colors,
    bubbleSentBg: sentBg,
    bubbleSentText: sentContrast.text,
    bubbleSentTime: sentContrast.time,
    bubbleRecvBg: recvBg,
    bubbleRecvText: recvContrast.text,
    bubbleRecvSender: recvContrast.sender,
    bubbleRecvTime: recvContrast.time,
    headerBg: headerBg,
    headerText: headerContrast.text
  };
};

// Stylized Butterfly SVG Paths for different colors
const BUTTERFLY_SVG_DATA = {
  purple: { primary: '#6c5ce7', secondary: '#a29bfe', bg: '#130f26' },
  neon: { primary: '#a855f7', secondary: '#06b6d4', bg: '#090812' },
  pink: { primary: '#fd79a8', secondary: '#fab1a0', bg: '#1a0d16' },
  blue: { primary: '#0984e3', secondary: '#00cec9', bg: '#0b1626' },
  gold: { primary: '#d4af37', secondary: '#f1c40f', bg: '#1a1408' }
};

/**
 * Draws a stylized UI/UX butterfly icon on a canvas
 */
const drawButterflyToCanvas = (ctx: CanvasRenderingContext2D, preset: keyof typeof BUTTERFLY_SVG_DATA, size: number) => {
  const colors = BUTTERFLY_SVG_DATA[preset];
  const padding = size * 0.1;
  const s = size - (padding * 2);
  const cx = size / 2;
  const cy = size / 2;

  // Background rounded rect
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.roundRect(padding/2, padding/2, size - padding, size - padding, size * 0.22);
  ctx.fill();

  // Draw Butterfly wings (minimalist geometric style)
  ctx.save();
  ctx.translate(cx, cy);

  const drawWing = (isRight: boolean) => {
    ctx.save();
    if (isRight) ctx.scale(-1, 1);
    
    const grad = ctx.createLinearGradient(0, -s/4, -s/2.5, s/4);
    grad.addColorStop(0, colors.primary);
    grad.addColorStop(1, colors.secondary);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    // Top wing
    ctx.moveTo(-2, -2);
    ctx.bezierCurveTo(-s/2, -s/2, -s/1.8, 0, -2, 2);
    // Bottom wing
    ctx.bezierCurveTo(-s/2.2, s/2, -s/2.5, s/3, -2, s/3.5);
    ctx.lineTo(-2, -2);
    ctx.fill();
    ctx.restore();
  };

  drawWing(false); // Left
  drawWing(true);  // Right

  // Body
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.roundRect(-1.5, -s/4, 3, s/2, 2);
  ctx.fill();
  
  ctx.restore();
};

export const DEFAULT_THEME_CONFIG: AppThemeConfig = {
  id: 'mikayla_default',
  name: 'Mikayla Intime (Défaut)',
  colors: DEFAULT_COLORS,
  wallpaper: DEFAULT_WALLPAPER,
  typography: DEFAULT_TYPOGRAPHY,
  appIcon: 'purple'
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
    id: 'mikayla_default',
    name: 'Mikayla Intime',
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
  const rawColors = theme?.colors || DEFAULT_COLORS;
  const typography = theme?.typography || DEFAULT_TYPOGRAPHY;
  const wallpaper = theme?.wallpaper || DEFAULT_WALLPAPER;

  // Compute adaptive high-contrast colors
  const colors = autoAdaptColorsToContrast(rawColors);

  // Header & Tabs
  root.style.setProperty('--mk-header-bg', colors.headerBg || DEFAULT_COLORS.headerBg);
  root.style.setProperty('--mk-header-text', colors.headerText || DEFAULT_COLORS.headerText);
  root.style.setProperty('--mk-tabs-bg', colors.tabsBg || DEFAULT_COLORS.tabsBg);
  root.style.setProperty('--mk-tabs-active', colors.tabsActiveIndicator || DEFAULT_COLORS.tabsActiveIndicator);

  // Sent Messages (Adaptive high-contrast text & timestamps)
  root.style.setProperty('--mk-bubble-sent-bg', colors.bubbleSentBg || DEFAULT_COLORS.bubbleSentBg);
  root.style.setProperty('--mk-bubble-sent-text', colors.bubbleSentText || DEFAULT_COLORS.bubbleSentText);
  root.style.setProperty('--mk-bubble-sent-time', colors.bubbleSentTime || DEFAULT_COLORS.bubbleSentTime);
  root.style.setProperty('--mk-tick-single', colors.tickSingle || DEFAULT_COLORS.tickSingle);
  root.style.setProperty('--mk-tick-delivered', colors.tickDelivered || DEFAULT_COLORS.tickDelivered);
  root.style.setProperty('--mk-tick-read', colors.tickRead || DEFAULT_COLORS.tickRead);

  // Received Messages (Adaptive high-contrast text & timestamps)
  root.style.setProperty('--mk-bubble-recv-bg', colors.bubbleRecvBg || DEFAULT_COLORS.bubbleRecvBg);
  root.style.setProperty('--mk-bubble-recv-text', colors.bubbleRecvText || DEFAULT_COLORS.bubbleRecvText);
  root.style.setProperty('--mk-bubble-recv-sender', colors.bubbleRecvSender || DEFAULT_COLORS.bubbleRecvSender);
  root.style.setProperty('--mk-bubble-recv-time', colors.bubbleRecvTime || DEFAULT_COLORS.bubbleRecvTime);

  // Accent & Interface
  root.style.setProperty('--mk-accent', colors.accentColor || DEFAULT_COLORS.accentColor);
  root.style.setProperty('--mk-input-bg', colors.inputBg || DEFAULT_COLORS.inputBg);
  root.style.setProperty('--mk-bottom-nav-bg', colors.bottomNavBg || DEFAULT_COLORS.bottomNavBg);

  // Typography & Bubble Shape
  const fontSize = typography.fontSize || 15;
  const fontFamily = getFontFamilyCSS(typography.fontFamily);
  const bubbleRadius = typography.bubbleBorderRadius ?? 16;
  root.style.setProperty('--mk-msg-font-size', `${fontSize}px`);
  root.style.setProperty('--mk-font-size', `${fontSize}px`);
  root.style.setProperty('--mk-msg-font-family', fontFamily);
  root.style.setProperty('--mk-font-family', fontFamily);
  root.style.setProperty('--mk-bubble-radius', `${bubbleRadius}px`);

  // Wallpaper variables
  root.style.setProperty('--mk-wallpaper-color', wallpaper.customColor || '#130f26');
  root.style.setProperty('--mk-wallpaper-opacity', `${(wallpaper.opacity ?? 85) / 100}`);
  root.style.setProperty('--mk-wallpaper-blur', `${wallpaper.blur ?? 0}px`);
  root.style.setProperty('--mk-wallpaper-dark-overlay', `${(wallpaper.darkOverlay ?? 30) / 100}`);
  if (wallpaper.preset === 'custom_image' && wallpaper.customImageUrl) {
    root.style.setProperty('--mk-wallpaper-image', `url("${wallpaper.customImageUrl}")`);
  } else {
    root.style.setProperty('--mk-wallpaper-image', 'none');
  }

  // Update Favicon based on app icon
  if (theme.appIcon) {
    generateDynamicFavicon(theme.appIcon);
  }
};

/**
 * Compresses an image file for use as a chat wallpaper to avoid LocalStorage quota issues
 */
export const compressImageForWallpaper = (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier image'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Impossible de charger l\'image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
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
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('[themeEngine] LocalStorage save warning (falling back without heavy wallpaper):', err);
    try {
      // Fallback without heavy custom image if quota exceeded
      const fallbackConfig = {
        ...config,
        wallpaper: {
          ...config.wallpaper,
          preset: config.wallpaper.preset === 'custom_image' ? 'doodle_dark' : config.wallpaper.preset,
          customImageUrl: undefined
        }
      };
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(fallbackConfig));
    } catch {
      // Ignore
    }
  }
  applyThemeToDOM(config);
};

// ==========================================
// DYNAMIC PWA ICON & FAVICON CANVAS GENERATOR
// ==========================================
export const generateDynamicFavicon = (iconPreset: AppIconPreset, partnerInitials = 'M & K'): string => {
  if (typeof document === 'undefined') return '';

  try {
    const butterflyIcons = ['purple', 'neon', 'pink', 'blue', 'gold'];
    let iconUrl = '';

    if (butterflyIcons.includes(iconPreset)) {
      // Use the new SVG-based drawing for butterfly icons
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawButterflyToCanvas(ctx, iconPreset as keyof typeof BUTTERFLY_SVG_DATA, 1024);
        iconUrl = canvas.toDataURL('image/png');
      }
    } else if (iconPreset === 'custom') {
      // Use uploaded custom icon from localStorage
      iconUrl = localStorage.getItem('mikayala_custom_icon') || '';
      
      // If no custom icon, fallback to purple vector
      if (!iconUrl) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawButterflyToCanvas(ctx, 'purple', 1024);
          iconUrl = canvas.toDataURL('image/png');
        }
      }
    } else {
      // Fallback to canvas drawing for custom presets
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      // Clear background
      ctx.clearRect(0, 0, 64, 64);

      if (iconPreset === 'monogram') {
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
        // Default Fallback: Emerald Heart
        ctx.fillStyle = '#130f26';
        ctx.beginPath();
        ctx.roundRect(4, 4, 56, 56, 14);
        ctx.fill();

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

        ctx.fillStyle = '#fd79a8';
        ctx.beginPath();
        ctx.arc(38, 20, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      iconUrl = canvas.toDataURL('image/png');
    }

    // Update Favicon in DOM
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.type = 'image/png';
    link.href = iconUrl;

    // Update Apple Touch Icon
    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
    if (appleLink) {
      appleLink.href = iconUrl;
    }

    // Attempt to update manifest dynamically (Experimental/Best Effort)
    updateDynamicManifest(iconPreset);

    return iconUrl;
  } catch {
    return '';
  }
};

// ==========================================
// DYNAMIC MANIFEST UPDATE
// ==========================================
export const updateDynamicManifest = (iconPreset: AppIconPreset) => {
  if (typeof document === 'undefined') return;

  try {
    const butterflyIcons = ['purple', 'neon', 'pink', 'blue', 'gold'];
    let iconPath = '';

    if (butterflyIcons.includes(iconPreset)) {
      // Generate the icon on the fly for the manifest
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawButterflyToCanvas(ctx, iconPreset as keyof typeof BUTTERFLY_SVG_DATA, 512);
        iconPath = canvas.toDataURL('image/png');
      }
    } else if (iconPreset === 'custom') {
      iconPath = localStorage.getItem('mikayala_custom_icon') || '';
    }

    if (!iconPath) return;

    // We can't easily change the installed PWA icon, but we can try to update the manifest link
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!manifestLink) return;

    // Create a minimal manifest blob
    const manifestData = {
      name: 'Mikayla',
      short_name: 'Mikayla',
      description: 'Application de couple intime et privée Mikayla',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f0c1d',
      theme_color: '#130f26',
      icons: [
        {
          src: iconPath,
          sizes: 'any',
          type: iconPath.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png',
          purpose: 'any'
        },
        {
          src: iconPath,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: iconPath,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        }
      ]
    };

    const stringManifest = JSON.stringify(manifestData);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);
    
    manifestLink.href = manifestUrl;
  } catch (err) {
    console.error('Error updating dynamic manifest:', err);
  }
};
