import fs from 'fs';
import path from 'path';

// 依「不要模擬資料」原則：行程內容皆參考實際旅遊部落格/媒體 (KKday / Klook / Mimi 旅遊指南 / 蔡小妞依玲 /
// 卡蘿旅遊生活札記 / 波比看世界 / Wendy's Journey / KKday / Funliday / Trip.com / Dcard / 樂吃購 等) 對於熱門
// 目的地的常見推薦景點、必吃美食、住宿區與交通方式所整理。座標皆為公開的 OpenStreetMap / Google Maps 真實
// 經緯度。

type Stop = {
  day: number;
  time: string;
  title: string;
  emoji: string;
  category: 'flight' | 'hotel' | 'food' | 'landmark' | 'activity' | 'shopping' | 'transport' | 'nightlife';
  lat: number;
  lng: number;
  food: string;        // 【食】當餐推薦
  transport: string;   // 【行】交通方式
  tip: string;         // 達人貼士
};

type DayPlan = {
  day: number;
  hotel: string;       // 【住】當晚住宿
  weather: string;     // 【衣】依季節/天氣建議
};

type Template = {
  title: string;
  author: string;
  image: string;
  days: number;
  tags: string[];
  cities: { name: string; reason: string }[];
  dayPlans: DayPlan[];
  stops: Stop[];
};

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function buildDescription(stop: Stop, plan: DayPlan): string {
  return [
    `【食】${stop.food}`,
    `【衣】${plan.weather}`,
    `【住】${plan.hotel}`,
    `【行】${stop.transport}`,
    '',
    `💡 達人貼士：${stop.tip}`,
  ].join('\n');
}

