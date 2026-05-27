import React from 'react';
import {
  Plane, Hotel, Compass, Map as MapIcon, Train, Sun, Tent,
  Mail, Utensils, Umbrella, Mountain, Bike, Ship, Sailboat,
  Wifi, Ticket, Heart, Backpack, Martini, Palmtree,
  Luggage, BookOpen, Camera, Globe, Footprints,
  Anchor, Binoculars, Telescope, Flame, Bed, Bath,
  Glasses, Wallet, Key, Bell, Star, Cloud,
  Zap, Droplet, Snowflake, Thermometer, Calendar,
  Clock, Gift, Smile, LucideIcon
} from 'lucide-react';

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

type IconConfig = {
  icon?: LucideIcon;
  emoji?: string;
  colors: readonly [string, string];
};

const PALETTES = {
  snow: ['rgba(0,179,255,0.5)', 'rgba(255,0,0,0.5)'],
  sunset: ['rgba(24,170,0,0.5)', 'rgba(255,153,0,0.5)'],
  boat: ['rgba(255,153,0,0.5)', 'rgba(99,228,197,0.5)'],
  rainbow: ['rgba(0,116,252,0.5)', 'rgba(255,0,107,0.5)'],
  flower: ['rgba(255,0,138,0.5)', 'rgba(24,170,0,0.5)'],
  rain: ['rgba(0,255,240,0.5)', 'rgba(255,184,0,0.5)'],
  kite: ['rgba(219,255,0,0.5)', 'rgba(228,99,99,0.5)'],
  tree: ['rgba(0,163,255,0.5)', 'rgba(99,228,127,0.5)'],
  mountain: ['rgba(0,179,255,0.5)', 'rgba(255,138,0,0.5)'],
  balloon: ['rgba(66,255,0,0.5)', 'rgba(228,99,99,0.5)'],
  luggage: ['rgba(24,170,0,0.5)', 'rgba(255,0,46,0.5)'],
  map: ['rgba(255,122,0,0.5)', 'rgba(218,99,228,0.5)'],
  beach: ['rgba(0,102,255,0.5)', 'rgba(228,99,122,0.5)'],
  van: ['rgba(235,0,255,0.5)', 'rgba(102,228,99,0.5)'],
  cruise: ['rgba(255,0,162,0.5)', 'rgba(0,217,255,0.5)'],
  earth: ['rgba(0,208,255,0.5)', 'rgba(0,255,55,0.5)'],
  camera: ['rgba(242,0,255,0.5)', 'rgba(255,247,0,0.5)'],
  tower: ['rgba(255,0,0,0.5)', 'rgba(255,119,0,0.5)'],
  moon: ['rgba(85,0,255,0.5)', 'rgba(0,209,255,0.5)'],
  bike: ['rgba(242,0,255,0.5)', 'rgba(255,247,0,0.5)'],
} as const;

