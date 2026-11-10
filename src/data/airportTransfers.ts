// Airport → city transfer facts for the /airport/{slug}/ SEO pages.
//
// Every option cites the operator's (or airport's) own page in `sourceUrl`.
// A fare is listed only when that page states it (`fareQuote` keeps the
// wording); otherwise `fare` is null and the page shows mode and time only.
// Re-check and bump `verifiedAt` when fares change.

export type TransferMode = 'train' | 'subway' | 'monorail' | 'bus' | 'taxi' | 'rideshare' | 'ferry';

export interface TransferOption {
  mode: TransferMode;
  name: string;
  operator: string;
  from: string;
  to: string;
  durationMin: number;
  durationSource: 'official' | 'estimate';
  transfers: number;
  /** `amount` is the fare, or the low end when the source gives a range up to `amountMax`. */
  fare: { amount: number; amountMax?: number; currency: string; note: string | null } | null;
  fareQuote: string | null;
  frequency: string | null;
  reservation: string | null;
  sourceUrl: string;
  notes: string | null;
}

export interface AirportTransfer {
  slug: string; // "fukuoka-airport-to-hakata"
  airportCode: string; // "FUK"
  airportName: string; // "福岡機場"
  areaName: string; // "博多"
  destinationSlug: string; // KNOWN_DESTINATIONS slug
  /** ISO date the options were last checked against their sources. */
  verifiedAt: string;
  options: TransferOption[];
}