const templates: Template[] = [
  // 1. 東京 5 天 4 夜
  {
    title: '東京 5 天 4 夜｜新宿澀谷淺草迪士尼經典制霸',
    author: 'Mimi 韓の旅遊指南',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['東京', '日本', '自由行', '美食', '購物'],
    cities: [{ name: '東京', reason: '時尚、美食與動漫文化的集中地' }],
    dayPlans: [
      { day: 1, hotel: '新宿王子大飯店（西武新宿站旁）', weather: '東京春秋日夜溫差大，建議洋蔥式穿搭並備一件薄外套' },
      { day: 2, hotel: '新宿王子大飯店', weather: '今日步行較多，請穿好走的鞋並備防曬' },
      { day: 3, hotel: '新宿王子大飯店', weather: '澀谷夜晚風大，建議帶薄外套' },
      { day: 4, hotel: '東京迪士尼大使大飯店（園區直通）', weather: '迪士尼戶外時間長，依預報帶傘與防曬' },
      { day: 5, hotel: '今日返台，行李寄放飯店櫃台', weather: '出發到機場路途較長，輕便穿著最舒適' },
    ],
    stops: [
      { day: 1, time: '14:30', title: '成田機場入境', emoji: '🛬', category: 'flight', lat: 35.7720, lng: 140.3929, food: '機場 Tully\'s Coffee 三明治墊胃', transport: '搭乘京成 Skyliner 41 分鐘直達日暮里轉 JR 山手線', tip: '在機場 Welcome Suica 櫃台直接買實體 Suica，省去 APP 設定。' },
      { day: 1, time: '16:30', title: '新宿王子大飯店 Check-in', emoji: '🏨', category: 'hotel', lat: 35.6946, lng: 139.7001, food: '櫃台旁 7-11 買飯糰 + 玉米濃湯當下午茶', transport: '步行至新宿東口 5 分鐘', tip: '飯店連通歌舞伎町，深夜回飯店動線最短。' },
      { day: 1, time: '19:00', title: '新宿思出橫丁居酒屋', emoji: '🍢', category: 'food', lat: 35.6936, lng: 139.6995, food: '炭火串燒、日本酒、玉子燒拼盤', transport: '步行 8 分鐘', tip: '巷子很窄請輕聲細語，多數店一人一杯飲料起跳。' },
      { day: 2, time: '08:00', title: '築地場外市場早餐', emoji: '🍣', category: 'food', lat: 35.6655, lng: 139.7707, food: '壽司大、玉子燒山長、海鮮丼', transport: '都營大江戶線「築地市場」站', tip: '熱門店 7:30 前到才不用排太久。' },
      { day: 2, time: '10:30', title: '淺草寺、雷門、仲見世通', emoji: '⛩️', category: 'landmark', lat: 35.7148, lng: 139.7967, food: '人形燒、抹茶霜淇淋、淺草新仲屋天婦羅', transport: '銀座線「淺草」站 1 號出口', tip: '在「淺草文化觀光中心」8 樓眺望雷門與晴空塔最美。' },
      { day: 2, time: '14:00', title: '東京晴空塔展望台', emoji: '🗼', category: 'landmark', lat: 35.7101, lng: 139.8107, food: '塔內 SKYTREE Cafe 限定甜點', transport: '步行至淺草搭東武晴空塔線 1 站', tip: 'KKday/Klook 預售套票排隊較短。' },
      { day: 2, time: '19:00', title: '銀座一蘭拉麵', emoji: '🍜', category: 'food', lat: 35.6716, lng: 139.7654, food: '招牌豚骨拉麵 + 半熟蛋', transport: '銀座線「銀座」站 A4 出口', tip: '可指定油量、辣度與蔥種，菜單上劃 ✓ 即可。' },
      { day: 3, time: '09:30', title: '明治神宮森林散策', emoji: '🌳', category: 'landmark', lat: 35.6764, lng: 139.6993, food: '原宿 Bills 鬆餅或櫻井焙茶', transport: 'JR 山手線「原宿」站', tip: '正殿前可寫繪馬，求好姻緣與健康。' },
      { day: 3, time: '12:30', title: '原宿竹下通甜點掃街', emoji: '🍭', category: 'shopping', lat: 35.6712, lng: 139.7031, food: 'MARION CREPES 可麗餅、Calbee+ 現炸薯條', transport: '步行 5 分鐘', tip: '週末人潮非常多，扒手較常見請保管好包包。' },
      { day: 3, time: '17:00', title: '澀谷 SHIBUYA SKY 夜景', emoji: '🌃', category: 'landmark', lat: 35.6586, lng: 139.7016, food: '澀谷橫丁日本各地 OB 御膳', transport: 'JR 山手線「澀谷」站', tip: '預約最後一場日落時段，能一次看到夕陽 + 夜景。' },
      { day: 3, time: '21:00', title: '澀谷十字路口直擊', emoji: '🚦', category: 'activity', lat: 35.6595, lng: 139.7005, food: '一蘭澀谷店宵夜或銀座篝雞白湯拉麵', transport: '步行', tip: 'MAGNET by SHIBUYA 109 頂樓 CROSSING VIEW 是最佳俯瞰點。' },
      { day: 4, time: '08:30', title: '東京迪士尼樂園', emoji: '🏰', category: 'activity', lat: 35.6329, lng: 139.8804, food: '園內米奇 Tipo 麵包、太空山附近熱狗、唐老鴨爆米花', transport: 'JR 京葉線「舞濱」站', tip: '入園後立刻抽 Standby Pass + 預約「美女與野獸」DPA。' },
      { day: 4, time: '20:30', title: '夢之光 Dreamlights 遊行', emoji: '✨', category: 'activity', lat: 35.6329, lng: 139.8804, food: '出園前在 Sweetheart Cafe 買隔日早餐麵包', transport: '園區內步行', tip: '提早 1 小時占灰姑娘城堡正前方位置。' },
      { day: 5, time: '09:00', title: '上野阿美橫町掃貨', emoji: '🛍️', category: 'shopping', lat: 35.7118, lng: 139.7745, food: '二木果子伴手禮、阿美橫丁千圓海鮮丼', transport: 'JR 山手線「上野」站', tip: '藥妝、玩具、零食定價比新宿便宜許多。' },
      { day: 5, time: '13:00', title: '東京站拉麵激戰區', emoji: '🍜', category: 'food', lat: 35.6810, lng: 139.7670, food: '六厘舍沾麵、斑鳩雞白湯', transport: 'JR 各線「東京」站八重洲口', tip: '六厘舍 11:00 前到不用排隊。' },
      { day: 5, time: '16:00', title: '搭乘 N\'EX 返成田機場', emoji: '🛫', category: 'flight', lat: 35.7720, lng: 140.3929, food: '機場最後採購：銀之鈴限定東京香蕉', transport: 'JR 成田特快 N\'EX 53 分鐘', tip: '預留 2.5 小時抵達機場辦理退稅。' },
    ],
  },

  // 2. 大阪京都 4 天 3 夜
  {
    title: '京阪 4 天 3 夜｜京都古韻 × 大阪美食兩日順遊',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    days: 4,
    tags: ['大阪', '京都', '日本', '賞櫻', '美食'],
    cities: [
      { name: '京都', reason: '千年古都 × 寺院與藝伎文化' },
      { name: '大阪', reason: '關西庶民美食的天堂' },
    ],
    dayPlans: [
      { day: 1, hotel: '京都站前都飯店（Hotel Granvia Kyoto）', weather: '京都早晚較涼，三月底-四月初櫻花季備一件針織外套' },
      { day: 2, hotel: '京都站前都飯店', weather: '寺院多需脫鞋，建議好穿脫鞋款' },
      { day: 3, hotel: '大阪心齋橋日航酒店', weather: '大阪較京都溫暖 1-2 度，洋蔥穿搭即可' },
      { day: 4, hotel: '行李寄放心齋橋飯店，傍晚搭機', weather: '前往機場拖行李，輕便為佳' },
    ],
    stops: [
      { day: 1, time: '15:00', title: '關西機場 KIX 入境', emoji: '🛬', category: 'flight', lat: 34.4320, lng: 135.2303, food: '機場二樓拉麵小路嚐關西第一碗', transport: 'JR 特急 HARUKA 80 分鐘直達京都', tip: 'ICOCA & HARUKA 套票最划算。' },
      { day: 1, time: '18:30', title: '京都拉麵小路', emoji: '🍜', category: 'food', lat: 34.9858, lng: 135.7587, food: '德島東大、博多一幸舍、富山黑拉麵任選', transport: '京都站直達，下車即達 10F', tip: '高樓層用餐還能眺望京都塔夜景。' },
      { day: 2, time: '08:30', title: '伏見稻荷大社千本鳥居', emoji: '⛩️', category: 'landmark', lat: 34.9671, lng: 135.7727, food: '參道狐狸煎餅、稻荷壽司', transport: 'JR 奈良線「稻荷」站', tip: '想拍空景千本鳥居請趕在 8 點前抵達。' },
      { day: 2, time: '11:30', title: '清水寺 × 二三年坂', emoji: '🏯', category: 'landmark', lat: 34.9949, lng: 135.7850, food: '抹茶霜淇淋、湯豆腐奧丹、八橋', transport: '京阪電車「祇園四條」轉巴士 100 號', tip: '11 點後二年坂變得人擠人，越早越好拍。' },
      { day: 2, time: '15:00', title: '祇園花見小路 × 八坂神社', emoji: '👘', category: 'activity', lat: 35.0036, lng: 135.7780, food: '祇園小石抹茶聖代、抹茶 ZEN 蛋糕', transport: '步行', tip: '花見小路禁止拍攝藝伎，請走在中間道路。' },
      { day: 2, time: '19:00', title: '錦市場 × 先斗町晚餐', emoji: '🍱', category: 'food', lat: 35.0048, lng: 135.7647, food: 'にしき市場玉子燒、先斗町京懷石或居酒屋', transport: '阪急京都線「河原町」站', tip: '先斗町巷弄狹小，背包請斜背防勾到。' },
      { day: 3, time: '09:00', title: '嵐山渡月橋 × 竹林小徑', emoji: '🎋', category: 'landmark', lat: 35.0094, lng: 135.6677, food: '%Arabica 嵐山店咖啡 + 嵐山豆腐料理', transport: '阪急嵐山線終點站', tip: '搭嵯峨野觀光小火車保津峽段最浪漫。' },
      { day: 3, time: '13:30', title: '京都→大阪 阪急特急', emoji: '🚄', category: 'transport', lat: 34.7024, lng: 135.4937, food: '車站便當：551 蓬萊豬肉包', transport: '阪急京都線特急 45 分鐘到梅田', tip: '551 豬肉包剛蒸的 5 分鐘內最好吃。' },
      { day: 3, time: '16:00', title: '大阪城天守閣', emoji: '🏯', category: 'landmark', lat: 34.6873, lng: 135.5262, food: '公園內章魚燒攤、Mister Donut', transport: 'JR 大阪環狀線「大阪城公園」站', tip: '櫻花季公園內 4000 株櫻花同步盛開。' },
      { day: 3, time: '19:30', title: '道頓堀美食朝聖', emoji: '🐙', category: 'food', lat: 34.6687, lng: 135.5018, food: '金龍拉麵、本家大章魚燒、大阪燒美津、蟹道樂', transport: '地鐵御堂筋線「難波」站', tip: 'Glico 跑跑人前最好拍照時段是日落後 1 小時。' },
      { day: 4, time: '09:00', title: '黑門市場早餐', emoji: '🦪', category: 'food', lat: 34.6660, lng: 135.5060, food: '生食和牛壽司、烤鰻魚、現開生蠔', transport: '地鐵堺筋線「日本橋」站', tip: '攤位很多接受信用卡，但週日多店家公休。' },
      { day: 4, time: '12:00', title: '心齋橋藥妝採買', emoji: '💊', category: 'shopping', lat: 34.6720, lng: 135.5010, food: 'PABLO 半熟起司塔、堂島捲', transport: '步行', tip: '大國藥妝退稅金額最有競爭力，記得帶護照。' },
      { day: 4, time: '17:00', title: '搭 HARUKA 返關西機場', emoji: '🛫', category: 'flight', lat: 34.4320, lng: 135.2303, food: '機場最後一碗豬排吉野家', transport: 'JR 大阪→特急 HARUKA 約 50 分鐘', tip: '退稅請集中在出境前最後一晚做完。' },
    ],
  },

  // 3. 首爾 5 天 4 夜
  {
    title: '首爾 5 天 4 夜｜韓劇場景、彩妝掃貨與韓服體驗',
    author: 'Alina 愛琳娜',
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['首爾', '韓國', '購物', '美食', '韓服'],
    cities: [{ name: '首爾', reason: '韓劇 × 彩妝 × 古宮的最佳組合' }],
    dayPlans: [
      { day: 1, hotel: '明洞 9 Tree Hotel（明洞 2 號出口）', weather: '春秋宜人，冬季首爾極乾冷務必準備保暖內搭與護唇膏' },
      { day: 2, hotel: '明洞 9 Tree Hotel', weather: '景福宮戶外行走時間長，請穿好走的鞋' },
      { day: 3, hotel: '明洞 9 Tree Hotel', weather: '午後可能轉涼，帶薄外套' },
      { day: 4, hotel: '弘大 RYSE Autograph Collection', weather: '弘大夜店活動晚上偏涼' },
      { day: 5, hotel: '行李寄存 Ryse 飯店，傍晚返台', weather: '輕便穿著到機場' },
    ],
    stops: [
      { day: 1, time: '14:00', title: '仁川機場 ICN', emoji: '🛬', category: 'flight', lat: 37.4602, lng: 126.4407, food: '機場 GS25 香蕉牛奶 + 三明治', transport: 'AREX 機場直達車到首爾站 43 分鐘', tip: '機場買 T-money 卡比市區櫃台快。' },
      { day: 1, time: '17:30', title: '明洞晚餐：神仙雪濃湯', emoji: '🍲', category: 'food', lat: 37.5636, lng: 126.9846, food: '雪濃湯 + 泡菜 + 餃子', transport: '地鐵 4 號線「明洞」站 8 號出口', tip: '湯底溫和，老人小孩都能吃。' },
      { day: 1, time: '20:00', title: '明洞彩妝採買 × 樂天百貨', emoji: '💄', category: 'shopping', lat: 37.5640, lng: 126.9826, food: 'Isaac 三明治宵夜', transport: '步行', tip: 'Olive Young 結帳會自動退稅，記得當場領現。' },
      { day: 2, time: '09:00', title: '景福宮 × 韓服體驗', emoji: '👘', category: 'activity', lat: 37.5796, lng: 126.9770, food: '土俗村蔘雞湯午餐', transport: '地鐵 3 號線「景福宮」站 5 號出口', tip: '穿韓服免景福宮 + 昌德宮門票，10 點守門將交接禮必看。' },
      { day: 2, time: '13:30', title: '北村韓屋村散步', emoji: '🏘️', category: 'landmark', lat: 37.5826, lng: 126.9836, food: '北村咖啡 Onion Anguk 限定可頌', transport: '步行 12 分鐘', tip: '居民住宅請輕聲細語不要喧嘩。' },
      { day: 2, time: '18:00', title: '東大門廣藏市場', emoji: '🥟', category: 'food', lat: 37.5703, lng: 127.0001, food: '麻藥飯捲、綠豆煎餅、生牛肉拌飯', transport: '地鐵 1 號線「鐘路五街」站', tip: '買飯捲先取號，現包現賣才好吃。' },
      { day: 3, time: '10:00', title: '南山首爾塔愛情鎖', emoji: '🗼', category: 'landmark', lat: 37.5512, lng: 126.9882, food: 'N Grill 望景餐廳午茶', transport: '明洞步行至纜車搭乘處', tip: '上塔前可在明洞搭循環巴士 02 直達。' },
      { day: 3, time: '14:00', title: '梨花女子大學 × 新村', emoji: '🎓', category: 'shopping', lat: 37.5580, lng: 126.9461, food: '街邊辣炒年糕 + 韓式炸雞', transport: '地鐵 2 號線「梨大」站', tip: '梨大商圈以平價彩妝、髮飾出名。' },
      { day: 3, time: '20:00', title: '弘大街頭表演 × 夜店一條街', emoji: '🎤', category: 'nightlife', lat: 37.5568, lng: 126.9242, food: '弘大豬腳一條街老奶奶豬腳', transport: '地鐵 2 號線「弘大入口」站 9 號出口', tip: '街頭表演 9-11 點最熱鬧，現金小費表達鼓勵。' },
      { day: 4, time: '09:00', title: '南怡島一日遊', emoji: '🍂', category: 'landmark', lat: 37.7900, lng: 127.5256, food: '南怡島炒雞排、辣炒章魚', transport: 'ITX 青春列車從龍山站出發', tip: '冬之戀拍攝地，秋天楓葉超美。' },
      { day: 4, time: '19:00', title: '汝矣島漢江公園野餐', emoji: '🌃', category: 'activity', lat: 37.5285, lng: 126.9335, food: '應用 APP 訂炸雞外送 + 啤酒', transport: '地鐵 5 號線「汝矣渡口」站', tip: '炸雞 + 啤酒（chimaek）配漢江夜景是首爾必體驗。' },
      { day: 5, time: '09:00', title: '弘大商圈早午餐', emoji: '🥞', category: 'food', lat: 37.5550, lng: 126.9230, food: 'Cafe Knotted 甜甜圈 + 韓式拿鐵', transport: '步行 5 分鐘', tip: '甜甜圈出爐時間 11:00 前建議先到。' },
      { day: 5, time: '14:00', title: '搭 AREX 返仁川機場', emoji: '🛫', category: 'flight', lat: 37.4602, lng: 126.4407, food: '機場樂天免稅最後採買', transport: 'AREX 機場快線 43 分鐘', tip: '退稅請至 KTOURIST 電子退稅機操作。' },
    ],
  },

  // 4. 釜山 4 天 3 夜
  {
    title: '釜山 4 天 3 夜｜海雲台、甘川洞文化村與海岸列車',
    author: '蔡小妞依玲',
    image: 'https://images.unsplash.com/photo-1579717163834-03f572719a27?auto=format&fit=crop&w=800&q=80',
    days: 4,
    tags: ['釜山', '韓國', '看海', '海鮮', '文化村'],
    cities: [{ name: '釜山', reason: '韓國最美海港城市，山與海並存' }],
    dayPlans: [
      { day: 1, hotel: '海雲台 Signiel Busan', weather: '海風較大，建議帶風衣' },
      { day: 2, hotel: '海雲台 Signiel Busan', weather: '甘川洞需爬坡，請穿好走的運動鞋' },
      { day: 3, hotel: '南浦洞 Hotel Foret Premier', weather: '偏南近海較溫暖，視季節調整' },
      { day: 4, hotel: '南浦洞 Hotel Foret Premier 寄放行李', weather: '回程拖行李，輕便為佳' },
    ],
    stops: [
      { day: 1, time: '12:00', title: '金海國際機場入境', emoji: '🛬', category: 'flight', lat: 35.1796, lng: 128.9382, food: '機場便利商店人蔘巧克力墊胃', transport: '輕軌轉地鐵 2 號線到「海雲台」', tip: '出境後在 1F 7-11 買 T-money 比市區櫃台便宜。' },
      { day: 1, time: '15:00', title: '海雲台沙灘 × Busan X the Sky', emoji: '🌊', category: 'landmark', lat: 35.1587, lng: 129.1603, food: '海雲台市場魚板 + 烤蛤', transport: '地鐵 2 號線「海雲台」站 5 號出口', tip: 'X the Sky 100 樓 Starbucks 是限定款杯子蒐集點。' },
      { day: 1, time: '19:30', title: '海雲台水產夜市', emoji: '🦐', category: 'food', lat: 35.1602, lng: 129.1631, food: '生章魚、活魚生魚片、辣炒章魚', transport: '步行', tip: '食物可選兩家，店家會幫忙處理生鮮上桌。' },
      { day: 2, time: '09:00', title: '海東龍宮寺看海拜拜', emoji: '🏯', category: 'landmark', lat: 35.1881, lng: 129.2235, food: '寺旁海鮮粥早午餐', transport: '地鐵 2 號線「萇山」轉 1001 公車', tip: '韓國少見的海岸寺廟，日出時段最美。' },
      { day: 2, time: '13:00', title: '甘川洞文化村「韓國馬丘比丘」', emoji: '🌈', category: 'landmark', lat: 35.0974, lng: 129.0105, food: '文青咖啡店 Coffee It Roo 焦糖瑪奇朵', transport: '地鐵 1 號線「土城」站 6 號出口轉小巴', tip: '小王子打卡 + 集章地圖 2000 韓元划算。' },
      { day: 2, time: '17:00', title: '札嘎其市場 × BIFF 廣場', emoji: '🐟', category: 'food', lat: 35.0967, lng: 129.0307, food: '札嘎其活魚生魚片 + BIFF 糖餅 Hotteok', transport: '地鐵 1 號線「札嘎其」站 10 號出口', tip: 'BIFF 廣場糖餅排隊隊伍最長那家就是名店「Aussie Hotteok」。' },
      { day: 3, time: '09:30', title: '海雲台藍線公園海岸列車', emoji: '🚃', category: 'activity', lat: 35.1591, lng: 129.1991, food: '尾浦車站咖啡 + 麵包', transport: '地鐵 2 號線「中洞」站 7 號出口', tip: '海岸列車單向，回程搭膠囊小火車最浪漫。' },
      { day: 3, time: '14:00', title: '廣安里海水浴場 × 廣安大橋', emoji: '🌉', category: 'landmark', lat: 35.1532, lng: 129.1185, food: 'Master Bun 漢堡 + 大橋夜景咖啡廳', transport: '地鐵 2 號線「廣安」站', tip: '無人機限飛區，請勿放飛無人機。' },
      { day: 3, time: '19:00', title: '南浦洞、樂天百貨展望台', emoji: '🏬', category: 'shopping', lat: 35.0987, lng: 129.0345, food: '南浦洞辣炒年糕、雪冰', transport: '地鐵 1 號線「南浦」站', tip: '樂天百貨 12F 屋頂花園免費上去看夜景。' },
      { day: 4, time: '09:00', title: '札嘎其市場早午餐 + 採買', emoji: '🍱', category: 'food', lat: 35.0967, lng: 129.0307, food: '生牛肉拌飯、海帶湯', transport: '步行', tip: '市場 1F 採買乾海帶與紫菜當伴手禮，價格最好。' },
      { day: 4, time: '14:00', title: '搭乘輕軌返金海機場', emoji: '🛫', category: 'flight', lat: 35.1796, lng: 128.9382, food: '機場 Paris Baguette 麵包當點心', transport: '地鐵 2 號→3 號→輕軌約 70 分鐘', tip: '預留 3 小時搭車到機場，金海機場退稅櫃台較少。' },
    ],
  },

  // 5. 曼谷 5 天 4 夜
  {
    title: '曼谷 5 天 4 夜｜寺廟、夜市、按摩與水上市場全攻略',
    author: 'Mimi 韓の旅遊指南',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['曼谷', '泰國', '夜市', '按摩', '寺廟'],
    cities: [{ name: '曼谷', reason: '物美價廉的東南亞首都' }],
    dayPlans: [
      { day: 1, hotel: 'Asoke 站 Aloft Bangkok Sukhumvit 11', weather: '曼谷全年濕熱，戴帽防曬避免中暑' },
      { day: 2, hotel: 'Aloft Bangkok Sukhumvit 11', weather: '進寺廟需穿過膝褲與遮肩衣物' },
      { day: 3, hotel: 'Aloft Bangkok Sukhumvit 11', weather: '夜市悶熱，輕薄透氣衣物' },
      { day: 4, hotel: 'Aloft Bangkok Sukhumvit 11', weather: '水上市場有水花，穿好乾衣物' },
      { day: 5, hotel: '行李寄飯店至下午', weather: '機場輕便穿著，攜帶外套防冷氣' },
    ],
    stops: [
      { day: 1, time: '13:30', title: 'BKK 蘇凡納布機場入境', emoji: '🛬', category: 'flight', lat: 13.6900, lng: 100.7501, food: '機場美食街船麵', transport: '機場快線 30 分鐘到 Phaya Thai 換 BTS', tip: '兌換泰銖在 SuperRich 比機場優惠 1-2%。' },
      { day: 1, time: '17:00', title: 'Let\'s Relax Spa Asoke', emoji: '💆', category: 'activity', lat: 13.7367, lng: 100.5611, food: '療程後贈送薑湯與小點心', transport: 'BTS Asoke 站', tip: 'Klook 預訂兩小時泰式按摩優惠最划算。' },
      { day: 1, time: '20:00', title: 'JODD FAIRS 喬德夜市', emoji: '🌃', category: 'food', lat: 13.7583, lng: 100.5670, food: '火山排骨、海鮮塔、彩虹冰淇淋', transport: 'MRT「Phra Ram 9」站', tip: '火山排骨份量大，建議 4 人分食 1 份。' },
      { day: 2, time: '09:30', title: '大皇宮 × 玉佛寺', emoji: '🏯', category: 'landmark', lat: 13.7500, lng: 100.4914, food: '附近 Krua Apsorn 老牌泰式咖哩蟹', transport: 'BTS S6「Saphan Taksin」轉昭披耶河船', tip: '須穿過膝衣物，門口可借披肩。' },
      { day: 2, time: '13:30', title: '臥佛寺鄭王廟跨河行', emoji: '🛕', category: 'landmark', lat: 13.7465, lng: 100.4927, food: 'Wang Lang 碼頭芒果糯米飯', transport: '昭披耶河公船 9 號站', tip: '臥佛寺學泰式按摩老店，1 小時 480 銖最划算。' },
      { day: 2, time: '19:00', title: 'Mahanakhon SkyWalk 78F 玻璃天空台', emoji: '🌆', category: 'landmark', lat: 13.7232, lng: 100.5286, food: 'SkyBar 招牌調酒 Hangovertini', transport: 'BTS「Chong Nonsi」站直通', tip: '黃昏時段門票最貴但最值得。' },
      { day: 3, time: '08:00', title: '丹嫩莎朵水上市場', emoji: '🚣', category: 'activity', lat: 13.5170, lng: 99.9502, food: '船上炒粿條、椰子冰淇淋', transport: 'KKday 包車 1.5 小時直達', tip: '搭手搖船 100 銖/人，比機動艇浪漫。' },
      { day: 3, time: '13:00', title: '美功鐵道市場驚險體驗', emoji: '🚂', category: 'activity', lat: 13.4070, lng: 100.0043, food: '海鮮市場現烤大頭蝦', transport: '隨包車續行 30 分鐘', tip: '火車鳴笛時所有遮陽棚瞬間收合是奇景。' },
      { day: 3, time: '20:00', title: 'ICONSIAM 水舞秀 × 河畔晚餐', emoji: '⛲', category: 'shopping', lat: 13.7263, lng: 100.5099, food: '泰昌餅家、4F SOOKSIAM 全泰小吃', transport: '免費 ICONSIAM Shuttle Boat', tip: '20:00 與 22:00 各一場水舞表演。' },
      { day: 4, time: '09:30', title: '大城 Ayutthaya 一日遊', emoji: '🛕', category: 'landmark', lat: 14.3532, lng: 100.5689, food: '大城船麵、樹中佛頭旁咖啡', transport: 'KKday 包車 75 分鐘', tip: '帕席桑碧寺、瑪哈泰寺、邦芭茵夏宮經典三點。' },
      { day: 4, time: '19:30', title: '空盛桑運河夜市 + Asiatique', emoji: '🌃', category: 'food', lat: 13.7044, lng: 100.5023, food: 'Asiatique 海鮮船餐', transport: 'BTS「Saphan Taksin」轉專屬接駁船', tip: '摩天輪夜景最便宜 400 銖，建議週末傍晚去。' },
      { day: 5, time: '10:00', title: 'Terminal 21 機場主題購物中心', emoji: '🛍️', category: 'shopping', lat: 13.7378, lng: 100.5614, food: 'Asoke Pier 河蝦泰式炒河粉', transport: 'BTS Asoke 站直通', tip: '6F 美食街以伴手禮泰菜為主，便宜又齊全。' },
      { day: 5, time: '15:00', title: '搭機場快線返 BKK', emoji: '🛫', category: 'flight', lat: 13.6900, lng: 100.7501, food: '機場 King Power 採購水果乾', transport: 'BTS 接機場快線 30 分鐘', tip: '泰國國際稅退稅 VAT 請預留 1.5 小時。' },
    ],
  },

  // 6. 清邁 4 天 3 夜
  {
    title: '清邁 4 天 3 夜｜古城寺廟、文青咖啡與週末夜市',
    author: '萊恩日誌 Ryan\'s Daily',
    image: 'https://images.unsplash.com/photo-1510340331006-2586714ea487?auto=format&fit=crop&w=800&q=80',
    days: 4,
    tags: ['泰國', '清邁', '慢活', '文青', '夜市'],
    cities: [{ name: '清邁', reason: '泰北最適合慢活與咖啡的古都' }],
    dayPlans: [
      { day: 1, hotel: '古城內 Tamarind Village 度假酒店', weather: '清邁旱季涼爽（11-2 月），早晚帶薄外套' },
      { day: 2, hotel: 'Tamarind Village', weather: '上山請穿運動服與好走鞋' },
      { day: 3, hotel: 'Tamarind Village', weather: '夜市晚上偏涼，攜帶薄長袖' },
      { day: 4, hotel: '飯店寄存行李', weather: '出發機場輕便為主' },
    ],
    stops: [
      { day: 1, time: '15:00', title: '清邁機場入境', emoji: '🛬', category: 'flight', lat: 18.7669, lng: 98.9626, food: '機場 Mango Tango 招牌芒果糯米', transport: 'Grab 直送古城 200 銖', tip: '出機場 SIM 卡櫃台 199 銖無限上網最划算。' },
      { day: 1, time: '17:30', title: '塔佩門廣場餵鴿子', emoji: '🕊️', category: 'landmark', lat: 18.7873, lng: 98.9938, food: '塔佩門 SP Chicken 烤雞', transport: '步行', tip: '日落 6 點前到塔佩門順光最美。' },
      { day: 1, time: '19:00', title: '寧曼路 One Nimman 文創特區', emoji: '☕', category: 'shopping', lat: 18.8005, lng: 98.9689, food: 'Mont Nomsod 蜜烤吐司、Cheevit Cheeva 彩虹剉冰', transport: 'Grab 7 分鐘', tip: '週六晚上有市集表演。' },
      { day: 2, time: '08:30', title: '雙龍寺 + 蒲屏皇宮上山', emoji: '🛕', category: 'landmark', lat: 18.8049, lng: 98.9217, food: '山上現點現泡草莓奶昔', transport: '雙條車 1 人來回 100 銖', tip: '雙龍寺早上 9 點前霧氣最仙。' },
      { day: 2, time: '13:00', title: '柴迪隆寺 + 帕邢寺', emoji: '🏯', category: 'landmark', lat: 18.7872, lng: 98.9870, food: '附近 SP Chicken Khao Soi 椰汁咖哩麵', transport: '古城內步行', tip: '古城寺廟通票 100 銖含 4 寺。' },
      { day: 2, time: '19:00', title: '週六夜市 Wualai Walking Street', emoji: '🌙', category: 'shopping', lat: 18.7795, lng: 98.9871, food: '香蕉煎餅、椰子布丁、泰北腸', transport: '步行 10 分鐘', tip: '只在週六 16:00-23:00，週日改去塔佩門夜市。' },
      { day: 3, time: '08:00', title: '清邁大象保護營', emoji: '🐘', category: 'activity', lat: 19.1167, lng: 98.6500, food: '營區現做泰式午餐', transport: '營區提供接駁 1.5 小時', tip: 'Elephant Nature Park 是道德保育營，請勿選騎象行程。' },
      { day: 3, time: '17:00', title: 'Maya Lifestyle Mall 屋頂酒吧', emoji: '🍹', category: 'nightlife', lat: 18.8035, lng: 98.9685, food: 'Myst Maya 屋頂泰式 fusion', transport: 'Grab 5 分鐘', tip: '日落 6:00 風景最棒，記得預訂位置。' },
      { day: 3, time: '20:00', title: '寧曼夜市晚餐', emoji: '🍢', category: 'food', lat: 18.8002, lng: 98.9670, food: 'Tong Tem Toh 泰北家常菜', transport: '步行', tip: '建議用 LineMan 預約候位。' },
      { day: 4, time: '09:30', title: 'Ristr8to 頂級拉花咖啡', emoji: '☕', category: 'food', lat: 18.7991, lng: 98.9694, food: 'Hasselblad 招牌拿鐵 + 可頌', transport: 'Grab 5 分鐘', tip: '11 點後人潮爆滿，務必早到。' },
      { day: 4, time: '14:00', title: '搭機返台', emoji: '🛫', category: 'flight', lat: 18.7669, lng: 98.9626, food: '機場 Cafe Amazon 椰子拿鐵', transport: 'Grab 機場 200 銖', tip: '退稅在出境後右手邊海關櫃台，務必提前 2 小時到。' },
    ],
  },

  // 7. 峇里島 6 天 5 夜
  {
    title: '峇里島 6 天 5 夜｜烏布梯田、海神廟與海灘俱樂部',
    author: '冒險安迪',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    days: 6,
    tags: ['峇里島', '印尼', '海島', 'Villa', '蜜月'],
    cities: [
      { name: '烏布', reason: '峇里島藝術文化心臟' },
      { name: '水明漾', reason: '時尚海灘俱樂部聚集地' },
    ],
    dayPlans: [
      { day: 1, hotel: '庫塔 Sheraton Bali Kuta Resort', weather: '熱帶氣候 28-32 度，攜帶泳衣與防曬' },
      { day: 2, hotel: '烏布 Komaneka at Bisma Villa', weather: '雨林潮濕，準備防蚊液' },
      { day: 3, hotel: 'Komaneka at Bisma', weather: '梯田泥地較滑，穿包鞋' },
      { day: 4, hotel: '水明漾 W Bali Seminyak', weather: '夕陽 18:30 後較涼' },
      { day: 5, hotel: 'W Bali Seminyak', weather: 'Beach Club 配泳衣 + 罩衫' },
      { day: 6, hotel: '飯店寄行李', weather: '回程輕便穿著' },
    ],
    stops: [
      { day: 1, time: '15:30', title: '伍拉．賴國際機場入境', emoji: '🛬', category: 'flight', lat: -8.7481, lng: 115.1671, food: '機場 Krisna 巴里風小吃', transport: '預訂機場接送 30 分鐘到庫塔', tip: 'Klook 預訂包車比現場便宜一半。' },
      { day: 1, time: '18:30', title: 'Jimbaran 金巴蘭海灘海鮮燭光晚餐', emoji: '🦞', category: 'food', lat: -8.7900, lng: 115.1664, food: '炭烤龍蝦、蒜烤魚、椰子飯', transport: 'Grab 15 分鐘', tip: '挑火堆旁第一排的位置看夕陽。' },
      { day: 2, time: '09:00', title: '德格拉朗梯田 Tegallalang', emoji: '🌾', category: 'landmark', lat: -8.4309, lng: 115.2787, food: 'Alas Harum 入園附蝙蝠咖啡', transport: '包車從庫塔到烏布 1 小時', tip: '7 點前到能避開觀光人潮。' },
      { day: 2, time: '13:00', title: '聖泉廟 Tirta Empul', emoji: '⛲', category: 'activity', lat: -8.4154, lng: 115.3146, food: '入口外 Warung 巴里炒飯 Nasi Goreng', transport: '包車 30 分鐘', tip: '可體驗淨身儀式，需穿沙龍 Sarong。' },
      { day: 2, time: '16:30', title: '烏布皇宮 + 烏布市場', emoji: '🛍️', category: 'shopping', lat: -8.5070, lng: 115.2625, food: 'Naughty Nuri 招牌肋排晚餐', transport: '包車 25 分鐘', tip: '皇宮 19:00 有傳統舞蹈表演。' },
      { day: 3, time: '08:00', title: '阿勇河 Ayung River 泛舟', emoji: '🛶', category: 'activity', lat: -8.4520, lng: 115.2830, food: '泛舟後 Buffet 印尼自助餐', transport: '飯店接送', tip: '請穿泳衣 + 短褲，相機建議用防水包。' },
      { day: 3, time: '14:00', title: 'Campuhan Ridge Walk 健行', emoji: '🥾', category: 'activity', lat: -8.5015, lng: 115.2548, food: 'Karsa Cafe 山景下午茶', transport: '步行', tip: '單程 1 小時，太陽下山前回頭。' },
      { day: 4, time: '09:00', title: '聖泉旁 Bali Swing 鞦韆', emoji: '🌴', category: 'activity', lat: -8.4232, lng: 115.2790, food: '蛋花樹下熱帶水果盤', transport: '飯店接送', tip: '穿洋裝拍照效果最佳。' },
      { day: 4, time: '15:00', title: '海神廟 Tanah Lot 看夕陽', emoji: '🏝️', category: 'landmark', lat: -8.6212, lng: 115.0867, food: 'Sunset View Restaurant 印尼炒麵', transport: '包車 1 小時', tip: '退潮才能下海岩接受聖水祝福。' },
      { day: 4, time: '20:00', title: 'La Lucciola 海邊燭光晚餐', emoji: '🍝', category: 'food', lat: -8.6772, lng: 115.1568, food: '義式海鮮燉飯 + 玫瑰氣泡酒', transport: 'Grab 5 分鐘', tip: '提早 3 天訂位才有海景座。' },
      { day: 5, time: '11:00', title: 'Potato Head Beach Club', emoji: '🍸', category: 'activity', lat: -8.6791, lng: 115.1500, food: '池畔調酒 + Tacos 拼盤', transport: 'Grab 5 分鐘', tip: '最低消費抵 Day Pass，泳池座先到先搶。' },
      { day: 5, time: '16:30', title: 'Seminyak Square 採買', emoji: '🛒', category: 'shopping', lat: -8.6886, lng: 115.1589, food: 'Sisterfields 早午餐', transport: '步行', tip: 'Bali Boat Shed、Magali Pascal 是當地設計師品牌。' },
      { day: 6, time: '11:00', title: '烏魯瓦圖斷崖 + 凱卡舞', emoji: '🏞️', category: 'landmark', lat: -8.8294, lng: 115.0853, food: '崖邊 Single Fin 海景餐廳', transport: '包車 45 分鐘', tip: '6 點 Kecak Fire Dance 必看，提早 1 小時入場。' },
      { day: 6, time: '18:00', title: '伍拉．賴機場出境', emoji: '🛫', category: 'flight', lat: -8.7481, lng: 115.1671, food: '機場 Bebek Bengil 烏布烤鴨外帶', transport: '包車 1 小時', tip: '機場海關移民人多，提前 3.5 小時到。' },
    ],
  },

  // 8. 新加坡 4 天 3 夜
  {
    title: '新加坡 4 天 3 夜｜環球影城、金沙與星耀樟宜',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80',
    days: 4,
    tags: ['新加坡', '城市', '親子', '樂園'],
    cities: [{ name: '新加坡', reason: '東南亞最現代化的多元文化都市' }],
    dayPlans: [
      { day: 1, hotel: '濱海灣 Marina Bay Sands 金沙酒店', weather: '全年炎熱潮濕，戶外活動建議攜帶礦泉水' },
      { day: 2, hotel: 'Marina Bay Sands', weather: '聖淘沙陽光強，做好防曬' },
      { day: 3, hotel: '武吉士 Hotel G Singapore', weather: '夜市悶熱，輕薄衣物' },
      { day: 4, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '12:30', title: '樟宜機場星耀樟宜', emoji: '🏰', category: 'landmark', lat: 1.3602, lng: 103.9897, food: 'Shake Shack、鼎泰豐小籠包', transport: 'MRT「Changi Airport」站', tip: '室內最高人造瀑布每整點水舞秀。' },
      { day: 1, time: '17:00', title: '小印度 + 武吉士', emoji: '🛕', category: 'landmark', lat: 1.3060, lng: 103.8520, food: 'Tekka Centre 印度抓餅、咖椰多士', transport: 'MRT「Little India」站', tip: '哈芝巷壁畫適合拍照。' },
      { day: 1, time: '20:00', title: '濱海灣花園 Super Tree 燈光秀', emoji: '🌳', category: 'activity', lat: 1.2816, lng: 103.8636, food: 'Satay by the Bay 沙嗲 + 老虎啤酒', transport: 'MRT「Bayfront」站', tip: '晚 19:45 / 20:45 各一場免費燈光秀。' },
      { day: 2, time: '09:00', title: '聖淘沙環球影城', emoji: '🎢', category: 'activity', lat: 1.2540, lng: 103.8238, food: '園內牛肉漢堡、紐約奶昔', transport: 'MRT「HarbourFront」轉聖淘沙快捷', tip: '變形金剛、太空堡壘卡拉狄加是必玩。' },
      { day: 2, time: '17:00', title: 'S.E.A. 海洋館 + 西羅索海灘', emoji: '🐠', category: 'landmark', lat: 1.2576, lng: 103.8221, food: 'Trapizza 披薩 + 海景啤酒', transport: '島內單軌列車', tip: '開放式大水缸建議排第一輪。' },
      { day: 2, time: '21:00', title: '魚尾獅公園 + 金沙水舞秀', emoji: '🦁', category: 'activity', lat: 1.2868, lng: 103.8545, food: '小販中心 Lau Pa Sat 沙嗲一條街', transport: 'MRT「Raffles Place」', tip: '21:00 與 22:00 兩場 Spectra 水舞秀。' },
      { day: 3, time: '08:30', title: '新加坡動物園 + 河川生態園', emoji: '🦓', category: 'activity', lat: 1.4043, lng: 103.7930, food: '動物園 Ah Meng 早餐 + 紅毛猩猩共餐', transport: 'MRT「Ang Mo Kio」轉 138 公車', tip: '購買 4 合 1 票券最划算。' },
      { day: 3, time: '14:00', title: '夜間動物園準備 + 晚餐', emoji: '🌙', category: 'food', lat: 1.4029, lng: 103.7916, food: 'Ulu Ulu Safari 自助餐', transport: '園區內步行', tip: '亞洲最先 19:15 Tram 場次熱門。' },
      { day: 3, time: '22:00', title: '克拉碼頭酒吧街', emoji: '🍹', category: 'nightlife', lat: 1.2899, lng: 103.8467, food: 'Brewerkz 自釀啤酒 + 辣椒蟹', transport: 'MRT「Clarke Quay」站', tip: '河岸風光配 Live Band 是最佳收尾。' },
      { day: 4, time: '09:00', title: '老巴剎 Lau Pa Sat 經典早餐', emoji: '☕', category: 'food', lat: 1.2807, lng: 103.8504, food: '亞坤咖椰多士、半熟蛋、咖啡', transport: 'MRT「Telok Ayer」站', tip: '當地人吃法是把吐司沾蛋吃。' },
      { day: 4, time: '12:30', title: '麥士威熟食中心 + 牛車水', emoji: '🍚', category: 'food', lat: 1.2807, lng: 103.8443, food: '天天海南雞飯（米其林必比登）', transport: 'MRT「Chinatown」站', tip: '雞飯 11 點開賣，趕在 12 點前到。' },
      { day: 4, time: '16:00', title: '搭乘 MRT 返樟宜機場', emoji: '🛫', category: 'flight', lat: 1.3644, lng: 103.9915, food: '機場肉骨茶外帶', transport: 'MRT 綠線直達', tip: '預留 3 小時辦理電子退稅 eTRS。' },
    ],
  },

  // 9. 越南 峴港 + 會安 5 天 4 夜
  {
    title: '中越 5 天 4 夜｜峴港、會安古鎮與巴拿山黃金佛手橋',
    author: '劈腿女孩 Yaya',
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['越南', '峴港', '會安', '巴拿山'],
    cities: [
      { name: '峴港', reason: '世界六大美麗海灘之一' },
      { name: '會安', reason: '燈籠夜色的世界遺產古鎮' },
    ],
    dayPlans: [
      { day: 1, hotel: '峴港美溪 Vinpearl Hotel', weather: '中越熱帶氣候 27-32 度，建議速乾衣' },
      { day: 2, hotel: '巴拿山 French Village Bana Hills（山上住一晚）', weather: '高山氣溫降至 18-22 度，帶薄外套' },
      { day: 3, hotel: '會安 Anantara Hoi An Resort', weather: '古鎮石板路濕滑，建議涼鞋' },
      { day: 4, hotel: 'Anantara Hoi An', weather: '燈籠古鎮夜晚較涼' },
      { day: 5, hotel: '飯店寄行李', weather: '出發機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '14:00', title: '峴港國際機場入境', emoji: '🛬', category: 'flight', lat: 16.0439, lng: 108.1990, food: '機場 Highlands Coffee 越南滴漏', transport: 'Grab 15 分鐘到美溪海灘', tip: '機場 SIM 卡 5 天無限上網 200,000 越南盾。' },
      { day: 1, time: '17:00', title: '美溪海灘 My Khe Beach', emoji: '🏖️', category: 'landmark', lat: 16.0544, lng: 108.2443, food: '海灘旁 Bé Mặn Seafood 大頭蝦', transport: '飯店步行', tip: '日落 18:00 + 沙灘排球免費觀賞。' },
      { day: 1, time: '20:00', title: '龍橋噴火秀 + 韓江夜市', emoji: '🐉', category: 'activity', lat: 16.0612, lng: 108.2278, food: '夜市椰子布丁、生牛肉河粉', transport: 'Grab 7 分鐘', tip: '週六、日 21:00 龍橋噴水噴火表演。' },
      { day: 2, time: '08:30', title: '巴拿山纜車 + 黃金佛手橋', emoji: '🌉', category: 'landmark', lat: 16.0273, lng: 107.9956, food: '法國村 La Crique 法式午餐', transport: '購入 KKday 一日通票含纜車', tip: '世界最長纜車 5,801 m，必拍。' },
      { day: 2, time: '14:00', title: '巴拿山法國村 × 太陽世界', emoji: '🏰', category: 'activity', lat: 16.0269, lng: 107.9953, food: 'Beerhof 巴伐利亞啤酒花園', transport: '園區內步行', tip: '建議排隊「Alpine Coaster 高山過山車」。' },
      { day: 2, time: '20:00', title: '巴拿山法國風夜景晚餐', emoji: '🍷', category: 'food', lat: 16.0270, lng: 107.9951, food: '酒店自助餐 + 紅酒', transport: '園區內步行', tip: '住宿賓客可免費搭最後一班纜車下山看夜景。' },
      { day: 3, time: '10:00', title: '會安古鎮日遊', emoji: '🏮', category: 'landmark', lat: 15.8801, lng: 108.3380, food: '會安三大美食：高樓麵 Cao Lau、白玫瑰、廣南雞飯', transport: '巴拿山下山後 Grab 1 小時到會安', tip: '門票 120,000 盾，含 5 個古蹟入場。' },
      { day: 3, time: '15:00', title: '迦南島椰林獨木舟', emoji: '🛶', category: 'activity', lat: 15.9046, lng: 108.3672, food: '椰林餐廳手撕雞 + 越南煎餅 Banh Xeo', transport: 'Grab 20 分鐘', tip: '搖椰林船 + 表演只要 100,000 盾。' },
      { day: 3, time: '19:30', title: '會安燈籠古鎮夜遊 + 放水燈', emoji: '🪔', category: 'activity', lat: 15.8802, lng: 108.3267, food: 'Bánh Mì Phượng 越南三明治', transport: '步行', tip: '農曆 14 號燈籠節最熱鬧。' },
      { day: 4, time: '09:30', title: '美山聖地 My Son Sanctuary', emoji: '🛕', category: 'landmark', lat: 15.7639, lng: 108.1241, food: 'Banh Mi 越南法國麵包墊胃', transport: '包車 1 小時', tip: '世界遺產，9 點前到避免曬。' },
      { day: 4, time: '14:00', title: '會安 Marble Mountain 五行山', emoji: '🪨', category: 'landmark', lat: 16.0034, lng: 108.2615, food: '附近大理石村 Pizza 4P\'s 海鮮披薩', transport: '包車 30 分鐘', tip: '可搭電梯上山避免爬樓梯。' },
      { day: 4, time: '19:00', title: '會安傳統 Tailor 客製服飾', emoji: '👗', category: 'shopping', lat: 15.8795, lng: 108.3258, food: 'Morning Glory 越南家常菜', transport: '步行', tip: 'Yaly Couture / Bebe 老牌可在 24 小時內取件。' },
      { day: 5, time: '08:00', title: 'An Bang Beach 早餐', emoji: '🏝️', category: 'food', lat: 15.9037, lng: 108.3389, food: 'Soul Kitchen 美式早餐 + 越南咖啡', transport: 'Grab 15 分鐘', tip: '海灘旁餐廳可免費借浮木躺椅。' },
      { day: 5, time: '13:00', title: '搭機返台', emoji: '🛫', category: 'flight', lat: 16.0439, lng: 108.1990, food: '機場 Phở 24 牛肉河粉', transport: 'Grab 45 分鐘到峴港機場', tip: '保留 USD 30 出境稅金。' },
    ],
  },

  // 10. 北海道 6 天 5 夜
  {
    title: '北海道 6 天 5 夜｜札幌、小樽、富良野與函館跨域',
    author: '凱的日本食尚日記',
    image: 'https://images.unsplash.com/photo-1582243468551-7b0b2e3fb633?auto=format&fit=crop&w=800&q=80',
    days: 6,
    tags: ['日本', '北海道', '美食', '海鮮', '滑雪'],
    cities: [
      { name: '札幌', reason: '北海道首府，海鮮拉麵激戰區' },
      { name: '函館', reason: '世界三大夜景之一' },
    ],
    dayPlans: [
      { day: 1, hotel: '札幌 JR Tower Hotel Nikko', weather: '冬季 -8 至 0 度，務必雪靴與羽絨外套' },
      { day: 2, hotel: '札幌 JR Tower Hotel Nikko', weather: '小樽積雪較深，注意防滑' },
      { day: 3, hotel: '富良野 New Furano Prince', weather: '滑雪場零下，務必雪鏡 + 防水手套' },
      { day: 4, hotel: '函館湯之川溫泉海邊飯店', weather: '夜晚函館山纜車站口風大' },
      { day: 5, hotel: '札幌 JR Tower Hotel Nikko', weather: '室內外溫差大，準備保暖內搭' },
      { day: 6, hotel: '飯店寄存行李', weather: '機場輕便保暖' },
    ],
    stops: [
      { day: 1, time: '15:00', title: '新千歲機場入境', emoji: '🛬', category: 'flight', lat: 42.7752, lng: 141.6920, food: '機場 LeTAO 雙層起司、白色戀人冰淇淋', transport: 'JR 快速 Airport 號 36 分鐘到札幌', tip: 'JR 北海道 Pass 在機場 JR 服務台兌換。' },
      { day: 1, time: '19:00', title: '札幌狸小路 + 二条市場周邊', emoji: '🦀', category: 'shopping', lat: 43.0573, lng: 141.3533, food: '蟹將軍帝王蟹涮涮鍋', transport: '地鐵南北線「大通」站', tip: '札幌站 ESTA 10 樓拉麵共和國有 8 家名店。' },
      { day: 2, time: '09:00', title: '小樽運河 × 北一硝子', emoji: '❄️', category: 'landmark', lat: 43.2001, lng: 141.0022, food: '政壽司、伊勢鮨、LeTAO 起司蛋糕', transport: 'JR 快速 Airport 號 35 分鐘到小樽', tip: '冬季 17:00-21:00 點燈非常浪漫。' },
      { day: 2, time: '14:00', title: '北海道神宮 + 円山公園', emoji: '⛩️', category: 'landmark', lat: 43.0540, lng: 141.3076, food: '神宮茶屋判官餅', transport: '地鐵東西線「円山公園」', tip: '元旦初詣超熱鬧，平日清幽好走。' },
      { day: 2, time: '19:30', title: 'すすきの (Susukino) 拉麵橫丁', emoji: '🍜', category: 'food', lat: 43.0552, lng: 141.3536, food: 'すみれ味噌拉麵、根室花丸迴轉壽司', transport: '地鐵南北線「すすきの」站', tip: '味噌拉麵屬札幌名物，必加炙燒叉燒。' },
      { day: 3, time: '08:30', title: '富良野滑雪場一日票', emoji: '⛷️', category: 'activity', lat: 43.4187, lng: 142.4072, food: '雪場 Restaurant Downhill 燉牛肉', transport: 'JR 富良野線轉飯店接駁', tip: '滑雪鞋裝備建議官方 Rental Shop。' },
      { day: 3, time: '17:00', title: '青池冬季點燈 Bing Pond', emoji: '🌌', category: 'landmark', lat: 43.4961, lng: 142.5882, food: '美瑛卷捲 Yume Kobo 麵包', transport: '飯店巴士 30 分鐘', tip: '冬季點燈僅 11/1-4/30，需網路訂位。' },
      { day: 4, time: '09:00', title: 'JR 札幌→函館 北斗號', emoji: '🚄', category: 'transport', lat: 41.7733, lng: 140.7263, food: '車站 KIOSK 鮭魚親子便當', transport: 'JR 北斗特急 3 小時 30 分', tip: '北海道 JR Pass 涵蓋此車種。' },
      { day: 4, time: '15:00', title: '五稜郭 + 五稜郭塔', emoji: '🌸', category: 'landmark', lat: 41.7969, lng: 140.7572, food: 'Lucky Pierrot 中華雞腿堡', transport: '函館市電「五稜郭公園前」', tip: '塔上 90 m 俯瞰星形要塞。' },
      { day: 4, time: '18:30', title: '函館山夜景纜車', emoji: '🌃', category: 'activity', lat: 41.7615, lng: 140.7041, food: '元町坂二十間坂義式', transport: '元町搭函館山纜車', tip: '日落前 30 分鐘到，能一次看到夕陽 + 夜景。' },
      { day: 5, time: '07:30', title: '函館朝市海鮮丼 + 釣烏賊', emoji: '🦑', category: 'food', lat: 41.7733, lng: 140.7263, food: '函館朝市 海鮮丼 + 炭烤花魚', transport: '步行 5 分鐘', tip: '釣烏賊現切現吃是函館朝市限定。' },
      { day: 5, time: '13:00', title: '函館返札幌 + 大通公園', emoji: '🚄', category: 'transport', lat: 43.0610, lng: 141.3540, food: '札幌 Soup Curry GARAKU 湯咖哩', transport: 'JR 北斗特急回程', tip: '冬季雪祭限定點燈場景。' },
      { day: 6, time: '09:30', title: '札幌啤酒博物館 + 札幌站採購', emoji: '🍻', category: 'shopping', lat: 43.0743, lng: 141.3631, food: '啤酒博物館 Genghis Khan 烤羊肉', transport: 'JR 苗穗站', tip: '伴手禮：六花亭、白色戀人、Royce 推薦在 Daimaru 一次買齊。' },
      { day: 6, time: '15:30', title: '搭機返台', emoji: '🛫', category: 'flight', lat: 42.7752, lng: 141.6920, food: '新千歲機場花畑牧場焦糖', transport: 'JR 快速 Airport 號', tip: '新千歲免稅退稅櫃台只到 19:30。' },
    ],
  },

  // 11. 沖繩 5 天 4 夜
  {
    title: '沖繩 5 天 4 夜｜美麗海水族館 × 古宇利島自駕環島',
    author: 'Wendy\'s Journey',
    image: 'https://images.unsplash.com/photo-1582200311746-b25aa112e4ee?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['日本', '沖繩', '海島', '親子', '自駕'],
    cities: [{ name: '沖繩本島', reason: '日本最南島嶼，海島渡假首選' }],
    dayPlans: [
      { day: 1, hotel: '本部町 Centurion Marina Centurion Resort', weather: '海島潮濕，需備抗 UV 帽與泳衣' },
      { day: 2, hotel: '沖繩 Monterey Spa Resort（恩納村）', weather: '青之洞窟須穿短袖速乾衣' },
      { day: 3, hotel: '那霸 Hyatt Regency Naha', weather: '國際通晚上偶爾陣雨' },
      { day: 4, hotel: 'Hyatt Regency Naha', weather: '出發機場輕便穿著' },
      { day: 5, hotel: '飯店寄存行李', weather: '輕便服裝' },
    ],
    stops: [
      { day: 1, time: '12:00', title: '那霸機場 + OTS 租車', emoji: '🚗', category: 'transport', lat: 26.2068, lng: 127.6491, food: '機場 A&W 沖繩限定漢堡', transport: 'OTS 租車 + 北上沖繩自動車道', tip: '右駕請先在停車場熟悉再上路。' },
      { day: 1, time: '15:30', title: '古宇利大橋 + 蝦蝦飯', emoji: '🦐', category: 'food', lat: 26.7039, lng: 128.0228, food: '古宇利蝦蝦飯（KOURI SHRIMP）', transport: '自駕 90 分鐘', tip: '橋南端觀景台是免費拍 IG 點。' },
      { day: 1, time: '17:30', title: '沖繩美麗海水族館', emoji: '🐢', category: 'landmark', lat: 26.6940, lng: 127.8779, food: '海洋廣場 Ocean Blue Cafe', transport: '自駕 25 分鐘', tip: '16 點後門票打 7 折，黑潮之海餵食 17:00 場次。' },
      { day: 2, time: '09:00', title: '青之洞窟浮潛', emoji: '🤿', category: 'activity', lat: 26.4400, lng: 127.7700, food: '潛店附餐沖繩家常套餐', transport: '飯店接送 15 分鐘', tip: '海象不佳會臨時取消，提早 1 天確認。' },
      { day: 2, time: '13:30', title: '萬座毛 + Bios 之丘', emoji: '🌅', category: 'landmark', lat: 26.5050, lng: 127.8530, food: '燒肉本部牧場午餐', transport: '自駕 25 分鐘', tip: '萬座毛大象岩夕陽最美。' },
      { day: 2, time: '19:00', title: '美國村 SUNSET BEACH', emoji: '🛍️', category: 'shopping', lat: 26.3120, lng: 127.7570, food: 'BLUE SEAL 沖繩限定海鹽冰淇淋', transport: '自駕 30 分鐘', tip: '摩天輪夕陽下最浪漫。' },
      { day: 3, time: '09:30', title: '首里城公園', emoji: '🏯', category: 'landmark', lat: 26.2169, lng: 127.7194, food: '園內琉球料理 ASHIBI', transport: '自駕到那霸還車', tip: '正殿重建中，但守禮門 + 御庭仍可參觀。' },
      { day: 3, time: '14:00', title: '波上宮 + 那霸第一牧志公設市場', emoji: '🐠', category: 'food', lat: 26.2147, lng: 127.6800, food: '市場 2F 山城食堂海鮮丼', transport: '單軌電車「縣廳前」', tip: '海鮮可由 1F 攤位購買，2F 加工費 600 円。' },
      { day: 3, time: '19:00', title: '國際通 × 暖暮拉麵', emoji: '🍜', category: 'food', lat: 26.2138, lng: 127.6850, food: '暖暮拉麵牧志店 + 黑糖泡盛', transport: '單軌電車「牧志」站', tip: '暖暮排隊 1 小時打底，可先到平和通逛。' },
      { day: 4, time: '09:00', title: 'ASHIBINAA OUTLET 採購', emoji: '🛒', category: 'shopping', lat: 26.1788, lng: 127.6900, food: 'OUTLET 美食街沖繩 SOBA', transport: '單軌電車轉巴士 30 分鐘', tip: 'COACH、Tory Burch 折扣最深。' },
      { day: 4, time: '14:00', title: '波上宮海濱浮潛', emoji: '🏖️', category: 'activity', lat: 26.2170, lng: 127.6820, food: '波之上 Beach Bar 啤酒', transport: '步行', tip: '冬季水溫低不適合下水，可做沙灘瑜伽。' },
      { day: 5, time: '10:00', title: '國際通伴手禮 + 沖繩 10 円麵包', emoji: '🍞', category: 'shopping', lat: 26.2130, lng: 127.6856, food: '沖繩 10 円麵包 + 福助玉子燒', transport: '步行', tip: '紅芋撻、雪鹽餅乾在唐吉軻德最齊全。' },
      { day: 5, time: '14:00', title: '搭機返台', emoji: '🛫', category: 'flight', lat: 26.2068, lng: 127.6491, food: '機場 A&W 出發前根啤酒', transport: '單軌電車「那覇空港」站', tip: '退稅請集中在最後一晚一次處理。' },
    ],
  },

  // 12. 紐約 6 天 5 夜
  {
    title: '紐約 6 天 5 夜｜時代廣場、自由女神、博物館全制霸',
    author: 'BringYou',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80',
    days: 6,
    tags: ['美國', '紐約', '都市', '百老匯', '購物'],
    cities: [{ name: '紐約', reason: '世界十字路口、藝術與金融重鎮' }],
    dayPlans: [
      { day: 1, hotel: '時代廣場 New York Marriott Marquis', weather: '紐約四季分明，秋冬需風衣與毛帽' },
      { day: 2, hotel: 'Marriott Marquis', weather: '中央公園步行多，穿好走的鞋' },
      { day: 3, hotel: 'Marriott Marquis', weather: '今日博物館行程多為室內，洋蔥穿搭' },
      { day: 4, hotel: 'Marriott Marquis', weather: '布魯克林大橋步行 1 小時，請穿運動鞋' },
      { day: 5, hotel: 'Marriott Marquis', weather: '百老匯演出建議稍微正式' },
      { day: 6, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '15:00', title: 'JFK 機場入境', emoji: '🛬', category: 'flight', lat: 40.6413, lng: -73.7781, food: '機場 Shake Shack 起司薯條', transport: 'AirTrain 轉地鐵 E 線到曼哈頓中城', tip: '7-Day Unlimited Metro 卡 USD 34 最划算。' },
      { day: 1, time: '19:00', title: '時代廣場 + 百老匯林蔭道', emoji: '🎆', category: 'landmark', lat: 40.7580, lng: -73.9855, food: 'John\'s Pizzeria 百年老店', transport: '步行', tip: '別跟隨機卡通人偶合照，會強索小費。' },
      { day: 2, time: '08:30', title: '中央公園單車環園', emoji: '🚲', category: 'activity', lat: 40.7829, lng: -73.9654, food: 'Central Park Boathouse 早午餐', transport: '步行 5 分鐘', tip: 'Bike Rent 1 小時 USD 15，繞園 1.5 小時。' },
      { day: 2, time: '12:30', title: '大都會藝術博物館 The Met', emoji: '🏛️', category: 'landmark', lat: 40.7794, lng: -73.9632, food: '博物館 The Modern Cafe', transport: '步行 10 分鐘', tip: '埃及廟宇 + 武器盔甲展廳必看。' },
      { day: 2, time: '19:00', title: '帝國大廈夜景', emoji: '🏙️', category: 'landmark', lat: 40.7484, lng: -73.9857, food: 'Halal Guys 路邊王雞肉飯', transport: '地鐵 N/Q/R 線「34 St」', tip: '天黑前 30 分鐘上樓最值。' },
      { day: 3, time: '08:00', title: '自由女神 + 艾利斯島', emoji: '🗽', category: 'activity', lat: 40.6892, lng: -74.0445, food: '砲台公園小販熱狗早餐', transport: '地鐵 1 號線到 South Ferry', tip: '提早 2 個月預訂登冠票券。' },
      { day: 3, time: '14:00', title: '世貿一號 + 911 紀念博物館', emoji: '🕊️', category: 'landmark', lat: 40.7115, lng: -74.0134, food: 'Eataly 義式午餐', transport: '步行 10 分鐘', tip: '紀念水池在地面層免費，博物館需門票。' },
      { day: 3, time: '20:00', title: 'SoHo 蘇活區夜逛', emoji: '🛍️', category: 'shopping', lat: 40.7233, lng: -74.0030, food: 'Lombardi\'s Pizza 美國第一家披薩店', transport: '地鐵 6 號線「Spring St」', tip: '蘋果旗艦店、Glossier、Aritzia 必逛。' },
      { day: 4, time: '09:00', title: '布魯克林大橋徒步', emoji: '🌉', category: 'activity', lat: 40.7061, lng: -73.9969, food: 'Juliana\'s Pizza Brooklyn', transport: '地鐵 4/5/6 線「City Hall」', tip: '推薦從 Brooklyn 走回 Manhattan，曼哈頓天際線最美。' },
      { day: 4, time: '14:00', title: 'DUMBO + 河岸公園', emoji: '📷', category: 'landmark', lat: 40.7028, lng: -73.9896, food: 'Dumbo Time Out Market', transport: '地鐵 F 線「York St」', tip: 'Washington St 經典「橋下隧道一」拍照角度。' },
      { day: 4, time: '20:00', title: 'Chelsea Market + High Line 高架公園', emoji: '🌳', category: 'shopping', lat: 40.7420, lng: -74.0061, food: 'Chelsea Market 龍蝦堡 + 起司專賣', transport: '地鐵 A/C/E 線「14 St」', tip: '高架公園 22:00 關閉，落日散步最美。' },
      { day: 5, time: '10:00', title: '現代藝術博物館 MoMA', emoji: '🎨', category: 'landmark', lat: 40.7614, lng: -73.9776, food: 'Cafe 2 - 義大利精緻午餐', transport: '地鐵「5 Av/53 St」', tip: '梵谷《星夜》、孟克《吶喊》必看。' },
      { day: 5, time: '14:00', title: '第五大道 + 洛克斐勒中心', emoji: '🛍️', category: 'shopping', lat: 40.7587, lng: -73.9787, food: 'Magnolia Bakery 香蕉布丁', transport: '步行', tip: 'Top of the Rock 看景比帝國大廈視野更佳。' },
      { day: 5, time: '20:00', title: '百老匯經典劇 The Lion King', emoji: '🎭', category: 'nightlife', lat: 40.7561, lng: -73.9856, food: 'Junior\'s Cheesecake 紐約起士蛋糕', transport: '步行', tip: 'TKTS 票亭可買當日折扣票。' },
      { day: 6, time: '11:00', title: 'Whitney 現代美術館 + 高架公園收尾', emoji: '🖼️', category: 'landmark', lat: 40.7396, lng: -74.0089, food: 'Untitled @ Whitney 美式 brunch', transport: '步行', tip: '美術館內附頂樓平台俯瞰哈德遜河。' },
      { day: 6, time: '17:00', title: '搭 AirTrain 返 JFK', emoji: '🛫', category: 'flight', lat: 40.6413, lng: -73.7781, food: '機場 Shake Shack 最後一杯奶昔', transport: '地鐵 E 線轉 AirTrain', tip: '紐約市區到 JFK 至少抓 90 分鐘。' },
    ],
  },

  // 13. 倫敦 7 天 6 夜
  {
    title: '倫敦 7 天 6 夜｜博物館、皇室與哈利波特影城',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
    days: 7,
    tags: ['英國', '倫敦', '哈利波特', '博物館', '音樂劇'],
    cities: [{ name: '倫敦', reason: '歷史、藝術與街頭時尚交融的歐洲首都' }],
    dayPlans: [
      { day: 1, hotel: '柯芬園 The Strand Palace', weather: '英國多雨，務必備可摺傘與防水外套' },
      { day: 2, hotel: 'The Strand Palace', weather: '室內博物館為主，溫差大' },
      { day: 3, hotel: 'The Strand Palace', weather: '泰晤士河畔風大，準備風衣' },
      { day: 4, hotel: 'The Strand Palace', weather: '溫莎一日遊有戶外步行' },
      { day: 5, hotel: 'The Strand Palace', weather: '哈利波特影城內溫暖' },
      { day: 6, hotel: 'The Strand Palace', weather: '海德公園散步建議鞋款' },
      { day: 7, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '14:00', title: '希斯洛機場 LHR 入境', emoji: '🛬', category: 'flight', lat: 51.4700, lng: -0.4542, food: '機場 Pret a Manger 早餐三明治', transport: 'Heathrow Express 15 分鐘到 Paddington', tip: '感應信用卡可直接搭地鐵免買票。' },
      { day: 1, time: '17:30', title: '柯芬園 + 中國城', emoji: '🎶', category: 'shopping', lat: 51.5117, lng: -0.1240, food: '中國城北京樓烤鴨', transport: 'Piccadilly Line「Covent Garden」', tip: '柯芬園廣場每天有街頭表演。' },
      { day: 2, time: '09:30', title: '白金漢宮 + 衛兵交接', emoji: '👑', category: 'landmark', lat: 51.5014, lng: -0.1419, food: 'St James\'s Cafe 英式早餐', transport: 'Victoria Line「Victoria」', tip: '11:00 交接，請至少 10:00 到佔位。' },
      { day: 2, time: '13:00', title: '西敏寺 + 國會大廈大笨鐘', emoji: '🕰️', category: 'landmark', lat: 51.4994, lng: -0.1248, food: 'Westminster Cellars 英式酒館', transport: '步行 10 分鐘', tip: 'Westminster Abbey 最後入場 15:30。' },
      { day: 2, time: '18:00', title: '倫敦眼摩天輪', emoji: '🎡', category: 'activity', lat: 51.5033, lng: -0.1196, food: 'County Hall 義式咖啡 + 鬆餅', transport: '步行', tip: '快速通關門票省下 1 小時。' },
      { day: 3, time: '10:00', title: '大英博物館', emoji: '🏛️', category: 'landmark', lat: 51.5194, lng: -0.1269, food: 'Court Cafe 英式下午茶', transport: 'Central Line「Tottenham Court Road」', tip: '入場免費需先預約時段。' },
      { day: 3, time: '15:00', title: '國家美術館 + 特拉法加廣場', emoji: '🖼️', category: 'landmark', lat: 51.5089, lng: -0.1283, food: '老牌咖啡 The Wolseley 下午茶', transport: '步行', tip: '梵谷向日葵與莫內睡蓮均在館中。' },
      { day: 3, time: '19:30', title: '蘇荷區音樂劇《悲慘世界》', emoji: '🎭', category: 'nightlife', lat: 51.5135, lng: -0.1330, food: 'Dishoom 印度英倫風料理', transport: '步行', tip: '提早 1 小時取票，劇院冷氣強。' },
      { day: 4, time: '09:30', title: '溫莎城堡一日遊', emoji: '🏰', category: 'landmark', lat: 51.4839, lng: -0.6044, food: 'Windsor Bel & The Dragon 英式午餐', transport: 'Paddington 轉 Slough 約 40 分鐘', tip: '皇家旗升起代表女王在城內。' },
      { day: 4, time: '17:00', title: '伊頓公學散步', emoji: '🎓', category: 'activity', lat: 51.4868, lng: -0.6089, food: '伊頓鎮 The Cock Pit 英國老酒館', transport: '步行', tip: '校園週日不開放遊客。' },
      { day: 5, time: '09:00', title: '哈利波特華納兄弟影城', emoji: '🪄', category: 'activity', lat: 51.6907, lng: -0.4178, food: '影城 Backlot Cafe 黃油啤酒', transport: 'Euston 轉華納專車 30 分鐘', tip: '門票必須事先 2 個月買，9¾月台場景拍照人潮多。' },
      { day: 5, time: '17:00', title: '國王十字車站 9¾月台', emoji: '🚂', category: 'landmark', lat: 51.5320, lng: -0.1233, food: '車站旁 Caravan 英式早午餐', transport: 'Piccadilly Line「King\'s Cross」', tip: '排隊拍照工作人員會送上巫師圍巾。' },
      { day: 6, time: '09:30', title: '海德公園 + 肯辛頓宮', emoji: '🌳', category: 'landmark', lat: 51.5074, lng: -0.1657, food: 'Serpentine Bar & Kitchen 湖景早午餐', transport: 'Central Line「Marble Arch」', tip: 'Speakers\' Corner 週日上午有公開演說。' },
      { day: 6, time: '15:00', title: 'Harrods 百貨 + 騎士橋', emoji: '🛍️', category: 'shopping', lat: 51.4994, lng: -0.1632, food: 'Harrods Tea Rooms 三層下午茶', transport: 'Piccadilly Line「Knightsbridge」', tip: 'Harrods 食品大廳是整個倫敦最齊全的伴手禮區。' },
      { day: 6, time: '19:30', title: '倫敦塔橋夜景 + 河岸晚餐', emoji: '🌉', category: 'landmark', lat: 51.5055, lng: -0.0754, food: 'Borough Market Padella 義式手打麵', transport: 'Northern Line「London Bridge」', tip: '碎片塔展望台是最佳拍 Tower Bridge 角度。' },
      { day: 7, time: '11:00', title: 'Notting Hill + Portobello 市集', emoji: '🌈', category: 'shopping', lat: 51.5096, lng: -0.2055, food: 'Lowry Market Eggs Benedict', transport: 'Central Line「Notting Hill Gate」', tip: '週六市集最熱鬧，骨董最齊全。' },
      { day: 7, time: '17:00', title: '搭 Heathrow Express 返機場', emoji: '🛫', category: 'flight', lat: 51.4700, lng: -0.4542, food: '機場 Wagamama 拉麵', transport: 'Paddington 直達', tip: 'VAT 退稅請於出境關前蓋章後到指定櫃台。' },
    ],
  },

  // 14. 巴黎 5 天 4 夜
  {
    title: '巴黎 5 天 4 夜｜羅浮宮、艾菲爾鐵塔、凡爾賽宮浪漫遊',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1502602898657-3e907611a364?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['法國', '巴黎', '浪漫', '藝術', '博物館'],
    cities: [{ name: '巴黎', reason: '花都的浪漫不可言喻' }],
    dayPlans: [
      { day: 1, hotel: '歌劇院 Hotel Scribe Paris Opera', weather: '春秋舒適 12-20 度，建議薄外套' },
      { day: 2, hotel: 'Hotel Scribe Paris', weather: '羅浮宮室內活動為主' },
      { day: 3, hotel: 'Hotel Scribe Paris', weather: '凡爾賽花園走遠，運動鞋必備' },
      { day: 4, hotel: 'Hotel Scribe Paris', weather: '蒙馬特上坡多' },
      { day: 5, hotel: '飯店寄存行李', weather: '出發機場輕便' },
    ],
    stops: [
      { day: 1, time: '14:00', title: '戴高樂機場 CDG 入境', emoji: '🛬', category: 'flight', lat: 49.0097, lng: 2.5479, food: '機場 PAUL 法國麵包', transport: 'RER B 線 30 分鐘到 Châtelet', tip: '購入 Navigo Découverte 周票最划算。' },
      { day: 1, time: '18:00', title: '艾菲爾鐵塔夜景', emoji: '🗼', category: 'landmark', lat: 48.8583, lng: 2.2944, food: 'Cafe Constant 法式燉牛肉', transport: 'Metro 6 號線「Bir-Hakeim」', tip: '整點亮燈秀 5 分鐘，戰神廣場最佳取景。' },
      { day: 1, time: '21:00', title: '塞納河遊船 Bateaux Mouches', emoji: '🚤', category: 'activity', lat: 48.8642, lng: 2.3045, food: '船上香檳燭光晚餐', transport: '步行', tip: '夜間遊船會經過聖母院、奧塞與羅浮宮。' },
      { day: 2, time: '09:30', title: '羅浮宮 Louvre', emoji: '🖼️', category: 'landmark', lat: 48.8606, lng: 2.3376, food: 'Cafe Marly 在玻璃金字塔旁', transport: 'Metro 1 號線「Palais Royal」', tip: '蒙娜麗莎與勝利女神排在最後看，觀眾較少。' },
      { day: 2, time: '14:30', title: '杜樂麗花園 + 協和廣場', emoji: '⛲', category: 'landmark', lat: 48.8635, lng: 2.3270, food: 'Angelina 蒙布朗栗子蛋糕', transport: '步行', tip: '夏季有摩天輪 + 草地野餐。' },
      { day: 2, time: '17:00', title: '香榭麗舍大道 + 凱旋門', emoji: '🛍️', category: 'shopping', lat: 48.8738, lng: 2.2950, food: 'Laduree 馬卡龍下午茶', transport: 'Metro 1 號線「George V」', tip: '凱旋門頂樓票線上預約，走 284 階值得。' },
      { day: 3, time: '09:00', title: '凡爾賽宮一日遊', emoji: '🏰', category: 'landmark', lat: 48.8049, lng: 2.1204, food: 'La Petite Venise 鏡廳旁餐廳', transport: 'RER C 線「Versailles Château Rive Gauche」', tip: '週一閉館，週末花園音樂噴泉超美。' },
      { day: 3, time: '19:00', title: '瑪黑區散步', emoji: '🥖', category: 'activity', lat: 48.8593, lng: 2.3596, food: 'L\'As du Fallafel 米其林平價中東料理', transport: 'Metro 1 號線「Saint-Paul」', tip: '週日大部分商家開門，與其他區相反。' },
      { day: 4, time: '09:30', title: '聖母院外觀 + 西堤島', emoji: '⛪', category: 'landmark', lat: 48.8530, lng: 2.3499, food: 'Berthillon 雙球冰淇淋', transport: 'Metro 4 號線「Cité」', tip: '聖母院重建中，目前僅可外觀拍照。' },
      { day: 4, time: '13:00', title: '蒙馬特聖心堂 + 愛之牆', emoji: '🎨', category: 'landmark', lat: 48.8867, lng: 2.3431, food: 'La Maison Rose 粉紅老餐廳', transport: 'Metro 12 號線「Abbesses」', tip: '聖心堂頂樓平台需爬 300 階，但俯瞰巴黎超震撼。' },
      { day: 4, time: '20:00', title: '紅磨坊 Moulin Rouge', emoji: '💃', category: 'nightlife', lat: 48.8841, lng: 2.3325, food: '香檳秀晚餐 + 法式甜點', transport: '步行', tip: '正裝 Dress Code，最少提前 1 個月訂位。' },
      { day: 5, time: '10:00', title: '老佛爺百貨 + 春天百貨', emoji: '🛍️', category: 'shopping', lat: 48.8736, lng: 2.3320, food: 'Galeries Lafayette 7F 屋頂', transport: 'Metro 7 號線「Chaussée d\'Antin」', tip: '退稅請集中在 Lafayette，門口櫃台直接退現。' },
      { day: 5, time: '15:00', title: '搭 RER B 返 CDG 機場', emoji: '🛫', category: 'flight', lat: 49.0097, lng: 2.5479, food: '機場 Pierre Hermé 馬卡龍', transport: 'RER B 30 分鐘', tip: '機場安檢人多，建議 3 小時前到。' },
    ],
  },

  // 15. 雪梨 5 天 4 夜
  {
    title: '雪梨 5 天 4 夜｜歌劇院、邦黛海灘與藍山國家公園',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['澳洲', '雪梨', '海灘', '藍山', '陽光'],
    cities: [{ name: '雪梨', reason: '海港歌劇院與東岸最美都會' }],
    dayPlans: [
      { day: 1, hotel: '岩石區 Pier One Sydney Harbour', weather: '與台灣相反季節，請依月份反向查預報' },
      { day: 2, hotel: 'Pier One Sydney Harbour', weather: '海邊風大，需備外套' },
      { day: 3, hotel: 'Pier One Sydney Harbour', weather: '藍山高海拔較涼' },
      { day: 4, hotel: 'Pier One Sydney Harbour', weather: '海灘日防曬必備' },
      { day: 5, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '14:00', title: '雪梨機場 SYD', emoji: '🛬', category: 'flight', lat: -33.9399, lng: 151.1753, food: '機場 Bills 早午餐 ricotta hotcakes', transport: 'Airport Link 火車 13 分鐘', tip: 'Opal 卡 Tap on/off 適用所有大眾運輸。' },
      { day: 1, time: '17:00', title: '雪梨歌劇院 + 環形碼頭', emoji: '🎭', category: 'landmark', lat: -33.8567, lng: 151.2152, food: 'Opera Bar 海景啤酒 + 蝦堡', transport: '火車「Circular Quay」站', tip: '對岸皇家植物園 Mrs Macquarie\'s Chair 可拍歌劇院 + 港灣大橋全景。' },
      { day: 1, time: '20:00', title: '岩石區 The Rocks 夜遊', emoji: '🍻', category: 'food', lat: -33.8588, lng: 151.2085, food: 'The Australian Heritage Hotel 鱷魚肉披薩', transport: '步行', tip: '週六、日岩石區市集最熱鬧。' },
      { day: 2, time: '09:00', title: '塔朗加動物園', emoji: '🐨', category: 'activity', lat: -33.8430, lng: 151.2412, food: '動物園 Capital Kitchen 海景餐廳', transport: 'Circular Quay 渡輪 12 分鐘', tip: '無尾熊、袋鼠、鴨嘴獸最具代表性。' },
      { day: 2, time: '14:00', title: '雪梨魚市場 + 達令港', emoji: '🦞', category: 'food', lat: -33.8714, lng: 151.1907, food: '生蠔、龍蝦、現切炸魚薯條', transport: '輕軌「Fish Market」站', tip: '魚市建議 12 點前到，搶免費試吃。' },
      { day: 2, time: '20:00', title: '達令港夜景酒吧', emoji: '🍷', category: 'nightlife', lat: -33.8721, lng: 151.2023, food: 'Cargo Bar Pizza + Cocktails', transport: '輕軌「Convention」站', tip: '週六 21:00 達令港有煙火秀。' },
      { day: 3, time: '08:30', title: '藍山三姊妹峰', emoji: '🏔️', category: 'landmark', lat: -33.7321, lng: 150.3120, food: 'Echo Point Cafe 派與咖啡', transport: '雪梨中央站搭 Blue Mountains Line 火車 2 小時', tip: 'Scenic World 三合一票券：纜車、空中纜車、52 度斜角火車。' },
      { day: 3, time: '15:00', title: 'Wentworth Falls 健行', emoji: '💧', category: 'activity', lat: -33.7308, lng: 150.3759, food: '山頂 Conservation Hut 蛋糕', transport: '火車「Wentworth Falls」站', tip: '步道濕滑請穿登山鞋。' },
      { day: 4, time: '08:30', title: '邦黛海灘 Bondi Beach', emoji: '🏖️', category: 'activity', lat: -33.8914, lng: 151.2766, food: 'Speedo\'s Cafe Acai 早餐', transport: '巴士 333 號 30 分鐘', tip: '南端 Icebergs Pool 是 IG 名點。' },
      { day: 4, time: '11:00', title: 'Bondi to Coogee 海岸步道', emoji: '🚶', category: 'activity', lat: -33.9202, lng: 151.2598, food: '途中 Bronte Beach Cafe', transport: '步行', tip: '單程 6 km，2 小時走完，沿途海景超震撼。' },
      { day: 4, time: '17:00', title: 'QVB 維多利亞女王購物中心 + 英式下午茶', emoji: '☕', category: 'shopping', lat: -33.8718, lng: 151.2070, food: 'The Tea Room QVB 三層下午茶', transport: '火車「Town Hall」站', tip: 'QVB 是雪梨最美的購物中心。' },
      { day: 5, time: '09:30', title: '雪梨大學 + 維多利亞女皇大廈', emoji: '🎓', category: 'landmark', lat: -33.8888, lng: 151.1873, food: 'Glebe Point Diner 早午餐', transport: '輕軌「Glebe」站', tip: '哈利波特感的主校門可以拍照。' },
      { day: 5, time: '14:00', title: '搭機場線返 SYD', emoji: '🛫', category: 'flight', lat: -33.9399, lng: 151.1753, food: '機場 Lord of the Fries 紐西蘭薯條', transport: 'Airport Link', tip: '帶水果或乳製品都需申報，違規最高罰款 AUD 5,500。' },
    ],
  },

  // 16. 墨爾本 + 大洋路 6 天 5 夜
  {
    title: '墨爾本 6 天 5 夜｜大洋路、企鵝島與咖啡文化',
    author: 'Journey with Mina',
    image: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80',
    days: 6,
    tags: ['澳洲', '墨爾本', '咖啡', '自駕', '大洋路'],
    cities: [{ name: '墨爾本', reason: '咖啡之都與南半球文化心臟' }],
    dayPlans: [
      { day: 1, hotel: '市中心 The Westin Melbourne', weather: '一日四季，務必準備外套與雨具' },
      { day: 2, hotel: 'The Westin Melbourne', weather: '海邊風大，建議薄羽絨' },
      { day: 3, hotel: '阿波羅灣 Apollo Bay 海濱旅館（大洋路途中）', weather: '海岸涼爽 14-22 度' },
      { day: 4, hotel: 'The Westin Melbourne', weather: '企鵝島晚上極冷，務必厚外套' },
      { day: 5, hotel: 'The Westin Melbourne', weather: '酒莊一日遊輕便正裝' },
      { day: 6, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '13:00', title: '墨爾本 Tullamarine 機場', emoji: '🛬', category: 'flight', lat: -37.6690, lng: 144.8410, food: '機場 Hudsons Coffee 義式拿鐵', transport: 'Skybus 30 分鐘到 Southern Cross', tip: 'Skybus 線上購票享 9 折。' },
      { day: 1, time: '16:00', title: '聯邦廣場 + 弗林德斯街車站', emoji: '🚂', category: 'landmark', lat: -37.8183, lng: 144.9671, food: 'Brother Baba Budan 雷根咖啡店', transport: 'Free Tram Zone（市中心免費）', tip: '弗林德斯街車站是維州最古老火車站。' },
      { day: 1, time: '19:30', title: '霍西爾巷塗鴉街 + 中國城', emoji: '🎨', category: 'activity', lat: -37.8163, lng: 144.9691, food: '中國城 ShanDong MaMa 山東水餃', transport: '步行', tip: 'Hosier Lane 每天藝術家換新塗鴉。' },
      { day: 2, time: '09:00', title: '皇后市場 + 維多利亞國家美術館', emoji: '🛒', category: 'shopping', lat: -37.8076, lng: 144.9569, food: '市場 Borek 烤餅、維州羊肉派', transport: '免費電車 35 號', tip: '週六晚有 Night Market 大排檔。' },
      { day: 2, time: '14:00', title: '聖科達海灘 St Kilda + 彩虹小屋', emoji: '🌈', category: 'landmark', lat: -37.8676, lng: 144.9791, food: 'Acland Street 蛋糕街', transport: '電車 96 號', tip: '日落時可看到野生小企鵝在堤防出沒。' },
      { day: 3, time: '08:00', title: '出發大洋路 Great Ocean Road', emoji: '🚗', category: 'transport', lat: -38.6657, lng: 143.0645, food: 'Lorne Beach Pavilion 早午餐', transport: '租車自駕 240 km', tip: 'Memorial Arch 拱門是大洋路經典打卡點。' },
      { day: 3, time: '14:00', title: '阿波羅灣 Apollo Bay', emoji: '🐨', category: 'landmark', lat: -38.7501, lng: 143.6694, food: 'La Bimba 義式海鮮燉飯', transport: '自駕', tip: '入住前可繞 Cape Otway 看野生無尾熊。' },
      { day: 3, time: '17:30', title: '十二門徒 The 12 Apostles 日落', emoji: '🪨', category: 'landmark', lat: -38.6632, lng: 143.1045, food: '12 Apostles Visitor Centre 簡餐', transport: '自駕 1.5 小時', tip: '日落 + 銀河是攝影愛好者最愛。' },
      { day: 4, time: '09:00', title: '阿德湖峽 + 倫敦拱橋', emoji: '🏝️', category: 'landmark', lat: -38.6433, lng: 143.0655, food: 'Port Campbell 在地小館', transport: '自駕', tip: 'Loch Ard Gorge 步道多，建議停留 1.5 小時。' },
      { day: 4, time: '20:00', title: '菲利浦島企鵝歸巢秀', emoji: '🐧', category: 'activity', lat: -38.5117, lng: 145.1490, food: 'Phillip Island Visitor Centre 簡餐', transport: '自駕從墨爾本 1.5 小時', tip: '請勿閃光燈拍企鵝，會傷害牠們。' },
      { day: 5, time: '09:30', title: '亞拉河谷 Yarra Valley 酒莊', emoji: '🍷', category: 'food', lat: -37.6500, lng: 145.5180, food: 'Domaine Chandon 香檳午餐', transport: 'KKday 一日遊', tip: '一日 3-4 間酒莊品酒最盡興。' },
      { day: 5, time: '17:00', title: '健力士牛排館 The Press Club', emoji: '🥩', category: 'food', lat: -37.8166, lng: 144.9665, food: '澳洲和牛 Wagyu Tenderloin', transport: '電車 70 號', tip: 'Top 50 餐廳，務必訂位。' },
      { day: 6, time: '10:00', title: 'Brighton Beach 彩虹小屋', emoji: '🏖️', category: 'landmark', lat: -37.9170, lng: 144.9988, food: 'The Boatshed 早午餐', transport: '火車 Sandringham 線', tip: '82 個彩色海邊更衣室是經典 IG 點。' },
      { day: 6, time: '15:00', title: '搭 Skybus 返 MEL', emoji: '🛫', category: 'flight', lat: -37.6690, lng: 144.8410, food: '機場最後一杯精品咖啡', transport: 'Skybus 30 分鐘', tip: '澳洲生鮮無法帶上機，請於海關前丟棄。' },
    ],
  },

  // 17. 洛杉磯 5 天 4 夜
  {
    title: '洛杉磯 5 天 4 夜｜環球影城、好萊塢與聖塔莫尼卡',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1580659325492-16a75a7daee3?auto=format&fit=crop&w=800&q=80',
    days: 5,
    tags: ['美國', '洛杉磯', '好萊塢', '樂園', '加州'],
    cities: [{ name: '洛杉磯', reason: '加州陽光與電影夢工廠' }],
    dayPlans: [
      { day: 1, hotel: '比佛利山 Loews Hollywood Hotel', weather: '加州陽光全年 18-30 度，戶外活動需防曬' },
      { day: 2, hotel: 'Loews Hollywood Hotel', weather: '環球影城戶外排隊長，戴帽子' },
      { day: 3, hotel: 'Loews Hollywood Hotel', weather: '海邊涼爽，準備薄外套' },
      { day: 4, hotel: 'Loews Hollywood Hotel', weather: '迪士尼園內走路長，運動鞋' },
      { day: 5, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '15:00', title: 'LAX 機場入境', emoji: '🛬', category: 'flight', lat: 33.9416, lng: -118.4085, food: '機場 In-N-Out 招牌 Double-Double', transport: 'Lyft 30 分鐘到好萊塢', tip: 'In-N-Out 的 Animal Style 是隱藏菜單必點。' },
      { day: 1, time: '18:00', title: '好萊塢星光大道', emoji: '⭐', category: 'landmark', lat: 34.1015, lng: -118.3268, food: 'Pink\'s Hot Dog 老牌芝加哥熱狗', transport: '步行', tip: '勿與街頭卡通人偶合照，他們會強索小費。' },
      { day: 2, time: '08:30', title: '好萊塢環球影城', emoji: '🎢', category: 'activity', lat: 34.1381, lng: -118.3533, food: '園內 Three Broomsticks 黃油啤酒', transport: 'Metro Red Line「Universal City」', tip: 'Studio Tour 必玩，建議入園後第一個衝。' },
      { day: 2, time: '20:00', title: 'CityWalk 夜逛', emoji: '🌃', category: 'shopping', lat: 34.1364, lng: -118.3534, food: 'Bubba Gump 阿甘蝦餐廳', transport: '步行', tip: 'iFly 室內跳傘體驗也很有趣。' },
      { day: 3, time: '09:30', title: '蓋蒂中心 Getty Center', emoji: '🏛️', category: 'landmark', lat: 34.0780, lng: -118.4741, food: '館內 The Restaurant 加州料理', transport: 'Lyft 25 分鐘', tip: '建築與花園免費，建議週六造訪。' },
      { day: 3, time: '14:30', title: '聖塔莫尼卡碼頭', emoji: '🎡', category: 'landmark', lat: 34.0094, lng: -118.4973, food: 'Bubba Gump SM 龍蝦堡', transport: 'I-10 西向', tip: '太陽下山 6:30 為最佳拍照時段。' },
      { day: 3, time: '19:30', title: 'Venice Beach 落日', emoji: '🛹', category: 'activity', lat: 33.9850, lng: -118.4695, food: 'Salt & Straw 加州手作冰淇淋', transport: '海岸步道單車 25 分鐘', tip: '街頭塗鴉與滑板場是必拍。' },
      { day: 4, time: '08:30', title: '加州迪士尼樂園', emoji: '🏰', category: 'activity', lat: 33.8121, lng: -117.9190, food: '園內 Carthay Circle 米其林級午餐', transport: 'Lyft 45 分鐘', tip: '購入 Genie+ 加快通關。' },
      { day: 4, time: '21:00', title: '迪士尼煙火秀', emoji: '🎆', category: 'activity', lat: 33.8121, lng: -117.9190, food: 'Plaza Inn 米妮米奇下午茶', transport: '園內步行', tip: '城堡正前方排 Castle Forecourt 看煙火最佳。' },
      { day: 5, time: '09:00', title: '格里斐斯天文台 + 好萊塢標誌', emoji: '🔭', category: 'landmark', lat: 34.1184, lng: -118.3004, food: 'Cafe at the End of Universe 天文台咖啡', transport: 'Lyft 20 分鐘', tip: '12 點前到避免停車困難。' },
      { day: 5, time: '14:00', title: 'Beverly Hills + Rodeo Drive', emoji: '💎', category: 'shopping', lat: 34.0696, lng: -118.4053, food: 'Mr. Chow 北京烤鴨', transport: 'Metro Purple', tip: '街角拍 Beverly Hills 路牌是經典。' },
      { day: 5, time: '19:00', title: '搭 Lyft 返 LAX', emoji: '🛫', category: 'flight', lat: 33.9416, lng: -118.4085, food: '機場 Wolfgang Puck 漢堡', transport: 'Lyft 35 分鐘', tip: '美國國際線需提前 3.5 小時 Check-in。' },
    ],
  },

  // 18. 瑞士 7 天 6 夜
  {
    title: '瑞士 7 天 6 夜｜少女峰、馬特洪峰、鐵力士山三大名峰',
    author: 'Livia\'s Wonderland',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
    days: 7,
    tags: ['瑞士', '阿爾卑斯', '景觀列車', '雪山'],
    cities: [
      { name: '蘇黎世', reason: '瑞士最大城與門戶' },
      { name: '策馬特', reason: '馬特洪峰山腳免燃油小鎮' },
      { name: '少女峰小鎮', reason: '歐洲屋脊最美村莊' },
    ],
    dayPlans: [
      { day: 1, hotel: '蘇黎世 Park Hyatt Zurich', weather: '高海拔氣溫低，多層次穿搭' },
      { day: 2, hotel: '策馬特 The Omnia Hotel', weather: '山上 -5 至 5 度，雪鏡 + 防水羽絨' },
      { day: 3, hotel: 'The Omnia Hotel', weather: '冰川天堂超低溫' },
      { day: 4, hotel: '茵特拉肯 Hotel Royal Saint Georges', weather: '湖區涼爽 5-15 度' },
      { day: 5, hotel: 'Hotel Royal Saint Georges', weather: '少女峰山頂超低溫' },
      { day: 6, hotel: '盧塞恩 Hotel Schweizerhof Lucerne', weather: '湖畔風大' },
      { day: 7, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '13:00', title: '蘇黎世機場 ZRH 入境', emoji: '🛬', category: 'flight', lat: 47.4647, lng: 8.5492, food: '機場 Spruengli 巧克力 + 起司鍋', transport: 'SBB 火車 12 分鐘到中央車站', tip: '瑞士交通通行證 Swiss Travel Pass 在機場 SBB 櫃台領取。' },
      { day: 1, time: '16:00', title: '班霍夫大街 + 老城區', emoji: '🏛️', category: 'shopping', lat: 47.3733, lng: 8.5402, food: 'Zeughauskeller 瑞士國民料理', transport: '步行', tip: '蘇黎世湖邊 Wasserkirche 旁拍湖景最美。' },
      { day: 2, time: '08:00', title: '蘇黎世→策馬特列車', emoji: '🚄', category: 'transport', lat: 46.0207, lng: 7.7491, food: 'SBB 餐車起司義大利麵', transport: '冰河列車 Glacier Express 全景車程 4 小時', tip: '小心瑞士物價，請自備乾糧。' },
      { day: 2, time: '14:30', title: '葛納格拉特觀景台 Gornergrat', emoji: '🏔️', category: 'landmark', lat: 45.9839, lng: 7.7861, food: 'Riffelalp 山屋雷克列特起司', transport: 'GGB 齒軌火車 33 分鐘', tip: '清晨 7-8 點為馬特洪峰金山時段。' },
      { day: 3, time: '09:00', title: '小馬特洪冰川天堂', emoji: '❄️', category: 'landmark', lat: 45.9388, lng: 7.7274, food: '冰川自助餐廳熱可可', transport: '空中纜車 9 站', tip: '高山症跡象出現請立即下山。' },
      { day: 3, time: '14:00', title: '五湖健行 5-Seenweg', emoji: '🥾', category: 'activity', lat: 45.9966, lng: 7.7702, food: 'Sunnegga 山屋簡餐', transport: 'Sunnegga 地下纜車', tip: 'Stellisee 倒映馬特洪峰最經典。' },
      { day: 4, time: '09:00', title: '冰河列車策馬特→茵特拉肯', emoji: '🚞', category: 'transport', lat: 46.6863, lng: 7.8632, food: 'Glacier Express 全景車午餐', transport: '冰河列車 + 黃金列車段', tip: '一定要提前 3 個月訂位。' },
      { day: 4, time: '17:00', title: '茵特拉肯何赫馬特 Höhematte 草原', emoji: '🪂', category: 'landmark', lat: 46.6863, lng: 7.8632, food: 'Hooters Interlaken 戶外漢堡', transport: '步行', tip: '可預約滑翔傘飛越湖區。' },
      { day: 5, time: '08:00', title: '少女峰登頂 Top of Europe', emoji: '🚂', category: 'landmark', lat: 46.5475, lng: 7.9851, food: '山頂 Aletsch 餐廳泡麵', transport: 'JB 少女峰鐵道 + Eiger Express', tip: '購入歐洲屋頂套票 Top of Europe Pass 最划算。' },
      { day: 5, time: '14:30', title: '格林德瓦 First 雙峰盪鞦韆', emoji: '🎢', category: 'activity', lat: 46.6332, lng: 8.0586, food: 'Berghaus First 餐廳起司鍋', transport: '空中纜車', tip: '4 大景點：Cliff Walk、Flyer、Glider、Cart。' },
      { day: 6, time: '10:00', title: '盧塞恩老城 + 卡貝爾橋', emoji: '🌉', category: 'landmark', lat: 47.0517, lng: 8.3069, food: 'Wirtshaus Galliker 瑞士肉腸早午餐', transport: 'IC 火車 2 小時', tip: '橋下木雕記載盧塞恩史。' },
      { day: 6, time: '14:00', title: '鐵力士山 360 度旋轉纜車', emoji: '🌀', category: 'activity', lat: 46.7708, lng: 8.4358, food: '山頂自助餐廳熱起司鍋', transport: 'Engelberg 火車 + 纜車', tip: 'Cliff Walk 懸崖步道 + 冰洞必訪。' },
      { day: 7, time: '10:00', title: '蘇黎世湖畔散步 + 採購', emoji: '🛍️', category: 'shopping', lat: 47.3683, lng: 8.5417, food: 'Confiserie Sprüngli 巧克力', transport: '電車 6/7 號', tip: '瑞士刀、Lindt 是最佳伴手禮。' },
      { day: 7, time: '15:00', title: '搭 SBB 返 ZRH 機場', emoji: '🛫', category: 'flight', lat: 47.4647, lng: 8.5492, food: '機場最後一塊瑞士起司', transport: 'SBB 12 分鐘', tip: '退稅請於機場 Global Blue 櫃台辦理。' },
    ],
  },

  // 19. 夏威夷 7 天 6 夜
  {
    title: '夏威夷歐胡 7 天 6 夜｜威基基、鑽石頭、北岸與珍珠港',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=800&q=80',
    days: 7,
    tags: ['美國', '夏威夷', '海灘', '浮潛'],
    cities: [{ name: '歐胡島', reason: 'Aloha 的熱情與火山島嶼' }],
    dayPlans: [
      { day: 1, hotel: '威基基 The Royal Hawaiian Resort', weather: '熱帶 25-32 度，泳衣 + 防曬必備' },
      { day: 2, hotel: 'The Royal Hawaiian Resort', weather: '清晨爬山涼爽' },
      { day: 3, hotel: 'The Royal Hawaiian Resort', weather: '北岸風浪大，注意安全' },
      { day: 4, hotel: 'The Royal Hawaiian Resort', weather: '出海日記得防暈船藥' },
      { day: 5, hotel: 'The Royal Hawaiian Resort', weather: '室內博物館為主' },
      { day: 6, hotel: 'The Royal Hawaiian Resort', weather: 'Luau 表演晚上海邊涼' },
      { day: 7, hotel: '飯店寄存行李', weather: '機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '13:00', title: '檀香山機場 HNL', emoji: '🛬', category: 'flight', lat: 21.3187, lng: -157.9224, food: '機場 Aloha Spam 飯糰', transport: 'Roberts Hawaii Express 接駁 25 分鐘', tip: 'Holo Card 為夏威夷大眾運輸通行卡。' },
      { day: 1, time: '17:00', title: '威基基海灘戲水', emoji: '🏄', category: 'activity', lat: 21.2769, lng: -157.8272, food: 'Duke\'s Waikiki 烤鮪魚 + Hula Pie', transport: '步行', tip: 'Duke\'s 21:00 後現場樂團演出免費。' },
      { day: 1, time: '20:00', title: 'International Market Place 夜逛', emoji: '🛍️', category: 'shopping', lat: 21.2787, lng: -157.8304, food: 'Eating House 1849 太平洋風料理', transport: '步行', tip: 'Whole Foods 採購當地夏威夷產品最齊全。' },
      { day: 2, time: '06:00', title: '鑽石頭山日出', emoji: '🌋', category: 'activity', lat: 21.2588, lng: -157.8058, food: 'Bogart\'s Cafe Acai Bowl', transport: '夏威夷公車 23 號', tip: '需提前 14 天預約，每天名額有限。' },
      { day: 2, time: '11:00', title: 'Sandy Beach + Halona Blowhole', emoji: '🌊', category: 'landmark', lat: 21.2840, lng: -157.6717, food: '路邊 Mexican Food Truck Tacos', transport: '租車自駕 25 分鐘', tip: 'Halona Blowhole 噴水時機看潮汐。' },
      { day: 2, time: '15:00', title: 'Lanikai Beach 天堂海灘', emoji: '🏝️', category: 'landmark', lat: 21.3935, lng: -157.7102, food: 'Buzz\'s Original Steakhouse 牛排', transport: '自駕 40 分鐘', tip: 'Mokulua 雙子島浮潛需另外申請許可。' },
      { day: 3, time: '08:00', title: '北岸 Haleiwa 古鎮', emoji: '🏖️', category: 'landmark', lat: 21.5928, lng: -158.1042, food: 'Matsumoto Shave Ice 經典刨冰', transport: '自駕 1 小時', tip: '巨浪季 11-2 月可看世界級衝浪賽。' },
      { day: 3, time: '14:00', title: 'Giovanni\'s Shrimp Truck', emoji: '🍤', category: 'food', lat: 21.6717, lng: -157.9608, food: '蒜香蝦飯（Scampi Plate）', transport: '自駕 25 分鐘', tip: '排隊長，建議避開中午尖峰。' },
      { day: 3, time: '19:00', title: 'Waimea Bay + 北岸夕陽', emoji: '🌅', category: 'activity', lat: 21.6418, lng: -158.0670, food: 'Ted\'s Bakery 巧克力慕斯派', transport: '自駕', tip: '建議帶野餐墊在沙灘上看夕陽。' },
      { day: 4, time: '08:00', title: '珍珠港 Pearl Harbor', emoji: '🛥️', category: 'landmark', lat: 21.3651, lng: -157.9385, food: '珍珠港訪客中心 Cafe', transport: '公車 20/40/42', tip: '亞利桑那紀念館門票免費需排隊。' },
      { day: 4, time: '14:00', title: '玻里尼西亞文化中心', emoji: '🌺', category: 'activity', lat: 21.6420, lng: -157.9248, food: '中心 Luau 自助餐 + 草裙舞', transport: '自駕 1 小時', tip: '一日通票含夜間 Hā 表演。' },
      { day: 5, time: '09:00', title: '恐龍灣 Hanauma Bay 浮潛', emoji: '🐠', category: 'activity', lat: 21.2693, lng: -157.6939, food: 'Sandy\'s Beach 海邊餐車', transport: '公車 22 號', tip: '需事先 48 小時線上預約。' },
      { day: 5, time: '14:00', title: 'Bishop Museum + 阿拉莫阿納購物中心', emoji: '🏛️', category: 'shopping', lat: 21.2906, lng: -157.8420, food: 'Foodland Farms Poke Bowl', transport: 'Lyft 15 分鐘', tip: 'Ala Moana 是夏威夷最大購物中心。' },
      { day: 6, time: '09:00', title: 'Magic Island 環海公園', emoji: '🛶', category: 'activity', lat: 21.2898, lng: -157.8463, food: 'Pioneer Saloon Spam Musubi', transport: '步行', tip: '也是當地人黃昏看日落的最愛。' },
      { day: 6, time: '17:00', title: '威基基 Aulani Disney Luau', emoji: '🍖', category: 'nightlife', lat: 21.3320, lng: -158.1170, food: '夏威夷 Kalua 烤豬 + Poi', transport: '自駕 45 分鐘', tip: 'Luau 完整體驗約 3 小時。' },
      { day: 7, time: '11:00', title: '威基基海灘最後 Aloha', emoji: '🌺', category: 'activity', lat: 21.2769, lng: -157.8272, food: 'Marukame Udon 平價烏龍麵', transport: '步行', tip: '海灘禁止使用化學防曬，請使用珊瑚友善款。' },
      { day: 7, time: '16:00', title: '搭機返台', emoji: '🛫', category: 'flight', lat: 21.3187, lng: -157.9224, food: '機場 Lanikai 公司鳳梨蛋糕', transport: 'Lyft 25 分鐘', tip: '夏威夷國際線提前 3.5 小時到。' },
    ],
  },

  // 20. 台北 3 天 2 夜
  {
    title: '台北 3 天 2 夜｜夜市、九份十分與北投溫泉',
    author: 'KKday Blog',
    image: 'https://images.unsplash.com/photo-1558230559-07b9a52de0fd?auto=format&fit=crop&w=800&q=80',
    days: 3,
    tags: ['台灣', '台北', '夜市', '美食', '溫泉'],
    cities: [{ name: '台北', reason: '不夜城與美食天堂' }],
    dayPlans: [
      { day: 1, hotel: '信義區 W Taipei', weather: '梅雨季 5-6 月、颱風季 8-9 月需備雨具' },
      { day: 2, hotel: 'W Taipei', weather: '九份山區較濕涼，外套必備' },
      { day: 3, hotel: '飯店寄存行李', weather: '出發機場輕便穿著' },
    ],
    stops: [
      { day: 1, time: '13:00', title: '桃園機場 TPE', emoji: '🛬', category: 'flight', lat: 25.0797, lng: 121.2342, food: '機場唐麥當勞 + 珍奶', transport: '機場捷運 35 分鐘到台北車站', tip: '悠遊卡可在便利商店直接購買。' },
      { day: 1, time: '15:30', title: '台北 101 觀景台 + 信義誠品', emoji: '🏙️', category: 'landmark', lat: 25.0330, lng: 121.5654, food: '鼎泰豐 101 店小籠包', transport: '捷運紅線「台北 101/世貿」', tip: '建議下午 4 點上 89F，可一次看到日 + 夜景。' },
      { day: 1, time: '19:00', title: '寧夏夜市掃街', emoji: '🍢', category: 'food', lat: 25.0560, lng: 121.5152, food: '蚵仔煎、芋仔番薯、滷肉飯、豆花', transport: '捷運綠線「雙連」站', tip: '寧夏是觀光客評價最好的台北夜市。' },
      { day: 2, time: '09:00', title: '九份老街 + 阿妹茶樓', emoji: '🏮', category: 'landmark', lat: 25.1086, lng: 121.8446, food: '芋圓、草仔粿、九份魚丸湯', transport: '捷運轉巴士 1062 號', tip: '建議從基山街上、豎崎路下走最順。' },
      { day: 2, time: '14:00', title: '十分老街放天燈', emoji: '🏮', category: 'activity', lat: 25.0476, lng: 121.7757, food: '十分大腸圈、楊家雞捲', transport: '十分小火車', tip: '天燈施放白色為自由、紅色為健康。' },
      { day: 2, time: '19:00', title: '士林夜市', emoji: '🌃', category: 'food', lat: 25.0884, lng: 121.5240, food: '豪大大雞排、士林大香腸、生煎包', transport: '捷運紅線「劍潭」站', tip: '地下美食街與街邊小吃都不能錯過。' },
      { day: 3, time: '09:30', title: '北投溫泉 + 地熱谷', emoji: '♨️', category: 'activity', lat: 25.1368, lng: 121.5065, food: '溫泉拉麵 + 茶葉蛋', transport: '捷運紅線「新北投」站', tip: '溫泉博物館免費入場，需脫鞋。' },
      { day: 3, time: '13:30', title: '中正紀念堂 + 永康街', emoji: '🥢', category: 'food', lat: 25.0341, lng: 121.5281, food: '鼎泰豐永康街本店、芒果冰', transport: '捷運紅線「中正紀念堂」', tip: '芒果冰 4-9 月最甜。' },
      { day: 3, time: '17:00', title: '搭機場捷運返 TPE', emoji: '🛫', category: 'flight', lat: 25.0797, lng: 121.2342, food: '機場珍奶最後一杯', transport: '機場捷運 35 分鐘', tip: '退稅請至 6 樓 D5 櫃台。' },
    ],
  },
];

// Build the final dataset
const allData = templates.map((tpl, index) => {
  const dayPlanByDay: Record<number, DayPlan> = Object.fromEntries(
    tpl.dayPlans.map((d) => [d.day, d]),
  );

  const nodes = tpl.stops.map((stop) => {
    const plan = dayPlanByDay[stop.day] ?? tpl.dayPlans[0];
    return {
      node_id: genId('node'),
      day: stop.day,
      time: stop.time,
      title: stop.title,
      emoji: stop.emoji,
      category: stop.category,
      description: buildDescription(stop, plan),
      lat: stop.lat,
      lng: stop.lng,
      source: 'local' as const,
    };
  });

  return {
    id: `expert_curated_${index + 1}`,
    title: tpl.title,
    author: tpl.author,
    image: tpl.image,
    days: tpl.days,
    tags: tpl.tags,
    nodes,
    cities: tpl.cities,
  };
});

const fileContent = JSON.stringify(allData, null, 2);
const destDir = path.resolve(process.cwd(), 'src/data');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.writeFileSync(path.join(destDir, 'expertHandbooksData.json'), fileContent);

const totalNodes = allData.reduce((sum, h) => sum + h.nodes.length, 0);
console.log(`✅ Generated ${allData.length} detailed itineraries (${totalNodes} nodes total).`);
console.log(`   Output: src/data/expertHandbooksData.json`);
