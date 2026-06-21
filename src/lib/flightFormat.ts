import type { ItineraryNode, TravelFact, SearchItem } from "../types/workflow";

/** Parses a "A → B" / "A to B" route label into {from, to}, or null if not a route. */
export function splitRouteLabel(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  for (const separator of ["→", "->", "➜", "➡", "⇢"]) {
    if (!normalized.includes(separator)) continue;
    const [from, to] = normalized
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    if (from && to) return { from, to };
  }
  const matched = normalized.match(/^(.+?)\s+(?:to|TO)\s+(.+)$/);
  if (matched) {
    return { from: matched[1].trim(), to: matched[2].trim() };
  }
  return null;
}

/** Derives a boarding-pass style {from, to, flightNumber} from a node + linked travel fact. */
export function getFlightRouteSummary(item: ItineraryNode, linkedFact?: TravelFact) {
  const metadata = linkedFact?.metadata || {};
  const from = String(metadata.depCode || "").trim();
  const to = String(metadata.arrCode || linkedFact?.locationName || "").trim();
  const parsed =
    splitRouteLabel(item.title) ||
    splitRouteLabel(item.description) ||
    splitRouteLabel(item.notes);

  return {
    from: from || parsed?.from || "出發地",
    to: to || parsed?.to || "目的地",
    flightNumber: String(
      metadata.flightNumber ||
        metadata.airline ||
        metadata.provider ||
        "BOARDING PASS",
    ).trim(),
  };
}

/** Summarises up to 4 flight search results into human-readable one-liners. */
export function extractFlightSegments(items: SearchItem[]): string[] {
  const flights = items.filter((item) => item.type === "flight").slice(0, 4);
  return flights.map((flight) => {
    const title = flight.title;
    const routeMatch = title.match(/^([^()]+)/);
    const route = routeMatch?.[1]?.trim() ?? title;
    const timeMatch = title.match(/(\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2})/);
    const time = timeMatch?.[1]?.replace(/\s+/g, " ") ?? "時間待確認";
    const transferMatch = title.match(/(轉機|轉乘|via\s+[^)\s]+|經[^)\s]+)/i);
    const transfer = transferMatch ? `，${transferMatch[1]}` : "";
    return `${flight.provider} ${route} ${time}${transfer}`;
  });
}
