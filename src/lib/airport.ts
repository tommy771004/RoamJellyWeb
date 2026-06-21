/** Extracts the last 3-letter airport code from a free-text value, else a 3-char fallback. */
export function extractAirportCode(value?: string): string {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (!normalized) return "";
  const matches = normalized.match(/[A-Z]{3}/g);
  if (matches?.length) return matches[matches.length - 1];
  return normalized.replace(/[^A-Z0-9]/g, "").slice(0, 3);
}

/** Maps a city name (zh/en) to a representative IATA code; defaults to TPE. */
export const getIataCode = (cityName: string = ""): string => {
  const name = cityName.toLowerCase();
  if (name.includes("東京") || name.includes("tokyo")) return "NRT";
  if (name.includes("大阪") || name.includes("osaka")) return "KIX";
  if (name.includes("倫敦") || name.includes("london")) return "LHR";
  if (name.includes("瑞士") || name.includes("switzerland") || name.includes("ch") || name.includes("瑞")) return "ZRH";
  if (name.includes("尼泊爾") || name.includes("nepal") || name.includes("尼")) return "KTM";
  if (name.includes("挪威") || name.includes("norway") || name.includes("挪")) return "OSL";
  if (name.includes("台北") || name.includes("taipei") || name.includes("tpe")) return "TPE";
  return "TPE";
};

/** Returns a coarse travel-safety status label (zh-TW) for a city. */
export const getSafetyStatus = (cityName: string = ""): string => {
  const name = cityName.toLowerCase();
  if (name.includes("倫敦") || name.includes("london")) return "💛 旅遊須知";
  return "💚 安全無虞";
};
