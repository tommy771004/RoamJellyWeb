// Airline display-name (English + 繁體中文) -> IATA code.
// The code drives the logo image at skyticket.com; unmapped names fall back to
// an initial-letter tile. Keep names lowercase-insensitive via getAirlineCode().
export const AIRLINE_CODES: Record<string, string> = {
  // ── Taiwan ──
  "EVA Air": "BR",
  長榮航空: "BR",
  "China Airlines": "CI",
  中華航空: "CI",
  "Starlux Airlines": "JX",
  星宇航空: "JX",
  "Tigerair Taiwan": "IT",
  台灣虎航: "IT",
  "Mandarin Airlines": "AE",
  華信航空: "AE",
  "UNI Air": "B7",
  立榮航空: "B7",

  // ── Japan ──
  "Japan Airlines": "JL",
  日本航空: "JL",
  "All Nippon Airways": "NH",
  全日空: "NH",
  ANA: "NH",
  "Peach Aviation": "MM",
  樂桃航空: "MM",
  "Jetstar Japan": "GK",
  捷星日本: "GK",
  "Skymark Airlines": "BC",
  天馬航空: "BC",
  StarFlyer: "7G",
  星悅航空: "7G",
  "Solaseed Air": "6J",
  "AIRDO": "HD",
  "ZIPAIR": "ZG",

  // ── Korea ──
  "Korean Air": "KE",
  大韓航空: "KE",
  "Asiana Airlines": "OZ",
  韓亞航空: "OZ",
  "Jin Air": "LJ",
  真航空: "LJ",
  "T'way Air": "TW",
  德威航空: "TW",
  "Jeju Air": "7C",
  濟州航空: "7C",
  "Air Busan": "BX",
  釜山航空: "BX",
  "Air Seoul": "RS",
  首爾航空: "RS",

  // ── Hong Kong / Macau ──
  "Cathay Pacific": "CX",
  國泰航空: "CX",
  "Hong Kong Airlines": "HX",
  香港航空: "HX",
  "HK Express": "UO",
  香港快運: "UO",
  "Greater Bay Airlines": "HB",
  大灣區航空: "HB",
  "Air Macau": "NX",
  澳門航空: "NX",

  // ── Mainland China ──
  "Air China": "CA",
  中國國際航空: "CA",
  "China Eastern Airlines": "MU",
  "China Eastern": "MU",
  東方航空: "MU",
  中國東方航空: "MU",
  "China Southern Airlines": "CZ",
  南方航空: "CZ",
  中國南方航空: "CZ",
  "Xiamen Air": "MF",
  廈門航空: "MF",
  "Shenzhen Airlines": "ZH",
  深圳航空: "ZH",
  "Hainan Airlines": "HU",
  海南航空: "HU",
  "Sichuan Airlines": "3U",
  四川航空: "3U",
  "Juneyao Airlines": "HO",
  吉祥航空: "HO",
  "Spring Airlines": "9C",
  春秋航空: "9C",

  // ── Southeast Asia ──
  "Singapore Airlines": "SQ",
  新加坡航空: "SQ",
  Scoot: "TR",
  酷航: "TR",
  "Thai Airways": "TG",
  泰國航空: "TG",
  "Thai AirAsia": "FD",
  泰國亞洲航空: "FD",
  AirAsia: "AK",
  亞洲航空: "AK",
  "AirAsia X": "D7",
  "Malaysia Airlines": "MH",
  馬來西亞航空: "MH",
  "Vietnam Airlines": "VN",
  越南航空: "VN",
  VietJet: "VJ",
  "VietJet Air": "VJ",
  越捷航空: "VJ",
  "Philippine Airlines": "PR",
  菲律賓航空: "PR",
  "Cebu Pacific": "5J",
  宿霧太平洋航空: "5J",
  "Garuda Indonesia": "GA",
  印尼鷹航: "GA",
  "Batik Air": "ID",
  "Lion Air": "JT",
  "Jetstar Asia": "3K",
  "Jetstar Airways": "JQ",
  捷星航空: "JQ",

  // ── North America ──
  "United Airlines": "UA",
  聯合航空: "UA",
  "American Airlines": "AA",
  美國航空: "AA",
  "Delta Air Lines": "DL",
  達美航空: "DL",
  "Air Canada": "AC",
  加拿大航空: "AC",
  "Hawaiian Airlines": "HA",
  夏威夷航空: "HA",

  // ── Europe ──
  Lufthansa: "LH",
  漢莎航空: "LH",
  "British Airways": "BA",
  英國航空: "BA",
  "Air France": "AF",
  法國航空: "AF",
  KLM: "KL",
  荷蘭皇家航空: "KL",
  "Swiss International Air Lines": "LX",
  瑞士國際航空: "LX",
  Finnair: "AY",
  芬蘭航空: "AY",

  // ── Middle East / Oceania ──
  Emirates: "EK",
  阿聯酋航空: "EK",
  "Qatar Airways": "QR",
  卡達航空: "QR",
  "Etihad Airways": "EY",
  阿提哈德航空: "EY",
  "Turkish Airlines": "TK",
  土耳其航空: "TK",
  Qantas: "QF",
  澳洲航空: "QF",
  "Air New Zealand": "NZ",
  紐西蘭航空: "NZ",
};

/** Resolves an airline display name (case-insensitive, trimmed) to its IATA code. */
export function getAirlineCode(providerName?: string): string | undefined {
  const name = providerName?.trim() ?? "";
  if (!name) return undefined;
  if (AIRLINE_CODES[name]) return AIRLINE_CODES[name];
  const lower = name.toLowerCase();
  for (const [key, code] of Object.entries(AIRLINE_CODES)) {
    if (key.toLowerCase() === lower) return code;
  }
  return undefined;
}

/** Renders an airline's logo image (by IATA code lookup), or an initial-letter fallback tile. */
export default function AirlineLogo({
  providerName,
  className,
}: {
  providerName: string;
  className: string;
}) {
  const normalizedName = providerName?.trim() || "";
  const code = getAirlineCode(normalizedName);
  if (code) {
    return (
      <img
        src={`https://skyticket.com/img/airline_images/${code}.jpg`}
        alt={normalizedName ? `${normalizedName} 標誌` : "航空公司標誌"}
        className={`${className} object-cover`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }
  const initial = normalizedName?.charAt(0) || "?";
  return (
    <div
      className={`${className} bg-slate-900 flex items-center justify-center font-black text-white shadow-sm`}
      role="img"
      aria-label={normalizedName ? `${normalizedName} 標誌` : "航空公司標誌"}
    >
      {initial}
    </div>
  );
}
