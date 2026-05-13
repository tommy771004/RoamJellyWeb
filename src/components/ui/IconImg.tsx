import React, { useEffect, useState } from 'react';

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

export function isCustomIcon(value: string): boolean {
  return (CUSTOM_ICONS as readonly string[]).includes(value);
}

interface IconImgProps {
  value: string;
  size?: number;
  className?: string;
}

const IconImg: React.FC<IconImgProps> = ({ value, size = 24, className = '' }) => {
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [value]);

  if (isCustomIcon(value) && !hasImageError) {
    return (
      <img
        src={`/icons/${value}.png`}
        alt={value}
        width={size}
        height={size}
        className={`object-contain shrink-0 ${className}`}
        draggable={false}
        onError={() => setHasImageError(true)}
      />
    );
  }

  const textValue = isCustomIcon(value) ? CUSTOM_ICON_FALLBACKS[value as CustomIconName] ?? '✈️' : value;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.78)), lineHeight: 1 }}
    >
      {textValue}
    </span>
  );
};

export default IconImg;
