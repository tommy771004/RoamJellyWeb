// Pure text/time parsing helpers extracted from ItineraryTab so they can be
// unit-tested independently of the (very large) component.

/** Splits free-text (newline / comma / 、 / ，) into a deduped, trimmed list. */
export function parseCsvInput(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

/** Clamps a "HH:MM" string to a valid 24h clock value; falls back to "10:00". */
export function normalizeClockInput(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "10:00";
  const hh = Math.min(Math.max(0, Number(match[1])), 23);
  const mm = Math.min(Math.max(0, Number(match[2])), 59);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Parses a human duration string ("1h 30m" / "90分鐘") into total minutes. */
export function extractMinutes(text: string): number {
  if (!text) return 0;
  let totalMinutes = 0;
  const hrMatch = text.match(/(\d+)\s*(h|hr|小時|時)/i);
  if (hrMatch) totalMinutes += parseInt(hrMatch[1], 10) * 60;
  const minMatch = text.match(/(\d+)\s*(m|min|分鐘|分)/i);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
  return totalMinutes;
}

/** Current wall-clock time as "HH:MM". */
export function formatCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
