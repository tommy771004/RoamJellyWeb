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
    return (
      <img
        src={`/icons/${value}.png`}
        alt={value}
        width={size}
        height={size}
        className={`object-contain shrink-0 ${className}`}
        draggable={false}
      />
    );
  }
  return <span className={className} style={{ lineHeight: 1 }}>{value}</span>;
};

export default IconImg;
