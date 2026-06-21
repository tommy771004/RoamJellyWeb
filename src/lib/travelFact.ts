import type { TravelFact } from "../types/workflow";

/** CTA label for a travel fact's booking link, or null if there's no booking URL. */
export function getTravelFactBookingLabel(fact?: TravelFact | null): string | null {
  if (!fact?.metadata?.bookingUrl) return null;
  return fact.factType.includes("flight") ? "前往預訂" : "查看價格";
}

/** Builds the clickout/redirect payload for a travel fact, or null if not bookable. */
export function getTravelFactRedirectPayload(fact?: TravelFact | null) {
  const bookingUrl = fact?.metadata?.bookingUrl?.trim();
  if (!fact || !bookingUrl) return null;

  return {
    provider: fact.metadata?.provider || fact.metadata?.airline || fact.title,
    affiliateUrl: bookingUrl,
    itemId: fact.id,
    airline: fact.metadata?.airline || fact.metadata?.provider || fact.title,
    departure: fact.metadata?.depCode || "出發",
    arrival: fact.metadata?.arrCode || fact.locationName || "目的地",
    price:
      typeof fact.metadata?.price === "number"
        ? fact.metadata.price
        : undefined,
    currency: fact.metadata?.currency,
    emoji: fact.factType.includes("flight") ? "✈️" : "🏨",
  };
}
