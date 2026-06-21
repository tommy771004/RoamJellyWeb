import type { ChecklistCategory } from "../types/workflow";

/** Current season label (zh-TW) based on the local month. */
export function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return "春季";
  if (month >= 6 && month <= 8) return "夏季";
  if (month >= 9 && month <= 11) return "秋季";
  return "冬季";
}

/** Heuristically classifies a packing/checklist item into a category by keyword. */
export function guessCategoryFromItem(text: string): ChecklistCategory {
  const t = text.toLowerCase();
  if (
    t.includes("護照") ||
    t.includes("簽證") ||
    t.includes("證件") ||
    t.includes("身分證") ||
    t.includes("機票") ||
    t.includes("門票") ||
    t.includes("卡") ||
    t.includes("錢包") ||
    t.includes("外币") ||
    t.includes("日圓") ||
    t.includes("牙刷") || // Wait, toothbrushes are toiletries, but other documents are separate
    t.includes("外幣") ||
    t.includes("保險") ||
    t.includes("憑證") ||
    t.includes("passport") ||
    t.includes("ticket") ||
    t.includes("card") ||
    t.includes("id") ||
    t.includes("cash") ||
    t.includes("money")
  ) {
    return "documents";
  }
  if (
    t.includes("充電") ||
    t.includes("線") ||
    t.includes("插") ||
    t.includes("轉接") ||
    t.includes("手機") ||
    t.includes("相機") ||
    t.includes("行動電源") ||
    t.includes("平板") ||
    t.includes("電腦") ||
    t.includes("耳機") ||
    t.includes("ipad") ||
    t.includes("power bank") ||
    t.includes("charger") ||
    t.includes("adapter") ||
    t.includes("electronics") ||
    t.includes("phone") ||
    t.includes("camera")
  ) {
    return "electronics";
  }
  if (
    t.includes("衣") ||
    t.includes("褲") ||
    t.includes("裙") ||
    t.includes("鞋") ||
    t.includes("襪") ||
    t.includes("帽") ||
    t.includes("外套") ||
    t.includes("內衣") ||
    t.includes("泳") ||
    t.includes("圍巾") ||
    t.includes("手套") ||
    t.includes("墨鏡") ||
    t.includes("太陽眼鏡") ||
    t.includes("clothes") ||
    t.includes("jacket") ||
    t.includes("shoes") ||
    t.includes("socks") ||
    t.includes("hat") ||
    t.includes("swimwear")
  ) {
    return "clothing";
  }
  if (
    t.includes("洗") ||
    t.includes("刷") ||
    t.includes("牙") ||
    t.includes("膏") ||
    t.includes("保養") ||
    t.includes("毛巾") ||
    t.includes("防曬") ||
    t.includes("隱形眼鏡") ||
    t.includes("保濕") ||
    t.includes("化妝") ||
    t.includes("洗面") ||
    t.includes("沐浴") ||
    t.includes("剃鬚") ||
    t.includes("刮鬍") ||
    t.includes("梳") ||
    t.includes("toiletries") ||
    t.includes("towel") ||
    t.includes("sunscreen") ||
    t.includes("shampoo") ||
    t.includes("soap") ||
    t.includes("brush")
  ) {
    return "toiletries";
  }
  return "other";
}
