import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_API_URL =
  'https://api.github.com/repos/travel-guide-tw/travel-guide-tw.github.io/git/trees/main?recursive=1';
const GUIDE_SITE_BASE_URL = 'https://travel-guide-tw.github.io';

const CATEGORY_NAMES = new Set([
  '景點',
  '活動',
  '美食',
  '住宿',
  '購物',
  '交通',
  '交通指南',
  '_交通',
  '_其他',
  '_注意事項',
  '_旅遊須知',
  '其他',
]);

const REGION_BY_COUNTRY = {
  // Asia - East
  日本: '亞洲',
  台灣: '亞洲',
  中國: '亞洲',
  香港: '亞洲',
  澳門: '亞洲',
  韓國: '亞洲',
  蒙古: '亞洲',

  // Asia - Southeast
  泰國: '亞洲',
  越南: '亞洲',
  菲律賓: '亞洲',
  印尼: '亞洲',
  馬來西亞: '亞洲',
  新加坡: '亞洲',
  緬甸: '亞洲',
  柬埔寨: '亞洲',
  寮國: '亞洲',
  汶萊: '亞洲',
  東帝汶: '亞洲',

  // Asia - South
  印度: '亞洲',
  尼泊爾: '亞洲',
  斯里蘭卡: '亞洲',
  馬爾地夫: '亞洲',
  不丹: '亞洲',
  孟加拉: '亞洲',
  巴基斯坦: '亞洲',

  // Asia - Central
  哈薩克: '亞洲',
  烏茲別克: '亞洲',
  吉爾吉斯: '亞洲',
  塔吉克: '亞洲',
  土庫曼: '亞洲',

  // Middle East
  阿聯酋: '中東',
  卡達: '中東',
  沙烏地阿拉伯: '中東',
  土耳其: '中東',
  以色列: '中東',
  約旦: '中東',
  科威特: '中東',
  巴林: '中東',
  阿曼: '中東',
  黎巴嫩: '中東',
  伊朗: '中東',
  亞塞拜然: '中東',
  喬治亞: '中東',
  亞美尼亞: '中東',

  // Europe - Western
  英國: '歐洲',
  法國: '歐洲',
  德國: '歐洲',
  荷蘭: '歐洲',
  比利時: '歐洲',
  盧森堡: '歐洲',
  瑞士: '歐洲',
  奧地利: '歐洲',
  義大利: '歐洲',
  西班牙: '歐洲',
  葡萄牙: '歐洲',
  愛爾蘭: '歐洲',

  // Europe - Northern
  挪威: '歐洲',
  瑞典: '歐洲',
  芬蘭: '歐洲',
  丹麥: '歐洲',
  冰島: '歐洲',
  愛沙尼亞: '歐洲',
  拉脫維亞: '歐洲',
  立陶宛: '歐洲',

  // Europe - Eastern & Central
  捷克: '歐洲',
  斯洛伐克: '歐洲',
  波蘭: '歐洲',
  匈牙利: '歐洲',
  羅馬尼亞: '歐洲',
  保加利亞: '歐洲',
  烏克蘭: '歐洲',
  俄羅斯: '歐洲',

  // Europe - Southern & Balkans
  希臘: '歐洲',
  克羅埃西亞: '歐洲',
  斯洛維尼亞: '歐洲',
  蒙特內哥羅: '歐洲',
  波士尼亞: '歐洲',
  塞爾維亞: '歐洲',
  阿爾巴尼亞: '歐洲',
  北馬其頓: '歐洲',
  科索沃: '歐洲',
  馬耳他: '歐洲',
  賽普勒斯: '歐洲',
  摩納哥: '歐洲',

  // North America
  美國: '北美洲',
  加拿大: '北美洲',
  墨西哥: '北美洲',
  古巴: '北美洲',
  牙買加: '北美洲',
  多明尼加: '北美洲',

  // Central America
  哥斯大黎加: '中美洲',
  巴拿馬: '中美洲',
  瓜地馬拉: '中美洲',
  貝里斯: '中美洲',
  宏都拉斯: '中美洲',
  薩爾瓦多: '中美洲',
  尼加拉瓜: '中美洲',

  // South America
  巴西: '南美洲',
  阿根廷: '南美洲',
  智利: '南美洲',
  祕魯: '南美洲',
  哥倫比亞: '南美洲',
  厄瓜多: '南美洲',
  玻利維亞: '南美洲',
  烏拉圭: '南美洲',
  巴拉圭: '南美洲',
  委內瑞拉: '南美洲',

  // Oceania
  澳洲: '大洋洲',
  紐西蘭: '大洋洲',
  斐濟: '大洋洲',
  關島: '大洋洲',
  帛琉: '大洋洲',
  塞班: '大洋洲',
  夏威夷: '大洋洲',
  大溪地: '大洋洲',
  薩摩亞: '大洋洲',

  // Africa
  南非: '非洲',
  埃及: '非洲',
  摩洛哥: '非洲',
  肯亞: '非洲',
  坦尚尼亞: '非洲',
  衣索比亞: '非洲',
  突尼西亞: '非洲',
  奈及利亞: '非洲',
  迦納: '非洲',
  塞內加爾: '非洲',
  馬達加斯加: '非洲',
  模里西斯: '非洲',
  尚比亞: '非洲',
  辛巴威: '非洲',
  波札那: '非洲',
  納米比亞: '非洲',
  盧安達: '非洲',
  烏干達: '非洲',
};

