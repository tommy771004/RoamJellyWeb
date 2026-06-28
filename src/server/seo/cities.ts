// src/server/seo/cities.ts

export interface KnownRoute {
  slug: string;
  fromCode: string;
  toCode: string;
  fromDisplay: string;
  toDisplay: string;
  fromVariants: string[];
  toVariants: string[];
  destinationSlug: string; // matches a slug in KNOWN_DESTINATIONS
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
    destinationSlug: 'tokyo',
  },
  {
    slug: 'tpe-hnd',
    fromCode: 'TPE', toCode: 'HND',
    fromDisplay: '台北', toDisplay: '東京羽田',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['羽田', 'HND', '東京羽田'],
    destinationSlug: 'tokyo',
  },
  {
    slug: 'tpe-icn',
    fromCode: 'TPE', toCode: 'ICN',
    fromDisplay: '台北', toDisplay: '首爾',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['首爾', 'ICN', 'Seoul', '首尔'],
    destinationSlug: 'seoul',
  },
  {
    slug: 'tpe-bkk',
    fromCode: 'TPE', toCode: 'BKK',
    fromDisplay: '台北', toDisplay: '曼谷',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['曼谷', 'BKK', 'Bangkok'],
    destinationSlug: 'bangkok',
  },
  {
    slug: 'tpe-sin',
    fromCode: 'TPE', toCode: 'SIN',
    fromDisplay: '台北', toDisplay: '新加坡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['新加坡', 'SIN', 'Singapore'],
    destinationSlug: 'singapore',
  },
  {
    slug: 'tpe-hkg',
    fromCode: 'TPE', toCode: 'HKG',
    fromDisplay: '台北', toDisplay: '香港',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['香港', 'HKG', 'Hong Kong', 'Hongkong'],
    destinationSlug: 'hong-kong',
  },
  {
    slug: 'tpe-kix',
    fromCode: 'TPE', toCode: 'KIX',
    fromDisplay: '台北', toDisplay: '大阪',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['大阪', 'KIX', 'Osaka'],
    destinationSlug: 'osaka',
  },
  {
    slug: 'tpe-itm',
    fromCode: 'TPE', toCode: 'ITM',
    fromDisplay: '台北', toDisplay: '大阪伊丹',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['伊丹', 'ITM', '大阪伊丹'],
    destinationSlug: 'osaka',
  },
  {
    slug: 'tpe-oka',
    fromCode: 'TPE', toCode: 'OKA',
    fromDisplay: '台北', toDisplay: '沖繩',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['沖繩', 'OKA', 'Okinawa', '冲绳'],
    destinationSlug: 'okinawa',
  },
  {
    slug: 'tpe-fuk',
    fromCode: 'TPE', toCode: 'FUK',
    fromDisplay: '台北', toDisplay: '福岡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['福岡', 'FUK', 'Fukuoka', '福冈'],
    destinationSlug: 'fukuoka',
  },
  {
    slug: 'tpe-cts',
    fromCode: 'TPE', toCode: 'CTS',
    fromDisplay: '台北', toDisplay: '札幌',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['札幌', 'CTS', 'Sapporo', '新千歲', 'Chitose'],
    destinationSlug: 'sapporo',
  },
  {
    slug: 'tpe-ngo',
    fromCode: 'TPE', toCode: 'NGO',
    fromDisplay: '台北', toDisplay: '名古屋',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['名古屋', 'NGO', 'Nagoya', '中部'],
    destinationSlug: 'nagoya',
  },
  {
    slug: 'tpe-dad',
    fromCode: 'TPE', toCode: 'DAD',
    fromDisplay: '台北', toDisplay: '峴港',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['峴港', 'DAD', 'Da Nang', 'Danang', '岘港'],
    destinationSlug: 'da-nang',
  },
  {
    slug: 'tpe-sgn',
    fromCode: 'TPE', toCode: 'SGN',
    fromDisplay: '台北', toDisplay: '胡志明市',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['胡志明', '胡志明市', 'SGN', 'Ho Chi Minh', 'Saigon', '西貢'],
    destinationSlug: 'ho-chi-minh',
  },
  {
    slug: 'tpe-han',
    fromCode: 'TPE', toCode: 'HAN',
    fromDisplay: '台北', toDisplay: '河內',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['河內', 'HAN', 'Hanoi', '河内'],
    destinationSlug: 'hanoi',
  },
  {
    slug: 'tpe-kul',
    fromCode: 'TPE', toCode: 'KUL',
    fromDisplay: '台北', toDisplay: '吉隆坡',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['吉隆坡', 'KUL', 'Kuala Lumpur'],
    destinationSlug: 'kuala-lumpur',
  },
  {
    slug: 'tpe-mnl',
    fromCode: 'TPE', toCode: 'MNL',
    fromDisplay: '台北', toDisplay: '馬尼拉',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['馬尼拉', 'MNL', 'Manila', '马尼拉'],
    destinationSlug: 'manila',
  },
  {
    slug: 'tpe-ceb',
    fromCode: 'TPE', toCode: 'CEB',
    fromDisplay: '台北', toDisplay: '宿霧',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['宿霧', 'CEB', 'Cebu', '宿务'],
    destinationSlug: 'cebu',
  },
  {
    slug: 'tpe-hkt',
    fromCode: 'TPE', toCode: 'HKT',
    fromDisplay: '台北', toDisplay: '普吉島',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['普吉島', 'HKT', 'Phuket', '普吉'],
    destinationSlug: 'phuket',
  },
  {
    slug: 'tpe-mfm',
    fromCode: 'TPE', toCode: 'MFM',
    fromDisplay: '台北', toDisplay: '澳門',
    fromVariants: ['台北', 'TPE', 'Taipei', '臺北'],
    toVariants: ['澳門', 'MFM', 'Macau', 'Macao', '澳门'],
    destinationSlug: 'macau',
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
  { slug: 'sapporo', displayName: '札幌', dbVariants: ['札幌', 'Sapporo', '新千歲', 'Chitose'] },
  { slug: 'nagoya', displayName: '名古屋', dbVariants: ['名古屋', 'Nagoya', '中部'] },
  { slug: 'da-nang', displayName: '峴港', dbVariants: ['峴港', 'Da Nang', 'Danang', '岘港'] },
  { slug: 'ho-chi-minh', displayName: '胡志明市', dbVariants: ['胡志明', '胡志明市', 'Ho Chi Minh', 'Saigon', '西貢', '西贡'] },
  { slug: 'hanoi', displayName: '河內', dbVariants: ['河內', 'Hanoi', '河内'] },
  { slug: 'kuala-lumpur', displayName: '吉隆坡', dbVariants: ['吉隆坡', 'Kuala Lumpur', 'KL'] },
  { slug: 'manila', displayName: '馬尼拉', dbVariants: ['馬尼拉', 'Manila', '马尼拉'] },
  { slug: 'cebu', displayName: '宿霧', dbVariants: ['宿霧', 'Cebu', '宿务'] },
  { slug: 'phuket', displayName: '普吉島', dbVariants: ['普吉島', 'Phuket', '普吉'] },
  { slug: 'macau', displayName: '澳門', dbVariants: ['澳門', 'Macau', 'Macao', '澳门'] },
];

export function getRouteBySlug(slug: string): KnownRoute | undefined {
  return KNOWN_ROUTES.find((r) => r.slug === slug);
}

export function getDestinationBySlug(slug: string): KnownDestination | undefined {
  return KNOWN_DESTINATIONS.find((d) => d.slug === slug);
}
