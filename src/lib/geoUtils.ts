export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) {
    return `${h} 小時${m > 0 ? ` ${m} 分鐘` : ''}`;
  }
  return `${m} 分鐘`;
}

export function estimateTransport(km: number): { emoji: string; label: string; minutes: number; isFlight?: boolean } {
  if (km < 0.8) {
    const minutes = Math.round((km * 1000) / 80);
    return { emoji: '🚶', label: `步行約 ${formatMinutes(minutes)}`, minutes };
  }
  if (km < 5) {
    const minutes = Math.round((km / 15) * 60);
    return { emoji: '🚇', label: `大眾運輸約 ${formatMinutes(minutes)}`, minutes };
  }
  if (km > 300) {
    const minutes = Math.round((km / 800) * 60) + 120; // 800km/h average flight speed + 2 hours buffer
    return { emoji: '✈️', label: `飛航/跨域約 ${formatMinutes(minutes)}`, minutes, isFlight: true };
  }

  const minutes = Math.round((km / 40) * 60);
  return { emoji: '🚗', label: `乘車約 ${formatMinutes(minutes)}`, minutes };
}
