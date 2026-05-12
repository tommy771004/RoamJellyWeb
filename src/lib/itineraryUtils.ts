import type { ItineraryNode } from '../types/workflow';

function padTwo(value: number) {
  return String(value).padStart(2, '0');
}

function parseDateOnlyParts(value?: string | null) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  return { year, month, day };
}

function toUtcDateFromParts(parts: { year: number; month: number; day: number }) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function getDateForDay(day: number, startDateStr?: string | null): string | undefined {
  const baseParts = parseDateOnlyParts(startDateStr ?? undefined);
  if (!baseParts || !Number.isFinite(day) || day < 1) return undefined;

  const date = toUtcDateFromParts(baseParts);
  date.setUTCDate(date.getUTCDate() + (day - 1));
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())}`;
}

export function getDayForDate(dateStr?: string | null, startDateStr?: string | null, fallbackDay = 1): number {
  const dateParts = parseDateOnlyParts(dateStr ?? undefined);
  const baseParts = parseDateOnlyParts(startDateStr ?? undefined);
  if (!dateParts || !baseParts) return fallbackDay;

  const date = toUtcDateFromParts(dateParts);
  const baseDate = toUtcDateFromParts(baseParts);
  const diffDays = Math.round((date.getTime() - baseDate.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

export function buildTimestampFromDateTime(dateStr?: string | null, time?: string | null): string | undefined {
  const normalizedDate = parseDateOnlyParts(dateStr ?? undefined);
  const normalizedTime = String(time ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!normalizedDate || !normalizedTime) return undefined;

  const hours = Number(normalizedTime[1]);
  const minutes = Number(normalizedTime[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;

  return `${normalizedDate.year}-${padTwo(normalizedDate.month)}-${padTwo(normalizedDate.day)}T${padTwo(hours)}:${padTwo(minutes)}:00Z`;
}

export function sortNodesForDisplay(nodes: ItineraryNode[]): ItineraryNode[] {
  return [...nodes].sort((a, b) => {
    const dayDiff = (a.day ?? 1) - (b.day ?? 1);
    if (dayDiff !== 0) return dayDiff;

    const dateA = a.date ?? '';
    const dateB = b.date ?? '';
    const dateDiff = dateA.localeCompare(dateB);
    if (dateDiff !== 0) return dateDiff;

    const timeA = a.time ?? '99:99';
    const timeB = b.time ?? '99:99';
    const timeDiff = timeA.localeCompare(timeB);
    if (timeDiff !== 0) return timeDiff;

    const sortA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sortB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;

    return (a.node_id ?? '').localeCompare(b.node_id ?? '');
  });
}

export function assignDaysBasedOnTimeAndOrder(nodes: any[], startDateStr?: string): ItineraryNode[] {
  let currentDay = 1;
  let lastTimeMinutes = -1;
  let sortOrderForDay = 1;

  return nodes.map((n) => {
    const previousDay = currentDay;
    const node: ItineraryNode = {
      node_id: n.node_id || n.id || `node_${Date.now()}_${Math.random()}`,
      day: Number(n.day ?? 1),
      date: n.date,
      time: n.time || '10:00',
      title: n.title || n.location || '未命名行程',
      emoji: n.emoji || n.icon || '📍',
      category: n.category || 'other',
      description: n.description ?? n.ai_note ?? n.notes,
      ai_note: n.ai_note ?? n.aiNote ?? undefined,
      intensity: n.intensity ?? undefined,
      is_visited: n.is_visited ?? n.isVisited ?? false,
      source: n.source || 'remote',
      lat: n.lat,
      lng: n.lng,
      transport_to_next: n.transport_to_next,
      image_url: n.image_url,
      linkedFactId: n.linkedFactId || n.linked_fact_id,
      sort_order: typeof n.sort_order === 'number' ? n.sort_order : typeof n.sortOrder === 'number' ? n.sortOrder : undefined,
    };

    if (n.day != null) {
      currentDay = Number(n.day);
      if (currentDay !== previousDay && !(typeof n.sort_order === 'number' || typeof n.sortOrder === 'number')) {
        sortOrderForDay = 1;
      }
    } else {
      const timeParts = String(node.time).split(':');
      const hours = parseInt(timeParts[0] || '10', 10);
      const mins = parseInt(timeParts[1] || '0', 10);
      const timeMinutes = hours * 60 + mins;

      if (lastTimeMinutes !== -1 && timeMinutes < lastTimeMinutes) {
        currentDay++;
        sortOrderForDay = 1;
      }
      lastTimeMinutes = timeMinutes;
    }

    node.day = Number.isFinite(currentDay) && currentDay > 0 ? currentDay : 1;
    node.date = node.date || getDateForDay(node.day, startDateStr);
    node.timestamp = n.timestamp || buildTimestampFromDateTime(node.date, node.time);
    node.sort_order = node.sort_order ?? sortOrderForDay;
    sortOrderForDay = (node.sort_order ?? sortOrderForDay) + 1;

    return node;
  });
}
