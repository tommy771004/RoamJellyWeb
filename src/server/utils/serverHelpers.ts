// Pure, dependency-free helpers extracted from server.ts so they can be unit-tested.

export function getSearchCacheKey(cacheKey: string): string {
  return `cache:search:${cacheKey}`;
}

export function getPlanningLogKey(tripId: string): string {
  return `planning:trip:${tripId}:events`;
}

export function getPlanningSnapshotKey(tripId: string): string {
  return `planning:trip:${tripId}:snapshot`;
}

export function normalizeMembers(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.map((item) => String(item).trim()).filter((item) => item.length > 0)));
}

export function isGuestUserId(userId: string | null): boolean {
  return typeof userId === 'string' && userId.startsWith('guest_');
}

export function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
