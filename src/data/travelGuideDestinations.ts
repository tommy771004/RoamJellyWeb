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
  { id: 'tw_taipei', region: '亞洲', country: '台灣', place: '台北/桃園', path: '台灣/台北', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E5%8F%B0%E5%8C%97', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TPE' },
  { id: 'tw_songshan', region: '亞洲', country: '台灣', place: '台北/松山', path: '台灣/台北', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E5%8F%B0%E5%8C%97', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TSA' },
  { id: 'tw_kaohsiung', region: '亞洲', country: '台灣', place: '高雄', path: '台灣/高雄', guideUrl: 'https://travel-guide-tw.github.io/%E5%8F%B0%E7%81%A3/%E9%AB%98%E9%9B%84', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KHH' },
  { id: 'tw_taichung', region: '亞洲', country: '台灣', place: '台中', path: '台灣/台中', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'RMQ' },
  { id: 'tw_tainan', region: '亞洲', country: '台灣', place: '台南', path: '台灣/台南', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TNN' },
  { id: 'tw_kinmen', region: '亞洲', country: '台灣', place: '金門', path: '台灣/金門', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KNH' },
  { id: 'tw_penghu', region: '亞洲', country: '台灣', place: '澎湖', path: '台灣/澎湖', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MZG' },
  
  { id: 'jp_tokyo_nrt', region: '亞洲', country: '日本', place: '東京/成田', path: '日本/東京', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E6%9D%B1%E4%BA%AC', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NRT' },
  { id: 'jp_tokyo_hnd', region: '亞洲', country: '日本', place: '東京/羽田', path: '日本/東京', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E6%9D%B1%E4%BA%AC', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HND' },
  { id: 'jp_osaka', region: '亞洲', country: '日本', place: '大阪/關西', path: '日本/大阪', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%A4%A7%E9%98%AA', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KIX' },
  { id: 'jp_fukuoka', region: '亞洲', country: '日本', place: '福岡', path: '日本/福岡', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E7%A6%8F%E5%B2%A1', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FUK' },
  { id: 'jp_sapporo', region: '亞洲', country: '日本', place: '札幌/新千歲', path: '日本/北海道/札幌', guideUrl: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%8C%97%E6%B5%B7%E9%81%93/%E6%9C%AD%E5%B9%8C', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CTS' },
  { id: 'jp_okinawa', region: '亞洲', country: '日本', place: '沖繩/那霸', path: '日本/沖繩', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'OKA' },
  { id: 'jp_nagoya', region: '亞洲', country: '日本', place: '名古屋', path: '日本/名古屋', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NGO' },
  { id: 'jp_sendai', region: '亞洲', country: '日本', place: '仙台', path: '日本/仙台', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SDJ' },
  { id: 'jp_takamatsu', region: '亞洲', country: '日本', place: '高松', path: '日本/高松', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TAK' },
  { id: 'jp_kumamoto', region: '亞洲', country: '日本', place: '熊本', path: '日本/熊本', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KMJ' },
  { id: 'jp_hakodate', region: '亞洲', country: '日本', place: '函館', path: '日本/函館', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HKD' },

  { id: 'kr_seoul_icn', region: '亞洲', country: '韓國', place: '首爾/仁川', path: '韓國/首爾', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ICN' },
  { id: 'kr_seoul_gmp', region: '亞洲', country: '韓國', place: '首爾/金浦', path: '韓國/首爾', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'GMP' },
  { id: 'kr_busan', region: '亞洲', country: '韓國', place: '釜山', path: '韓國/釜山', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PUS' },
  { id: 'kr_jeju', region: '亞洲', country: '韓國', place: '濟州島', path: '韓國/濟州島', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CJU' },
  { id: 'kr_daegu', region: '亞洲', country: '韓國', place: '大邱', path: '韓國/大邱', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TAE' },
  { id: 'kr_cheongju', region: '亞洲', country: '韓國', place: '清州', path: '韓國/清州', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CJJ' },

  { id: 'th_bangkok_bkk', region: '亞洲', country: '泰國', place: '曼谷/蘇凡納布', path: '泰國/曼谷', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BKK' },
  { id: 'th_bangkok_dmk', region: '亞洲', country: '泰國', place: '曼谷/廊曼', path: '泰國/曼谷', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DMK' },
  { id: 'th_chiang_mai', region: '亞洲', country: '泰國', place: '清邁', path: '泰國/清邁', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CNX' },
  { id: 'th_phuket', region: '亞洲', country: '泰國', place: '普吉島', path: '泰國/普吉島', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HKT' },

  { id: 'sg_singapore', region: '亞洲', country: '新加坡', place: '新加坡/樟宜', path: '新加坡/新加坡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SIN' },
  
  { id: 'my_kuala_lumpur', region: '亞洲', country: '馬來西亞', place: '吉隆坡', path: '馬來西亞/吉隆坡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'KUL' },
  { id: 'my_penang', region: '亞洲', country: '馬來西亞', place: '檳城', path: '馬來西亞/檳城', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PEN' },
  { id: 'my_kota_kinabalu', region: '亞洲', country: '馬來西亞', place: '亞庇', path: '馬來西亞/亞庇', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BKI' },

  { id: 'vn_ho_chi_minh', region: '亞洲', country: '越南', place: '胡志明市', path: '越南/胡志明市', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SGN' },
  { id: 'vn_hanoi', region: '亞洲', country: '越南', place: '河內', path: '越南/河內', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HAN' },
  { id: 'vn_da_nang', region: '亞洲', country: '越南', place: '峴港', path: '越南/峴港', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DAD' },
  { id: 'vn_phu_quoc', region: '亞洲', country: '越南', place: '富國島', path: '越南/富國島', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PQC' },

  { id: 'hk_hong_kong', region: '亞洲', country: '香港', place: '香港', path: '香港/香港', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HKG' },
  { id: 'mo_macau', region: '亞洲', country: '澳門', place: '澳門', path: '澳門/澳門', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MFM' },

  { id: 'cn_shanghai_pvg', region: '亞洲', country: '中國', place: '上海/浦東', path: '中國/上海', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PVG' },
  { id: 'cn_shanghai_sha', region: '亞洲', country: '中國', place: '上海/虹橋', path: '中國/上海', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SHA' },
  { id: 'cn_beijing_pek', region: '亞洲', country: '中國', place: '北京/首都', path: '中國/北京', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PEK' },
  { id: 'cn_guangzhou', region: '亞洲', country: '中國', place: '廣州', path: '中國/廣州', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CAN' },
  { id: 'cn_shenzhen', region: '亞洲', country: '中國', place: '深圳', path: '中國/深圳', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SZX' },
  { id: 'cn_chengdu', region: '亞洲', country: '中國', place: '成都', path: '中國/成都', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CTU' },

  { id: 'ph_manila', region: '亞洲', country: '菲律賓', place: '馬尼拉', path: '菲律賓/馬尼拉', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MNL' },
  { id: 'ph_cebu', region: '亞洲', country: '菲律賓', place: '宿霧', path: '菲律賓/宿霧', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CEB' },
  { id: 'id_bali', region: '亞洲', country: '印尼', place: '峇里島', path: '印尼/峇里島', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DPS' },
  { id: 'id_jakarta', region: '亞洲', country: '印尼', place: '雅加達', path: '印尼/雅加達', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CGK' },
  { id: 'in_delhi', region: '亞洲', country: '印度', place: '新德里', path: '印度/新德里', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DEL' },
  { id: 'in_mumbai', region: '亞洲', country: '印度', place: '孟買', path: '印度/孟買', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BOM' },

  // 歐洲
  { id: 'uk_london_lhr', region: '歐洲', country: '英國', place: '倫敦/希斯洛', path: '英國/倫敦', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LHR' },
  { id: 'uk_london_lgw', region: '歐洲', country: '英國', place: '倫敦/蓋威克', path: '英國/倫敦', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LGW' },
  { id: 'uk_manchester', region: '歐洲', country: '英國', place: '曼徹斯特', path: '英國/曼徹斯特', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MAN' },
  { id: 'uk_edinburgh', region: '歐洲', country: '英國', place: '愛丁堡', path: '英國/愛丁堡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'EDI' },
  { id: 'fr_paris_cdg', region: '歐洲', country: '法國', place: '巴黎/戴高樂', path: '法國/巴黎', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CDG' },
  { id: 'fr_paris_ory', region: '歐洲', country: '法國', place: '巴黎/奧利', path: '法國/巴黎', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ORY' },
  { id: 'fr_nice', region: '歐洲', country: '法國', place: '尼斯', path: '法國/尼斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NCE' },
  { id: 'de_frankfurt', region: '歐洲', country: '德國', place: '法蘭克福', path: '德國/法蘭克福', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FRA' },
  { id: 'de_munich', region: '歐洲', country: '德國', place: '慕尼黑', path: '德國/慕尼黑', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MUC' },
  { id: 'de_berlin', region: '歐洲', country: '德國', place: '柏林', path: '德國/柏林', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BER' },
  { id: 'nl_amsterdam', region: '歐洲', country: '荷蘭', place: '阿姆斯特丹', path: '荷蘭/阿姆斯特丹', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'AMS' },
  { id: 'it_rome', region: '歐洲', country: '義大利', place: '羅馬', path: '義大利/羅馬', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'FCO' },
  { id: 'it_milan_mxp', region: '歐洲', country: '義大利', place: '米蘭/馬爾彭薩', path: '義大利/米蘭', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MXP' },
  { id: 'it_venice', region: '歐洲', country: '義大利', place: '威尼斯', path: '義大利/威尼斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'VCE' },
  { id: 'es_madrid', region: '歐洲', country: '西班牙', place: '馬德里', path: '西班牙/馬德里', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MAD' },
  { id: 'es_barcelona', region: '歐洲', country: '西班牙', place: '巴塞隆納', path: '西班牙/巴塞隆納', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BCN' },
  { id: 'pt_lisbon', region: '歐洲', country: '葡萄牙', place: '里斯本', path: '葡萄牙/里斯本', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LIS' },
  { id: 'pt_porto', region: '歐洲', country: '葡萄牙', place: '波多', path: '葡萄牙/波多', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'OPO' },
  { id: 'ch_zurich', region: '歐洲', country: '瑞士', place: '蘇黎世', path: '瑞士/蘇黎世', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ZRH' },
  { id: 'ch_geneva', region: '歐洲', country: '瑞士', place: '日內瓦', path: '瑞士/日內瓦', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'GVA' },
  { id: 'ch_bern', region: '歐洲', country: '瑞士', place: '伯恩州', path: '瑞士/伯恩州', guideUrl: 'https://travel-guide-tw.github.io/%E7%91%9E%E5%A3%AB/%E4%BC%AF%E6%81%A9%E5%B7%9E', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BRN' },
  { id: 'at_vienna', region: '歐洲', country: '奧地利', place: '維也納', path: '奧地利/維也納', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'VIE' },
  { id: 'cz_prague', region: '歐洲', country: '捷克', place: '布拉格', path: '捷克/布拉格', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PRG' },
  { id: 'hu_budapest', region: '歐洲', country: '匈牙利', place: '布達佩斯', path: '匈牙利/布達佩斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BUD' },
  { id: 'gr_athens', region: '歐洲', country: '希臘', place: '雅典', path: '希臘/雅典', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ATH' },
  { id: 'be_brussels', region: '歐洲', country: '比利時', place: '布魯塞爾', path: '比利時/布魯塞爾', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BRU' },
  { id: 'dk_copenhagen', region: '歐洲', country: '丹麥', place: '哥本哈根', path: '丹麥/哥本哈根', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CPH' },
  { id: 'se_stockholm', region: '歐洲', country: '瑞典', place: '斯德哥爾摩', path: '瑞典/斯德哥爾摩', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ARN' },
  { id: 'fi_helsinki', region: '歐洲', country: '芬蘭', place: '赫爾辛基', path: '芬蘭/赫爾辛基', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HEL' },
  { id: 'no_oslo', region: '歐洲', country: '挪威', place: '奧斯陸', path: '挪威/奧斯陸', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'OSL' },
  { id: 'no_tromso', region: '歐洲', country: '挪威', place: '特羅姆瑟', path: '挪威/特羅姆瑟', guideUrl: 'https://travel-guide-tw.github.io/%E6%8C%AA%E5%A8%81/%E7%89%B9%E7%BE%85%E5%A7%86%E7%91%9F', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TOS' },
  { id: 'ie_dublin', region: '歐洲', country: '愛爾蘭', place: '都柏林', path: '愛爾蘭/都柏林', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DUB' },
  { id: 'pl_warsaw', region: '歐洲', country: '波蘭', place: '華沙', path: '波蘭/華沙', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'WAW' },

  // 美洲
  { id: 'us_new_york_jfk', region: '美洲', country: '美國', place: '紐約/甘迺迪', path: '美國/紐約', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'JFK' },
  { id: 'us_new_york_ewr', region: '美洲', country: '美國', place: '紐約/紐華克', path: '美國/紐約', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'EWR' },
  { id: 'us_los_angeles', region: '美洲', country: '美國', place: '洛杉磯', path: '美國/洛杉磯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LAX' },
  { id: 'us_san_francisco', region: '美洲', country: '美國', place: '舊金山', path: '美國/舊金山', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SFO' },
  { id: 'us_seattle', region: '美洲', country: '美國', place: '西雅圖', path: '美國/西雅圖', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SEA' },
  { id: 'us_chicago', region: '美洲', country: '美國', place: '芝加哥/歐海爾', path: '美國/芝加哥', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ORD' },
  { id: 'us_atlanta', region: '美洲', country: '美國', place: '亞特蘭大', path: '美國/亞特蘭大', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ATL' },
  { id: 'us_miami', region: '美洲', country: '美國', place: '邁阿密', path: '美國/邁阿密', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MIA' },
  { id: 'us_houston', region: '美洲', country: '美國', place: '休士頓', path: '美國/休士頓', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'IAH' },
  { id: 'us_dallas', region: '美洲', country: '美國', place: '達拉斯', path: '美國/達拉斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DFW' },
  { id: 'us_las_vegas', region: '美洲', country: '美國', place: '拉斯維加斯', path: '美國/拉斯維加斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LAS' },
  { id: 'us_boston', region: '美洲', country: '美國', place: '波士頓', path: '美國/波士頓', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BOS' },
  { id: 'us_honolulu', region: '美洲', country: '美國', place: '檀香山', path: '美國/夏威夷/檀香山', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'HNL' },
  
  { id: 'ca_vancouver', region: '美洲', country: '加拿大', place: '溫哥華', path: '加拿大/溫哥華', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'YVR' },
  { id: 'ca_toronto', region: '美洲', country: '加拿大', place: '多倫多', path: '加拿大/多倫多', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'YYZ' },
  { id: 'ca_montreal', region: '美洲', country: '加拿大', place: '蒙特婁', path: '加拿大/蒙特婁', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'YUL' },
  { id: 'ca_calgary', region: '美洲', country: '加拿大', place: '卡加利', path: '加拿大/卡加利', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'YYC' },

  { id: 'mx_mexico_city', region: '美洲', country: '墨西哥', place: '墨西哥城', path: '墨西哥/墨西哥城', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MEX' },
  { id: 'mx_cancun', region: '美洲', country: '墨西哥', place: '坎昆', path: '墨西哥/坎昆', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CUN' },
  
  { id: 'br_sao_paulo', region: '美洲', country: '巴西', place: '聖保羅', path: '巴西/聖保羅', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'GRU' },
  { id: 'br_rio', region: '美洲', country: '巴西', place: '里約熱內盧', path: '巴西/里約熱內盧', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'GIG' },
  { id: 'ar_buenos_aires', region: '美洲', country: '阿根廷', place: '布宜諾斯艾利斯', path: '阿根廷/布宜諾斯艾利斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'EZE' },
  { id: 'cl_santiago', region: '美洲', country: '智利', place: '聖地亞哥', path: '智利/聖地亞哥', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SCL' },
  { id: 'pe_lima', region: '美洲', country: '秘魯', place: '利馬', path: '秘魯/利馬', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'LIM' },
  { id: 'co_bogota', region: '美洲', country: '哥倫比亞', place: '波哥大', path: '哥倫比亞/波哥大', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BOG' },

  // 大洋洲
  { id: 'au_sydney', region: '大洋洲', country: '澳洲', place: '雪梨', path: '澳洲/雪梨', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SYD' },
  { id: 'au_melbourne', region: '大洋洲', country: '澳洲', place: '墨爾本', path: '澳洲/墨爾本', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'MEL' },
  { id: 'au_brisbane', region: '大洋洲', country: '澳洲', place: '布里斯本', path: '澳洲/布里斯本', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'BNE' },
  { id: 'au_perth', region: '大洋洲', country: '澳洲', place: '伯斯', path: '澳洲/伯斯', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'PER' },
  { id: 'au_adelaide', region: '大洋洲', country: '澳洲', place: '阿德雷德', path: '澳洲/阿德雷德', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ADL' },
  { id: 'au_gold_coast', region: '大洋洲', country: '澳洲', place: '黃金海岸', path: '澳洲/黃金海岸', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'OOL' },
  { id: 'nz_auckland', region: '大洋洲', country: '紐西蘭', place: '奧克蘭', path: '紐西蘭/奧克蘭', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'AKL' },
  { id: 'nz_christchurch', region: '大洋洲', country: '紐西蘭', place: '基督城', path: '紐西蘭/基督城', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CHC' },
  { id: 'nz_wellington', region: '大洋洲', country: '紐西蘭', place: '威靈頓', path: '紐西蘭/威靈頓', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'WLG' },
  { id: 'nz_queenstown', region: '大洋洲', country: '紐西蘭', place: '皇后鎮', path: '紐西蘭/皇后鎮', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'ZQN' },
  { id: 'fj_nadi', region: '大洋洲', country: '斐濟', place: '納迪', path: '斐濟/納迪', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NAN' },

  // 中東 & 非洲
  { id: 'ae_dubai', region: '中東', country: '阿拉伯聯合大公國', place: '杜拜', path: '阿聯酋/杜拜', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DXB' },
  { id: 'ae_abu_dhabi', region: '中東', country: '阿拉伯聯合大公國', place: '阿布達比', path: '阿聯酋/阿布達比', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'AUH' },
  { id: 'tr_istanbul_ist', region: '中東', country: '土耳其', place: '伊斯坦堡', path: '土耳其/伊斯坦堡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'IST' },
  { id: 'tr_istanbul_saw', region: '中東', country: '土耳其', place: '伊斯坦堡/薩比哈', path: '土耳其/伊斯坦堡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'SAW' },
  { id: 'qa_doha', region: '中東', country: '卡達', place: '杜哈', path: '卡達/杜哈', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'DOH' },
  { id: 'il_tel_aviv', region: '中東', country: '以色列', place: '特拉維夫', path: '以色列/特拉維夫', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'TLV' },
  { id: 'sa_riyadh', region: '中東', country: '沙烏地阿拉伯', place: '利雅德', path: '沙烏地阿拉伯/利雅德', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'RUH' },
  { id: 'sa_jeddah', region: '中東', country: '沙烏地阿拉伯', place: '吉達', path: '沙烏地阿拉伯/吉達', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'JED' },
  { id: 'eg_cairo', region: '中東', country: '埃及', place: '開羅', path: '埃及/開羅', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CAI' },
  { id: 'za_johannesburg', region: '中東', country: '南非', place: '約翰尼斯堡', path: '南非/約翰尼斯堡', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'JNB' },
  { id: 'za_cape_town', region: '中東', country: '南非', place: '開普敦', path: '南非/開普敦', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CPT' },
  { id: 'ke_nairobi', region: '中東', country: '肯亞', place: '奈洛比', path: '肯亞/奈洛比', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'NBO' },
  { id: 'ma_casablanca', region: '中東', country: '摩洛哥', place: '卡薩布蘭加', path: '摩洛哥/卡薩布蘭加', guideUrl: '#', sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io', searchAlias: 'CMN' },
];

export function matchTravelDestinations(query: string, region: string | '全部地區'): TravelGuideDestination[] {
  const normalized = query.trim().toLowerCase();
  const byRegion = region === '全部地區'
    ? TRAVEL_GUIDE_DESTINATIONS
    : TRAVEL_GUIDE_DESTINATIONS.filter((item) => item.region === region);

  if (!normalized) {
    return byRegion.slice(0, 50);
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
    .slice(0, 30);
}