const SEARCH_ALIAS_BY_PLACE = {
  // Japan
  東京: 'NRT',
  羽田: 'HND',
  成田: 'NRT',
  大阪: 'KIX',
  關西: 'KIX',
  京都: 'KIX',
  奈良: 'KIX',
  神戶: 'UKB',
  福岡: 'FUK',
  札幌: 'CTS',
  千歲: 'CTS',
  函館: 'HKD',
  旭川: 'AKJ',
  稚內: 'WKJ',
  釧路: 'KUH',
  帶廣: 'OBO',
  名古屋: 'NGO',
  沖繩: 'OKA',
  那霸: 'OKA',
  仙台: 'SDJ',
  廣島: 'HIJ',
  高松: 'TAK',
  鹿兒島: 'KOJ',
  長崎: 'NGS',
  大分: 'OIT',
  宮崎: 'KMI',
  金澤: 'KMQ',
  富山: 'TOY',
  新潟: 'KIJ',
  松山: 'MYJ',

  // Taiwan
  台北: 'TPE',
  桃園: 'TPE',
  高雄: 'KHH',
  台中: 'RMQ',
  台南: 'TNN',
  花蓮: 'HUN',
  澎湖: 'MZG',
  金門: 'KNH',
  馬祖: 'LZN',

  // China
  上海: 'PVG',
  北京: 'PEK',
  廣州: 'CAN',
  成都: 'CTU',
  深圳: 'SZX',
  重慶: 'CKG',
  西安: 'XIY',
  杭州: 'HGH',
  南京: 'NKG',
  昆明: 'KMG',
  青島: 'TAO',
  廈門: 'XMN',
  武漢: 'WUH',
  三亞: 'SYX',
  麗江: 'LJG',
  桂林: 'KWL',
  海口: 'HAK',
  南寧: 'NNG',
  天津: 'TSN',
  哈爾濱: 'HRB',
  長春: 'CGQ',
  瀋陽: 'SHE',
  大連: 'DLC',
  烏魯木齊: 'URC',
  張家界: 'DYG',
  貴陽: 'KWE',
  長沙: 'CSX',
  鄭州: 'CGO',
  福州: 'FOC',
  南昌: 'KHN',
  合肥: 'HFE',
  石家莊: 'SJW',
  太原: 'TYN',
  蘭州: 'LHW',
  西寧: 'XNN',
  銀川: 'INC',
  呼和浩特: 'HET',
  拉薩: 'LXA',
  九寨溝: 'JZH',
  西雙版納: 'JHG',

  // Korea
  首爾: 'ICN',
  仁川: 'ICN',
  釜山: 'PUS',
  濟州: 'CJU',
  大邱: 'TAE',
  光州: 'KWJ',
  清州: 'CJJ',

  // Hong Kong / Macau
  香港: 'HKG',
  澳門: 'MFM',

  // Southeast Asia - Thailand
  曼谷: 'BKK',
  蘇凡納布: 'BKK',
  清邁: 'CNX',
  普吉: 'HKT',
  喀比: 'KBV',
  蘇梅島: 'USM',
  清萊: 'CEI',
  芭達雅: 'UTP',
  合艾: 'HDY',

  // Southeast Asia - Vietnam
  河內: 'HAN',
  胡志明市: 'SGN',
  峴港: 'DAD',
  富國島: 'PQC',
  芽莊: 'CXR',
  大叻: 'DLI',
  順化: 'HUI',

  // Southeast Asia - Malaysia
  吉隆坡: 'KUL',
  檳城: 'PEN',
  蘭卡威: 'LGK',
  亞庇: 'BKI',
  古晉: 'KCH',
  沙巴: 'BKI',

  // Southeast Asia - Indonesia
  雅加達: 'CGK',
  峇里島: 'DPS',
  日惹: 'JOG',
  龍目島: 'LOP',
  泗水: 'SUB',
  棉蘭: 'KNO',
  望加錫: 'UPG',
  科摩多: 'LBJ',

  // Southeast Asia - Philippines
  馬尼拉: 'MNL',
  宿霧: 'CEB',
  長灘島: 'MPH',
  巴拉望: 'PPS',
  達沃: 'DVO',
  卡加延德奧羅: 'CGY',

  // Southeast Asia - Singapore
  新加坡: 'SIN',

  // Southeast Asia - Others
  仰光: 'RGN',
  曼德勒: 'MDL',
  金邊: 'PNH',
  暹粒: 'REP',
  永珍: 'VTE',
  琅勃拉邦: 'LPQ',

  // South Asia
  德里: 'DEL',
  孟買: 'BOM',
  班加羅爾: 'BLR',
  清奈: 'MAA',
  海德拉巴: 'HYD',
  果阿: 'GOI',
  科欽: 'COK',
  加德滿都: 'KTM',
  科倫坡: 'CMB',
  馬列: 'MLE',

  // Middle East
  杜拜: 'DXB',
  阿布達比: 'AUH',
  多哈: 'DOH',
  伊斯坦堡: 'IST',
  利雅德: 'RUH',
  吉達: 'JED',
  安曼: 'AMM',
  科威特城: 'KWI',
  馬斯喀特: 'MCT',
  特拉維夫: 'TLV',
  貝魯特: 'BEY',
  貝拉: 'BAH',
  第比利斯: 'TBS',
  巴庫: 'GYD',
  葉里溫: 'EVN',

  // Central Asia
  阿拉木圖: 'ALA',
  塔什干: 'TAS',
  撒馬爾罕: 'SKD',
  比斯凱克: 'FRU',

  // Europe - British Isles
  倫敦: 'LHR',
  愛丁堡: 'EDI',
  曼徹斯特: 'MAN',
  都柏林: 'DUB',

  // Europe - France
  巴黎: 'CDG',
  尼斯: 'NCE',
  里昂: 'LYS',
  馬賽: 'MRS',
  波爾多: 'BOD',
  史特拉斯堡: 'SXB',

  // Europe - Germany
  法蘭克福: 'FRA',
  慕尼黑: 'MUC',
  柏林: 'BER',
  漢堡: 'HAM',
  杜塞道夫: 'DUS',
  斯圖加特: 'STR',
  科隆: 'CGN',

  // Europe - Benelux & Switzerland
  阿姆斯特丹: 'AMS',
  布魯塞爾: 'BRU',
  蘇黎世: 'ZRH',
  日內瓦: 'GVA',
  維也納: 'VIE',
  薩爾茲堡: 'SZG',

  // Europe - Iberian Peninsula
  馬德里: 'MAD',
  巴塞隆納: 'BCN',
  塞維亞: 'SVQ',
  瓦倫西亞: 'VLC',
  里斯本: 'LIS',
  波爾圖: 'OPO',

  // Europe - Italy
  羅馬: 'FCO',
  米蘭: 'MXP',
  威尼斯: 'VCE',
  佛羅倫斯: 'FLR',
  那不勒斯: 'NAP',
  波隆那: 'BLQ',
  西西里: 'PMO',
  薩丁尼亞: 'CAG',

  // Europe - Nordic
  哥本哈根: 'CPH',
  斯德哥爾摩: 'ARN',
  赫爾辛基: 'HEL',
  奧斯陸: 'OSL',
  雷克雅維克: 'KEF',

  // Europe - Eastern & Central
  布拉格: 'PRG',
  布達佩斯: 'BUD',
  華沙: 'WAW',
  克拉科夫: 'KRK',
  布加勒斯特: 'OTP',
  索菲亞: 'SOF',
  塔林: 'TLL',
  里加: 'RIX',
  維爾紐斯: 'VNO',

  // Europe - Balkans
  雅典: 'ATH',
  薩格勒布: 'ZAG',
  盧布爾雅那: 'LJU',
  杜布羅夫尼克: 'DBV',
  斯普利特: 'SPU',
  貝爾格勒: 'BEG',
  科托爾: 'TIV',
  提拉納: 'TIA',
  史高比耶: 'SKP',

  // Europe - Islands
  聖托里尼: 'JTR',
  米科諾斯: 'JMK',
  克里特: 'HER',
  馬耳他: 'MLA',

  // Russia
  莫斯科: 'SVO',
  聖彼得堡: 'LED',

  // Americas - USA
  紐約: 'JFK',
  洛杉磯: 'LAX',
  舊金山: 'SFO',
  西雅圖: 'SEA',
  芝加哥: 'ORD',
  拉斯維加斯: 'LAS',
  邁阿密: 'MIA',
  奧蘭多: 'MCO',
  波士頓: 'BOS',
  華盛頓: 'IAD',
  夏威夷: 'HNL',
  火奴魯魯: 'HNL',
  達拉斯: 'DFW',
  休士頓: 'IAH',
  亞特蘭大: 'ATL',
  丹佛: 'DEN',
  鳳凰城: 'PHX',
  聖地牙哥: 'SAN',
  紐奧良: 'MSY',
  阿拉斯加: 'ANC',

  // Americas - Canada
  溫哥華: 'YVR',
  多倫多: 'YYZ',
  蒙特婁: 'YUL',
  卡加利: 'YYC',
  渥太華: 'YOW',
  魁北克城: 'YQB',
  艾德蒙頓: 'YEG',

  // Americas - Mexico & Central/South
  墨西哥城: 'MEX',
  坎昆: 'CUN',
  聖保羅: 'GRU',
  里約: 'GIG',
  布宜諾斯艾利斯: 'EZE',
  利馬: 'LIM',
  波哥大: 'BOG',
  聖地亞哥: 'SCL',
  基多: 'UIO',
  聖何塞: 'SJO',
  巴拿馬城: 'PTY',
  哈瓦那: 'HAV',

  // Oceania - Australia
  雪梨: 'SYD',
  墨爾本: 'MEL',
  布里斯本: 'BNE',
  黃金海岸: 'OOL',
  凱恩斯: 'CNS',
  阿德萊德: 'ADL',
  伯斯: 'PER',
  達爾文: 'DRW',
  坎培拉: 'CBR',

  // Oceania - New Zealand & Pacific
  奧克蘭: 'AKL',
  基督城: 'CHC',
  惠靈頓: 'WLG',
  皇后鎮: 'ZQN',
  關島: 'GUM',
  塞班: 'SPN',
  帛琉: 'ROR',
  大溪地: 'PPT',
  斐濟: 'NAN',
  庫克群島: 'RAR',

  // Africa
  開羅: 'CAI',
  約翰尼斯堡: 'JNB',
  開普敦: 'CPT',
  馬拉喀什: 'RAK',
  奈洛比: 'NBO',
  達累斯薩拉姆: 'DAR',
  亞的斯亞貝巴: 'ADD',
  突尼斯: 'TUN',
  拉各斯: 'LOS',
  阿克拉: 'ACC',
  路薩卡: 'LUN',
  哈拉雷: 'HRE',
  溫得和克: 'WDH',
  盧安達: 'KGL',
  安塔那那利佛: 'TNR',
  路易港: 'MRU',
};