const ICON_CONFIG_MAP: Record<CustomIconName, IconConfig> = {
  airplane: { icon: Plane, colors: PALETTES.snow },
  hotel: { icon: Hotel, colors: PALETTES.sunset },
  compass: { icon: Compass, colors: PALETTES.boat },
  map: { icon: MapIcon, colors: PALETTES.map },
  train: { icon: Train, colors: PALETTES.van },
  sun: { icon: Sun, colors: PALETTES.sunset },
  tent: { icon: Tent, colors: PALETTES.tower },
  postcard: { icon: Mail, colors: PALETTES.kite },
  'food-drink': { icon: Utensils, colors: PALETTES.flower },
  beach: { icon: Umbrella, colors: PALETTES.beach },
  mountain: { icon: Mountain, colors: PALETTES.mountain },
  bicycle: { icon: Bike, colors: PALETTES.bike },
  ship: { icon: Ship, colors: PALETTES.cruise },
  wifi: { icon: Wifi, colors: PALETTES.rainbow },
  ticket: { icon: Ticket, colors: PALETTES.kite },
  heart: { icon: Heart, colors: PALETTES.flower },
  backpack: { icon: Backpack, colors: PALETTES.luggage },
  cocktail: { icon: Martini, colors: PALETTES.beach },
  'palm-tree': { icon: Palmtree, colors: PALETTES.tree },
  umbrella: { icon: Umbrella, colors: PALETTES.rain },
  suitcase: { icon: Luggage, colors: PALETTES.luggage },
  passport: { icon: BookOpen, colors: PALETTES.map },
  camera: { icon: Camera, colors: PALETTES.camera },
  globe: { icon: Globe, colors: PALETTES.earth },
  'hiking-boot': { icon: Footprints, colors: PALETTES.mountain },
  'hot-air-balloon': { emoji: '🎈', colors: PALETTES.balloon },
  lantern: { emoji: '🏮', colors: PALETTES.sunset },
  'diving-mask': { emoji: '🤿', colors: PALETTES.beach },
  surfboard: { emoji: '🏄', colors: PALETTES.boat },
  anchor: { icon: Anchor, colors: PALETTES.cruise },
  binoculars: { icon: Binoculars, colors: PALETTES.tree },
  telescope: { icon: Telescope, colors: PALETTES.moon },
  campfire: { icon: Flame, colors: PALETTES.sunset },
  'sleeping-bag': { icon: Bed, colors: PALETTES.moon },
  towel: { emoji: '🧺', colors: PALETTES.rain },
  sunglasses: { icon: Glasses, colors: PALETTES.sunset },
  hat: { emoji: '👒', colors: PALETTES.kite },
  wallet: { icon: Wallet, colors: PALETTES.camera },
  key: { icon: Key, colors: PALETTES.map },
  bell: { icon: Bell, colors: PALETTES.bike },
  star: { icon: Star, colors: PALETTES.moon },
  cloud: { icon: Cloud, colors: PALETTES.rainbow },
  lightning: { icon: Zap, colors: PALETTES.rain },
  'water-drop': { icon: Droplet, colors: PALETTES.rain },
  snowflake: { icon: Snowflake, colors: PALETTES.snow },
  thermometer: { icon: Thermometer, colors: PALETTES.sunset },
  calendar: { icon: Calendar, colors: PALETTES.kite },
  clock: { icon: Clock, colors: PALETTES.moon },
  gift: { icon: Gift, colors: PALETTES.flower },
  'roam-jelly': { emoji: '🍮', colors: PALETTES.rainbow },
};

export function isCustomIcon(value: string): boolean {
  return (CUSTOM_ICONS as readonly string[]).includes(value);
}

interface IconImgProps {
  value: string;
  size?: number;
  className?: string;
}

const IconImg: React.FC<IconImgProps> = ({ value, size = 24, className = "" }) => {
  if (isCustomIcon(value)) {
    const config = ICON_CONFIG_MAP[value as CustomIconName];
    const IconComponent = config.icon;
    const [color1, color2] = config.colors;
    
    const auraSize = Math.max(size * 0.55, 12);
    const blurRadius = Math.max(size * 0.125, 2);

    return (
      <div 
        className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Aura 1 - Top Right */}
        <div 
          className="absolute rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen"
          style={{
            width: auraSize,
            height: auraSize,
            top: "12%",
            right: "10%",
            background: color1,
            filter: `blur(${blurRadius}px)`,
          }}
          aria-hidden="true"
        />
        {/* Aura 2 - Bottom Left */}
        <div 
          className="absolute rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen"
          style={{
            width: auraSize,
            height: auraSize,
            bottom: "12%",
            left: "10%",
            background: color2,
            filter: `blur(${blurRadius}px)`,
          }}
          aria-hidden="true"
        />
        
        {IconComponent ? (
          <IconComponent 
            size={Math.max(14, size * 0.75)} 
            strokeWidth={1.5} 
            className="relative z-10 text-slate-800 dark:text-slate-100 drop-shadow-sm" 
          />
        ) : (
          <span
            className="relative z-10 select-none"
            style={{
              fontSize: Math.max(12, Math.round(size * 0.75)),
              lineHeight: 1,
              filter: "grayscale(20%) drop-shadow(0 1px 1px rgba(0,0,0,0.1))"
            }}
          >
            {config.emoji}
          </span>
        )}
      </div>
    );
  }

  // Fallback for raw emoji or text
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.78)),
        lineHeight: 1,
      }}
    >
      {value}
    </span>
  );
};

export default IconImg;
