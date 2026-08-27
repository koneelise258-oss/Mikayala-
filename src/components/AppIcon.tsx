import React, { useEffect, useState } from 'react';
import { 
  LucideIcon, 
  Heart, 
  Lock, 
  Unlock,
  Key, 
  Shield, 
  ShieldCheck, 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageSquare, 
  MessageSquareHeart, 
  MessageCircle, 
  MessageSquarePlus, 
  Calendar, 
  Clock, 
  Timer, 
  Gift, 
  Ticket, 
  Sparkles, 
  Flame, 
  Dices, 
  Gamepad2, 
  Camera, 
  Image, 
  Smile, 
  Star, 
  HelpCircle, 
  Settings, 
  Search, 
  Send, 
  MapPin, 
  Fingerprint, 
  Sun, 
  Moon, 
  QrCode, 
  Share2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Activity, 
  Zap, 
  Music, 
  FileText, 
  Plus, 
  X, 
  AlertTriangle,
  Pin,
  Compass,
  Bell,
  Archive,
  BarChart2
} from 'lucide-react';
import { IOSEmoji } from './IOSEmoji';
import { getStoredThemeConfig } from '../utils/themeEngine';

// Dictionary mapping common Lucide icon identifiers to their Apple iOS emoji equivalent
export const LUCIDE_TO_IOS_EMOJI: Record<string, string> = {
  // Intimacy & Romance
  Heart: '❤️',
  MessageSquareHeart: '💌',
  Sparkles: '✨',
  Flame: '🔥',
  Gift: '🎁',
  Ticket: '🎟️',
  Dices: '🎲',
  Gamepad: '🎮',
  Gamepad2: '🎮',
  Calendar: '📅',
  Timer: '⏳',
  Clock: '⏰',
  Smile: '😊',
  Star: '⭐',
  Music: '🎵',
  Zap: '⚡',
  Activity: '📈',
  BarChart2: '📊',

  // Security & Privacy
  Lock: '🔒',
  Unlock: '🔓',
  Key: '🔑',
  Shield: '🛡️',
  ShieldCheck: '🛡️',
  Eye: '👁️',
  EyeOff: '🙈',
  Fingerprint: '🫵',

  // Communication & Media
  Phone: '📞',
  PhoneCall: '📞',
  PhoneOff: '📵',
  Video: '📹',
  VideoOff: '🚫',
  Mic: '🎙️',
  MicOff: '🔇',
  MessageSquare: '💬',
  MessageCircle: '💬',
  MessageSquarePlus: '📝',
  Camera: '📸',
  Image: '🖼️',
  Send: '🚀',
  MapPin: '📍',
  Pin: '📌',
  Compass: '🧭',
  Volume2: '🔊',
  VolumeX: '🔇',

  // System & Utilities
  Settings: '⚙️',
  Search: '🔍',
  RefreshCw: '🔄',
  QrCode: '📲',
  Share2: '🔗',
  Trash2: '🗑️',
  HelpCircle: '❓',
  AlertTriangle: '⚠️',
  Check: '✓',
  CheckCheck: '✅',
  FileText: '📄',
  Archive: '📦',
  Bell: '🔔',
  Plus: '➕',
  X: '❌',
  Sun: '☀️',
  Moon: '🌙'
};

export interface AppIconProps {
  /** Lucide Icon component reference (e.g. Heart, Lock, Calendar) */
  icon?: LucideIcon;
  /** Optional icon name string if not passing component (e.g. "Heart", "Lock") */
  name?: string;
  /** Explicit iOS emoji override (e.g. "❤️", "🔒", "✨") */
  iosEmoji?: string;
  /** Emoji alias prop */
  emoji?: string;
  /** Force display mode: true = iOS Emoji, false = Lucide Vector Icon, undefined = auto from user theme preference */
  preferEmoji?: boolean;
  /** Size in pixels (default: 20) */
  size?: number;
  /** CSS class name */
  className?: string;
  /** Icon color (for Lucide icon mode) */
  color?: string;
  /** Stroke width (for Lucide icon mode) */
  strokeWidth?: number;
  /** Accessible title or label */
  title?: string;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Custom style */
  style?: React.CSSProperties;
}

export const AppIcon: React.FC<AppIconProps> = ({
  icon: IconComponent,
  name,
  iosEmoji,
  emoji,
  preferEmoji,
  size = 20,
  className = '',
  color,
  strokeWidth = 2,
  title,
  onClick,
  style
}) => {
  const [useIosEmojiPreference, setUseIosEmojiPreference] = useState<boolean>(() => {
    if (typeof preferEmoji === 'boolean') return preferEmoji;
    try {
      const cfg = getStoredThemeConfig();
      return !!cfg.typography?.iosEmojis;
    } catch {
      return false;
    }
  });

  // Listen to theme changes in localStorage / dynamic updates
  useEffect(() => {
    if (typeof preferEmoji === 'boolean') {
      setUseIosEmojiPreference(preferEmoji);
      return;
    }

    const checkPreference = () => {
      try {
        const cfg = getStoredThemeConfig();
        setUseIosEmojiPreference(!!cfg.typography?.iosEmojis);
      } catch {
        // Keep default
      }
    };

    window.addEventListener('storage', checkPreference);
    // Also check immediately
    checkPreference();

    return () => {
      window.removeEventListener('storage', checkPreference);
    };
  }, [preferEmoji]);

  // Determine explicit or mapped emoji
  const explicitEmoji = iosEmoji || emoji;
  const iconName = name || (IconComponent?.displayName || IconComponent?.name || '');
  const mappedEmoji = explicitEmoji || (iconName ? LUCIDE_TO_IOS_EMOJI[iconName] : undefined);

  // If user preference / prop asks for emoji AND an emoji is available
  if (useIosEmojiPreference && mappedEmoji) {
    return (
      <IOSEmoji
        emoji={mappedEmoji}
        size={size}
        className={className}
        title={title}
        onClick={onClick}
        style={style}
      />
    );
  }

  // Otherwise render Lucide Vector Icon
  if (IconComponent) {
    return (
      <IconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
        title={title}
        onClick={onClick}
        style={style}
      />
    );
  }

  // Fallback: If no IconComponent was provided but an emoji exists, show IOSEmoji
  if (mappedEmoji) {
    return (
      <IOSEmoji
        emoji={mappedEmoji}
        size={size}
        className={className}
        title={title}
        onClick={onClick}
        style={style}
      />
    );
  }

  return null;
};

export default AppIcon;
