import * as playwrightCore from 'playwright-core';
import chromiumSparticuz from '@sparticuz/chromium';

// Ensure Vercel node-file-trace includes playwright by statically referencing it
try { require('playwright'); } catch {}

export interface FlightData {
  id: string;
  type: 'flight';
  provider: string;
  title: string;
  price: number;
  currency: string;
  emoji: string;
  affiliate_url: string;
  /** 'oneway' (default) or 'roundtrip' */
  tripType?: 'oneway' | 'roundtrip';
  details: {
    airline: string;
    departure: string;
    arrival: string;
    stops: number;
    duration: string;
  };
  /** Populated only when tripType === 'roundtrip' */
  returnLeg?: {
    airline: string;
    departure: string;
    arrival: string;
    stops: number;
    duration: string;
  };
}

/** Random sleep between min~max ms */
function sleep(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate a human-like mouse path from (x1,y1) to (x2,y2)
 * using small random jitter steps.
 */
async function humanMouseMove(
  page: playwrightCore.Page,
  x1: number, y1: number,
  x2: number, y2: number,
) {
  const steps = 8 + Math.floor(Math.random() * 12);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const jx = (Math.random() - 0.5) * 6;
    const jy = (Math.random() - 0.5) * 6;
    await page.mouse.move(x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t + jy);
    await sleep(8, 25);
  }
}

/**
 * Comprehensive anti-detection init script injected before every page load.
 * Covers: webdriver flag, plugins, languages, canvas fingerprint,
 * permission API, and Chrome automation indicator symbols.
 */
const STEALTH_SCRIPT = `
(function () {
  // 1. Remove webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. Spoof realistic Chrome plugins
  const fakePlugins = [
    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
  ];
  Object.defineProperty(navigator, 'plugins', {
    get: () => Object.assign(fakePlugins, { item: (i) => fakePlugins[i], namedItem: (n) => fakePlugins.find(p => p.name === n) || null, length: fakePlugins.length }),
  });

  // 3. Languages
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-TW', 'zh', 'en-US', 'en'] });

  // 4. Subtle canvas noise to randomise fingerprint
  const _getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const ctx = _getContext.call(this, type, ...args);
    if (type === '2d' && ctx) {
      const _fill = ctx.fillText.bind(ctx);
      ctx.fillText = function (...a) { ctx.shadowBlur = Math.random() * 0.005; return _fill(...a); };
    }
    return ctx;
  };

  // 5. Patch permissions API (avoid 'denied' leaks)
  const _query = window.navigator.permissions && window.navigator.permissions.query.bind(window.navigator.permissions);
  if (_query) {
    window.navigator.permissions.query = (p) =>
      p.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission, onchange: null })
        : _query(p);
  }

  // 6. Remove cdc_ automation markers injected by some drivers
  const toDel = Object.keys(window).filter(k => k.startsWith('cdc_'));
  toDel.forEach(k => { try { delete (window as any)[k]; } catch {} });

  // 7. Spoof screen/hardware concurrency
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  Object.defineProperty(screen, 'colorDepth', { get: () => 24 });

  // 8. Spoof chrome runtime (expected by Trip.com JS checks)
  if (!window.chrome) {
    (window as any).chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };
  }

  // 9. Hide headless indicators in navigator
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
  Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });

  // 10. Remove HeadlessChrome from UA reported via JS (if overridden at network layer)
  const originalUAData = (navigator as any).userAgentData;
  if (originalUAData) {
    try {
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({
          ...originalUAData,
          brands: [
            { brand: 'Chromium', version: '124' },
            { brand: 'Google Chrome', version: '124' },
          ],
          mobile: false,
          platform: 'macOS',
        }),
      });
    } catch {}
  }
})();
`;

