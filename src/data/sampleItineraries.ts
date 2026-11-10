// Sample day-by-day itineraries for /trips/{city}/{n}-days/ and the
// "複製到我的行程" deep link (/?template={id}).
//
// Written to landmarks and areas only: no prices, opening hours or
// coordinates (the copy flow geocodes `place`). Drafted by AI; a page is
// indexable only after a person has checked it and set `reviewedAt`.

export type SampleStopCategory = 'spot' | 'food' | 'shopping' | 'transport';

export interface SampleStop {
  time: string; // "09:00"
  title: string;
  /** Geocoding query, in the local name where that geocodes better. */
  place: string;
  category: SampleStopCategory;
  note?: string;
}

export interface SampleDay {
  day: number;
  theme: string;
  area: string;
  stops: SampleStop[];
}

export interface SampleItinerary {
  id: string; // "fukuoka-3-days" — also the URL segment after /trips/{city}/
  destinationSlug: string;
  city: string;
  days: number;
  title: string;
  summary: string;
  /** Who this length suits; shown in the page lead. */
  bestFor: string;
  tips: string[];
  /** ISO date a person proofread this itinerary; null = draft (noindex, not in sitemap). */
  reviewedAt: string | null;
  dayPlans: SampleDay[];
}

export const SAMPLE_ITINERARIES: SampleItinerary[] = [
  // ── 東京 ────────────────────────────────────────────────────────────────
  {
    id: 'tokyo-3-days',
    destinationSlug: 'tokyo',
    city: '東京',
    days: 3,
    title: '東京 3 天 2 夜自由行行程',
    summary: '第一次去東京、時間只有 3 天：一天東邊老街（淺草、上野、晴空塔），一天西邊潮流區（原宿、澀谷、新宿），最後半天在銀座與東京車站收尾。',
    bestFor: '第一次去東京、週末加一天或 3 天連假',
    tips: [
      '三天都在市區，用 Suica 或 PASMO 等交通 IC 卡搭地鐵最方便。',
      '澀谷 SKY、晴空塔等觀景台熱門時段常客滿，建議出發前先線上預約。',
      '最後一天把行李寄放在東京車站的置物櫃，逛完直接搭車去機場。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '下町風情與晴空塔夜景',
        area: '淺草、上野、押上',
        stops: [
          { time: '09:00', title: '淺草寺・雷門', place: '浅草寺', category: 'spot', note: '早上人潮較少，適合拍雷門大燈籠。' },
          { time: '10:00', title: '仲見世通商店街', place: '仲見世通り', category: 'shopping', note: '雷門到寶藏門之間的參道，賣人形燒與傳統點心。' },
          { time: '12:00', title: '淺草午餐（天丼或蕎麥麵）', place: '浅草', category: 'food' },
          { time: '13:30', title: '上野恩賜公園', place: '上野恩賜公園', category: 'spot', note: '公園內有多座博物館，可依興趣挑一館。' },
          { time: '15:30', title: '阿美橫丁', place: 'アメ横商店街', category: 'shopping', note: '零食、藥妝與乾貨集中的平價商店街。' },
          { time: '18:00', title: '東京晴空塔', place: '東京スカイツリー', category: 'spot', note: '傍晚上去可以同時看到夕陽與夜景。' },
        ],
      },
      {
        day: 2,
        theme: '原宿、澀谷到新宿的潮流路線',
        area: '原宿、表參道、澀谷、新宿',
        stops: [
          { time: '09:00', title: '明治神宮', place: '明治神宮', category: 'spot', note: '從原宿站走進森林參道，早上最清幽。' },
          { time: '11:00', title: '竹下通', place: '竹下通り', category: 'shopping' },
          { time: '12:30', title: '表參道午餐與散步', place: '表参道', category: 'food', note: '精品建築與咖啡店集中，適合慢慢逛。' },
          { time: '15:00', title: '澀谷十字路口', place: '渋谷スクランブル交差点', category: 'spot' },
          { time: '17:00', title: '澀谷 SKY 展望台', place: 'SHIBUYA SKY', category: 'spot', note: '日落時段最熱門，建議提早預約。' },
          { time: '19:30', title: '新宿回憶橫丁晚餐', place: '思い出横丁', category: 'food', note: '小巷裡的串燒小店，氣氛熱鬧。' },
        ],
      },
      {
        day: 3,
        theme: '市場早餐、銀座與東京車站',
        area: '築地、銀座、丸之內',
        stops: [
          { time: '08:30', title: '築地場外市場早餐', place: '築地場外市場', category: 'food', note: '海鮮丼與玉子燒，越早去選擇越多。' },
          { time: '10:30', title: '銀座購物', place: '銀座', category: 'shopping' },
          { time: '13:30', title: '皇居外苑', place: '皇居外苑', category: 'spot' },
          { time: '15:00', title: '東京車站丸之內站舍', place: '東京駅 丸の内駅舎', category: 'spot', note: '紅磚站舍是經典拍照點。' },
          { time: '16:00', title: '東京車站一番街買伴手禮', place: '東京駅一番街', category: 'shopping' },
          { time: '17:30', title: '前往機場', place: '東京駅', category: 'transport', note: '成田可搭成田特快，羽田可搭單軌電車或京急。' },
        ],
      },
    ],
  },
  {
    id: 'tokyo-5-days',
    destinationSlug: 'tokyo',
    city: '東京',
    days: 5,
    title: '東京 5 天 4 夜自由行行程（含河口湖富士山一日遊）',
    summary: '5 天的節奏比較從容：市區分成新宿、下町、潮流區三天慢慢逛，再排一天到河口湖看富士山，最後一天留給築地與伴手禮。',
    bestFor: '想看富士山、行程不想太趕的人',
    tips: [
      '富士山常被雲遮住，河口湖那天可以看天氣預報和其他天對調。',
      '新宿到河口湖有直達高速巴士，熱門時段建議先訂位。',
      '住新宿或東京車站一帶，往返河口湖與機場都方便。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '抵達新宿，免費夜景與居酒屋',
        area: '新宿',
        stops: [
          { time: '15:00', title: '新宿飯店入住', place: '新宿駅', category: 'transport' },
          { time: '17:00', title: '東京都廳展望室', place: '東京都庁 展望室', category: 'spot', note: '免費的高樓展望室，天氣好時看得到富士山方向。' },
          { time: '19:00', title: '新宿回憶橫丁晚餐', place: '思い出横丁', category: 'food' },
          { time: '20:30', title: '歌舞伎町與新宿東口散步', place: '新宿東口', category: 'spot' },
        ],
      },
      {
        day: 2,
        theme: '淺草、晴空塔與上野',
        area: '淺草、押上、上野',
        stops: [
          { time: '09:00', title: '淺草寺・雷門', place: '浅草寺', category: 'spot' },
          { time: '10:00', title: '仲見世通商店街', place: '仲見世通り', category: 'shopping' },
          { time: '12:00', title: '隅田川沿岸散步', place: '隅田公園', category: 'spot', note: '沿河步行到晴空塔一帶。' },
          { time: '13:00', title: '東京晴空塔城午餐與購物', place: '東京ソラマチ', category: 'food' },
          { time: '16:00', title: '上野恩賜公園', place: '上野恩賜公園', category: 'spot' },
          { time: '18:00', title: '阿美橫丁晚餐', place: 'アメ横商店街', category: 'food' },
        ],
      },
      {
        day: 3,
        theme: '原宿、表參道與澀谷',
        area: '原宿、表參道、澀谷',
        stops: [
          { time: '09:00', title: '明治神宮', place: '明治神宮', category: 'spot' },
          { time: '11:00', title: '竹下通', place: '竹下通り', category: 'shopping' },
          { time: '12:30', title: '表參道與貓街', place: 'キャットストリート', category: 'shopping', note: '從表參道走貓街可以一路逛到澀谷。' },
          { time: '15:00', title: '澀谷十字路口與忠犬八公像', place: '忠犬ハチ公像', category: 'spot' },
          { time: '17:00', title: '澀谷 SKY 展望台', place: 'SHIBUYA SKY', category: 'spot', note: '建議提早預約日落時段。' },
        ],
      },
      {
        day: 4,
        theme: '河口湖富士山一日遊',
        area: '河口湖、富士吉田',
        stops: [
          { time: '07:30', title: '新宿搭高速巴士往河口湖', place: 'バスタ新宿', category: 'transport' },
          { time: '10:00', title: '新倉山淺間公園（忠靈塔）', place: '新倉山浅間公園', category: 'spot', note: '五重塔與富士山同框的經典角度，需要爬一段階梯。' },
          { time: '12:30', title: '河口湖周邊午餐（餺飥麵）', place: '河口湖駅', category: 'food', note: '餺飥（ほうとう）是山梨的味噌鍋麵。' },
          { time: '14:00', title: '大石公園', place: '大石公園', category: 'spot', note: '在湖北岸，隔著湖面看富士山。' },
          { time: '17:00', title: '搭巴士回新宿', place: '河口湖駅', category: 'transport' },
        ],
      },
      {
        day: 5,
        theme: '築地早餐、銀座與返程',
        area: '築地、銀座、東京車站',
        stops: [
          { time: '08:30', title: '築地場外市場早餐', place: '築地場外市場', category: 'food' },
          { time: '10:30', title: '銀座購物', place: '銀座', category: 'shopping' },
          { time: '13:00', title: '東京車站一番街買伴手禮', place: '東京駅一番街', category: 'shopping' },
          { time: '15:00', title: '前往機場', place: '東京駅', category: 'transport' },
        ],
      },
    ],
  },

  // ── 首爾 ────────────────────────────────────────────────────────────────
  {
    id: 'seoul-3-days',
    destinationSlug: 'seoul',
    city: '首爾',
    days: 3,
    title: '首爾 3 天 2 夜自由行行程',
    summary: '3 天抓首爾最經典的三塊：景福宮與北村韓屋的傳統區、弘大與漢江的年輕路線，最後半天在東大門和廣藏市場吃完再去機場。',
    bestFor: '第一次去首爾、短天數或週末加一天',
    tips: [
      '在景福宮周邊租韓服穿著入宮可免門票，記得留時間換裝。',
      '交通卡 T-money 可以搭地鐵、公車，也能在便利商店付款。',
      '北村韓屋村是住宅區，參觀時請放低音量並留意開放時段。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '宮殿、韓屋與仁寺洞',
        area: '鍾路、北村、仁寺洞、明洞',
        stops: [
          { time: '09:00', title: '景福宮', place: '경복궁', category: 'spot', note: '可安排在守門將換班儀式的時段入場。' },
          { time: '11:30', title: '北村韓屋村', place: '북촌한옥마을', category: 'spot' },
          { time: '13:00', title: '三清洞午餐與咖啡', place: '삼청동', category: 'food' },
          { time: '15:00', title: '仁寺洞與 Ssamziegil', place: '쌈지길', category: 'shopping', note: '傳統工藝品、茶館集中的街區。' },
          { time: '18:30', title: '明洞街頭小吃', place: '명동', category: 'food' },
        ],
      },
      {
        day: 2,
        theme: '弘大、延南洞與漢江夜景',
        area: '弘大、延南洞、汝矣島、南山',
        stops: [
          { time: '10:30', title: '延南洞京義線林蔭道', place: '경의선숲길', category: 'spot', note: '鐵道改建的線形公園，兩旁都是咖啡店。' },
          { time: '12:30', title: '弘大商圈午餐與逛街', place: '홍대입구역', category: 'shopping' },
          { time: '16:00', title: '汝矣島漢江公園', place: '여의도한강공원', category: 'spot', note: '在便利商店買泡麵在河邊吃是在地玩法。' },
          { time: '19:30', title: 'N 首爾塔', place: 'N서울타워', category: 'spot', note: '可搭南山纜車上山看夜景。' },
        ],
      },
      {
        day: 3,
        theme: '東大門與廣藏市場',
        area: '東大門、鍾路',
        stops: [
          { time: '09:30', title: '東大門設計廣場 DDP', place: '동대문디자인플라자', category: 'spot' },
          { time: '11:30', title: '廣藏市場午餐', place: '광장시장', category: 'food', note: '綠豆煎餅、麻藥紫菜飯捲是招牌。' },
          { time: '13:30', title: '首爾站搭機場快線', place: '서울역', category: 'transport' },
        ],
      },
    ],
  },
  {
    id: 'seoul-5-days',
    destinationSlug: 'seoul',
    city: '首爾',
    days: 5,
    title: '首爾 5 天 4 夜自由行行程（含水原華城）',
    summary: '5 天可以把首爾分成江北與江南慢慢玩，加一天到水原華城走城牆，再留一天給聖水洞咖啡與蠶室樂天世界塔。',
    bestFor: '想多看江南與近郊、喜歡咖啡廳的人',
    tips: [
      '水原華城城牆一圈步行時間長，穿好走的鞋。',
      '聖水洞咖啡店多在中午後開門，安排在下午比較順。',
      '江南、蠶室與江北距離較遠，同一天盡量排在同一區。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '抵達首爾，明洞與南山',
        area: '明洞、南山',
        stops: [
          { time: '15:00', title: '明洞飯店入住', place: '명동역', category: 'transport' },
          { time: '17:00', title: '明洞逛街與街頭小吃', place: '명동', category: 'food' },
          { time: '19:30', title: 'N 首爾塔夜景', place: 'N서울타워', category: 'spot' },
        ],
      },
      {
        day: 2,
        theme: '宮殿、韓屋與益善洞',
        area: '鍾路、北村、益善洞',
        stops: [
          { time: '09:00', title: '景福宮', place: '경복궁', category: 'spot' },
          { time: '11:30', title: '北村韓屋村', place: '북촌한옥마을', category: 'spot' },
          { time: '13:00', title: '仁寺洞午餐', place: '인사동', category: 'food' },
          { time: '15:00', title: '益善洞韓屋巷弄', place: '익선동 한옥거리', category: 'spot', note: '韓屋改建的咖啡店與小店集中。' },
          { time: '18:00', title: '廣藏市場晚餐', place: '광장시장', category: 'food' },
        ],
      },
      {
        day: 3,
        theme: '水原華城一日遊',
        area: '水原',
        stops: [
          { time: '09:00', title: '搭地鐵前往水原', place: '수원역', category: 'transport' },
          { time: '10:30', title: '華城行宮', place: '화성행궁', category: 'spot' },
          { time: '12:30', title: '水原排骨午餐', place: '수원 팔달구', category: 'food', note: '水原以韓式烤排骨聞名。' },
          { time: '14:00', title: '水原華城城牆步道', place: '수원화성', category: 'spot', note: '世界遺產城牆，可從八達門一帶開始走。' },
          { time: '17:30', title: '返回首爾', place: '수원역', category: 'transport' },
        ],
      },
      {
        day: 4,
        theme: '聖水洞、首爾林與蠶室',
        area: '聖水洞、蠶室',
        stops: [
          { time: '11:00', title: '首爾林', place: '서울숲', category: 'spot' },
          { time: '13:00', title: '聖水洞咖啡街', place: '성수동 카페거리', category: 'food', note: '工廠改建的咖啡店與品牌快閃店集中。' },
          { time: '16:30', title: '樂天世界塔與石村湖', place: '롯데월드타워', category: 'spot' },
          { time: '19:00', title: '蠶室晚餐', place: '잠실역', category: 'food' },
        ],
      },
      {
        day: 5,
        theme: '弘大、延南洞與返程',
        area: '弘大、延南洞',
        stops: [
          { time: '10:00', title: '延南洞京義線林蔭道', place: '경의선숲길', category: 'spot' },
          { time: '12:00', title: '弘大午餐與最後採買', place: '홍대입구역', category: 'shopping' },
          { time: '14:00', title: '弘大入口站搭機場快線', place: '홍대입구역', category: 'transport', note: '機場快線 AREX 有停弘大入口站。' },
        ],
      },
    ],
  },

  // ── 福岡 ────────────────────────────────────────────────────────────────
  {
    id: 'fukuoka-3-days',
    destinationSlug: 'fukuoka',
    city: '福岡',
    days: 3,
    title: '福岡 3 天 2 夜自由行行程',
    summary: '福岡機場離市區很近，3 天就能玩得完整：一天博多與中洲屋台，一天太宰府天滿宮，最後半天在大濠公園與福岡城跡散步。',
    bestFor: '第一次去福岡、短天數或 3 天連假',
    tips: [
      '機場到博多、天神很近，第一天下午抵達也能直接開始逛。',
      '中洲屋台通常傍晚後才開，週末人多，可以早點去排。',
      '太宰府從天神搭西鐵電車前往，回程順路逛天神。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '博多老街與中洲屋台',
        area: '博多、中洲',
        stops: [
          { time: '13:00', title: '博多拉麵午餐', place: '博多駅', category: 'food' },
          { time: '14:30', title: '櫛田神社', place: '櫛田神社', category: 'spot', note: '博多總鎮守，境內展示祇園山笠的裝飾山車。' },
          { time: '15:30', title: '川端通商店街', place: '上川端商店街', category: 'shopping' },
          { time: '16:30', title: '博多運河城', place: 'キャナルシティ博多', category: 'shopping' },
          { time: '19:00', title: '中洲屋台', place: '中洲屋台', category: 'food', note: '那珂川沿岸的路邊攤，招牌是拉麵、關東煮和烤串。' },
        ],
      },
      {
        day: 2,
        theme: '太宰府天滿宮與天神',
        area: '太宰府、天神、大名',
        stops: [
          { time: '09:00', title: '西鐵天神站搭電車往太宰府', place: '西鉄福岡（天神）駅', category: 'transport' },
          { time: '10:00', title: '太宰府天滿宮', place: '太宰府天満宮', category: 'spot', note: '祭祀學問之神菅原道真，考生必拜。' },
          { time: '11:30', title: '太宰府表參道與梅枝餅', place: '太宰府天満宮 表参道', category: 'food' },
          { time: '13:00', title: '九州國立博物館', place: '九州国立博物館', category: 'spot', note: '從天滿宮旁的手扶梯隧道就能走到。' },
          { time: '16:00', title: '天神地下街', place: '天神地下街', category: 'shopping' },
          { time: '18:30', title: '大名一帶晚餐', place: '大名 福岡市', category: 'food', note: '天神旁的小巷街區，餐廳與古著店多。' },
        ],
      },
      {
        day: 3,
        theme: '大濠公園、福岡城跡與返程',
        area: '大濠公園、舞鶴公園',
        stops: [
          { time: '09:00', title: '大濠公園', place: '大濠公園', category: 'spot', note: '環湖步道一圈約 2 公里。' },
          { time: '10:30', title: '福岡城跡（舞鶴公園）', place: '福岡城跡', category: 'spot' },
          { time: '12:00', title: '午餐：水炊或明太子料理', place: '天神', category: 'food' },
          { time: '14:00', title: '前往福岡機場', place: '福岡空港', category: 'transport' },
        ],
      },
    ],
  },
  {
    id: 'fukuoka-5-days',
    destinationSlug: 'fukuoka',
    city: '福岡',
    days: 5,
    title: '福岡 5 天 4 夜自由行行程（含柳川、門司港）',
    summary: '以福岡為據點的 5 天：市區兩天，加上太宰府與柳川遊船一天、門司港與對岸下關一天，不用換飯店就能玩到北九州。',
    bestFor: '想用福岡當據點玩北九州、不想換飯店的人',
    tips: [
      '太宰府和柳川都在西鐵沿線，同一天走完最順。',
      '門司港從博多搭 JR 前往，過關門海峽人行隧道就能走到山口縣。',
      '住博多站附近，往返門司港與機場最方便。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '抵達博多與中洲屋台',
        area: '博多、中洲',
        stops: [
          { time: '14:00', title: '博多站周邊入住', place: '博多駅', category: 'transport' },
          { time: '15:30', title: '櫛田神社', place: '櫛田神社', category: 'spot' },
          { time: '16:30', title: '博多運河城', place: 'キャナルシティ博多', category: 'shopping' },
          { time: '19:00', title: '中洲屋台', place: '中洲屋台', category: 'food' },
        ],
      },
      {
        day: 2,
        theme: '太宰府天滿宮與柳川遊船',
        area: '太宰府、柳川',
        stops: [
          { time: '09:00', title: '太宰府天滿宮', place: '太宰府天満宮', category: 'spot' },
          { time: '10:30', title: '太宰府表參道與梅枝餅', place: '太宰府天満宮 表参道', category: 'food' },
          { time: '12:00', title: '搭西鐵電車往柳川', place: '西鉄柳川駅', category: 'transport' },
          { time: '13:00', title: '柳川鰻魚蒸籠飯午餐', place: '柳川市', category: 'food', note: '柳川名物「せいろ蒸し」。' },
          { time: '14:30', title: '柳川川下遊船', place: '柳川 川下り', category: 'spot', note: '船夫撐篙穿過水道，約一小時。' },
          { time: '17:30', title: '返回福岡', place: '西鉄柳川駅', category: 'transport' },
        ],
      },
      {
        day: 3,
        theme: '門司港懷舊區與關門海峽',
        area: '門司港、下關',
        stops: [
          { time: '09:00', title: '博多搭 JR 往門司港', place: '門司港駅', category: 'transport' },
          { time: '10:30', title: '門司港車站與懷舊街區', place: '門司港レトロ', category: 'spot', note: '大正時代的木造車站與西洋建築。' },
          { time: '12:00', title: '燒咖哩午餐', place: '門司港レトロ', category: 'food', note: '門司港的在地名物。' },
          { time: '13:30', title: '關門海峽人行隧道', place: '関門トンネル人道', category: 'spot', note: '步行穿越海底，從福岡縣走到山口縣。' },
          { time: '15:00', title: '下關唐戶市場', place: '唐戸市場', category: 'food' },
          { time: '17:30', title: '返回博多', place: '門司港駅', category: 'transport' },
        ],
      },
      {
        day: 4,
        theme: '大濠公園、福岡城跡與海濱',
        area: '大濠公園、百道濱',
        stops: [
          { time: '09:00', title: '大濠公園', place: '大濠公園', category: 'spot' },
          { time: '10:30', title: '福岡城跡（舞鶴公園）', place: '福岡城跡', category: 'spot' },
          { time: '13:00', title: '天神午餐', place: '天神', category: 'food' },
          { time: '15:30', title: '百道濱海濱公園', place: 'シーサイドももち海浜公園', category: 'spot' },
          { time: '17:30', title: '福岡塔夕陽', place: '福岡タワー', category: 'spot' },
        ],
      },
      {
        day: 5,
        theme: '天神購物與返程',
        area: '天神、博多',
        stops: [
          { time: '10:00', title: '天神地下街', place: '天神地下街', category: 'shopping' },
          { time: '12:00', title: '博多站買伴手禮與午餐', place: '博多駅', category: 'shopping', note: '明太子與博多通りもん是熱門伴手禮。' },
          { time: '14:00', title: '前往福岡機場', place: '福岡空港', category: 'transport' },
        ],
      },
    ],
  },

  // ── 香港 ────────────────────────────────────────────────────────────────
  {
    id: 'hong-kong-3-days',
    destinationSlug: 'hong-kong',
    city: '香港',
    days: 3,
    title: '香港 3 天 2 夜自由行行程',
    summary: '香港 3 天的經典分法：港島中上環與太平山頂、九龍尖沙咀到旺角，最後一天上大嶼山看天壇大佛，下山就在機場附近。',
    bestFor: '第一次去香港、3 天連假',
    tips: [
      '八達通可搭港鐵、巴士、天星小輪，也能在便利商店付款。',
      '昂坪 360 纜車在機場附近的東涌，排在最後一天回程最順。',
      '太平山頂傍晚人多，纜車排隊時間長，可改搭巴士或計程車。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '中上環與太平山頂夜景',
        area: '中環、上環、山頂',
        stops: [
          { time: '11:00', title: '中環至半山自動扶梯', place: '中環至半山自動扶梯', category: 'spot' },
          { time: '12:30', title: '中環午餐（茶餐廳或燒味）', place: '中環', category: 'food' },
          { time: '14:00', title: '大館', place: '大館', category: 'spot', note: '前中區警署建築群改建的文化空間。' },
          { time: '15:30', title: 'PMQ 元創方', place: 'PMQ 元創方', category: 'shopping' },
          { time: '18:00', title: '山頂纜車與太平山頂', place: '山頂纜車', category: 'spot', note: '天黑後看維多利亞港夜景。' },
        ],
      },
      {
        day: 2,
        theme: '尖沙咀、天星小輪與旺角',
        area: '尖沙咀、旺角、油麻地',
        stops: [
          { time: '09:30', title: '港式早餐', place: '尖沙咀', category: 'food' },
          { time: '10:30', title: '尖沙咀海濱與星光大道', place: '星光大道', category: 'spot' },
          { time: '12:00', title: '天星小輪來回維港', place: '天星小輪 尖沙咀碼頭', category: 'transport', note: '船程短，是看維港最便宜的方式。' },
          { time: '15:00', title: '旺角女人街', place: '通菜街', category: 'shopping' },
          { time: '19:00', title: '廟街夜市', place: '廟街', category: 'food' },
        ],
      },
      {
        day: 3,
        theme: '大嶼山昂坪與天壇大佛',
        area: '東涌、昂坪',
        stops: [
          { time: '09:30', title: '昂坪 360 纜車', place: '昂坪360 東涌纜車站', category: 'transport' },
          { time: '10:30', title: '天壇大佛與寶蓮禪寺', place: '天壇大佛', category: 'spot' },
          { time: '12:30', title: '寶蓮禪寺齋菜午餐', place: '寶蓮禪寺', category: 'food' },
          { time: '14:30', title: '東涌搭車前往機場', place: '東涌站', category: 'transport' },
        ],
      },
    ],
  },
  {
    id: 'hong-kong-4-days',
    destinationSlug: 'hong-kong',
    city: '香港',
    days: 4,
    title: '香港 4 天 3 夜自由行行程（含赤柱、大澳）',
    summary: '多一天就能離開鬧區：港島南區的赤柱與淺水灣、大嶼山的大澳漁村，搭配市區的中環、山頂與九龍。',
    bestFor: '去過香港、想看海邊與漁村的人',
    tips: [
      '赤柱與淺水灣從中環搭巴士前往，沿途是海岸線景色。',
      '大澳在大嶼山西側，從昂坪有巴士可達。',
      '每天晚上都可以在不同角度看維港夜景：山頂、尖沙咀、中環海濱。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '抵達尖沙咀與維港夜景',
        area: '尖沙咀',
        stops: [
          { time: '15:00', title: '尖沙咀飯店入住', place: '尖沙咀站', category: 'transport' },
          { time: '16:30', title: '1881 Heritage 與海港城', place: '1881 Heritage', category: 'shopping' },
          { time: '19:30', title: '尖沙咀海濱看維港夜景', place: '尖沙咀海濱長廊', category: 'spot' },
        ],
      },
      {
        day: 2,
        theme: '中上環與太平山頂',
        area: '中環、上環、山頂',
        stops: [
          { time: '09:30', title: '天星小輪到中環', place: '天星小輪 中環碼頭', category: 'transport' },
          { time: '10:30', title: '中環至半山自動扶梯與大館', place: '大館', category: 'spot' },
          { time: '12:30', title: '上環午餐', place: '上環', category: 'food' },
          { time: '14:00', title: '上環海味街與文武廟', place: '文武廟', category: 'spot' },
          { time: '17:30', title: '太平山頂', place: '凌霄閣', category: 'spot' },
        ],
      },
      {
        day: 3,
        theme: '港島南區：淺水灣與赤柱',
        area: '淺水灣、赤柱',
        stops: [
          { time: '10:00', title: '中環搭巴士往淺水灣', place: '淺水灣', category: 'transport' },
          { time: '10:45', title: '淺水灣海灘', place: '淺水灣泳灘', category: 'spot' },
          { time: '12:30', title: '赤柱午餐', place: '赤柱大街', category: 'food' },
          { time: '14:00', title: '赤柱市集與美利樓', place: '美利樓', category: 'shopping' },
          { time: '18:30', title: '旺角或油麻地晚餐', place: '油麻地', category: 'food' },
        ],
      },
      {
        day: 4,
        theme: '大澳漁村與天壇大佛',
        area: '大澳、昂坪、東涌',
        stops: [
          { time: '09:00', title: '昂坪 360 纜車', place: '昂坪360 東涌纜車站', category: 'transport' },
          { time: '10:00', title: '天壇大佛', place: '天壇大佛', category: 'spot' },
          { time: '11:30', title: '搭巴士往大澳', place: '大澳', category: 'transport' },
          { time: '12:00', title: '大澳棚屋與漁村小吃', place: '大澳', category: 'food', note: '水上棚屋聚落，蝦醬與魚乾是特產。' },
          { time: '15:00', title: '前往機場', place: '香港國際機場', category: 'transport' },
        ],
      },
    ],
  },

  // ── 札幌 ────────────────────────────────────────────────────────────────
  {
    id: 'sapporo-3-days',
    destinationSlug: 'sapporo',
    city: '札幌',
    days: 3,
    title: '札幌 3 天 2 夜自由行行程（含小樽）',
    summary: '札幌 3 天：市區的大通公園、時計台與薄野，一天搭 JR 到小樽運河，最後一天吃二條市場海鮮再從新千歲機場回程。',
    bestFor: '第一次去北海道、短天數',
    tips: [
      '新千歲機場到札幌搭 JR 快速 Airport 最方便。',
      '冬天路面結冰，鞋底要防滑；雪祭期間飯店很早就會客滿。',
      '新千歲機場內伴手禮與美食很多，回程可以早點到機場。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '札幌市區與薄野夜晚',
        area: '大通、薄野',
        stops: [
          { time: '13:00', title: '札幌站周邊入住', place: '札幌駅', category: 'transport' },
          { time: '14:30', title: '札幌市時計台', place: '札幌市時計台', category: 'spot' },
          { time: '15:00', title: '大通公園', place: '大通公園', category: 'spot', note: '冬季雪祭與夏季啤酒節都在這裡舉行。' },
          { time: '16:30', title: '札幌電視塔', place: 'さっぽろテレビ塔', category: 'spot' },
          { time: '17:30', title: '狸小路商店街', place: '狸小路商店街', category: 'shopping' },
          { time: '19:00', title: '薄野成吉思汗烤羊肉', place: 'すすきの', category: 'food' },
        ],
      },
      {
        day: 2,
        theme: '小樽運河一日遊',
        area: '小樽',
        stops: [
          { time: '09:00', title: '札幌搭 JR 往小樽', place: '小樽駅', category: 'transport' },
          { time: '10:00', title: '小樽運河', place: '小樽運河', category: 'spot' },
          { time: '11:00', title: '堺町通商店街', place: '堺町通り商店街', category: 'shopping', note: '玻璃工藝與甜點店集中。' },
          { time: '12:30', title: '小樽海鮮丼或壽司午餐', place: '小樽', category: 'food' },
          { time: '14:00', title: '小樽音樂盒堂', place: '小樽オルゴール堂 本館', category: 'spot' },
          { time: '17:00', title: '運河夜景後返回札幌', place: '小樽運河', category: 'spot' },
        ],
      },
      {
        day: 3,
        theme: '二條市場與返程',
        area: '札幌市區、新千歲機場',
        stops: [
          { time: '08:00', title: '二條市場海鮮早餐', place: '二条市場', category: 'food' },
          { time: '10:00', title: '北海道神宮', place: '北海道神宮', category: 'spot' },
          { time: '13:00', title: '搭 JR 前往新千歲機場', place: '新千歳空港', category: 'transport', note: '機場內有拉麵道場與伴手禮店，可以多留時間。' },
        ],
      },
    ],
  },
  {
    id: 'sapporo-5-days',
    destinationSlug: 'sapporo',
    city: '札幌',
    days: 5,
    title: '札幌 5 天 4 夜自由行行程（含小樽、登別溫泉）',
    summary: '5 天以札幌為中心：市區與藻岩山夜景、小樽運河、登別溫泉地獄谷各一天，不用自駕也能玩。',
    bestFor: '想泡溫泉、看夜景、不自駕的人',
    tips: [
      '登別溫泉可當天來回，也可以在溫泉旅館住一晚。',
      '藻岩山夜景搭纜車上山，冬天山頂很冷。',
      '札幌到小樽、登別都有 JR 直達，住札幌站附近最方便。',
    ],
    reviewedAt: null,
    dayPlans: [
      {
        day: 1,
        theme: '抵達札幌與薄野',
        area: '札幌站、薄野',
        stops: [
          { time: '15:00', title: '札幌站周邊入住', place: '札幌駅', category: 'transport' },
          { time: '17:00', title: '狸小路商店街', place: '狸小路商店街', category: 'shopping' },
          { time: '19:00', title: '薄野味噌拉麵', place: 'すすきの', category: 'food', note: '札幌是味噌拉麵的發源地。' },
        ],
      },
      {
        day: 2,
        theme: '札幌市區與藻岩山夜景',
        area: '大通、圓山、藻岩山',
        stops: [
          { time: '09:00', title: '二條市場早餐', place: '二条市場', category: 'food' },
          { time: '10:30', title: '札幌市時計台與大通公園', place: '大通公園', category: 'spot' },
          { time: '13:00', title: '北海道神宮與圓山公園', place: '北海道神宮', category: 'spot' },
          { time: '15:30', title: '白色戀人公園', place: '白い恋人パーク', category: 'spot' },
          { time: '18:30', title: '藻岩山纜車看夜景', place: 'もいわ山ロープウェイ', category: 'spot' },
        ],
      },
      {
        day: 3,
        theme: '小樽運河一日遊',
        area: '小樽',
        stops: [
          { time: '09:00', title: '札幌搭 JR 往小樽', place: '小樽駅', category: 'transport' },
          { time: '10:00', title: '小樽運河', place: '小樽運河', category: 'spot' },
          { time: '11:00', title: '堺町通與北一硝子', place: '北一硝子', category: 'shopping' },
          { time: '12:30', title: '小樽壽司午餐', place: '小樽', category: 'food' },
          { time: '14:00', title: '小樽音樂盒堂', place: '小樽オルゴール堂 本館', category: 'spot' },
          { time: '17:00', title: '返回札幌', place: '小樽駅', category: 'transport' },
        ],
      },
      {
        day: 4,
        theme: '登別溫泉地獄谷',
        area: '登別',
        stops: [
          { time: '09:00', title: '札幌搭 JR 往登別', place: '登別駅', category: 'transport', note: '登別站轉乘巴士進溫泉街。' },
          { time: '11:00', title: '登別地獄谷', place: '登別地獄谷', category: 'spot', note: '火山噴氣地形，沿木棧步道可以近距離觀看。' },
          { time: '12:30', title: '溫泉街午餐', place: '登別温泉', category: 'food' },
          { time: '14:00', title: '溫泉旅館純泡湯', place: '登別温泉', category: 'spot', note: '不少旅館提供不住宿的日歸溫泉。' },
          { time: '17:00', title: '返回札幌', place: '登別駅', category: 'transport' },
        ],
      },
      {
        day: 5,
        theme: '最後採買與返程',
        area: '札幌站、新千歲機場',
        stops: [
          { time: '10:00', title: '札幌站買伴手禮', place: '札幌駅', category: 'shopping' },
          { time: '12:00', title: '搭 JR 前往新千歲機場', place: '新千歳空港', category: 'transport' },
          { time: '13:00', title: '新千歲機場拉麵道場午餐', place: '北海道ラーメン道場', category: 'food' },
        ],
      },
    ],
  },
];

export function getSampleItinerary(id: string): SampleItinerary | undefined {
  return SAMPLE_ITINERARIES.find((s) => s.id === id);
}

export function sampleItinerariesFor(destinationSlug: string): SampleItinerary[] {
  return SAMPLE_ITINERARIES.filter((s) => s.destinationSlug === destinationSlug).sort((a, b) => a.days - b.days);
}
