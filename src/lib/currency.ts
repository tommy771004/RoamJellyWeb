/**
 * Maps a destination string (zh-TW or English place name) to an ISO currency code.
 * Single source of truth — previously duplicated across ItineraryTab, ToolsTab,
 * and QuickExpenseModal (with subtly divergent rules). Defaults to TWD.
 */
export function getCurrencyFromDestination(destination: string): string {
  if (!destination) return "TWD";
  const lower = destination.toLowerCase();
  if (
    lower.includes("日") ||
    lower.includes("tokyo") ||
    lower.includes("osaka") ||
    lower.includes("kyoto")
  )
    return "JPY";
  if (lower.includes("韓") || lower.includes("seoul")) return "KRW";
  if (lower.includes("泰") || lower.includes("bangkok")) return "THB";
  if (
    lower.includes("美") ||
    lower.includes("usa") ||
    lower.includes("new york")
  )
    return "USD";
  if (
    lower.includes("歐") ||
    lower.includes("paris") ||
    lower.includes("london")
  )
    return "EUR";
  return "TWD";
}
