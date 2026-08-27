import React, { useState, useEffect } from 'react';

// Apple Emoji CDN endpoint (emoji-datasource-apple)
const PRIMARY_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/';
const FALLBACK_CDN = 'https://unpkg.com/emoji-datasource-apple@15.1.2/img/apple/64/';

/**
 * Converts a Unicode emoji string into a hyphen-separated hex code point string
 * matching the emoji-datasource-apple filenames (e.g. "❤️" -> "2764-fe0f", "🥰" -> "1f970")
 */
export function emojiToUnified(emoji: string): string {
  if (!emoji) return '';

  // If already in unified hex format (e.g., "1f60d" or "2764-fe0f")
  if (/^[0-9a-fA-F-]+$/.test(emoji)) {
    return emoji.toLowerCase();
  }

  const codePoints: string[] = [];
  for (let i = 0; i < emoji.length; i++) {
    const codePoint = emoji.codePointAt(i);
    if (codePoint !== undefined) {
      codePoints.push(codePoint.toString(16).toLowerCase());
      if (codePoint > 0xffff) {
        i++; // Skip low surrogate
      }
    }
  }

  return codePoints.join('-');
}

/**
 * Common emoji alias mappings for edge-cases in emoji-datasource
 */
const EMOJI_SPECIAL_MAPPINGS: Record<string, string> = {
  '❤️': '2764-fe0f',
  '❤': '2764-fe0f',
  '✨': '2728',
  '⭐': '2b50',
  '🔥': '1f525',
  '🔒': '1f512',
  '💋': '1f48b',
  '🥰': '1f970',
  '😍': '1f60d',
  '😘': '1f618',
  '💕': '1f495',
  '💖': '1f496',
  '💗': '1f497',
  '💓': '1f493',
  '💞': '1f49e',
  '💘': '1f498',
  '💌': '1f48c',
  '🌹': '1f339',
  '🎁': '1f381',
  '🎟️': '1f39f-fe0f',
  '🎟': '1f39f-fe0f',
  '🎲': '1f3b2',
  '🎮': '1f3ae',
  '📅': '1f4c5',
  '⏳': '23f3',
  '⏰': '23f0',
  '⚙️': '2699-fe0f',
  '⚙': '2699-fe0f',
  '📞': '1f4de',
  '💬': '1f4ac',
  '📸': '1f4f8',
  '🛡️': '1f6e1-fe0f',
  '🛡': '1f6e1-fe0f',
  '🔑': '1f511',
  '📍': '1f4cd',
  '📌': '1f4cc',
  '🚀': '1f680',
  '🔍': '1f50d',
  '✅': '2705',
  '✓': '2713',
  '🎉': '1f389',
  '👀': '1f440',
  '😂': '1f602',
  '🤫': '1f92b',
  '👑': '1f451',
  '💍': '1f48d'
};

export interface IOSEmojiProps {
  /** The Unicode emoji string (e.g. "❤️", "🥰", "🔥") or unified code ("1f60d") */
  emoji: string;
  /** Size in pixels (e.g. 20) or CSS size string (e.g. "1.25rem") */
  size?: number | string;
  /** Custom CSS classes */
  className?: string;
  /** Custom accessible alt text */
  alt?: string;
  /** Custom tooltip title */
  title?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Custom fallback element when PNG fails to load */
  fallback?: React.ReactNode;
  /** Whether to render as inline-block */
  inline?: boolean;
}

export const IOSEmoji: React.FC<IOSEmojiProps> = ({
  emoji,
  size = 20,
  className = '',
  alt,
  title,
  style,
  onClick,
  fallback,
  inline = true
}) => {
  const [loadError, setLoadError] = useState(false);
  const [attemptFallbackCdn, setAttemptFallbackCdn] = useState(false);
  const [attemptNoFe0f, setAttemptNoFe0f] = useState(false);

  // Reset errors when emoji changes
  useEffect(() => {
    setLoadError(false);
    setAttemptFallbackCdn(false);
    setAttemptNoFe0f(false);
  }, [emoji]);

  if (!emoji) return null;

  // Resolve code point
  let unified = EMOJI_SPECIAL_MAPPINGS[emoji] || emojiToUnified(emoji);

  if (attemptNoFe0f && unified.includes('-fe0f')) {
    unified = unified.replace(/-fe0f/g, '');
  }

  const cdnBase = attemptFallbackCdn ? FALLBACK_CDN : PRIMARY_CDN;
  const imageUrl = `${cdnBase}${unified}.png`;

  const sizeStyle: React.CSSProperties = typeof size === 'number'
    ? { width: `${size}px`, height: `${size}px`, minWidth: `${size}px`, minHeight: `${size}px` }
    : { width: size, height: size, minWidth: size, minHeight: size };

  const handleImageError = () => {
    if (!attemptNoFe0f && unified.includes('-fe0f')) {
      setAttemptNoFe0f(true);
    } else if (!attemptFallbackCdn) {
      setAttemptFallbackCdn(true);
    } else {
      setLoadError(true);
    }
  };

  // If failed to load both CDNs & variants, fallback to native text emoji
  if (loadError) {
    if (fallback) return <>{fallback}</>;
    return (
      <span
        className={`inline-block select-none leading-none align-middle font-apple-emoji ${className}`}
        style={{
          fontSize: typeof size === 'number' ? `${size}px` : size,
          ...style
        }}
        title={title || alt || emoji}
        onClick={onClick}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || emoji}
      title={title || alt || emoji}
      referrerPolicy="no-referrer"
      loading="lazy"
      draggable={false}
      onError={handleImageError}
      onClick={onClick}
      style={{
        ...sizeStyle,
        display: inline ? 'inline-block' : 'block',
        verticalAlign: 'middle',
        objectFit: 'contain',
        ...style
      }}
      className={`select-none pointer-events-auto transition-transform ${className}`}
    />
  );
};

/**
 * Regular Expression matching common emojis to replace them with IOSEmoji components in strings
 */
const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

/**
 * Helper to parse a text string and render all Unicode emojis as Apple HD PNG IOSEmoji components
 */
export const renderWithIOSEmojis = (
  text: string, 
  emojiSize: number = 18, 
  extraClass: string = ''
): React.ReactNode => {
  if (!text) return text;

  const parts = text.split(EMOJI_REGEX);
  if (parts.length <= 1) return text;

  return (
    <>
      {parts.map((part, index) => {
        if (part && EMOJI_REGEX.test(part)) {
          return (
            <IOSEmoji
              key={`emoji_${index}_${part}`}
              emoji={part}
              size={emojiSize}
              className={`mx-0.5 ${extraClass}`}
            />
          );
        }
        return part;
      })}
    </>
  );
};

export default IOSEmoji;
