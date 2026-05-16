// src/server/seo/cities.ts

export interface KnownRoute {
  slug: string;
  fromCode: string;
  toCode: string;
  fromDisplay: string;
  toDisplay: string;
  fromVariants: string[];
  toVariants: string[];
}

export interface KnownDestination {
  slug: string;
  displayName: string;
  dbVariants: string[];
}

export const KNOWN_ROUTES: KnownRoute[] = [
  {
    slug: 'tpe-nrt',
    fromCode: 'TPE', toCode: 'NRT',
    fromDisplay: '台北', toDisplay: '東京',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['東京', 'NRT', 'Tokyo', '东京'],
  },
  {
    slug: 'tpe-hnd',
    fromCode: 'TPE', toCode: 'HND',
    fromDisplay: '台北', toDisplay: '東京羽田',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['羽田', 'HND', '東京羽田'],
  },
  {
    slug: 'tpe-icn',
    fromCode: 'TPE', toCode: 'ICN',
    fromDisplay: '台北', toDisplay: '首爾',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['首爾', 'ICN', 'Seoul', '首尔'],
  },
  {
    slug: 'tpe-bkk',
    fromCode: 'TPE', toCode: 'BKK',
    fromDisplay: '台北', toDisplay: '曼谷',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['曼谷', 'BKK', 'Bangkok'],
  },
  {
    slug: 'tpe-sin',
    fromCode: 'TPE', toCode: 'SIN',
    fromDisplay: '台北', toDisplay: '新加坡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['新加坡', 'SIN', 'Singapore'],
  },
  {
    slug: 'tpe-hkg',
    fromCode: 'TPE', toCode: 'HKG',
    fromDisplay: '台北', toDisplay: '香港',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['香港', 'HKG', 'Hong Kong', 'Hongkong'],
  },
  {
    slug: 'tpe-kix',
    fromCode: 'TPE', toCode: 'KIX',
    fromDisplay: '台北', toDisplay: '大阪',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['大阪', 'KIX', 'Osaka'],
  },
  {
    slug: 'tpe-itm',
    fromCode: 'TPE', toCode: 'ITM',
    fromDisplay: '台北', toDisplay: '大阪伊丹',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['伊丹', 'ITM', '大阪伊丹'],
  },
  {
    slug: 'tpe-oka',
    fromCode: 'TPE', toCode: 'OKA',
    fromDisplay: '台北', toDisplay: '沖繩',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['沖繩', 'OKA', 'Okinawa', '冲绳'],
  },
  {
    slug: 'tpe-fuk',
    fromCode: 'TPE', toCode: 'FUK',
    fromDisplay: '台北', toDisplay: '福岡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['福岡', 'FUK', 'Fukuoka', '福冈'],
  },
];

export const KNOWN_DESTINATIONS: KnownDestination[] = [
  { slug: 'tokyo', displayName: '東京', dbVariants: ['東京', 'Tokyo', '东京'] },
  { slug: 'osaka', displayName: '大阪', dbVariants: ['大阪', 'Osaka'] },
  { slug: 'seoul', displayName: '首爾', dbVariants: ['首爾', 'Seoul', '首尔'] },
  { slug: 'bangkok', displayName: '曼谷', dbVariants: ['曼谷', 'Bangkok'] },
  { slug: 'singapore', displayName: '新加坡', dbVariants: ['新加坡', 'Singapore'] },
  { slug: 'hong-kong', displayName: '香港', dbVariants: ['香港', 'Hong Kong'] },
  { slug: 'okinawa', displayName: '沖繩', dbVariants: ['沖繩', 'Okinawa', '冲绳'] },
  { slug: 'fukuoka', displayName: '福岡', dbVariants: ['福岡', 'Fukuoka', '福冈'] },
  { slug: 'kyoto', displayName: '京都', dbVariants: ['京都', 'Kyoto'] },
  { slug: 'sapporo', displayName: '札幌', dbVariants: ['札幌', 'Sapporo'] },
];

export function getRouteBySlug(slug: string): KnownRoute | undefined {
  return KNOWN_ROUTES.find((r) => r.slug === slug);
}

export function getDestinationBySlug(slug: string): KnownDestination | undefined {
  return KNOWN_DESTINATIONS.find((d) => d.slug === slug);
}
