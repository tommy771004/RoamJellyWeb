import React from 'react';

export const CUSTOM_ICONS = [
  'airplane', 'hotel', 'compass', 'map', 'train', 'sun', 'tent',
  'postcard', 'food-drink', 'beach', 'mountain', 'bicycle', 'ship',
  'wifi', 'ticket', 'heart', 'backpack', 'cocktail', 'palm-tree',
  'umbrella', 'suitcase', 'passport', 'camera', 'globe', 'hiking-boot',
  'hot-air-balloon', 'lantern', 'diving-mask', 'surfboard', 'anchor',
  'binoculars', 'telescope', 'campfire', 'sleeping-bag', 'towel',
  'sunglasses', 'hat', 'wallet', 'key', 'bell', 'star', 'cloud',
  'lightning', 'water-drop', 'snowflake', 'thermometer', 'calendar',
  'clock', 'gift', 'roam-jelly',
] as const;

export type CustomIconName = typeof CUSTOM_ICONS[number];

type IconTone = 'rose' | 'sky' | 'mint' | 'lilac' | 'amber' | 'peach';

const CUSTOM_ICON_EMOJIS: Record<CustomIconName, string> = {
  airplane: '✈️',
  hotel: '🏨',
  compass: '🧭',
  map: '🗺️',
  train: '🚆',
  sun: '☀️',
  tent: '⛺',
  postcard: '💌',
  'food-drink': '🍽️',
  beach: '🏖️',
  mountain: '⛰️',
  bicycle: '🚲',
  ship: '🚢',
  wifi: '📶',
  ticket: '🎫',
  heart: '❤️',
  backpack: '🎒',
  cocktail: '🍹',
  'palm-tree': '🌴',
  umbrella: '☂️',
  suitcase: '🧳',
  passport: '📘',
  camera: '📷',
  globe: '🌍',
  'hiking-boot': '🥾',
  'hot-air-balloon': '🎈',
  lantern: '🏮',
  'diving-mask': '🤿',
  surfboard: '🏄',
  anchor: '⚓',
  binoculars: '🔭',
  telescope: '🔭',
  campfire: '🔥',
  'sleeping-bag': '🛌',
  towel: '🧺',
  sunglasses: '🕶️',
  hat: '👒',
  wallet: '👛',
  key: '🔑',
  bell: '🔔',
  star: '⭐',
  cloud: '☁️',
  lightning: '⚡',
  'water-drop': '💧',
  snowflake: '❄️',
  thermometer: '🌡️',
  calendar: '📅',
  clock: '🕒',
  gift: '🎁',
  'roam-jelly': '🍮',
};

const ICON_THEME_MAP: Partial<Record<CustomIconName, IconTone>> = {
  airplane: 'rose',
  hotel: 'sky',
  compass: 'rose',
  map: 'mint',
  train: 'lilac',
  sun: 'amber',
  tent: 'mint',
  postcard: 'lilac',
  'food-drink': 'rose',
  beach: 'sky',
  mountain: 'sky',
  bicycle: 'rose',
  ship: 'sky',
  wifi: 'mint',
  ticket: 'rose',
  heart: 'rose',
  backpack: 'mint',
  cocktail: 'amber',
  'palm-tree': 'mint',
  umbrella: 'rose',
  suitcase: 'peach',
  passport: 'lilac',
  camera: 'sky',
  globe: 'mint',
  'hiking-boot': 'peach',
  'hot-air-balloon': 'amber',
  lantern: 'amber',
  'diving-mask': 'lilac',
  surfboard: 'sky',
  anchor: 'sky',
  binoculars: 'lilac',
  telescope: 'lilac',
  campfire: 'peach',
  'sleeping-bag': 'mint',
  towel: 'rose',
  sunglasses: 'sky',
  hat: 'amber',
  wallet: 'lilac',
  key: 'amber',
  bell: 'amber',
  star: 'rose',
  cloud: 'sky',
  lightning: 'amber',
  'water-drop': 'sky',
  snowflake: 'sky',
  thermometer: 'sky',
  calendar: 'lilac',
  clock: 'rose',
  gift: 'rose',
  'roam-jelly': 'sky',
};

const GLASS_BASE = 'rgba(255,255,255,0.4)';

