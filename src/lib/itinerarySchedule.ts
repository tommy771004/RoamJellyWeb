import type { ItineraryNode } from "../types/workflow";
import {
  buildTimestampFromDateTime,
  getDateForDay,
  getDayForDate,
  getCategoryMeta,
  getNodeEmoji,
} from "./itineraryUtils";

/** Returns a copy of the node with its category normalized and an auto-derived emoji. */
export function withAutoCategoryIcon(node: ItineraryNode): ItineraryNode {
  return {
    ...node,
    category: getCategoryMeta(node.category).key,
    emoji: getNodeEmoji(node),
  };
}

/** Fills in a node's date/day/time/timestamp/sort_order consistently from a trip start date. */
export function normalizeScheduleForNode(
  node: Partial<ItineraryNode>,
  options: {
    tripStartDate?: string | null;
    fallbackDay: number;
    fallbackSortOrder?: number;
  },
): Partial<ItineraryNode> {
  const fallbackDay =
    Number(options.fallbackDay) > 0 ? Number(options.fallbackDay) : 1;
  const normalizedDate =
    node.date ||
    getDateForDay(node.day ?? fallbackDay, options.tripStartDate) ||
    getDateForDay(fallbackDay, options.tripStartDate);
  const derivedDay = getDayForDate(
    normalizedDate,
    options.tripStartDate,
    node.day ?? fallbackDay,
  );
  const normalizedTime = node.time || "10:00";

  return {
    ...node,
    day: derivedDay,
    date: normalizedDate,
    time: normalizedTime,
    timestamp:
      buildTimestampFromDateTime(normalizedDate, normalizedTime) ??
      node.timestamp,
    sort_order:
      typeof node.sort_order === "number"
        ? node.sort_order
        : typeof options.fallbackSortOrder === "number"
          ? options.fallbackSortOrder
          : undefined,
  };
}
