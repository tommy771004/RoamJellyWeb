/* Curated integration dataset from travel-guide-tw/travel-guide-tw.github.io */

export interface TravelGuideDestination {
  id: string;
  region: typeof TRAVEL_GUIDE_REGIONS[number] | '其他';
  country: string;
  place: string;
  path: string;
  guideUrl: string;
  sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io';
  searchAlias: string | null;
}

export const TRAVEL_GUIDE_SOURCE_REPO = 'travel-guide-tw/travel-guide-tw.github.io' as const;

export const TRAVEL_GUIDE_REGIONS = ['亞洲', '歐洲', '美洲', '大洋洲', '中東'] as const;

export const TRAVEL_GUIDE_DESTINATIONS: TravelGuideDestination[] = [
  // 亞洲
  { id: 'jp_tokyo', region: '亞洲', country: '日本', place: '東京', path: '日本/東京', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E6%9D%B1%E4%BA%AC', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NRT' },
  { id: 'jp_osaka', region: '亞洲', country: '日本', place: '大阪', path: '日本/大阪', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%A4%A7%E9%98%AA', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KIX' },
  { id: 'jp_fukuoka', region: '亞洲', country: '日本', place: '福岡', path: '日本/福岡', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E7%A6%8F%E5%B2%A1', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FUK' },
  { id: 'jp_sapporo', region: '亞洲', country: '日本', place: '札幌', path: '日本/北海道/札幌', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%8C%97%E6%B5%B7%E9%81%93/%E6%9C%AD%E5%B9%8C', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CTS' },
  { id: 'kr_seoul', region: '亞洲', country: '韓國', place: '首爾', path: '韓國/首爾', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ICN' },
  { id: 'kr_busan', region: '亞洲', country: '韓國', place: '釜山', path: '韓國/釜山', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PUS' },
  { id: 'th_bangkok', region: '亞洲', country: '泰國', place: '曼谷', path: '泰國/曼谷', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BKK' },
  { id: 'sg_singapore', region: '亞洲', country: '新加坡', place: '新加坡', path: '新加坡/新加坡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SIN' },
  { id: 'cn_shanghai', region: '亞洲', country: '中國', place: '上海', path: '中國/上海', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PVG' },
  { id: 'cn_beijing', region: '亞洲', country: '中國', place: '北京', path: '中國/北京', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PEK' },
  { id: 'tw_taipei', region: '亞洲', country: '台灣', place: '台北', path: '台灣/台北', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E5%8F%B0%E5%8C%97', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TPE' },
  { id: 'tw_kaohsiung', region: '亞洲', country: '台灣', place: '高雄', path: '台灣/高雄', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E9%AB%98%E9%9B%84', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KHH' },
  { id: 'my_kuala_lumpur', region: '亞洲', country: '馬來西亞', place: '吉隆坡', path: '馬來西亞/吉隆坡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KUL' },
  { id: 'vn_ho_chi_minh', region: '亞洲', country: '越南', place: '胡志明市', path: '越南/胡志明市', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SGN' },
  // 歐洲
  { id: 'uk_london', region: '歐洲', country: '英國', place: '倫敦', path: '英國/倫敦', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LHR' },
  { id: 'fr_paris', region: '歐洲', country: '法國', place: '巴黎', path: '法國/巴黎', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CDG' },
  { id: 'ch_bern', region: '歐洲', country: '瑞士', place: '伯恩州', path: '瑞士/伯恩州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E4%BC%AF%E6%81%A9%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'ch_valais', region: '歐洲', country: '瑞士', place: '瓦萊州', path: '瑞士/瓦萊州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E7%93%A6%E8%90%8A%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'no_tromso', region: '歐洲', country: '挪威', place: '特羅姆瑟', path: '挪威/特羅姆瑟', guideUrl: 'https://travel-guide-tw.github.io/%E6%8C%AA%E5%A8%81/%E7%89%B9%E7%BE%85%E5%A7%86%E7%91%9F', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'de_frankfurt', region: '歐洲', country: '德國', place: '法蘭克福', path: '德國/法蘭克福', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FRA' },
  { id: 'nl_amsterdam', region: '歐洲', country: '荷蘭', place: '阿姆斯特丹', path: '荷蘭/阿姆斯特丹', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'AMS' },
  { id: 'it_rome', region: '歐洲', country: '義大利', place: '羅馬', path: '義大利/羅馬', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FCO' },
  // 美洲
  { id: 'us_new_york', region: '美洲', country: '美國', place: '紐約', path: '美國/紐約', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'JFK' },
  { id: 'us_los_angeles', region: '美洲', country: '美國', place: '洛杉磯', path: '美國/洛杉磯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LAX' },
  { id: 'us_san_francisco', region: '美洲', country: '美國', place: '舊金山', path: '美國/舊金山', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SFO' },
  { id: 'ca_vancouver', region: '美洲', country: '加拿大', place: '溫哥華', path: '加拿大/溫哥華', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'YVR' },
  { id: 'ca_toronto', region: '美洲', country: '加拿大', place: '多倫多', path: '加拿大/多倫多', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'YYZ' },
  // 大洋洲
  { id: 'au_sydney', region: '大洋洲', country: '澳洲', place: '雪梨', path: '澳洲/雪梨', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SYD' },
  { id: 'au_melbourne', region: '大洋洲', country: '澳洲', place: '墨爾本', path: '澳洲/墨爾本', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MEL' },
  { id: 'nz_auckland', region: '大洋洲', country: '紐西蘭', place: '奧克蘭', path: '紐西蘭/奧克蘭', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'AKL' },
  // 中東
  { id: 'ae_dubai', region: '中東', country: '阿聯酋', place: '杜拜', path: '阿聯酋/杜拜', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DXB' },
  { id: 'tr_istanbul', region: '中東', country: '土耳其', place: '伊斯坦堡', path: '土耳其/伊斯坦堡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'IST' },
];

export function matchTravelDestinations(query: string, region: string | '全部地區'): TravelGuideDestination[] {
  const normalized = query.trim().toLowerCase();
  const byRegion = region === '全部地區'
    ? TRAVEL_GUIDE_DESTINATIONS
    : TRAVEL_GUIDE_DESTINATIONS.filter((item) => item.region === region);

  if (!normalized) {
    return byRegion.slice(0, 8);
  }

  return byRegion
    .filter((item) => {
      return (
        item.place.toLowerCase().includes(normalized) ||
        item.country.toLowerCase().includes(normalized) ||
        item.path.toLowerCase().includes(normalized) ||
        (item.searchAlias?.toLowerCase().includes(normalized) ?? false)
      );
    })
    .slice(0, 8);
}
