export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateTransport(km: number): { emoji: string; label: string } {
  if (km < 0.8) return { emoji: '🚶', label: `步行約 ${Math.round(km * 1000 / 80)} 分鐘` };
  if (km < 5)   return { emoji: '🚇', label: `大眾運輸約 ${Math.round(km / 15 * 60)} 分鐘` };
  return           { emoji: '🚗', label: `乘車約 ${Math.round(km / 40 * 60)} 分鐘` };
}