const COUNTRY_DEFAULT_SEARCH_ALIAS = {
  // Asia - East
  日本: 'NRT',
  台灣: 'TPE',
  中國: 'PVG',
  韓國: 'ICN',
  香港: 'HKG',
  澳門: 'MFM',
  蒙古: 'ULN',

  // Asia - Southeast
  泰國: 'BKK',
  越南: 'SGN',
  菲律賓: 'MNL',
  印尼: 'CGK',
  馬來西亞: 'KUL',
  新加坡: 'SIN',
  緬甸: 'RGN',
  柬埔寨: 'PNH',
  寮國: 'VTE',
  汶萊: 'BWN',

  // Asia - South
  印度: 'DEL',
  尼泊爾: 'KTM',
  斯里蘭卡: 'CMB',
  馬爾地夫: 'MLE',
  孟加拉: 'DAC',
  巴基斯坦: 'KHI',

  // Asia - Central
  哈薩克: 'ALA',
  烏茲別克: 'TAS',
  吉爾吉斯: 'FRU',
  塔吉克: 'DYU',

  // Middle East
  阿聯酋: 'DXB',
  卡達: 'DOH',
  沙烏地阿拉伯: 'RUH',
  土耳其: 'IST',
  以色列: 'TLV',
  約旦: 'AMM',
  科威特: 'KWI',
  巴林: 'BAH',
  阿曼: 'MCT',
  黎巴嫩: 'BEY',
  亞塞拜然: 'GYD',
  喬治亞: 'TBS',
  亞美尼亞: 'EVN',

  // Europe
  英國: 'LHR',
  法國: 'CDG',
  德國: 'FRA',
  荷蘭: 'AMS',
  比利時: 'BRU',
  瑞士: 'ZRH',
  奧地利: 'VIE',
  義大利: 'FCO',
  西班牙: 'MAD',
  葡萄牙: 'LIS',
  愛爾蘭: 'DUB',
  挪威: 'OSL',
  瑞典: 'ARN',
  芬蘭: 'HEL',
  丹麥: 'CPH',
  冰島: 'KEF',
  愛沙尼亞: 'TLL',
  拉脫維亞: 'RIX',
  立陶宛: 'VNO',
  捷克: 'PRG',
  斯洛伐克: 'BTS',
  波蘭: 'WAW',
  匈牙利: 'BUD',
  羅馬尼亞: 'OTP',
  保加利亞: 'SOF',
  烏克蘭: 'KBP',
  俄羅斯: 'SVO',
  希臘: 'ATH',
  克羅埃西亞: 'ZAG',
  斯洛維尼亞: 'LJU',
  塞爾維亞: 'BEG',
  馬耳他: 'MLA',
  賽普勒斯: 'LCA',

  // Americas
  美國: 'JFK',
  加拿大: 'YYZ',
  墨西哥: 'MEX',
  古巴: 'HAV',
  哥斯大黎加: 'SJO',
  巴拿馬: 'PTY',
  巴西: 'GRU',
  阿根廷: 'EZE',
  智利: 'SCL',
  祕魯: 'LIM',
  哥倫比亞: 'BOG',
  厄瓜多: 'UIO',

  // Oceania
  澳洲: 'SYD',
  紐西蘭: 'AKL',
  斐濟: 'NAN',
  關島: 'GUM',
  帛琉: 'ROR',

  // Africa
  南非: 'JNB',
  埃及: 'CAI',
  摩洛哥: 'RAK',
  肯亞: 'NBO',
  坦尚尼亞: 'DAR',
  衣索比亞: 'ADD',
  突尼西亞: 'TUN',
  奈及利亞: 'LOS',
  模里西斯: 'MRU',
};

function hashCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function encodePathForUrl(rawPath) {
  return rawPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function normalizeRecord(pathInDocs) {
  if (!pathInDocs.endsWith('.md')) return null;
  if (pathInDocs === 'index.md' || pathInDocs.endsWith('/AGENTS.md')) return null;

  const parts = pathInDocs.split('/');
  if (parts.length < 3) return null;

  const country = parts[0];
  if (country.startsWith('_')) return null;

  const dirs = parts.slice(1, -1);
  const filteredDirs = dirs.filter(
    (segment) => !segment.startsWith('_') && !CATEGORY_NAMES.has(segment),
  );

  if (filteredDirs.length === 0) return null;

  const place = filteredDirs[filteredDirs.length - 1];
  const placePath = [country, ...filteredDirs].join('/');
  const region = REGION_BY_COUNTRY[country] ?? '其他';
  const searchAlias =
    SEARCH_ALIAS_BY_PLACE[place] ??
    COUNTRY_DEFAULT_SEARCH_ALIAS[country] ??
    null;

  return {
    id: `tg_${hashCode(`${country}/${placePath}`).toString(36)}`,
    region,
    country,
    place,
    path: placePath,
    guideUrl: `${GUIDE_SITE_BASE_URL}/${encodePathForUrl(placePath)}`,
    sourceRepo: 'travel-guide-tw/travel-guide-tw.github.io',
    searchAlias,
  };
}

function dedupeRecords(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.country}::${record.place}`;
    const existed = byKey.get(key);
    if (!existed || record.path.length < existed.path.length) {
      byKey.set(key, record);
    }
  }
  return [...byKey.values()];
}

async function fetchDocsTree() {
  const response = await fetch(REPO_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'RoamJellyBot/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.tree)) {
    throw new Error('Unexpected GitHub API payload');
  }

  return payload.tree
    .filter((entry) => entry && entry.type === 'blob' && typeof entry.path === 'string')
    .map((entry) => entry.path)
    .filter((repoPath) => repoPath.startsWith('docs/') && repoPath.endsWith('.md'))
    .map((repoPath) => repoPath.slice('docs/'.length));
}

function buildOutputFile(records) {
  const regionList = [...new Set(records.map((item) => item.region))];

  const content = `/* AUTO-GENERATED FILE. DO NOT EDIT BY HAND.\n * Source: travel-guide-tw/travel-guide-tw.github.io\n * Regenerate with: npm run sync:travel-guide\n */\n\nexport interface TravelGuideDestination {\n  id: string;\n  region: string;\n  country: string;\n  place: string;\n  path: string;\n  guideUrl: string;\n  sourceRepo: string;\n  searchAlias: string | null;\n}\n\nexport const TRAVEL_GUIDE_SOURCE_REPO = 'travel-guide-tw/travel-guide-tw.github.io';\n\nexport const TRAVEL_GUIDE_REGIONS = ${JSON.stringify(regionList, null, 2)} as const;\n\nexport const TRAVEL_GUIDE_DESTINATIONS: TravelGuideDestination[] = ${JSON.stringify(records, null, 2)};\n`;

  return content;
}

async function run() {
  const docsPaths = await fetchDocsTree();
  const rawRecords = docsPaths
    .map((docsPath) => normalizeRecord(docsPath))
    .filter(Boolean);

  const deduped = dedupeRecords(rawRecords)
    .sort((a, b) => {
      const regionCompare = a.region.localeCompare(b.region, 'zh-Hant');
      if (regionCompare !== 0) return regionCompare;
      const countryCompare = a.country.localeCompare(b.country, 'zh-Hant');
      if (countryCompare !== 0) return countryCompare;
      return a.place.localeCompare(b.place, 'zh-Hant');
    });

  const outputContent = buildOutputFile(deduped);

  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const outputPath = path.join(rootDir, 'src', 'data', 'travelGuideDestinations.ts');

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, outputContent, 'utf8');

  console.log(`Generated ${deduped.length} destinations -> ${outputPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
