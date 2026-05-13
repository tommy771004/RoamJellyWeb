import React from 'react';
import * as LucideIcons from 'lucide-react';

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

const CUSTOM_ICON_FALLBACKS: Record<CustomIconName, string> = {
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

const LUCIDE_ICON_MAP: Partial<Record<CustomIconName, string>> = {
  airplane: 'Plane',
  hotel: 'Hotel',
  compass: 'Compass',
  map: 'Map',
  train: 'TrainFront',
  sun: 'Sun',
  tent: 'Tent',
  postcard: 'Image',
  'food-drink': 'UtensilsCrossed',
  beach: 'Umbrella',
  mountain: 'Mountain',
  bicycle: 'Bike',
  ship: 'Ship',
  wifi: 'Wifi',
  ticket: 'Ticket',
  heart: 'Heart',
  backpack: 'Backpack',
  cocktail: 'Martini',
  'palm-tree': 'TreePalm',
  umbrella: 'Umbrella',
  suitcase: 'Luggage',
  camera: 'Camera',
  globe: 'Globe',
  lantern: 'Lamp',
  'diving-mask': 'Glasses',
  surfboard: 'Waves',
  anchor: 'Anchor',
  binoculars: 'Binoculars',
  telescope: 'Telescope',
  campfire: 'Flame',
  sunglasses: 'Glasses',
  wallet: 'Wallet',
  key: 'KeyRound',
  bell: 'Bell',
  star: 'Star',
  cloud: 'Cloud',
  lightning: 'Zap',
  'water-drop': 'Droplets',
  snowflake: 'Snowflake',
  thermometer: 'Thermometer',
  calendar: 'CalendarDays',
  clock: 'Clock3',
  gift: 'Gift',
  'roam-jelly': 'Sparkles',
};

const ICON_THEME_STYLES: Record<IconTone, { background: string; outline: string; highlight: string; accent: string; shadow: string }> = {
  rose: {
    background: 'linear-gradient(135deg, #fee3ec 0%, #f4dfff 100%)',
    outline: 'rgba(255,255,255,0.92)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.18) 100%)',
    accent: '#c4688a',
    shadow: '0 12px 28px rgba(244, 114, 182, 0.20)',
  },
  sky: {
    background: 'linear-gradient(135deg, #e5efff 0%, #dff5ff 100%)',
    outline: 'rgba(255,255,255,0.94)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.16) 100%)',
    accent: '#7d9ac8',
    shadow: '0 12px 28px rgba(125, 155, 210, 0.18)',
  },
  mint: {
    background: 'linear-gradient(135deg, #e4f7ef 0%, #ddf6ff 100%)',
    outline: 'rgba(255,255,255,0.92)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.18) 100%)',
    accent: '#71a99c',
    shadow: '0 12px 28px rgba(52, 211, 153, 0.16)',
  },
  lilac: {
    background: 'linear-gradient(135deg, #efe5ff 0%, #e5ecff 100%)',
    outline: 'rgba(255,255,255,0.94)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.20) 100%)',
    accent: '#9c83c9',
    shadow: '0 12px 28px rgba(168, 139, 250, 0.18)',
  },
  amber: {
    background: 'linear-gradient(135deg, #fff1cf 0%, #ffe0bf 100%)',
    outline: 'rgba(255,255,255,0.92)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.18) 100%)',
    accent: '#d6a14c',
    shadow: '0 12px 28px rgba(251, 191, 36, 0.18)',
  },
  peach: {
    background: 'linear-gradient(135deg, #f9e5db 0%, #f5ecff 100%)',
    outline: 'rgba(255,255,255,0.92)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.18) 100%)',
    accent: '#bc8d74',
    shadow: '0 12px 28px rgba(251, 146, 60, 0.14)',
  },
};

const LUCIDE_REGISTRY = LucideIcons as unknown as Record<string, React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}>>;

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
    const isMini = shellSize <= 16;
    const borderRadius = Math.round(shellSize * 0.32);
    const iconSize = isMini ? Math.max(12, Math.round(shellSize * 0.9)) : Math.max(12, Math.round(shellSize * 0.52));
    const lucideName = LUCIDE_ICON_MAP[iconKey];
    const LucideIcon = lucideName ? LUCIDE_REGISTRY[lucideName] : undefined;
    const glyph = LucideIcon ? (
      <LucideIcon size={iconSize} color={theme.accent} strokeWidth={isMini ? 2.3 : 2.15} />
    ) : (
      <span style={{ fontSize: Math.max(11, Math.round(iconSize * 0.9)), lineHeight: 1 }}>
        {CUSTOM_ICON_FALLBACKS[iconKey] ?? '✈️'}
      </span>
    );

    if (isMini) {
      return (
        <span
          className={`inline-flex shrink-0 select-none items-center justify-center ${className}`}
          style={{
            width: shellSize,
            height: shellSize,
            filter: 'drop-shadow(0 1px 1px rgba(255,255,255,0.9))',
          }}
        >
          {glyph}
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
          background: theme.background,
          border: `1px solid ${theme.outline}`,
          boxShadow: `${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -8px 14px rgba(255,255,255,0.28)`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: Math.max(borderRadius - 2, 8),
            background: theme.highlight,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: shellSize * 0.12,
            top: shellSize * 0.1,
            width: shellSize * 0.44,
            height: shellSize * 0.28,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.56)',
            filter: 'blur(2px)',
            opacity: 0.95,
          }}
        />
        <span
          className="relative z-10 inline-flex items-center justify-center"
          style={{ filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.92)) drop-shadow(0 3px 6px rgba(148, 163, 184, 0.22))' }}
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