export const AIRPORT_TRANSFERS: AirportTransfer[] = [
  {
    "slug": "narita-airport-to-ueno",
    "airportCode": "NRT",
    "airportName": "成田機場",
    "areaName": "上野",
    "destinationSlug": "tokyo",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "京成 Skyliner",
        "operator": "京成電鐵",
        "from": "成田機場站／機場第 2 大樓站",
        "to": "京成上野站",
        "durationMin": 41,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 2580,
          "currency": "JPY",
          "note": "車票（磁氣票）1,280 日圓＋Skyliner 特急券 1,300 日圓；使用 IC 卡則車資部分為 1,267 日圓（合計 2,567 日圓）"
        },
        "fareQuote": "スカイライナー (京成上野・日暮里～空港第2ビル・成田空港) 運賃 [ＩＣ]大人1,267円／小児633円 [磁気]大人1,280円／小児640円 ライナー料金 大人1,300円／小児650円",
        "frequency": null,
        "reservation": "全車對號座（需另購 Skyliner 券）",
        "sourceUrl": "https://www.keisei.co.jp/keisei/tetudou/skyliner/jp/skyliner/ticket.php",
        "notes": "官方標示最快 41 分鐘抵達京成上野；未持 Skyliner 券上車需加收大人 300 日圓。"
      },
      {
        "mode": "train",
        "name": "京成本線 特急／快速特急",
        "operator": "京成電鐵",
        "from": "成田機場站／機場第 2 大樓站",
        "to": "京成上野站",
        "durationMin": 75,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.keisei.co.jp/keisei/tetudou/skyliner/us/traffic/main.php",
        "notes": "經由京成本線（船橋方向），不需特急券，車程較 Skyliner 長但較省錢。"
      }
    ]
  },
  {
    "slug": "narita-airport-to-shinjuku",
    "airportCode": "NRT",
    "airportName": "成田機場",
    "areaName": "新宿",
    "destinationSlug": "tokyo",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "JR 成田特快 N'EX",
        "operator": "JR 東日本",
        "from": "成田機場站／機場第 2・3 大樓站",
        "to": "JR 新宿站",
        "durationMin": 80,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 3330,
          "currency": "JPY",
          "note": "普通車（含車資與特急費用）；綠色車廂 4,100 日圓；全年同價"
        },
        "fareQuote": "Fares and charges related to transport to Narita Airport Terminal 1 Station and Narita Airport Terminal 2・3 Station … Shinagawa Shibuya Shinjuku ¥3,330 ¥4,100",
        "frequency": null,
        "reservation": "需購特急券（可選指定席或座席未指定特急券，同價）",
        "sourceUrl": "https://www.jreast.co.jp/en/multi/nex/tickets/",
        "notes": "直達新宿免轉車；外國旅客可考慮 14 天內有效的 N'EX 東京來回票（官方售價 5,200 日圓）。"
      },
      {
        "mode": "bus",
        "name": "利木津巴士（成田機場－新宿地區）",
        "operator": "東京空港交通（利木津巴士）",
        "from": "成田機場各航廈巴士站",
        "to": "新宿地區（新宿站周邊及主要飯店）",
        "durationMin": 90,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 3600,
          "currency": "JPY",
          "note": "成人單程"
        },
        "fareQuote": "Fare (1 person) adult 3,600yen children 1,800yen",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.limousinebus.co.jp/en/line/detail/Narita-Shinjuku/",
        "notes": "可直達新宿主要飯店，行李多時方便，但車程受道路壅塞影響。"
      }
    ]
  },
  {
    "slug": "haneda-airport-to-shinjuku",
    "airportCode": "HND",
    "airportName": "羽田機場",
    "areaName": "新宿",
    "destinationSlug": "tokyo",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "京急線＋JR 山手線（品川轉乘）",
        "operator": "京濱急行電鐵／JR 東日本",
        "from": "羽田機場第 1・第 2 航廈站／第 3 航廈站",
        "to": "JR 新宿站",
        "durationMin": 50,
        "durationSource": "estimate",
        "transfers": 1,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://tokyo-haneda.com/text/access/train/index.html",
        "notes": "於品川站轉乘 JR 山手線；羽田機場官網標示電車至新宿站約 50 分鐘（目安）。"
      },
      {
        "mode": "monorail",
        "name": "東京單軌電車＋JR 山手線（濱松町轉乘）",
        "operator": "東京單軌電車／JR 東日本",
        "from": "羽田機場第 1、第 2、第 3 航廈站",
        "to": "JR 新宿站",
        "durationMin": 37,
        "durationSource": "official",
        "transfers": 1,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.tokyo-monorail.co.jp/english/",
        "notes": "於濱松町轉乘 JR 山手線；單軌電車濱松町至羽田機場第 1、第 2 航廈成人紙本票 520 日圓，JR 段需另計。"
      },
      {
        "mode": "bus",
        "name": "利木津巴士（羽田機場－新宿地區）",
        "operator": "東京空港交通（利木津巴士）",
        "from": "羽田機場各航廈巴士站",
        "to": "新宿地區（新宿站西口等）",
        "durationMin": 35,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1400,
          "currency": "JPY",
          "note": "成人單程"
        },
        "fareQuote": "Fare (1 person) adult 1,400yen children 700yen",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.limousinebus.co.jp/en/line/detail/Haneda-Shinjuku/",
        "notes": "羽田機場官網標示至新宿站西口約 35 分鐘，實際依路況而定。"
      }
    ]
  },
  {
    "slug": "kansai-airport-to-namba",
    "airportCode": "KIX",
    "airportName": "關西機場",
    "areaName": "難波",
    "destinationSlug": "osaka",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "南海特急 rapi:t",
        "operator": "南海電鐵",
        "from": "關西機場站",
        "to": "南海難波站",
        "durationMin": 34,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1670,
          "currency": "JPY",
          "note": "車資 970 日圓＋一般座特急費 700 日圓；Super Seat 特急費 910 日圓，車上補購特急券另加 300 日圓"
        },
        "fareQuote": "関西空港 − 難波 片道運賃（大人） 970 円 ／ 運行全区間 700円 350円",
        "frequency": null,
        "reservation": "全車對號座",
        "sourceUrl": "https://www.nankai.co.jp/traffic/express/rapit.html",
        "notes": "官方標示最快 34 分鐘；透過南海特急無票服務購買特急券可便宜 150 日圓。"
      },
      {
        "mode": "train",
        "name": "南海空港急行",
        "operator": "南海電鐵",
        "from": "關西機場站",
        "to": "南海難波站",
        "durationMin": 45,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 970,
          "currency": "JPY",
          "note": "成人單程車資，不需特急券"
        },
        "fareQuote": "関西空港 − 難波 キロ程：42.8Km 片道運賃（大人） 970 円",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://kensaku.nankai.co.jp/pc/U1",
        "notes": "最省錢的鐵路選項，可直接刷 IC 卡搭乘。"
      },
      {
        "mode": "bus",
        "name": "關西機場利木津巴士（難波 OCAT 線）",
        "operator": "關西空港交通（KATE）",
        "from": "關西機場第 1 航廈／第 2 航廈巴士站",
        "to": "難波（OCAT）",
        "durationMin": 50,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1400,
          "currency": "JPY",
          "note": "成人單程；14 天內有效來回票 2,500 日圓"
        },
        "fareQuote": "One-way Namba (OCAT)⇔Kansai Airport 1,400Yen 700Yen",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.kate.co.jp/en/timetable/detail/OC",
        "notes": "官方標示第 1 航廈至難波 OCAT 約 50 分鐘，實際依路況而定。"
      }
    ]
  },
  {
    "slug": "kansai-airport-to-umeda",
    "airportCode": "KIX",
    "airportName": "關西機場",
    "areaName": "梅田（大阪站）",
    "destinationSlug": "osaka",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "JR 關空快速",
        "operator": "JR 西日本",
        "from": "JR 關西機場站",
        "to": "JR 大阪站",
        "durationMin": 65,
        "durationSource": "official",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": "約每 15 分鐘一班",
        "reservation": null,
        "sourceUrl": "https://www.kansai-airport.or.jp/explorekansai/osaka/21821",
        "notes": "不需特急券，可直接刷 IC 卡搭乘，是到大阪站最省錢的鐵路方式。"
      },
      {
        "mode": "train",
        "name": "JR 特急 HARUKA（はるか）",
        "operator": "JR 西日本",
        "from": "JR 關西機場站",
        "to": "JR 大阪站（うめきた地下月台）",
        "durationMin": 47,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": "約每 30 分鐘一班",
        "reservation": null,
        "sourceUrl": "https://www.kansai-airport.or.jp/explorekansai/osaka/21821",
        "notes": "持外國護照的短期滯在旅客可於日本境外預購 JR 西日本 HARUKA One-way Ticket（關西機場→大阪成人 1,900 日圓）；列車停靠大阪站うめきた地下月台。"
      },
      {
        "mode": "bus",
        "name": "關西機場利木津巴士（大阪站線）",
        "operator": "關西空港交通（KATE）",
        "from": "關西機場第 1 航廈／第 2 航廈巴士站",
        "to": "大阪站（阪急三番街）",
        "durationMin": 60,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1800,
          "currency": "JPY",
          "note": "成人單程；14 天內有效來回票 3,300 日圓"
        },
        "fareQuote": "One-way Osaka Sta.(Umeda)⇔Kansai Airport 1,800Yen 900Yen",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.kate.co.jp/en/timetable/detail/um",
        "notes": "官方標示第 1 航廈至大阪站約 60 分鐘，阪神高速壅塞時可能延誤。"
      }
    ]
  },
  {
    "slug": "kansai-airport-to-kyoto",
    "airportCode": "KIX",
    "airportName": "關西機場",
    "areaName": "京都",
    "destinationSlug": "kyoto",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "JR 特急 HARUKA（はるか）",
        "operator": "JR 西日本",
        "from": "JR 關西機場站",
        "to": "JR 京都站",
        "durationMin": 75,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.kansai-airport.or.jp/explorekansai/kyoto/21816",
        "notes": "持外國護照的短期滯在旅客可於日本境外預購 JR 西日本 HARUKA One-way Ticket（關西機場→京都成人 2,700 日圓），免轉車直達京都站。"
      },
      {
        "mode": "bus",
        "name": "關西機場利木津巴士（京都站線）",
        "operator": "關西空港交通（KATE）",
        "from": "關西機場第 1 航廈／第 2 航廈巴士站",
        "to": "京都站八條口",
        "durationMin": 85,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 2800,
          "currency": "JPY",
          "note": "成人單程；14 天內有效來回票 5,100 日圓"
        },
        "fareQuote": "One-way Kyoto Sra./Highway Kyotanabe⇔Kansai Airport 2,800Yen 1,400Yen",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.kate.co.jp/en/timetable/detail/KY",
        "notes": "官方標示第 1 航廈至京都站八條口約 1 小時 25～30 分鐘，實際依路況而定。"
      }
    ]
  },
  {
    "slug": "fukuoka-airport-to-hakata",
    "airportCode": "FUK",
    "airportName": "福岡機場",
    "areaName": "博多",
    "destinationSlug": "fukuoka",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "subway",
        "name": "福岡市地下鐵空港線（經國內線航廈）",
        "operator": "福岡市交通局",
        "from": "福岡機場國際線航廈（搭免費聯絡巴士至國內線航廈「福岡空港站」）",
        "to": "博多站",
        "durationMin": 15,
        "durationSource": "official",
        "transfers": 1,
        "fare": {
          "amount": 260,
          "currency": "JPY",
          "note": "地下鐵大人單程票，福岡空港站至博多站屬 2 區；國際線↔國內線聯絡巴士免費"
        },
        "fareQuote": "2区（3kmを超え7kmまで） 260円",
        "frequency": "地下鐵約每4–8分鐘一班；聯絡巴士約每5–7分鐘一班",
        "reservation": null,
        "sourceUrl": "https://subway.city.fukuoka.lg.jp/fare/futuken/",
        "notes": "國際線航廈沒有地下鐵站，需先搭免費聯絡巴士約10分鐘到國內線，再搭地下鐵約5分鐘到博多，時間未含候車。"
      },
      {
        "mode": "bus",
        "name": "西鐵巴士 博多站（筑紫口）～福岡機場國際線 直達巴士",
        "operator": "西日本鐵道（西鐵）",
        "from": "福岡機場國際線航廈 6・7號乘車處",
        "to": "博多站（筑紫口）",
        "durationMin": 20,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 400,
          "currency": "JPY",
          "note": "車上以交通IC卡或信用卡感應支付折抵20日圓（380日圓）"
        },
        "fareQuote": "大人 400円 ※車内でクレジットカード、交通系ICカードでお支払いをする場合、上記運賃から20円引きされます",
        "frequency": "平日8:00–21:00發車，白天約每15分鐘一班（2026年4月1日時刻表）",
        "reservation": null,
        "sourceUrl": "https://www.nishitetsu.jp/bus/rosen/akeito/",
        "notes": "本路線為完全無現金巴士實證運行，原則請使用交通IC卡或信用卡感應支付。"
      }
    ]
  },
  {
    "slug": "fukuoka-airport-to-tenjin",
    "airportCode": "FUK",
    "airportName": "福岡機場",
    "areaName": "天神",
    "destinationSlug": "fukuoka",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "bus",
        "name": "西鐵特急巴士「Airport Express」",
        "operator": "西日本鐵道（西鐵）",
        "from": "福岡機場國際線航廈 8號乘車處",
        "to": "西鐵天神高速巴士總站",
        "durationMin": 30,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 500,
          "currency": "JPY",
          "note": "使用交通IC卡為480日圓；不可使用信用卡"
        },
        "fareQuote": "大人 500円 480円",
        "frequency": "每日17班，約9:00至18:45之間自機場發車；尖峰約每20分鐘、白天約每30分鐘一班（2026年10月25日改正）",
        "reservation": null,
        "sourceUrl": "https://www.nishitetsu.jp/bus/rosen/airportexpress/",
        "notes": "中途不停靠直達天神；末班車於傍晚發車，晚間抵達請改搭地下鐵。"
      },
      {
        "mode": "subway",
        "name": "福岡市地下鐵空港線（經國內線航廈）",
        "operator": "福岡市交通局",
        "from": "福岡機場國際線航廈（搭免費聯絡巴士至國內線航廈「福岡空港站」）",
        "to": "天神站",
        "durationMin": 21,
        "durationSource": "official",
        "transfers": 1,
        "fare": {
          "amount": 260,
          "currency": "JPY",
          "note": "地下鐵大人單程票，福岡空港站至天神站屬 2 區；國際線↔國內線聯絡巴士免費"
        },
        "fareQuote": "2区（3kmを超え7kmまで） 260円",
        "frequency": "地下鐵約每4–8分鐘一班；聯絡巴士約每5–7分鐘一班",
        "reservation": null,
        "sourceUrl": "https://subway.city.fukuoka.lg.jp/fare/futuken/",
        "notes": "先搭免費聯絡巴士約10分鐘到國內線，再搭地下鐵約11分鐘到天神，時間未含候車。"
      }
    ]
  },
  {
    "slug": "new-chitose-airport-to-sapporo",
    "airportCode": "CTS",
    "airportName": "新千歲機場",
    "areaName": "札幌",
    "destinationSlug": "sapporo",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "JR快速「Airport」",
        "operator": "JR北海道",
        "from": "JR新千歲機場站（國內線航廈地下1樓）",
        "to": "JR札幌站",
        "durationMin": 37,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1230,
          "currency": "JPY",
          "note": "自由席；4號車廂指定席「u Seat」需另付指定席費1,000日圓"
        },
        "fareQuote": "New Chitose Airport Sapporo Details ¥1,230 Non-reserved seat ¥2,230 Reserved seat",
        "frequency": "新千歲機場站發車約每10分鐘一班（白天每小時6班，每日163班）",
        "reservation": "自由席免預約；4號車廂指定席「u Seat」可線上預訂",
        "sourceUrl": "https://www.jrhokkaido.co.jp/global/english/ticket/regular/index.html",
        "notes": "37分鐘為白天快速最快所需時間（特別快速最快36分鐘），自由席可直接刷交通IC卡進站。"
      },
      {
        "mode": "bus",
        "name": "新千歲機場聯絡巴士（札幌都心線）",
        "operator": "北都交通／北海道中央巴士",
        "from": "新千歲機場國際線航廈巴士站",
        "to": "札幌站前",
        "durationMin": 77,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1500,
          "currency": "JPY",
          "note": "可付現金、信用卡感應支付或PayPay"
        },
        "fareQuote": "札幌都心部～月寒東1-19 ⇔ 新千歳空港 1,500円",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.hokto.co.jp/information/49138/",
        "notes": "時刻表標示至札幌站前約 77 分鐘，實際依路況而定；2026 年 12 月 11 日起路線重整，票價不變。"
      }
    ]
  },
  {
    "slug": "chubu-airport-to-nagoya",
    "airportCode": "NGO",
    "airportName": "中部國際機場",
    "areaName": "名古屋站",
    "destinationSlug": "nagoya",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "名鐵μSKY特急",
        "operator": "名古屋鐵道（名鐵）",
        "from": "名鐵中部國際機場站",
        "to": "名鐵名古屋站",
        "durationMin": 29,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 1430,
          "currency": "JPY",
          "note": "普通車票980日圓＋特別車票「μticket」450日圓；全車為特別車廂"
        },
        "fareQuote": "名鐵名古屋 980日圓 μSKY Ltd.Exp. 29分鐘 / 特急 38分鐘；乘坐μSKY特急、快速特急或特急的特別車廂時， 需購買特別車票「μticket」（450日圓） 。",
        "frequency": null,
        "reservation": "需購買μticket（含座位指定），可於車站售票處或線上購買",
        "sourceUrl": "https://www.meitetsu.co.jp/cht/airport-access/index.html",
        "notes": "μSKY於中部國際機場站1號月台發車，所有車廂均為特別車廂。"
      },
      {
        "mode": "train",
        "name": "名鐵特急（一般車廂）",
        "operator": "名古屋鐵道（名鐵）",
        "from": "名鐵中部國際機場站",
        "to": "名鐵名古屋站",
        "durationMin": 38,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 980,
          "currency": "JPY",
          "note": "一般車廂只需普通車票；1・2號特別車廂需另購μticket 450日圓"
        },
        "fareQuote": "名鐵名古屋 980日圓 μSKY Ltd.Exp. 29分鐘 / 特急 38分鐘",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.meitetsu.co.jp/cht/airport-access/index.html",
        "notes": "特急在2號或3號月台發車，一般車廂不必加購μticket。"
      }
    ]
  },
  {
    "slug": "naha-airport-to-kokusai-dori",
    "airportCode": "OKA",
    "airportName": "那霸機場",
    "areaName": "國際通",
    "destinationSlug": "okinawa",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "monorail",
        "name": "沖繩都市單軌電車（Yui Rail）至縣廳前站",
        "operator": "沖繩都市單軌電車株式會社",
        "from": "那霸機場站",
        "to": "縣廳前站（國際通西端）",
        "durationMin": 13,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 290,
          "currency": "JPY",
          "note": null
        },
        "fareQuote": "県庁前駅 290 (150) 13 6",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.yui-rail.co.jp/routemap/nahakuko/?t=fare",
        "notes": "縣廳前站位於國際通西端入口，適合住在國際通西段或久茂地一帶的旅客。"
      },
      {
        "mode": "monorail",
        "name": "沖繩都市單軌電車（Yui Rail）至牧志站",
        "operator": "沖繩都市單軌電車株式會社",
        "from": "那霸機場站",
        "to": "牧志站（國際通東端）",
        "durationMin": 16,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 320,
          "currency": "JPY",
          "note": null
        },
        "fareQuote": "牧志駅 320 (160) 16 7.7",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.yui-rail.co.jp/routemap/nahakuko/?t=fare",
        "notes": "牧志站靠近國際通東段，住在東段者在此下車較近。"
      }
    ]
  },
  {
    "slug": "incheon-airport-to-seoul-station",
    "airportCode": "ICN",
    "airportName": "仁川機場",
    "areaName": "首爾站",
    "destinationSlug": "seoul",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "機場快線 AREX 直達列車",
        "operator": "공항철도（AREX 機場鐵路）",
        "from": "仁川機場第一航廈站",
        "to": "首爾站",
        "durationMin": 43,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 13000,
          "currency": "KRW",
          "note": "現行成人票價；原價（정상운임）第一航廈 18,500 韓元、第二航廈 19,100 韓元"
        },
        "fareQuote": "어른 : 13,000원 ※ 정상운임 : 18,500원(서울역~인천공항1터미널), 19,100원(서울역~인천공항2터미널)",
        "frequency": "每日 56 班，11–18 時平均約 35 分鐘一班",
        "reservation": "需另購直達列車車票（官網、售票機或交通中心地下 1 樓直達列車服務中心）",
        "sourceUrl": "https://www.airportrailroad.com/train/express/introduce",
        "notes": "全車對號座、中途不停站；第二航廈出發約 51 分鐘。"
      },
      {
        "mode": "train",
        "name": "機場快線 AREX 普通列車",
        "operator": "공항철도（AREX 機場鐵路）",
        "from": "仁川機場第一航廈站",
        "to": "首爾站",
        "durationMin": 59,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 4750,
          "currency": "KRW",
          "note": "交通卡（선후불 교통카드）票價；購買一次性交通卡加收 100 韓元，另付 500 韓元押金（到站可退）"
        },
        "fareQuote": "인천공항1터미널 | 4,750",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.airportrailroad.com/train/normal/fare",
        "notes": "沿途停靠弘大入口、孔德等站，可直接刷交通卡進站；部分班次會多花 2–6 分鐘。"
      }
    ]
  },
  {
    "slug": "incheon-airport-to-myeongdong",
    "airportCode": "ICN",
    "airportName": "仁川機場",
    "areaName": "明洞",
    "destinationSlug": "seoul",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "bus",
        "name": "機場巴士 6015（明洞方向）",
        "operator": "공항리무진（Airport Limousine）",
        "from": "仁川機場第一航廈",
        "to": "明洞站（L7 明洞／世宗飯店）",
        "durationMin": 70,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 17000,
          "currency": "KRW",
          "note": "成人；兒童（6–12 歲）12,000 韓元"
        },
        "fareQuote": "성인 : 17,000원 / 어린이 : 12,000원",
        "frequency": null,
        "reservation": "不提供線上預約；第一航廈先到先上，可用交通卡或現金；第二航廈須持紙本車票",
        "sourceUrl": "https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=21",
        "notes": "沿途停靠樂天飯店、乙支路、明洞站與忠正路、孔德等站，下車前記得按鈴。"
      },
      {
        "mode": "subway",
        "name": "機場快線普通列車 + 地鐵 4 號線",
        "operator": "공항철도（AREX）／서울교통공사（首爾交通公社）",
        "from": "仁川機場第一航廈站",
        "to": "明洞站（4 號線）",
        "durationMin": 75,
        "durationSource": "estimate",
        "transfers": 1,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.airportrailroad.com/train/normal/introduce",
        "notes": "在首爾站轉乘 4 號線，經會賢站後下一站即為明洞站，建議全程使用 T-money 等交通卡。"
      }
    ]
  },
  {
    "slug": "hong-kong-airport-to-central",
    "airportCode": "HKG",
    "airportName": "香港機場",
    "areaName": "中環／九龍",
    "destinationSlug": "hong-kong",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "機場快綫（往香港站）",
        "operator": "港鐵 MTR",
        "from": "機場站",
        "to": "香港站（中環）",
        "durationMin": 24,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 120,
          "currency": "HKD",
          "note": "八達通／感應式信用卡／乘車碼價；機場快綫 QR Code 車票為 130 港元"
        },
        "fareQuote": "Hong Kong | $120 $130 | $215",
        "frequency": "平均約 10 分鐘一班",
        "reservation": null,
        "sourceUrl": "https://www.mtr.com.hk/en/customer/tickets/tf_index.html",
        "notes": "用八達通或感應式信用卡進閘最省事，同日來回可享回程優惠。"
      },
      {
        "mode": "train",
        "name": "機場快綫（往九龍站）",
        "operator": "港鐵 MTR",
        "from": "機場站",
        "to": "九龍站",
        "durationMin": 22,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 105,
          "currency": "HKD",
          "note": "八達通／感應式信用卡／乘車碼價；機場快綫 QR Code 車票為 115 港元"
        },
        "fareQuote": "Kowloon | $105 $115 | $195",
        "frequency": "平均約 10 分鐘一班",
        "reservation": null,
        "sourceUrl": "https://www.mtr.com.hk/en/customer/tickets/tf_index.html",
        "notes": "九龍站位於西九龍，前往尖沙咀、佐敦需再轉車或搭計程車。"
      },
      {
        "mode": "bus",
        "name": "城巴 A11（往中環、北角）",
        "operator": "城巴 Citybus",
        "from": "機場（地面運輸中心）",
        "to": "中環／北角碼頭",
        "durationMin": 60,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.citybus.com.hk/routes/airport-bus/route/index.aspx",
        "notes": "行經港島北岸，適合住中環、灣仔一帶且不趕時間的旅客。"
      },
      {
        "mode": "bus",
        "name": "城巴 A21（往旺角、尖沙咀、紅磡）",
        "operator": "城巴 Citybus",
        "from": "機場（地面運輸中心）",
        "to": "旺角／尖沙咀／紅磡站",
        "durationMin": 60,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.citybus.com.hk/routes/airport-bus/route/index.aspx",
        "notes": "沿彌敦道行駛，住旺角、油麻地、尖沙咀可直達飯店附近。"
      }
    ]
  },
  {
    "slug": "macau-airport-to-city",
    "airportCode": "MFM",
    "airportName": "澳門機場",
    "areaName": "澳門半島／路氹",
    "destinationSlug": "macau",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "澳門輕軌氹仔線（往媽閣）",
        "operator": "澳門輕軌股份有限公司",
        "from": "機場站",
        "to": "媽閣站（澳門半島）",
        "durationMin": 25,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 12,
          "currency": "MOP",
          "note": "單程票（機場至媽閣共 11 站）；使用輕軌卡或澳門通為 MOP 6"
        },
        "fareQuote": "MOP $12.00 / 12 stations or less / MOP $6.00",
        "frequency": "約 5–10.5 分鐘一班；週一至四 06:30–23:15，週五至日及公眾假期 06:30–23:59",
        "reservation": null,
        "sourceUrl": "https://www.mlm.com.mo/en/general_ticket.html",
        "notes": "輕軌機場站與客運大樓北出口相連；往路氹各站站數較少，票價較低。"
      },
      {
        "mode": "bus",
        "name": "巴士 AP1（往關閘）",
        "operator": "新福利巴士 Transmac",
        "from": "澳門國際機場",
        "to": "關閘（澳門半島）",
        "durationMin": 45,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 6,
          "currency": "MOP",
          "note": "依機場官網，實際以車上公告為準"
        },
        "fareQuote": "Transmac | AP1 | Barrier Gate / Terminal | Barrier Gate / Terminal | 6.0 | 06:00 ~ 01:20",
        "frequency": "服務時間 06:00–01:20",
        "reservation": null,
        "sourceUrl": "https://www.macau-airport.com/en/transportation/public-transport",
        "notes": "MT1、MT4、26、36、51A 等路線也停靠機場，票價同為 MOP 6；各大酒店另有免費接駁車，約 11:00–21:00 每 15–20 分鐘一班。"
      }
    ]
  },
  {
    "slug": "changi-airport-to-city",
    "airportCode": "SIN",
    "airportName": "新加坡樟宜機場",
    "areaName": "市區",
    "destinationSlug": "singapore",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "subway",
        "name": "地鐵東西線（經丹那美拉轉乘）",
        "operator": "SMRT",
        "from": "樟宜機場站（CG2）",
        "to": "政府大廈站等市區各站",
        "durationMin": 35,
        "durationSource": "estimate",
        "transfers": 1,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.changiairport.com/en/airport-guide/transport/leaving-the-airport.html",
        "notes": "在丹那美拉站（EW4）轉往大士連路方向；首班車週一至六 5:31、週日及假日 5:59，可直接用感應式信用卡進站（外國卡另收手續費）。"
      },
      {
        "mode": "taxi",
        "name": "計程車",
        "operator": "各計程車公司",
        "from": "樟宜機場第 1–4 航廈抵達大廳",
        "to": "市區",
        "durationMin": 30,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 25,
          "currency": "SGD",
          "note": "官方區間 S$25–45，跳表計費；另加機場附加費 S$6（17:00–23:59 為 S$8），尖峰時段加收 25%、午夜加收 50%",
          "amountMax": 45
        },
        "fareQuote": "A ride to the city takes about 30 minutes and costs between S$25 and S$45. All fares are metered.",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://www.changiairport.com/en/airport-guide/transport/leaving-the-airport.html",
        "notes": "地鐵收班後仍可 24 小時在各航廈排班搭乘。"
      }
    ]
  },
  {
    "slug": "klia-to-kl-sentral",
    "airportCode": "KUL",
    "airportName": "吉隆坡國際機場",
    "areaName": "KL Sentral",
    "destinationSlug": "kuala-lumpur",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "train",
        "name": "吉隆坡機場快線 KLIA Ekspres",
        "operator": "Express Rail Link (ERL)",
        "from": "KLIA 第 1 航廈／第 2 航廈",
        "to": "KL Sentral",
        "durationMin": 28,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 55,
          "currency": "MYR",
          "note": "成人單程；官方已公告 2027 年 1 月 1 日起調整為 RM65"
        },
        "fareQuote": "RM55.00",
        "frequency": "每 20 分鐘一班（含週末及國定假日）",
        "reservation": "透過官網或 KLIA Ekspres App 購票享 9 折；3 人以上同行可購團體票（每人 RM40）",
        "sourceUrl": "https://kliaekspres.com/products-fares/klia-ekspres/",
        "notes": "直達不停站，從第 1 航廈出發約 28 分鐘，第 2 航廈再多約 3 分鐘。"
      }
    ]
  },
  {
    "slug": "da-nang-airport-to-city",
    "airportCode": "DAD",
    "airportName": "峴港機場",
    "areaName": "市區/美溪沙灘",
    "destinationSlug": "da-nang",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "bus",
        "name": "峴港公車 12 號線（Danabus）",
        "operator": "Phuong Trang 客運公司（Danabus）",
        "from": "國內線航廈（T1）2 號柱／國際線航廈（T2）7、8 號柱外",
        "to": "峴港市區（經黎筍路 Le Duan、黎利路 Le Loi 等）",
        "durationMin": 20,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 8000,
          "currency": "VND",
          "note": "單程票"
        },
        "fareQuote": "Danabus – Route 12 (City route): - One-way: 8,000 VND per trip",
        "frequency": "每日 05:30–19:00，候車時間約 5–30 分鐘",
        "reservation": null,
        "sourceUrl": "https://danangairport.vn/airport-guide-transport-from-the-airport",
        "notes": "機場已於 2024 年 12 月 11 日公告 6 號公車停止進出機場，12 號線照常營運。"
      },
      {
        "mode": "taxi",
        "name": "機場計程車",
        "operator": "Mai Linh、Tien Sa、VinaSun、Xanh SM 等",
        "from": "入境大廳外第二車道計程車招呼站（兩航廈共用）",
        "to": "峴港市區／美溪沙灘",
        "durationMin": 15,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://danangairport.vn/airport-guide-transport-from-the-airport",
        "notes": "固定路線的車資可查看入境大廳 2 號柱旁的計程車價目表，也可詢問現場工作人員。"
      }
    ]
  },
  {
    "slug": "noi-bai-airport-to-old-quarter",
    "airportCode": "HAN",
    "airportName": "內排機場",
    "areaName": "河內老城區/還劍湖",
    "destinationSlug": "hanoi",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "bus",
        "name": "機場公車 86 號線",
        "operator": "河內公車",
        "from": "內排機場",
        "to": "河內火車站（Ga Hà Nội）",
        "durationMin": 60,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 50000,
          "currency": "VND",
          "note": "單程"
        },
        "fareQuote": "Route No.86: Noi Bai - Ha Noi Railway Station + 50.000 VND/trip",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://noibaiairport.vn/en/public-transportations-nid1.html",
        "notes": "終點是河內火車站，前往老城區或還劍湖請依住宿位置選擇下車站。"
      },
      {
        "mode": "bus",
        "name": "一般公車 17 號線",
        "operator": "河內公車",
        "from": "內排機場",
        "to": "龍編公車站（Long Biên）",
        "durationMin": 75,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 15000,
          "currency": "VND",
          "note": "單程"
        },
        "fareQuote": "Route No.17: Noi Bai - Long Bien + 15.000 VND/trip",
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://noibaiairport.vn/en/public-transportations-nid1.html",
        "notes": "一般市區公車，票價比 86 號線便宜，但停靠站較多、車程較長。"
      }
    ]
  },
  {
    "slug": "manila-airport-to-makati",
    "airportCode": "MNL",
    "airportName": "馬尼拉機場",
    "areaName": "馬卡蒂",
    "destinationSlug": "manila",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "taxi",
        "name": "機場固定價計程車（Coupon Taxi）",
        "operator": "LTFRB 核定機場固定價計程車",
        "from": "第 1／2／3 航廈入境車道",
        "to": "馬卡蒂（Greenbelt、Glorietta、Legaspi Village 一帶）",
        "durationMin": 40,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": {
          "amount": 330,
          "currency": "PHP",
          "note": "每車固定價，適用 Makati Area 1（Greenbelt、Glorietta、Legaspi Village 等）；Rockwell、Guadalupe 等 Area 2 為 PHP 440"
        },
        "fareQuote": "GREENBELT PARK AREA 1 330.00",
        "frequency": null,
        "reservation": "於航廈入境車道的固定價計程車櫃台搭乘",
        "sourceUrl": "https://newnaia.com.ph/articles/ltfrb-prescribed-rates-metro-manila",
        "notes": "依目的地收取固定價，上車前請保留機場人員給的派車單，不要交給司機。"
      },
      {
        "mode": "taxi",
        "name": "黃色機場跳表計程車",
        "operator": "NAIA 黃色機場計程車",
        "from": "第 1／2／3 航廈入境車道",
        "to": "馬卡蒂",
        "durationMin": 40,
        "durationSource": "estimate",
        "transfers": 0,
        "fare": null,
        "fareQuote": null,
        "frequency": null,
        "reservation": null,
        "sourceUrl": "https://newnaia.com.ph/transport",
        "notes": "跳表計費，起跳 P75（前 500 公尺），之後每 300 公尺加 P4，等候每 2 分鐘加 P4。"
      }
    ]
  },
  {
    "slug": "phuket-airport-to-patong",
    "airportCode": "HKT",
    "airportName": "普吉機場",
    "areaName": "芭東海灘",
    "destinationSlug": "phuket",
    "verifiedAt": "2026-11-10",
    "options": [
      {
        "mode": "bus",
        "name": "普吉智慧巴士 Phuket Smart Bus",
        "operator": "Phuket Smart Bus（PKSB）",
        "from": "普吉機場",
        "to": "芭東（PEA Patong 站）",
        "durationMin": 90,
        "durationSource": "official",
        "transfers": 0,
        "fare": {
          "amount": 100,
          "currency": "THB",
          "note": "機場–芭東–拉威路線單一票價；6 歲以下兒童由付費成人陪同免費"
        },
        "fareQuote": "Airport ⇄ Patong ⇄ Rawai 100 ฿ flat",
        "frequency": "機場發車 08:15–23:30，約每 30 分鐘一班（2026 年 1 月 16 日起時刻表）",
        "reservation": "不需預約，車上可用感應式 Visa／Mastercard／JCB、泰國 QR（PromptPay）或現金付款",
        "sourceUrl": "https://phuketsmartbus.com/payment",
        "notes": "依官方時刻表，機場到芭東約 80–90 分鐘，沿途會經過北部各海灘。"
      }
    ]
  }
];
