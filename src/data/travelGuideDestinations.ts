/* Curated integration dataset from travel-guide-tw/travel-guide-tw.github.io */

export interface TravelGuideDestination {
  id: string;
  region: '亞洲' | '歐洲' | '其他';
  country: string;
  place: string;
  path: string;
  guideUrl: string;
  sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io';
  searchAlias: string | null;
}

export const TRAVEL_GUIDE_SOURCE_REPO = 'travel-guide-tw/travel-guide-tw.github.io' as const;

export const TRAVEL_GUIDE_REGIONS = ['亞洲', '歐洲'] as const;

export const TRAVEL_GUIDE_DESTINATIONS: TravelGuideDestination[] = [
  { id: 'jp_tokyo', region: '亞洲', country: '日本', place: '東京', path: '日本/東京', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E6%9D%B1%E4%BA%AC', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NRT' },
  { id: 'jp_fukuoka', region: '亞洲', country: '日本', place: '福岡', path: '日本/福岡', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E7%A6%8F%E5%B2%A1', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FUK' },
  { id: 'jp_osaka', region: '亞洲', country: '日本', place: '大阪', path: '日本/大阪', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%A4%A7%E9%98%AA', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KIX' },
  { id: 'jp_kyoto', region: '亞洲', country: '日本', place: '京都', path: '日本/京都', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E4%BA%AC%E9%83%BD', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KIX' },
  { id: 'jp_hokkaido', region: '亞洲', country: '日本', place: '北海道', path: '日本/北海道', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%8C%97%E6%B5%B7%E9%81%93', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'jp_sapporo', region: '亞洲', country: '日本', place: '札幌', path: '日本/北海道/札幌', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%8C%97%E6%B5%B7%E9%81%93/%E6%9C%AD%E5%B9%8C', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CTS' },
  { id: 'jp_hakodate', region: '亞洲', country: '日本', place: '函館', path: '日本/北海道/函館', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%8C%97%E6%B5%B7%E9%81%93/%E5%87%BD%E9%A4%A8', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HKD' },
  { id: 'jp_aomori', region: '亞洲', country: '日本', place: '青森', path: '日本/青森', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E9%9D%92%E6%A3%AE', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'jp_nara', region: '亞洲', country: '日本', place: '奈良', path: '日本/奈良', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%A5%88%E8%89%AF', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KIX' },
  { id: 'jp_hiroshima', region: '亞洲', country: '日本', place: '廣島', path: '日本/廣島', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%BB%A3%E5%B3%B6', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HIJ' },
  { id: 'jp_nagano', region: '亞洲', country: '日本', place: '長野', path: '日本/長野', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E9%95%B7%E9%87%8E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'jp_shizuoka', region: '亞洲', country: '日本', place: '靜岡', path: '日本/靜岡', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E9%9D%9C%E5%B2%A1', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'jp_okayama', region: '亞洲', country: '日本', place: '岡山', path: '日本/岡山', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%B2%A1%E5%B1%B1', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },

  { id: 'tw_taipei', region: '亞洲', country: '台灣', place: '台北', path: '台灣/台北', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E5%8F%B0%E5%8C%97', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TPE' },
  { id: 'tw_taoyuan', region: '亞洲', country: '台灣', place: '桃園', path: '台灣/桃園', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E6%A1%83%E5%9C%92', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TPE' },
  { id: 'tw_taichung', region: '亞洲', country: '台灣', place: '台中', path: '台灣/台中', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E5%8F%B0%E4%B8%AD', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'RMQ' },
  { id: 'tw_tainan', region: '亞洲', country: '台灣', place: '台南', path: '台灣/台南', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E5%8F%B0%E5%8D%97', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'tw_kaohsiung', region: '亞洲', country: '台灣', place: '高雄', path: '台灣/高雄', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E9%AB%98%E9%9B%84', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KHH' },
  { id: 'tw_hualien', region: '亞洲', country: '台灣', place: '花蓮', path: '台灣/花蓮', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E8%8A%B1%E8%93%AE', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },

  { id: 'np_kathmandu', region: '亞洲', country: '尼泊爾', place: '加德滿都', path: '尼泊爾/加德滿都', guideUrl: 'https://travel-guide-tw.github.io/%E5%B0%BC%E6%B3%8A%E7%88%BE/%E5%8A%A0%E5%BE%B7%E6%BB%BF%E9%83%BD', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },

  { id: 'ch_bern', region: '歐洲', country: '瑞士', place: '伯恩州', path: '瑞士/伯恩州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E4%BC%AF%E6%81%A9%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'ch_valais', region: '歐洲', country: '瑞士', place: '瓦萊州', path: '瑞士/瓦萊州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E7%93%A6%E8%90%8A%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'ch_lucerne', region: '歐洲', country: '瑞士', place: '琉森州', path: '瑞士/琉森州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E7%90%89%E6%A3%AE%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'ch_vaud', region: '歐洲', country: '瑞士', place: '佛德州', path: '瑞士/佛德州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E4%BD%9B%E5%BE%B7%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
  { id: 'ch_ticino', region: '歐洲', country: '瑞士', place: '提契諾州', path: '瑞士/提契諾州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E6%8F%90%E5%A5%91%E8%AB%BE%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },

  { id: 'no_tromso', region: '歐洲', country: '挪威', place: '特羅姆瑟', path: '挪威/特羅姆瑟', guideUrl: 'https://travel-guide-tw.github.io/%E6%8C%AA%E5%A8%81/%E7%89%B9%E7%BE%85%E5%A7%86%E7%91%9F', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: null },
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