const IATA_MAP: Record<string, string> = {
  // ── 台灣 Taiwan ──────────────────────────────────────────────────────────
  '台北': 'tpe',
  '桃園': 'tpe',
  '台北/桃園': 'tpe',
  '桃園國際': 'tpe',
  'taipei': 'tpe',
  'taoyuan': 'tpe',
  '松山': 'tsa',
  '台北/松山': 'tsa',
  '台北松山': 'tsa',
  'songshan': 'tsa',
  '高雄': 'khh',
  '高雄國際': 'khh',
  'kaohsiung': 'khh',
  '台中': 'rmq',
  '台中清泉崗': 'rmq',
  'taichung': 'rmq',
  '台南': 'tnn',
  'tainan': 'tnn',
  '花蓮': 'hun',
  'hualien': 'hun',
  '台東': 'ttt',
  'taitung': 'ttt',
  '澎湖': 'mzg',
  '馬公': 'mzg',
  'penghu': 'mzg',
  '金門': 'kmq',
  'kinmen': 'kmq',
  '馬祖': 'lzn',
  '南竿': 'lzn',
  'matsu': 'lzn',

  // ── 日本 Japan ───────────────────────────────────────────────────────────
  '東京': 'tyo',
  '成田': 'nrt',
  '羽田': 'hnd',
  '東京/成田': 'nrt',
  '東京/羽田': 'hnd',
  'tokyo': 'tyo',
  'narita': 'nrt',
  'haneda': 'hnd',
  '大阪': 'osa',
  '關西': 'kix',
  '大阪/關西': 'kix',
  '大阪/伊丹': 'itm',
  '伊丹': 'itm',
  'osaka': 'osa',
  'kansai': 'kix',
  'itami': 'itm',
  '沖繩': 'oka',
  '那霸': 'oka',
  '沖繩/那霸': 'oka',
  'okinawa': 'oka',
  'naha': 'oka',
  '石垣島': 'ishigaki',
  '石垣': 'ishigaki',
  '宮古島': 'mmx',
  '宮古': 'mmx',
  '福岡': 'fuk',
  'fukuoka': 'fuk',
  '札幌': 'cts',
  '新千歲': 'cts',
  '北海道': 'cts',
  'sapporo': 'cts',
  'chitose': 'cts',
  '名古屋': 'ngo',
  '中部': 'ngo',
  'nagoya': 'ngo',
  '仙台': 'sdj',
  'sendai': 'sdj',
  '廣島': 'hij',
  'hiroshima': 'hij',
  '小松': 'kmq',
  'komatsu': 'kmq',
  '熊本': 'kmj',
  'kumamoto': 'kmj',
  '函館': 'hkd',
  'hakodate': 'hkd',
  '高松(日本)': 'tak',
  'takamatsu': 'tak',
  '長崎': 'ngs',
  'nagasaki': 'ngs',
  '鹿兒島': 'koj',
  'kagoshima': 'koj',
  '宮崎': 'kmi',
  'miyazaki': 'kmi',
  '大分': 'oita',
  'oita': 'oita',
  '松山(日本)': 'myt',
  '富山': 'toyama',
  '旭川': 'akj',
  'asahikawa': 'akj',
  '釧路': 'kushiro',
  '帶廣': 'obihiro',
  '高知': 'kochi',
  '鳥取': 'tottori',
  '山形': 'gaj',
  '秋田': 'akita',
  '青森': 'aomori',
  '岡山': 'oka2',
  '米子': 'yonago',
  '山口宇部': 'ube',
  '奄美大島': 'amm',
  '屋久島': 'yakushima',

  // ── 韓國 Korea ───────────────────────────────────────────────────────────
  '首爾': 'sel',
  '仁川': 'icn',
  '首爾/仁川': 'icn',
  '金浦': 'gmp',
  '首爾/金浦': 'gmp',
  'seoul': 'sel',
  'incheon': 'icn',
  'gimpo': 'gmp',
  '釜山': 'pus',
  '金海': 'pus',
  'busan': 'pus',
  '濟州': 'cju',
  'jeju': 'cju',
  '大邱': 'tae',
  'daegu': 'tae',
  '清州': 'cjj',
  'cheongju': 'cjj',
  '光州': 'kwj',
  'gwangju': 'kwj',
  '務安': 'mwx',
  'muan': 'mwx',

  // ── 中國大陸 Mainland China ──────────────────────────────────────────────
  '北京': 'bjs',
  '首都': 'pek',
  '北京首都': 'pek',
  '大興': 'pkx',
  '北京大興': 'pkx',
  'beijing': 'bjs',
  '上海': 'sha',
  '浦東': 'pvg',
  '上海浦東': 'pvg',
  '虹橋': 'sha',
  '上海虹橋': 'sha',
  'shanghai': 'sha',
  'pudong': 'pvg',
  '廣州': 'can',
  '白雲': 'can',
  'guangzhou': 'can',
  '深圳': 'szx',
  'shenzhen': 'szx',
  '成都': 'ctu',
  '天府': 'tfu',
  '成都天府': 'tfu',
  '雙流': 'ctu',
  'chengdu': 'ctu',
  '昆明': 'kmg',
  'kunming': 'kmg',
  '廈門': 'xmn',
  'xiamen': 'xmn',
  '杭州': 'hgh',
  'hangzhou': 'hgh',
  '南京': 'nkg',
  'nanjing': 'nkg',
  '武漢': 'wuh',
  'wuhan': 'wuh',
  '西安': 'sia',
  'xian': 'sia',
  '重慶': 'ckg',
  'chongqing': 'ckg',
  '鄭州': 'cgn',
  'zhengzhou': 'cgn',
  '青島': 'tao',
  'qingdao': 'tao',
  '長沙': 'csx',
  'changsha': 'csx',
  '大連': 'dlc',
  'dalian': 'dlc',
  '瀋陽': 'she',
  'shenyang': 'she',
  '哈爾濱': 'hrb',
  'harbin': 'hrb',
  '天津': 'tsn',
  'tianjin': 'tsn',
  '南寧': 'nng',
  'nanning': 'nng',
  '貴陽': 'kwe',
  'guiyang': 'kwe',
  '桂林': 'kwl',
  'guilin': 'kwl',
  '海口': 'hak',
  'haikou': 'hak',
  '三亞': 'syx',
  'sanya': 'syx',
  '福州': 'foc',
  'fuzhou': 'foc',
  '烏魯木齊': 'urc',
  'urumqi': 'urc',
  '拉薩': 'lxa',
  'lhasa': 'lxa',
  '麗江': 'ljg',
  'lijiang': 'ljg',
  '西雙版納': 'jmj',
  '景洪': 'jmj',
  '張家界': 'dys',
  '合肥': 'hfe',
  '南昌': 'khn',
  '石家莊': 'sjw',
  '太原': 'tyn',
  '呼和浩特': 'hot',
  '長春': 'cgq',
  '銀川': 'inc',
  '蘭州': 'lhw',
  '西寧': 'xnn',
  '溫州': 'wnh',
  '寧波': 'ngb',
  '揚州': 'ytz',
  '蘇州': 'szv',
  '舟山': 'zos',
  '汕頭': 'swu',
  '珠海': 'zuh',
  '南通': 'ntg',

  // ── 東南亞 Southeast Asia ────────────────────────────────────────────────
  '曼谷': 'bkk',
  '素萬那普': 'bkk',
  '蘇凡納布': 'bkk',
  '廊曼': 'dmk',
  'bangkok': 'bkk',
  'suvarnabhumi': 'bkk',
  'don mueang': 'dmk',
  '清邁': 'cnx',
  'chiang mai': 'cnx',
  '清萊': 'cei',
  'chiang rai': 'cei',
  '普吉島': 'hkt',
  '普吉': 'hkt',
  'phuket': 'hkt',
  '蘇梅島': 'usp',
  '蘇梅': 'usp',
  'koh samui': 'usp',
  '喀比': 'kbv',
  'krabi': 'kbv',
  '烏汶': 'ubn',
  '合艾': 'hdy',
  'hat yai': 'hdy',
  '新加坡': 'sin',
  'singapore': 'sin',
  '香港': 'hkg',
  'hong kong': 'hkg',
  '澳門': 'mfm',
  'macau': 'mfm',
  'macao': 'mfm',
  '吉隆坡': 'kul',
  '吉隆坡國際': 'kul',
  'kuala lumpur': 'kul',
  '亞庇': 'bki',
  '哥打京那巴盧': 'bki',
  'kota kinabalu': 'bki',
  '古晉': 'kch',
  'kuching': 'kch',
  '蘭卡威': 'lgk',
  'langkawi': 'lgk',
  '檳城': 'pen',
  'penang': 'pen',
  '胡志明': 'sgn',
  '胡志明市': 'sgn',
  'ho chi minh': 'sgn',
  'saigon': 'sgn',
  '河內': 'han',
  'hanoi': 'han',
  '峴港': 'dad',
  'da nang': 'dad',
  '芽莊': 'cam',
  'nha trang': 'cam',
  '富國島': 'phu',
  'phu quoc': 'phu',
  '會安': 'dad',
  '峇里島': 'dps',
  '巴里島': 'dps',
  'bali': 'dps',
  'denpasar': 'dps',
  '雅加達': 'cgk',
  'jakarta': 'cgk',
  '泗水': 'sub',
  'surabaya': 'sub',
  '日惹': 'jog',
  'yogyakarta': 'jog',
  '美達': 'kno',
  '棉蘭': 'kno',
  'medan': 'kno',
  '龍目島': 'lop',
  'lombok': 'lop',
  '望加錫': 'upg',
  'makassar': 'upg',
  '宿霧': 'ceb',
  'cebu': 'ceb',
  '馬尼拉': 'mnl',
  'manila': 'mnl',
  '長灘島': 'mph',
  'boracay': 'mph',
  '達沃': 'dvo',
  'davao': 'dvo',
  '科塔巴托': 'kta',
  '仰光': 'rgn',
  'yangon': 'rgn',
  '曼德勒': 'mdl',
  'mandalay': 'mdl',
  '金邊': 'pnh',
  'phnom penh': 'pnh',
  '暹粒': 'rep',
  '吳哥': 'rep',
  'siem reap': 'rep',
  '永珍': 'vte',
  '萬象': 'vte',
  'vientiane': 'vte',
  '琅勃拉邦': 'lpq',
  'luang prabang': 'lpq',
  '汶萊': 'bwn',
  'bandar seri begawan': 'bwn',
  'brunei': 'bwn',
  '東帝汶': 'dil',
  'dili': 'dil',

  // ── 南亞 South Asia ──────────────────────────────────────────────────────
  '孟買': 'bom',
  'mumbai': 'bom',
  '新德里': 'del',
  '德里': 'del',
  'delhi': 'del',
  'new delhi': 'del',
  '班加羅爾': 'blr',
  '邦加羅爾': 'blr',
  'bangalore': 'blr',
  'bengaluru': 'blr',
  '清奈': 'maa',
  '金奈': 'maa',
  'chennai': 'maa',
  '加爾各答': 'ccu',
  'kolkata': 'ccu',
  'calcutta': 'ccu',
  '海德拉巴': 'hyd',
  'hyderabad': 'hyd',
  '可倫坡': 'cmb',
  '科倫坡': 'cmb',
  'colombo': 'cmb',
  '達卡': 'dac',
  'dhaka': 'dac',
  '加德滿都': 'ktm',
  'kathmandu': 'ktm',
  '馬爾地夫': 'mle',
  '馬累': 'mle',
  'maldives': 'mle',
  'male': 'mle',
  '伊斯蘭堡': 'isb',
  'islamabad': 'isb',
  '卡拉奇': 'khi',
  'karachi': 'khi',
  '拉合爾': 'lhe',
  'lahore': 'lhe',
  '喀布爾': 'kbl',
  'kabul': 'kbl',

  // ── 中亞 Central Asia ────────────────────────────────────────────────────
  '阿拉木圖': 'ala',
  'almaty': 'ala',
  '努爾蘇丹': 'nqz',
  '阿斯塔納': 'nqz',
  'astana': 'nqz',
  '塔什干': 'tas',
  'tashkent': 'tas',

  // ── 中東 Middle East ─────────────────────────────────────────────────────
  '杜拜': 'dxb',
  '迪拜': 'dxb',
  'dubai': 'dxb',
  '阿布達比': 'auh',
  '阿布扎比': 'auh',
  'abu dhabi': 'auh',
  '多哈': 'doh',
  'doha': 'doh',
  '科威特': 'kwi',
  'kuwait': 'kwi',
  '利雅德': 'ruh',
  'riyadh': 'ruh',
  '吉達': 'jed',
  'jeddah': 'jed',
  '麥地那': 'med',
  'medina': 'med',
  '安曼': 'amm',
  'amman': 'amm',
  '貝魯特': 'bey',
  'beirut': 'bey',
  '特拉維夫': 'tlv',
  'tel aviv': 'tlv',
  '開羅': 'cai',
  'cairo': 'cai',
  '阿曼': 'mct',
  '馬斯喀特': 'mct',
  'muscat': 'mct',
  '巴林': 'bah',
  'bahrain': 'bah',
  '德黑蘭': 'thr',
  'tehran': 'thr',
  '伊斯坦堡': 'ist',
  '伊斯坦布爾': 'ist',
  'istanbul': 'ist',
  '安卡拉': 'ank',
  'ankara': 'ank',

  // ── 歐洲 Europe ──────────────────────────────────────────────────────────
  '倫敦': 'lon',
  '希斯洛': 'lhr',
  '倫敦/希斯洛': 'lhr',
  '蓋威克': 'lgw',
  '倫敦/蓋威克': 'lgw',
  'london': 'lon',
  'heathrow': 'lhr',
  'gatwick': 'lgw',
  '巴黎': 'par',
  '戴高樂': 'cdg',
  '巴黎/戴高樂': 'cdg',
  '奧利': 'ory',
  '巴黎/奧利': 'ory',
  'paris': 'par',
  'charles de gaulle': 'cdg',
  '法蘭克福': 'fra',
  'frankfurt': 'fra',
  '慕尼黑': 'muc',
  'munich': 'muc',
  '柏林': 'ber',
  'berlin': 'ber',
  '漢堡': 'ham',
  'hamburg': 'ham',
  '杜塞道夫': 'dus',
  'dusseldorf': 'dus',
  '阿姆斯特丹': 'ams',
  'amsterdam': 'ams',
  '布魯塞爾': 'bru',
  'brussels': 'bru',
  '馬德里': 'mad',
  'madrid': 'mad',
  '巴塞隆納': 'bcn',
  'barcelona': 'bcn',
  '羅馬': 'rom',
  '菲烏米奇諾': 'fco',
  '羅馬/菲烏米奇諾': 'fco',
  'rome': 'rom',
  'fiumicino': 'fco',
  '米蘭': 'mxp',
  '馬爾彭薩': 'mxp',
  '林納特': 'lin',
  'milan': 'mxp',
  '威尼斯': 'vce',
  'venice': 'vce',
  '佛羅倫斯': 'flr',
  'florence': 'flr',
  '那不勒斯': 'nap',
  'naples': 'nap',
  '蘇黎世': 'zrh',
  'zurich': 'zrh',
  '日內瓦': 'gva',
  'geneva': 'gva',
  '維也納': 'vie',
  'vienna': 'vie',
  '哥本哈根': 'cph',
  'copenhagen': 'cph',
  '斯德哥爾摩': 'arn',
  'stockholm': 'arn',
  '奧斯陸': 'osl',
  'oslo': 'osl',
  '赫爾辛基': 'hel',
  'helsinki': 'hel',
  '雷克雅維克': 'kef',
  'reykjavik': 'kef',
  '里斯本': 'lis',
  'lisbon': 'lis',
  '都柏林': 'dub',
  'dublin': 'dub',
  '愛丁堡': 'edi',
  'edinburgh': 'edi',
  '曼徹斯特': 'man',
  'manchester': 'man',
  '布達佩斯': 'bud',
  'budapest': 'bud',
  '布拉格': 'prg',
  'prague': 'prg',
  '華沙': 'waw',
  'warsaw': 'waw',
  '雅典': 'ath',
  'athens': 'ath',
  '伊斯坦堡/新': 'ist',
  '薩格勒布': 'zag',
  'zagreb': 'zag',
  '貝爾格勒': 'beg',
  'belgrade': 'beg',
  '莫斯科': 'mos',
  '謝列梅捷沃': 'svo',
  '多莫傑多沃': 'dme',
  'moscow': 'mos',
  '聖彼得堡': 'led',
  'st. petersburg': 'led',
  '基輔': 'iev',
  'kyiv': 'iev',
  '里加': 'rix',
  'riga': 'rix',
  '塔林': 'tll',
  'tallinn': 'tll',
  '維爾紐斯': 'vno',
  'vilnius': 'vno',
  '盧森堡': 'lux',
  'luxembourg': 'lux',
  '奧克蘭': 'akl',
  '尼斯': 'nce',
  'nice': 'nce',
  '里昂': 'lys',
  'lyon': 'lys',
  '馬賽': 'mrs',
  'marseille': 'mrs',
  '斯圖加特': 'str',
  'stuttgart': 'str',
  '紐倫堡': 'nue',
  'nuremberg': 'nue',
  '杜布羅夫尼克': 'dbv',
  'dubrovnik': 'dbv',
  '薩拉熱窩': 'sjj',
  'sarajevo': 'sjj',
  '索菲亞': 'sof',
  'sofia': 'sof',
  '布加勒斯特': 'otp',
  'bucharest': 'otp',
  '奧克蘭(紐西蘭)': 'akl',

  // ── 非洲 Africa ──────────────────────────────────────────────────────────
  '奈洛比': 'nbo',
  'nairobi': 'nbo',
  '約翰尼斯堡': 'jnb',
  'johannesburg': 'jnb',
  '開普敦': 'cpt',
  'cape town': 'cpt',
  '卡薩布蘭加': 'cmn',
  '卡薩布蘭卡': 'cmn',
  'casablanca': 'cmn',
  '拉各斯': 'los',
  'lagos': 'los',
  '達累斯薩拉姆': 'dar',
  'dar es salaam': 'dar',
  '阿克拉': 'acc',
  'accra': 'acc',
  '亞的斯亞貝巴': 'add',
  'addis ababa': 'add',
  '突尼斯': 'tun',
  'tunis': 'tun',
  '阿爾及爾': 'alg',
  'algiers': 'alg',
  '路易港': 'mru',
  '模里西斯': 'mru',
  'mauritius': 'mru',
  '留尼旺': 'run',
  'reunion': 'run',
  '塞席爾': 'sez',
  'seychelles': 'sez',

  // ── 大洋洲 Oceania ───────────────────────────────────────────────────────
  '雪梨': 'syd',
  'sydney': 'syd',
  '墨爾本': 'mel',
  'melbourne': 'mel',
  '布里斯本': 'bne',
  'brisbane': 'bne',
  '珀斯': 'per',
  '伯斯': 'per',
  'perth': 'per',
  '阿德萊德': 'adl',
  'adelaide': 'adl',
  '黃金海岸': 'ool',
  'gold coast': 'ool',
  '凱恩斯': 'cns',
  'cairns': 'cns',
  '達爾文': 'drw',
  'darwin': 'drw',
  '堪培拉': 'cbr',
  'canberra': 'cbr',
  'auckland': 'akl',
  '基督城': 'chc',
  'christchurch': 'chc',
  '惠靈頓': 'wlg',
  'wellington': 'wlg',
  '皇后鎮': 'zqn',
  'queenstown': 'zqn',
  '努美阿': 'nou',
  'noumea': 'nou',
  '大溪地': 'ppt',
  '帕皮提': 'ppt',
  'tahiti': 'ppt',
  '斐濟': 'suv',
  '蘇瓦': 'suv',
  'fiji': 'nadi',
  'nadi': 'nadi',
  '關島': 'gum',
  'guam': 'gum',
  '塞班': 'spn',
  'saipan': 'spn',

  // ── 北美 North America ───────────────────────────────────────────────────
  '紐約': 'nyc',
  '甘迺迪': 'jfk',
  '紐約/甘迺迪': 'jfk',
  '拉瓜地亞': 'lga',
  '紐瓦克': 'ewr',
  'new york': 'nyc',
  'jfk': 'jfk',
  'newark': 'ewr',
  '洛杉磯': 'lax',
  'los angeles': 'lax',
  '舊金山': 'sfo',
  'san francisco': 'sfo',
  '西雅圖': 'sea',
  'seattle': 'sea',
  '拉斯維加斯': 'las',
  'las vegas': 'las',
  '丹佛': 'den',
  'denver': 'den',
  '鳳凰城': 'phx',
  'phoenix': 'phx',
  '波特蘭': 'pdx',
  'portland': 'pdx',
  '聖地牙哥(美國)': 'san',
  'san diego': 'san',
  '薩克拉門托': 'smf',
  'sacramento': 'smf',
  '鹽湖城': 'slc',
  'salt lake city': 'slc',
  '阿拉斯加': 'anc',
  '安克拉治': 'anc',
  'anchorage': 'anc',
  '火奴魯魯': 'hnl',
  '夏威夷': 'hnl',
  'honolulu': 'hnl',
  'hawaii': 'hnl',
  '芝加哥': 'chi',
  '歐海爾': 'ord',
  '芝加哥/歐海爾': 'ord',
  '中途島': 'mdw',
  'chicago': 'chi',
  "o'hare": 'ord',
  '休士頓': 'hou',
  '喬治布希': 'iah',
  '休士頓/喬治布希': 'iah',
  'houston': 'hou',
  '達拉斯': 'dfw',
  'dallas': 'dfw',
  '邁阿密': 'mia',
  'miami': 'mia',
  '奧蘭多': 'mco',
  'orlando': 'mco',
  '亞特蘭大': 'atl',
  'atlanta': 'atl',
  '波士頓': 'bos',
  'boston': 'bos',
  '華盛頓': 'was',
  '杜勒斯': 'iad',
  '雷根': 'dca',
  '華盛頓/杜勒斯': 'iad',
  'washington': 'was',
  'dulles': 'iad',
  '費城': 'phl',
  'philadelphia': 'phl',
  '底特律': 'dtw',
  'detroit': 'dtw',
  '明尼阿波利斯': 'msp',
  'minneapolis': 'msp',
  '聖路易': 'stl',
  'st. louis': 'stl',
  '納許維爾': 'bna',
  'nashville': 'bna',
  '夏洛特': 'clt',
  'charlotte': 'clt',
  '坦帕': 'tpa',
  'tampa': 'tpa',
  '巴爾的摩': 'bwi',
  'baltimore': 'bwi',
  '辛辛那提': 'cvg',
  'cincinnati': 'cvg',
  '溫哥華': 'yvr',
  'vancouver': 'yvr',
  '多倫多': 'yto',
  '皮爾遜': 'yyz',
  '多倫多/皮爾遜': 'yyz',
  'toronto': 'yto',
  '蒙特婁': 'yul',
  'montreal': 'yul',
  '卡加利': 'yyc',
  'calgary': 'yyc',
  '渥太華': 'yow',
  'ottawa': 'yow',
  '愛德蒙頓': 'yeg',
  'edmonton': 'yeg',
  '哈利法克斯': 'yhz',
  'halifax': 'yhz',
  '墨西哥城': 'mex',
  'mexico city': 'mex',
  '坎昆': 'cun',
  'cancun': 'cun',
  '瓜達拉哈拉': 'gdl',
  'guadalajara': 'gdl',
  '蒙特瑞': 'mty',
  'monterrey': 'mty',

  // ── 中美洲 & 加勒比海 Central America & Caribbean ────────────────────────
  '哈瓦那': 'hav',
  'havana': 'hav',
  '聖多明哥': 'sdq',
  'santo domingo': 'sdq',
  '聖胡安': 'sju',
  'san juan': 'sju',
  '金斯頓': 'kin',
  'kingston': 'kin',
  '巴拿馬城': 'pty',
  'panama city': 'pty',
  '聖荷西': 'sjo',
  'san jose': 'sjo',

  // ── 南美洲 South America ─────────────────────────────────────────────────
  '聖保羅': 'gru',
  '瓜魯柳斯': 'gru',
  'sao paulo': 'gru',
  '里約熱內盧': 'gig',
  'rio de janeiro': 'gig',
  '布宜諾斯艾利斯': 'eze',
  'buenos aires': 'eze',
  '波哥大': 'bog',
  'bogota': 'bog',
  '利馬': 'lim',
  'lima': 'lim',
  '聖地牙哥(智利)': 'scl',
  'santiago': 'scl',
  '加拉卡斯': 'ccs',
  'caracas': 'ccs',
  '基多': 'uio',
  'quito': 'uio',
  '蒙特維多': 'mvd',
  'montevideo': 'mvd',
  '亞松森': 'asu',
  'asuncion': 'asu',
  '拉巴斯': 'lpb',
  'la paz': 'lpb',
};