const ICON_THEME_STYLES: Record<IconTone, { tint: string; tintSoft: string; glow: string; emojiGlow: string }> = {
  rose: {
    tint: '#ffd9df',
    tintSoft: '#ffb1c2',
    glow: '0 12px 30px rgba(156, 63, 89, 0.16)',
    emojiGlow: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 6px 12px rgba(156, 63, 89, 0.16))',
  },
  sky: {
    tint: '#c7e7ff',
    tintSoft: '#a3cce9',
    glow: '0 12px 30px rgba(58, 99, 124, 0.15)',
    emojiGlow: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 6px 12px rgba(58, 99, 124, 0.16))',
  },
  mint: {
    tint: '#b1efd8',
    tintSoft: '#96d3bd',
    glow: '0 12px 30px rgba(44, 105, 86, 0.14)',
    emojiGlow: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 6px 12px rgba(44, 105, 86, 0.14))',
  },
  lilac: {
    tint: '#efe5ff',
    tintSoft: '#e4d5ff',
    glow: '0 12px 30px rgba(140, 116, 188, 0.15)',
    emojiGlow: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 6px 12px rgba(140, 116, 188, 0.16))',
  },
  amber: {
    tint: '#fff0c9',
    tintSoft: '#ffd69b',
    glow: '0 12px 30px rgba(214, 161, 76, 0.16)',
    emojiGlow: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 6px 12px rgba(214, 161, 76, 0.16))',
  },
  peach: {
    tint: '#ffe0d4',
    tintSoft: '#f6d9bd',
    glow: '0 12px 30px rgba(188, 141, 116, 0.14)',
    emojiGlow: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 6px 12px rgba(188, 141, 116, 0.14))',
  },
};

export function isCustomIcon(value: string): boolean {
  return (CUSTOM_ICONS as readonly string[]).includes(value);
}

interface IconImgProps {
  value: string;
  size?: number;
  className?: string;
}

const IconImg: React.FC<IconImgProps> = ({ value, size = 24, className = '' }) => {
  if (isCustomIcon(value)) {
    const iconKey = value as CustomIconName;
    const tone = ICON_THEME_MAP[iconKey] ?? 'sky';
    const theme = ICON_THEME_STYLES[tone];
    const shellSize = Math.max(14, size);
    const hasGlassShell = shellSize >= 17;
    const borderRadius = shellSize >= 36 ? 16 : shellSize >= 24 ? 14 : 11;
    const iconSize = shellSize >= 40 ? Math.round(shellSize * 0.56) : shellSize >= 24 ? Math.round(shellSize * 0.6) : Math.round(shellSize * 0.72);
    const shellInset = shellSize >= 36 ? 1.5 : 1.25;
    const topHighlightWidth = shellSize * 0.46;
    const topHighlightHeight = shellSize * 0.26;
    const glyph = CUSTOM_ICON_EMOJIS[iconKey] ?? '✈️';

    if (!hasGlassShell) {
      return (
        <span
          className={`inline-flex shrink-0 select-none items-center justify-center ${className}`}
          style={{
            width: shellSize,
            height: shellSize,
            fontSize: Math.max(12, iconSize),
            lineHeight: 1,
            filter: `${theme.emojiGlow} saturate(0.94) brightness(0.98)`,
          }}
        >
          <span style={{ transform: 'translateY(-0.5px)' }}>{glyph}</span>
        </span>
      );
    }

    return (
      <span
        className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden ${className}`}
        style={{
          width: shellSize,
          height: shellSize,
          borderRadius,
          border: '1.5px solid transparent',
          background: `linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.18) 100%) padding-box, linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.12) 100%) border-box, radial-gradient(circle at 24% 18%, ${theme.tint} 0%, ${theme.tintSoft} 38%, ${GLASS_BASE} 100%) border-box`,
          boxShadow: `${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -10px 18px rgba(255,255,255,0.16)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: shellInset,
            borderRadius: Math.max(borderRadius - 2, 8),
            background: 'linear-gradient(180deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.10) 100%)',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: shellSize * 0.12,
            top: shellSize * 0.1,
            width: topHighlightWidth,
            height: topHighlightHeight,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.62)',
            filter: 'blur(3px)',
            opacity: 0.95,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: shellSize * 0.1,
            bottom: shellSize * 0.12,
            width: shellSize * 0.34,
            height: shellSize * 0.24,
            borderRadius: 999,
            background: `${theme.tint}55`,
            filter: 'blur(8px)',
            opacity: 0.72,
          }}
        />
        <span
          className="relative z-10 inline-flex items-center justify-center"
          style={{
            fontSize: Math.max(12, iconSize),
            lineHeight: 1,
            transform: shellSize >= 32 ? 'translateY(-1px)' : 'translateY(-0.5px)',
            filter: `${theme.emojiGlow} saturate(0.95) brightness(0.99)`,
          }}
        >
          {glyph}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.78)),
        lineHeight: 1,
        filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.85))',
      }}
    >
      {value}
    </span>
  );
};

export default IconImg;
