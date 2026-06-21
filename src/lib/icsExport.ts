import type { ItineraryNode } from "../types/workflow";
import { sortNodesForDisplay } from "./itineraryUtils";
import { normalizeClockInput } from "./itineraryText";

/** Escapes a value for safe inclusion in an iCalendar (.ics) text field. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Formats a Date as a local-time iCalendar timestamp: YYYYMMDDTHHMMSS. */
export function formatDateToIcs(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

/** Builds a full VCALENDAR string from a trip's itinerary nodes. */
export function buildIcsCalendar(tripName: string, nodes: ItineraryNode[]): string {
  const orderedNodes = sortNodesForDisplay([...nodes]).filter(
    (node) => node.date && node.time,
  );
  const nowStamp = formatDateToIcs(new Date());
  const events = orderedNodes.map((node, index) => {
    const start = new Date(`${node.date}T${normalizeClockInput(node.time)}:00`);
    const nextNode = orderedNodes[index + 1];
    const nextStart =
      nextNode?.date && nextNode?.time
        ? new Date(`${nextNode.date}T${normalizeClockInput(nextNode.time)}:00`)
        : null;
    const end =
      nextStart && nextStart > start
        ? nextStart
        : new Date(start.getTime() + 60 * 60 * 1000);

    return [
      "BEGIN:VEVENT",
      `UID:${node.node_id}@roamjelly.app`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatDateToIcs(start)}`,
      `DTEND:${formatDateToIcs(end)}`,
      `SUMMARY:${escapeIcsText(node.title)}`,
      `DESCRIPTION:${escapeIcsText(node.description || node.ai_note || "")}`,
      `LOCATION:${escapeIcsText(node.title)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RoamJelly//Trip Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(tripName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