const IATA_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(IATA_MAP).map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()]),
);

function getIata(city: string): string {
  const normalizedCity = city.trim().toLowerCase();
  if (!normalizedCity) return 'tpe';
  if (/^[a-z]{3}$/i.test(normalizedCity)) return normalizedCity;
  if (IATA_LOOKUP[normalizedCity]) return IATA_LOOKUP[normalizedCity];
  for (const [key, val] of Object.entries(IATA_LOOKUP)) {
      if (normalizedCity.includes(key)) return val;
  }
  return normalizedCity;
}

// ---------------------------------------------------------------------------
// API response parser — attempt to extract flights from Trip.com's internal
// JSON endpoints captured via network interception.
// ---------------------------------------------------------------------------
function parseApiResponses(
  captured: Array<{ url: string; data: any }>,
  affiliateUrl: string,
  origin: string,
  destination: string,
  date: string,
): FlightData[] {
  const results: FlightData[] = [];

  for (const { url: capturedUrl, data } of captured) {
    // ── FlightMiddleSearch (soa2/27015) ──────────────────────────────────
    // Structure: { head: { retCode }, flightItineraryList: [{ flightSegments:[{ flightList:[...] }] }] }
    // or: { routeList: [{ itemList: [...] }] }
    if (capturedUrl.includes('FlightMiddleSearch') || capturedUrl.includes('soa2/27015')) {
      const itineraryList: any[] =
        data?.flightItineraryList ??
        data?.data?.flightItineraryList ??
        data?.routeList ??
        data?.data?.routeList ??
        [];
      for (const itinerary of itineraryList) {
        try {
          const segGroups: any[] = itinerary?.flightSegments ?? itinerary?.itemList ?? [itinerary];
          for (const segGroup of segGroups) {
            const segs: any[] = segGroup?.flightList ?? segGroup?.segments ?? [segGroup];
            const seg = segs[0] ?? {};
            const priceInfo = itinerary?.priceList?.[0] ?? itinerary?.cabinInfoList?.[0] ?? {};
            const price = Number(
              priceInfo?.adultPrice ?? priceInfo?.price ?? priceInfo?.salePrice ?? 0
            );
            if (!price) continue;
            const depTime = (seg?.departureDateTime ?? seg?.depDateTime ?? '').match(/(\d{2}:\d{2})/)?.[1] ?? '';
            const arrTime = (seg?.arrivalDateTime ?? seg?.arrDateTime ?? '').match(/(\d{2}:\d{2})/)?.[1] ?? '';
            const airline = seg?.marketingAirlineName ?? seg?.airlineName ?? seg?.carrierName ?? 'Unknown';
            const durationMin = Number(seg?.duration ?? seg?.flightTime ?? 0);
            const stops = Number(itinerary?.transferCount ?? itinerary?.stopNum ?? 0);
            if (!depTime && !arrTime) continue;
            results.push({
              id: `tripcom_api_${date}_${results.length}_${Date.now()}`,
              type: 'flight',
              provider: 'Trip.com',
              title: `${origin} → ${destination} · ${stops === 0 ? '直飛' : stops + ' 轉'}`,
              price,
              currency: 'TWD',
              emoji: '✈️',
              affiliate_url: affiliateUrl,
              details: {
                airline,
                departure: depTime,
                arrival: arrTime,
                stops,
                duration: durationMin ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m` : '--',
              },
            });
          }
        } catch { /* skip */ }
        if (results.length >= 10) break;
      }
      if (results.length >= 10) break;
      continue; // move to next captured response
    }

    // Trip.com / Ctrip API envelopes vary; try common paths
    const root =
      data?.Response ??
      data?.data ??
      data?.result ??
      data?.flightData ??
      data;

    const flightList: any[] =
      root?.FlightRouteItems ??
      root?.flightRouteList ??
      root?.flightList ??
      root?.items ??
      (Array.isArray(root) ? root : []);

    for (const item of flightList) {
      try {
        const segs: any[] =
          item?.FlightSegmentList ??
          item?.segments ??
          item?.legs ??
          [];

        const seg = segs[0] ?? {};
        const priceNode =
          item?.Prices ??
          item?.price ??
          item?.fare ??
          {};

        const price = Number(
          priceNode?.AdultPrice ??
          priceNode?.adultPrice ??
          priceNode?.totalPrice ??
          priceNode?.amount ??
          item?.minPrice ??
          item?.price ??
          0,
        );

        if (!price) continue;

        const depRaw: string =
          seg?.DepartureDateTime ??
          seg?.departureDateTime ??
          seg?.departureTime ??
          '';
        const arrRaw: string =
          seg?.ArrivalDateTime ??
          seg?.arrivalDateTime ??
          seg?.arrivalTime ??
          '';

        const depTime = depRaw.match(/\d{2}:\d{2}/)?.[0] ?? depRaw.slice(-5);
        const arrTime = arrRaw.match(/\d{2}:\d{2}/)?.[0] ?? arrRaw.slice(-5);

        const airline: string =
          seg?.MarketingAirlineName ??
          seg?.airlineName ??
          seg?.carrier ??
          item?.airlineName ??
          'Unknown';

        const durationMin: number =
          seg?.Duration ?? seg?.duration ?? item?.duration ?? 0;
        const durationStr = durationMin
          ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
          : '--';

        const stops: number =
          (item?.StopNum ?? item?.stopNum ?? item?.stops ?? segs.length - 1) || 0;

        results.push({
          id: `tripcom_api_${date}_${results.length}_${Date.now()}`,
          type: 'flight',
          provider: 'Trip.com',
          title: `${origin} → ${destination} · ${stops === 0 ? '直飛' : stops + ' 轉'}`,
          price,
          currency: 'TWD',
          emoji: '✈️',
          affiliate_url: affiliateUrl,
          details: { airline, departure: depTime, arrival: arrTime, stops, duration: durationStr },
        });
      } catch {
        // skip malformed item
      }
    }

    if (results.length >= 10) break;
  }

  return results.slice(0, 10);
}

// ---------------------------------------------------------------------------
// DOM parser — executed inside page.evaluate(), must be self-contained JS.
// Trip.com renders each flight field on its own line inside .m-flight-list.
// Pattern per flight:
//   [Airline name]
//   [HH:MM]   <- departure
//   [TPET1]   <- origin airport+terminal
//   [X 小時 Y 分]
//   [直飛 | N 轉]
//   [HH:MM]   <- arrival
//   [OKA / OKAI]
//   [TWD N,NNN]
// ---------------------------------------------------------------------------
function buildDomParserScript(_originIATA: string, _destIATA: string): string {
  return `
(function () {
  var CARD_SELECTORS = [
    '.flight-item',
    '[class*="flight-item"]',
    '[class*="FlightItem"]',
    '[class*="flightItem"]',
    '.m-list-item',
    '.flight-card',
    '[class*="flight-card"]',
    '[class*="FlightCard"]',
    '.o-flight-card',
    '[data-testid="flight-card"]',
  ];

  var nodes = [];
  for (var si = 0; si < CARD_SELECTORS.length; si++) {
    var found = Array.from(document.querySelectorAll(CARD_SELECTORS[si]));
    if (found.length >= 2) { nodes = found; break; }
  }

  // Strategy A: structured node extraction
  if (nodes.length > 0) {
    var stratA = nodes.slice(0, 15).map(function(node, index) {
      var text = node.textContent || '';
      var times = text.match(/(\\d{2}:\\d{2})/g) || [];
      var dep = times[0] || '';
      var arr = times[1] || '';
      var pm = text.match(/TWD[\\s,]*([\\d,]+)/) || text.match(/([\\d,]{4,})\\s*TWD/);
      var price = pm ? parseInt(pm[1].replace(/,/g, ''), 10) : 0;
      var airlineEl = node.querySelector('[class*="airline"],[class*="carrier"],[class*="Airline"]');
      var airline = airlineEl ? (airlineEl.textContent || '').trim() : '';
      if (!airline) {
        var airlineM = text.match(/([\\u4e00-\\u9fff]+(?:航空|航班))/);
        airline = airlineM ? airlineM[1] : '';
      }
      var durEl = node.querySelector('[class*="duration"],[class*="Duration"]');
      var duration = durEl ? (durEl.textContent || '').trim() : '';
      if (!duration) {
        var durM = text.match(/(\\d+)\\s*小時\\s*(\\d+)\\s*分/);
        duration = durM ? (durM[1] + 'h ' + durM[2] + 'm') : '';
      }
      var stops = text.includes('直飛') ? 0 : (text.match(/(\\d+)\\s*[轉停]/) ? parseInt(text.match(/(\\d+)\\s*[轉停]/)[1]) : 1);
      if (!dep || !arr || price < 1000) return null;
      return { index: index, airline: airline, departure: dep, arrival: arr, price: price, duration: duration, stops: stops };
    }).filter(function(x) { return x !== null; });
    if (stratA.length >= 2) return stratA;
  }

  // Strategy B: sentinel-split — Trip.com ends each card with "選取" (Select)
  // or "查看詳情" (View Details) depending on A/B variant. Use body.innerText.
  var fullText = document.body.innerText || '';
  if (fullText.length < 300) {
    var container = document.querySelector('.m-flight-list, .page-box-list');
    if (container && container.innerText && container.innerText.length > fullText.length) {
      fullText = container.innerText;
    }
  }

  // Truncate at footer noise (recommended dates section or SEO footer)
  var cutMarkers = ['推薦日期', '資料擷取時間', '在 Trip.com 預訂', '常見問題'];
  var flightZone = fullText;
  for (var ci = 0; ci < cutMarkers.length; ci++) {
    var ci2 = flightZone.indexOf(cutMarkers[ci]);
    if (ci2 > 200) { flightZone = flightZone.slice(0, ci2); break; }
  }

  // Split on both sentinel variants
  var sentinelRe = /選取|查看詳情/g;
  var lastIdx = 0;
  var blocksList = [];
  var smatch;
  while ((smatch = sentinelRe.exec(flightZone)) !== null) {
    blocksList.push(flightZone.slice(lastIdx, smatch.index));
    lastIdx = smatch.index + smatch[0].length;
  }
  // Drop the trailing segment (footer content after last sentinel)
  var blocks = blocksList;
  var results = [];

  for (var bi = 0; bi < blocks.length - 1 && results.length < 10; bi++) {
    var block = blocks[bi];
    // Keep last 600 chars of the block (flight data is always near the end)
    block = block.slice(Math.max(0, block.length - 600));

    // Times — need at least departure + arrival
    var times = block.match(/(\\d{2}:\\d{2})/g) || [];
    if (times.length < 2) continue;
    var arrTime = times[times.length - 1];
    var depTime = times[times.length - 2];

    // Price
    var priceMatch = block.match(/TWD[\\s,]*([\\d,]+)/);
    if (!priceMatch) continue;
    var price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price < 1000 || price > 500000) continue;

    // Duration (X 小時 Y 分)
    var durMatch = block.match(/(\\d+)\\s*小時\\s*(\\d+)\\s*分/);
    var duration = durMatch ? (durMatch[1] + 'h ' + durMatch[2] + 'm') : '';

    // Stops
    var stops = block.includes('直飛') ? 0
      : (block.match(/(\\d+)\\s*[轉停]/) ? parseInt(block.match(/(\\d+)\\s*[轉停]/)[1]) : 1);

    // Airline name — Chinese characters ending in 航空 or 航班
    var airlineMatch = block.match(/([\\u4e00-\\u9fff]+(?:航空|航班))/);
    var airline = airlineMatch ? airlineMatch[1] : '';

    results.push({
      index: results.length,
      airline: airline,
      departure: depTime,
      arrival: arrTime,
      price: price,
      duration: duration,
      stops: stops,
    });
  }

  return results;
})()
  `;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Scrape Trip.com flight search results using Playwright with:
 *  1. Network response interception (parse internal API JSON — most reliable)
 *  2. DOM extraction with multi-strategy fallback
 *  3. Human-behaviour simulation (random mouse path, gradual scrolling)
 *  4. Comprehensive anti-detection init script
 */
export async function scrapeTripFlights(
  origin: string,
  destination: string,
  date: string,
): Promise<FlightData[]> {
  const originIATA = getIata(origin);
  const destIATA = getIata(destination);
  const url = `https://tw.trip.com/flights/${originIATA}-to-${destIATA}/tickets-${originIATA}-${destIATA}/?flighttype=ow&dcity=${originIATA}&acity=${destIATA}&ddate=${date}`;
  const isVercel = !!process.env.VERCEL;

  console.log(`[tripParser] Starting → ${url}`);

  const capturedApiData: Array<{ url: string; data: any }> = [];
  let browser: playwrightCore.Browser | undefined;

  try {
    // ── Browser launch ────────────────────────────────────────────────────
    const executablePath = isVercel
      ? await (chromiumSparticuz as any).executablePath()
      : undefined;

    browser = await playwrightCore.chromium.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        ...((isVercel && (chromiumSparticuz as any).args) ? (chromiumSparticuz as any).args : []),
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--window-size=1440,900',
        '--lang=zh-TW',
        // Additional stealth: suppress headless indicators
        '--disable-infobars',
        '--ignore-certificate-errors',
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--hide-scrollbars',
        '--mute-audio',
        '--force-device-scale-factor=1',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--password-store=basic',
      ],
    });

    // ── Context setup ─────────────────────────────────────────────────────
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
      extraHTTPHeaders: {
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      },
    });

    // Inject stealth script before every page/frame load
    await context.addInitScript(STEALTH_SCRIPT);

    const page = await context.newPage();

    // ── Network interception ──────────────────────────────────────────────
    // Capture Trip.com's internal flight-search API responses
    page.on('response', async (response: playwrightCore.Response) => {
      const resUrl = response.url();
      const ct = response.headers()['content-type'] ?? '';
      const isJson = ct.includes('json');
      const looksLikeFlight =
        resUrl.includes('flightList') ||
        resUrl.includes('FlightList') ||
        resUrl.includes('flightSearch') ||
        resUrl.includes('searchFlight') ||
        resUrl.includes('FlightMiddleSearch') ||  // Trip.com streaming search
        resUrl.includes('soa2/27015') ||          // Trip.com flight search service
        resUrl.includes('soa2/11296') ||
        resUrl.includes('soa2/24049') ||
        resUrl.includes('intl/flight');

      if (isJson && looksLikeFlight) {
        try {
          const json = await response.json();
          // Only keep if it looks like it has flight data
          const hasData =
            json?.Response?.FlightRouteItems?.length ||
            json?.data?.flightList?.length ||
            json?.flightList?.length ||
            json?.result?.length ||
            json?.head?.retCode === 'SUCCESS';  // FlightMiddleSearch success indicator
          if (hasData) {
            console.log(`[tripParser] Captured API response: ${resUrl}`);
            capturedApiData.push({ url: resUrl, data: json });
          }
        } catch {
          // Non-JSON or parse error — skip silently
        }
      }
    });

    // ── Navigation ────────────────────────────────────────────────────────
    // Start mouse at a plausible initial position
    await page.mouse.move(400 + Math.random() * 300, 100 + Math.random() * 100);

    console.log('[tripParser] Navigating...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: isVercel ? 20000 : 60000,
    });

    // Wait for initial JS hydration — networkidle gives the SPA time to bootstrap
    try {
      await page.waitForLoadState('networkidle', { timeout: isVercel ? 8000 : 15000 });
    } catch {
      // networkidle may not reach if long-polling keeps firing; proceed anyway
    }

    // ── Human-behaviour simulation ────────────────────────────────────────
    console.log('[tripParser] Simulating human behaviour...');

    // Brief pause after page load (as if reading the hero/banner)
    await sleep(1200, 2500);

    // Slow scroll to reveal flight list content
    let scrolled = 0;
    while (scrolled < 500) {
      const delta = 40 + Math.floor(Math.random() * 50);
      await page.mouse.wheel(0, delta);
      scrolled += delta;
      await sleep(60, 150);
    }

    await sleep(600, 1200);

    // Realistic mouse drift across the page (simulating reading)
    await humanMouseMove(page, 350, 400, 900, 500);
    await sleep(200, 500);
    await humanMouseMove(page, 900, 500, 600, 650);
    await sleep(300, 700);

    // Continue scrolling down (flight cards are below the fold)
    while (scrolled < 1200) {
      const delta = 50 + Math.floor(Math.random() * 60);
      await page.mouse.wheel(0, delta);
      scrolled += delta;
      await sleep(80, 180);
    }

    await sleep(800, 1500);

    // ── Wait for actual flight data (not just container) ─────────────────
    // Poll body.innerText until a recognisable flight-card sentinel appears.
    // Trip.com uses "選取" (Select) or "查看詳情" (View Details) per card.
    console.log('[tripParser] Waiting for flight data to render...');
    try {
      await page.waitForFunction(
        () => {
          const t = document.body.innerText || '';
          return (
            (t.includes('選取') && t.includes('TWD')) ||
            (t.includes('查看詳情') && t.includes('TWD')) ||
            t.includes('找不到航班') ||
            t.includes('0 個航班')
          );
        },
        { timeout: isVercel ? 25000 : 45000, polling: 1000 },
      );
      console.log('[tripParser] Flight data detected in page.');
    } catch {
      console.warn('[tripParser] Timed out waiting for flight data; proceeding with available content.');
    }

    // Brief extra settle time
    await sleep(800, 1500);

    // Slight scroll back up (natural reading behaviour)
    await page.mouse.wheel(0, -(100 + Math.floor(Math.random() * 100)));
    await sleep(300, 600);

    // ── Strategy 1: use intercepted API data ──────────────────────────────
    if (capturedApiData.length > 0) {
      console.log(`[tripParser] Parsing ${capturedApiData.length} captured API responses...`);
      const apiFlights = parseApiResponses(capturedApiData, url, origin, destination, date);
      if (apiFlights.length > 0) {
        console.log(`[tripParser] ✓ ${apiFlights.length} flights from API interception.`);
        await browser.close();
        return apiFlights;
      }
    }

    // ── Strategy 2: DOM extraction ────────────────────────────────────────
    console.log('[tripParser] Falling back to DOM extraction...');
    const domScript = buildDomParserScript(originIATA, destIATA);
    const rawFlights: Array<{
      index: number; airline: string; departure: string;
      arrival: string; price: number; duration: string; stops: number;
    }> = await page.evaluate(domScript) as any;

    await browser.close();

    const valid = (rawFlights ?? []).filter(f => f?.price > 0).slice(0, 10);
    console.log(`[tripParser] DOM extraction found ${valid.length} flights.`);

    if (valid.length === 0) return [];

    return valid.map(f => ({
      id: `tripcom_${date}_${f.index}_${Date.now()}`,
      type: 'flight' as const,
      provider: 'Trip.com',
      title: `${origin} → ${destination} · ${f.stops === 0 ? '直飛' : f.stops + ' 轉'}`,
      price: f.price,
      currency: 'TWD',
      emoji: '✈️',
      affiliate_url: url,
      details: {
        airline: f.airline || 'Unknown',
        departure: f.departure,
        arrival: f.arrival,
        stops: f.stops,
        duration: f.duration || '--',
      },
    }));

  } catch (error: any) {
    if (browser) await browser.close();
    console.warn('[tripParser] Scraper failed:', error?.message ?? error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Roundtrip support
// ---------------------------------------------------------------------------

/**
 * Parse Trip.com internal API JSON (captured via network interception) for
 * ROUNDTRIP results.  Each itinerary must have two flightSegments groups:
 * index 0 = outbound leg, index 1 = return leg.
 */
function parseApiResponsesRoundTrip(
  captured: Array<{ url: string; data: any }>,
  affiliateUrl: string,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
): FlightData[] {
  const results: FlightData[] = [];

  for (const { url: capturedUrl, data } of captured) {
    // ── FlightMiddleSearch / soa2/27015 ─────────────────────────────────
    if (capturedUrl.includes('FlightMiddleSearch') || capturedUrl.includes('soa2/27015')) {
      const itineraryList: any[] =
        data?.flightItineraryList ??
        data?.data?.flightItineraryList ??
        data?.routeList ??
        data?.data?.routeList ??
        [];

      for (const itinerary of itineraryList) {
        try {
          const segGroups: any[] = itinerary?.flightSegments ?? itinerary?.itemList ?? [];
          // Roundtrip must have two segment groups
          if (segGroups.length < 2) continue;

          // Outbound (leg 0)
          const outSegs: any[] = segGroups[0]?.flightList ?? segGroups[0]?.segments ?? [];
          const outSeg = outSegs[0] ?? {};

          // Return (leg 1)
          const retSegs: any[] = segGroups[1]?.flightList ?? segGroups[1]?.segments ?? [];
          const retSeg = retSegs[0] ?? {};

          // Price (roundtrip total)
          const priceInfo = itinerary?.priceList?.[0] ?? itinerary?.cabinInfoList?.[0] ?? {};
          const price = Number(priceInfo?.adultPrice ?? priceInfo?.price ?? priceInfo?.salePrice ?? 0);
          if (!price) continue;

          // Times
          const outDepTime = (outSeg?.departureDateTime ?? outSeg?.depDateTime ?? '').match(/(\d{2}:\d{2})/)?.[1] ?? '';
          const outArrTime = (outSeg?.arrivalDateTime ?? outSeg?.arrDateTime ?? '').match(/(\d{2}:\d{2})/)?.[1] ?? '';
          const retDepTime = (retSeg?.departureDateTime ?? retSeg?.depDateTime ?? '').match(/(\d{2}:\d{2})/)?.[1] ?? '';
          const retArrTime = (retSeg?.arrivalDateTime ?? retSeg?.arrDateTime ?? '').match(/(\d{2}:\d{2})/)?.[1] ?? '';
          if (!outDepTime && !outArrTime) continue;

          // Airlines
          const outAirline: string = outSeg?.marketingAirlineName ?? outSeg?.airlineName ?? outSeg?.carrierName ?? 'Unknown';
          const retAirline: string = retSeg?.marketingAirlineName ?? retSeg?.airlineName ?? retSeg?.carrierName ?? outAirline;

          // Duration (in minutes in the API)
          const outDurMin = Number(outSeg?.duration ?? outSeg?.flightTime ?? 0);
          const retDurMin = Number(retSeg?.duration ?? retSeg?.flightTime ?? 0);

          // Stops
          const outStops = Number(segGroups[0]?.transferCount ?? Math.max(0, outSegs.length - 1));
          const retStops = Number(segGroups[1]?.transferCount ?? Math.max(0, retSegs.length - 1));

          results.push({
            id: `tripcom_rt_${departureDate}_${returnDate}_${results.length}_${Date.now()}`,
            type: 'flight',
            tripType: 'roundtrip',
            provider: 'Trip.com',
            title: `${origin} ⇄ ${destination} · 來回`,
            price,
            currency: 'TWD',
            emoji: '✈️',
            affiliate_url: affiliateUrl,
            details: {
              airline: outAirline,
              departure: outDepTime,
              arrival: outArrTime,
              stops: outStops,
              duration: outDurMin ? `${Math.floor(outDurMin / 60)}h ${outDurMin % 60}m` : '--',
            },
            returnLeg: {
              airline: retAirline,
              departure: retDepTime,
              arrival: retArrTime,
              stops: retStops,
              duration: retDurMin ? `${Math.floor(retDurMin / 60)}h ${retDurMin % 60}m` : '--',
            },
          });
        } catch { /* skip malformed entry */ }
        if (results.length >= 10) break;
      }
      if (results.length >= 10) break;
      continue;
    }

    // ── Generic API format (FlightRouteItems / flightRouteList) ─────────
    const root = data?.Response ?? data?.data ?? data?.result ?? data?.flightData ?? data;
    const flightList: any[] =
      root?.FlightRouteItems ??
      root?.flightRouteList ??
      root?.flightList ??
      root?.items ??
      (Array.isArray(root) ? root : []);

    for (const item of flightList) {
      try {
        const segs: any[] = item?.FlightSegmentList ?? item?.segments ?? item?.legs ?? [];
        if (segs.length < 2) continue; // need both legs

        const outSeg = segs[0] ?? {};
        const retSeg = segs[1] ?? {};

        const priceNode = item?.Prices ?? item?.price ?? item?.fare ?? {};
        const price = Number(
          priceNode?.AdultPrice ?? priceNode?.adultPrice ?? priceNode?.totalPrice ??
          priceNode?.amount ?? item?.minPrice ?? item?.price ?? 0,
        );
        if (!price) continue;

        const outDepTime = (outSeg?.DepartureDateTime ?? outSeg?.departureDateTime ?? '').match(/\d{2}:\d{2}/)?.[0] ?? '';
        const outArrTime = (outSeg?.ArrivalDateTime ?? outSeg?.arrivalDateTime ?? '').match(/\d{2}:\d{2}/)?.[0] ?? '';
        const retDepTime = (retSeg?.DepartureDateTime ?? retSeg?.departureDateTime ?? '').match(/\d{2}:\d{2}/)?.[0] ?? '';
        const retArrTime = (retSeg?.ArrivalDateTime ?? retSeg?.arrivalDateTime ?? '').match(/\d{2}:\d{2}/)?.[0] ?? '';
        if (!outDepTime && !outArrTime) continue;

        const outAirline: string = outSeg?.MarketingAirlineName ?? outSeg?.airlineName ?? outSeg?.carrier ?? item?.airlineName ?? 'Unknown';
        const retAirline: string = retSeg?.MarketingAirlineName ?? retSeg?.airlineName ?? retSeg?.carrier ?? outAirline;

        const outDurMin = Number(outSeg?.Duration ?? outSeg?.duration ?? 0);
        const retDurMin = Number(retSeg?.Duration ?? retSeg?.duration ?? 0);

        results.push({
          id: `tripcom_rt_${departureDate}_${returnDate}_${results.length}_${Date.now()}`,
          type: 'flight',
          tripType: 'roundtrip',
          provider: 'Trip.com',
          title: `${origin} ⇄ ${destination} · 來回`,
          price,
          currency: 'TWD',
          emoji: '✈️',
          affiliate_url: affiliateUrl,
          details: {
            airline: outAirline,
            departure: outDepTime,
            arrival: outArrTime,
            stops: Number(item?.StopNum ?? item?.stopNum ?? item?.stops ?? 0),
            duration: outDurMin ? `${Math.floor(outDurMin / 60)}h ${outDurMin % 60}m` : '--',
          },
          returnLeg: {
            airline: retAirline,
            departure: retDepTime,
            arrival: retArrTime,
            stops: 0,
            duration: retDurMin ? `${Math.floor(retDurMin / 60)}h ${retDurMin % 60}m` : '--',
          },
        });
      } catch { /* skip */ }
    }
    if (results.length >= 10) break;
  }

  return results.slice(0, 10);
}

/**
 * Returns a JS string (for page.evaluate) that extracts roundtrip flight
 * bundles from Trip.com DOM.  Each result has outDep/outArr (outbound) and
 * retDep/retArr (return), plus price and airline.
 *
 * Strategy A: CSS node extraction (4+ time values per card)
 * Strategy B: sentinel-split of body.innerText, 4 times per block
 */
function buildDomParserScriptRoundTrip(_originIATA: string, _destIATA: string): string {
  return `
(function () {
  var CARD_SELECTORS = [
    '.flight-item', '[class*="flight-item"]', '[class*="FlightItem"]',
    '[class*="flightItem"]', '.m-list-item', '.flight-card',
    '[class*="flight-card"]', '[class*="FlightCard"]', '.o-flight-card',
    '[data-testid="flight-card"]',
  ];

  // --- Strategy A: structured node extraction ---
  var nodes = [];
  for (var si = 0; si < CARD_SELECTORS.length; si++) {
    var found = Array.from(document.querySelectorAll(CARD_SELECTORS[si]));
    if (found.length >= 2) { nodes = found; break; }
  }

  if (nodes.length > 0) {
    var stratA = nodes.slice(0, 15).map(function(node, index) {
      var text = node.textContent || '';
      var times = text.match(/(\\d{2}:\\d{2})/g) || [];
      if (times.length < 4) return null; // roundtrip requires at least 4 times
      var outDep = times[0], outArr = times[1];
      var retDep = times[2], retArr = times[3];

      var pm = text.match(/TWD[\\s,]*([\\d,]+)/) || text.match(/([\\d,]{4,})\\s*TWD/);
      var price = pm ? parseInt(pm[1].replace(/,/g, ''), 10) : 0;
      if (price < 2000) return null;

      var airlineEls = Array.from(node.querySelectorAll('[class*="airline"],[class*="carrier"],[class*="Airline"]'));
      var outAirline = airlineEls[0] ? (airlineEls[0].textContent || '').trim() : '';
      var retAirline = airlineEls[1] ? (airlineEls[1].textContent || '').trim() : outAirline;
      if (!outAirline) {
        var ams = text.match(/([\\u4e00-\\u9fff]+(?:航空|航班))/g) || [];
        outAirline = ams[0] || '';
        retAirline = ams[1] || outAirline;
      }

      var durEls = Array.from(node.querySelectorAll('[class*="duration"],[class*="Duration"]'));
      var outDur = durEls[0] ? (durEls[0].textContent || '').trim() : '';
      var retDur = durEls[1] ? (durEls[1].textContent || '').trim() : '';
      if (!outDur) {
        var dms = [];
        var dre = /(\\d+)\\s*小時\\s*(\\d+)\\s*分/g, dm;
        while ((dm = dre.exec(text)) !== null) dms.push(dm[1] + 'h ' + dm[2] + 'm');
        outDur = dms[0] || '';
        retDur = dms[1] || '';
      }

      var outStops = text.includes('直飛') ? 0
        : (text.match(/(\\d+)\\s*[轉停]/) ? parseInt(text.match(/(\\d+)\\s*[轉停]/)[1]) : 1);

      return { index: index, outAirline: outAirline, outDep: outDep, outArr: outArr,
               retAirline: retAirline, retDep: retDep, retArr: retArr,
               price: price, outDur: outDur, retDur: retDur,
               outStops: outStops, retStops: 0 };
    }).filter(Boolean);
    if (stratA.length >= 2) return stratA;
  }

  // --- Strategy B: sentinel split ---
  var fullText = document.body.innerText || '';
  var container = document.querySelector('.m-flight-list, .page-box-list');
  if (container && container.innerText && container.innerText.length > fullText.length) {
    fullText = container.innerText;
  }
  var cutMarkers = ['推薦日期', '資料擷取時間', '在 Trip.com 預訂', '常見問題'];
  var flightZone = fullText;
  for (var ci = 0; ci < cutMarkers.length; ci++) {
    var ci2 = flightZone.indexOf(cutMarkers[ci]);
    if (ci2 > 200) { flightZone = flightZone.slice(0, ci2); break; }
  }

  var sentinelRe = /選取|查看詳情/g;
  var lastIdx = 0, blocksList = [], smatch;
  while ((smatch = sentinelRe.exec(flightZone)) !== null) {
    blocksList.push(flightZone.slice(lastIdx, smatch.index));
    lastIdx = smatch.index + smatch[0].length;
  }

  var results = [];
  for (var bi = 0; bi < blocksList.length - 1 && results.length < 10; bi++) {
    var block = blocksList[bi].slice(Math.max(0, blocksList[bi].length - 900));
    var times = block.match(/(\\d{2}:\\d{2})/g) || [];
    if (times.length < 4) continue;

    // Use first 2 as outbound, last 2 as return (handles direct + 1-stop cases)
    var outDep = times[0], outArr = times[1];
    var retDep = times[times.length - 2], retArr = times[times.length - 1];

    var priceMatch = block.match(/TWD[\\s,]*([\\d,]+)/);
    if (!priceMatch) continue;
    var price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price < 2000 || price > 2000000) continue;

    var dms = [], dre2 = /(\\d+)\\s*小時\\s*(\\d+)\\s*分/g, dm2;
    while ((dm2 = dre2.exec(block)) !== null) dms.push(dm2[1] + 'h ' + dm2[2] + 'm');

    var ams2 = block.match(/([\\u4e00-\\u9fff]+(?:航空|航班))/g) || [];
    var outAirline = ams2[0] || '', retAirline = ams2[1] || outAirline;

    results.push({
      index: results.length,
      outAirline: outAirline, outDep: outDep, outArr: outArr,
      retAirline: retAirline, retDep: retDep, retArr: retArr,
      price: price,
      outDur: dms[0] || '', retDur: dms[1] || '',
      outStops: 0, retStops: 0,
    });
  }

  return results;
})()
  `;
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export interface RoundTripValidation {
  valid: FlightData[];
  issues: string[];
  summary: string;
}

/**
 * Structurally validates roundtrip FlightData[] returned by the scraper.
 * Call after scrapeTripRoundTrip() to confirm both legs were extracted before
 * passing data to the API layer.
 */
export function validateRoundTripResult(flights: FlightData[]): RoundTripValidation {
  const issues: string[] = [];

  if (flights.length === 0) {
    return { valid: [], issues: ['scraper returned 0 flights'], summary: '❌ 0 valid roundtrip flights' };
  }

  const valid = flights.filter((f, i) => {
    const tag = `[${i}]`;
    if (f.tripType !== 'roundtrip') {
      issues.push(`${tag} tripType="${f.tripType}" expected "roundtrip"`);
      return false;
    }
    if (!f.returnLeg) {
      issues.push(`${tag} missing returnLeg`);
      return false;
    }
    if (!f.details.departure || !f.details.arrival) {
      issues.push(`${tag} outbound leg missing departure/arrival times`);
      return false;
    }
    if (!f.returnLeg.departure || !f.returnLeg.arrival) {
      issues.push(`${tag} return leg missing departure/arrival times`);
      return false;
    }
    if (f.price < 2000) {
      issues.push(`${tag} price TWD ${f.price} unusually low for roundtrip`);
      return false;
    }
    if (f.price > 500000) {
      issues.push(`${tag} price TWD ${f.price} unusually high`);
      return false;
    }
    return true;
  });

  const summary = valid.length > 0
    ? `✓ ${valid.length}/${flights.length} valid roundtrip flights`
    : `❌ all ${flights.length} flights failed validation`;

  return { valid, issues, summary };
}

// ---------------------------------------------------------------------------
// Roundtrip main exported function
// ---------------------------------------------------------------------------

/**
 * Scrape Trip.com roundtrip flight search results.
 *
 * Uses the same Playwright browser infrastructure as scrapeTripFlights but:
 *  - URL: flighttype=rt&ddate={departureDate}&rdate={returnDate}
 *  - API parser: reads both flightSegments[0] (outbound) and [1] (return)
 *  - DOM fallback: extracts 4-time blocks per card
 *  - Returns FlightData[] with both `details` (outbound) and `returnLeg` set
 *  - Validates structural integrity before returning (no fake data fallback)
 */
export async function scrapeTripRoundTrip(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string,
): Promise<FlightData[]> {
  const originIATA = getIata(origin);
  const destIATA = getIata(destination);
  const url =
    `https://tw.trip.com/flights/${originIATA}-to-${destIATA}/tickets-${originIATA}-${destIATA}/?flighttype=rt` +
    `&dcity=${originIATA}&acity=${destIATA}&ddate=${departureDate}&rdate=${returnDate}`;
  const isVercel = !!process.env.VERCEL;

  console.log(`[tripParser/RT] Starting → ${url}`);

  const capturedApiData: Array<{ url: string; data: any }> = [];
  let browser: playwrightCore.Browser | undefined;

  try {
    // ── Browser launch ─────────────────────────────────────────────────────
    const executablePath = isVercel
      ? await (chromiumSparticuz as any).executablePath()
      : undefined;

    browser = await playwrightCore.chromium.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        ...((isVercel && (chromiumSparticuz as any).args) ? (chromiumSparticuz as any).args : []),
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--window-size=1440,900',
        '--lang=zh-TW',
        '--disable-infobars',
        '--ignore-certificate-errors',
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--hide-scrollbars',
        '--mute-audio',
        '--force-device-scale-factor=1',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--password-store=basic',
      ],
    });

    // ── Context setup ──────────────────────────────────────────────────────
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'zh-TW',
      timezoneId: 'Asia/Taipei',
      extraHTTPHeaders: {
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      },
    });

    await context.addInitScript(STEALTH_SCRIPT);
    const page = await context.newPage();

    // ── Network interception ───────────────────────────────────────────────
    page.on('response', async (response: playwrightCore.Response) => {
      const resUrl = response.url();
      const ct = response.headers()['content-type'] ?? '';
      const isJson = ct.includes('json');
      const looksLikeFlight =
        resUrl.includes('flightList') || resUrl.includes('FlightList') ||
        resUrl.includes('flightSearch') || resUrl.includes('searchFlight') ||
        resUrl.includes('FlightMiddleSearch') || resUrl.includes('soa2/27015') ||
        resUrl.includes('soa2/11296') || resUrl.includes('soa2/24049') ||
        resUrl.includes('intl/flight');

      if (isJson && looksLikeFlight) {
        try {
          const json = await response.json();
          const hasData =
            json?.Response?.FlightRouteItems?.length ||
            json?.data?.flightList?.length ||
            json?.flightList?.length ||
            json?.result?.length ||
            json?.head?.retCode === 'SUCCESS';
          if (hasData) {
            console.log(`[tripParser/RT] Captured API response: ${resUrl}`);
            capturedApiData.push({ url: resUrl, data: json });
          }
        } catch { /* skip */ }
      }
    });

    // ── Navigation ─────────────────────────────────────────────────────────
    await page.mouse.move(400 + Math.random() * 300, 100 + Math.random() * 100);
    console.log('[tripParser/RT] Navigating...');
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: isVercel ? 20000 : 60000,
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: isVercel ? 8000 : 15000 });
    } catch { /* proceed */ }

    // ── Human-behaviour simulation ─────────────────────────────────────────
    console.log('[tripParser/RT] Simulating human behaviour...');
    await sleep(1200, 2500);

    let scrolled = 0;
    while (scrolled < 500) {
      const delta = 40 + Math.floor(Math.random() * 50);
      await page.mouse.wheel(0, delta);
      scrolled += delta;
      await sleep(60, 150);
    }
    await sleep(600, 1200);

    await humanMouseMove(page, 350, 400, 900, 500);
    await sleep(200, 500);
    await humanMouseMove(page, 900, 500, 600, 650);
    await sleep(300, 700);

    while (scrolled < 1200) {
      const delta = 50 + Math.floor(Math.random() * 60);
      await page.mouse.wheel(0, delta);
      scrolled += delta;
      await sleep(80, 180);
    }
    await sleep(800, 1500);

    // ── Wait for flight data ───────────────────────────────────────────────
    console.log('[tripParser/RT] Waiting for flight data to render...');
    try {
      await page.waitForFunction(
        () => {
          const t = document.body.innerText || '';
          return (
            (t.includes('選取') && t.includes('TWD')) ||
            (t.includes('查看詳情') && t.includes('TWD')) ||
            t.includes('找不到航班') ||
            t.includes('0 個航班')
          );
        },
        { timeout: isVercel ? 25000 : 45000, polling: 1000 },
      );
      console.log('[tripParser/RT] Flight data detected in page.');
    } catch {
      console.warn('[tripParser/RT] Timed out waiting for flight data; proceeding with available content.');
    }

    await sleep(800, 1500);
    await page.mouse.wheel(0, -(100 + Math.floor(Math.random() * 100)));
    await sleep(300, 600);

    // ── Strategy 1: intercepted API data ──────────────────────────────────
    if (capturedApiData.length > 0) {
      console.log(`[tripParser/RT] Parsing ${capturedApiData.length} captured API responses...`);
      const apiFlights = parseApiResponsesRoundTrip(
        capturedApiData, url, origin, destination, departureDate, returnDate,
      );
      if (apiFlights.length > 0) {
        await browser.close();
        const validation = validateRoundTripResult(apiFlights);
        console.log(`[tripParser/RT] API strategy: ${validation.summary}`);
        if (validation.issues.length) console.warn('[tripParser/RT] Issues:', validation.issues);
        return validation.valid;
      }
    }

    // ── Strategy 2: DOM extraction ─────────────────────────────────────────
    console.log('[tripParser/RT] Falling back to DOM extraction...');
    const domScript = buildDomParserScriptRoundTrip(originIATA, destIATA);
    const rawFlights: Array<{
      index: number;
      outAirline: string; outDep: string; outArr: string;
      retAirline: string; retDep: string; retArr: string;
      price: number; outDur: string; retDur: string;
      outStops: number; retStops: number;
    }> = await page.evaluate(domScript) as any;

    await browser.close();

    const validRaw = (rawFlights ?? []).filter(f => f?.price > 0).slice(0, 10);
    console.log(`[tripParser/RT] DOM extraction found ${validRaw.length} roundtrip bundles.`);
    if (validRaw.length === 0) return [];

    const domResults: FlightData[] = validRaw.map(f => ({
      id: `tripcom_rt_dom_${departureDate}_${returnDate}_${f.index}_${Date.now()}`,
      type: 'flight' as const,
      tripType: 'roundtrip' as const,
      provider: 'Trip.com',
      title: `${origin} ⇄ ${destination} · 來回`,
      price: f.price,
      currency: 'TWD',
      emoji: '✈️',
      affiliate_url: url,
      details: {
        airline: f.outAirline || 'Unknown',
        departure: f.outDep,
        arrival: f.outArr,
        stops: f.outStops,
        duration: f.outDur || '--',
      },
      returnLeg: {
        airline: f.retAirline || 'Unknown',
        departure: f.retDep,
        arrival: f.retArr,
        stops: f.retStops,
        duration: f.retDur || '--',
      },
    }));

    const domValidation = validateRoundTripResult(domResults);
    console.log(`[tripParser/RT] DOM strategy: ${domValidation.summary}`);
    if (domValidation.issues.length) console.warn('[tripParser/RT] Issues:', domValidation.issues);
    return domValidation.valid;

  } catch (error: any) {
    if (browser) await browser.close();
    console.warn('[tripParser/RT] Scraper failed:', error?.message ?? error);
    return [];
  }
}
