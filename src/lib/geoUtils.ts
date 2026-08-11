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

/**
 * Optimizes the visiting order of spots based on geographic distance using Nearest Neighbor TSP + 2-Opt local search refinement.
 */
export function optimizeSpotOrder<T extends { lat?: number | null; lng?: number | null; time?: string; category?: string }>(spots: T[]): { ordered: T[]; savedKm: number; savedMinutes: number } {
  if (spots.length <= 2) {
    return { ordered: [...spots], savedKm: 0, savedMinutes: 0 };
  }

  const calculateTotalKmAndMinutes = (route: T[]) => {
    let totalKm = 0;
    let totalMin = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const s1 = route[i];
      const s2 = route[i + 1];
      if (s1.lat != null && s1.lng != null && s2.lat != null && s2.lng != null) {
        const km = haversineKm(s1.lat, s1.lng, s2.lat, s2.lng);
        totalKm += km;
        totalMin += estimateTransport(km).minutes;
      }
    }
    return { totalKm, totalMin };
  };

  const originalStats = calculateTotalKmAndMinutes(spots);

  const validSpots: { spot: T; index: number }[] = [];
  const invalidSpots: { spot: T; index: number }[] = [];

  spots.forEach((spot, index) => {
    if (spot.lat != null && spot.lng != null) {
      validSpots.push({ spot, index });
    } else {
      invalidSpots.push({ spot, index });
    }
  });

  if (validSpots.length <= 1) {
    return { ordered: [...spots], savedKm: 0, savedMinutes: 0 };
  }

  // Step 1: Nearest Neighbor TSP
  const visited = new Set<number>();
  const initialValid: T[] = [];

  let current = validSpots[0];
  initialValid.push(current.spot);
  visited.add(current.index);

  while (initialValid.length < validSpots.length) {
    let nearest: { spot: T; index: number } | null = null;
    let minDistance = Infinity;

    for (const candidate of validSpots) {
      if (!visited.has(candidate.index)) {
        const dist = haversineKm(current.spot.lat!, current.spot.lng!, candidate.spot.lat!, candidate.spot.lng!);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = candidate;
        }
      }
    }

    if (nearest) {
      initialValid.push(nearest.spot);
      visited.add(nearest.index);
      current = nearest;
    } else {
      break;
    }
  }

  // Step 2: 2-Opt Local Search Refinement to eliminate crossing paths
  let bestValid = [...initialValid];
  let improved = true;
  let iterations = 0;

  const validRouteKm = (r: T[]) => {
    let dist = 0;
    for (let i = 0; i < r.length - 1; i++) {
      dist += haversineKm(r[i].lat!, r[i].lng!, r[i + 1].lat!, r[i + 1].lng!);
    }
    return dist;
  };

  let bestDist = validRouteKm(bestValid);

  while (improved && iterations < 50) {
    improved = false;
    iterations++;
    for (let i = 0; i < bestValid.length - 1; i++) {
      for (let k = i + 1; k < bestValid.length; k++) {
        // Reverse route segment between i and k
        const newRoute = [
          ...bestValid.slice(0, i),
          ...bestValid.slice(i, k + 1).reverse(),
          ...bestValid.slice(k + 1),
        ];
        const newDist = validRouteKm(newRoute);
        if (newDist < bestDist - 0.001) {
          bestDist = newDist;
          bestValid = newRoute;
          improved = true;
        }
      }
    }
  }

  // Combine back with spots that didn't have coordinates
  const result: T[] = [...bestValid, ...invalidSpots.map(i => i.spot)];

  const optimizedStats = calculateTotalKmAndMinutes(result);

  const savedKm = Math.max(0, originalStats.totalKm - optimizedStats.totalKm);
  const savedMinutes = Math.max(0, originalStats.totalMin - optimizedStats.totalMin);

  return { ordered: result, savedKm, savedMinutes };
}

/**
 * Checks if two consecutive itinerary items have an unrealistic travel time based on their Haversine distance.
 */
export interface UnrealisticTravelCheckResult {
  isUnrealistic: boolean;
  distanceKm: number;
  estimatedMinutes: number;
  availableMinutes?: number;
  requiredSpeedKmH?: number;
  reason?: 'impossible_speed' | 'insufficient_time' | 'excessive_distance';
  message?: string;
  severity?: 'warning' | 'error';
}

export function checkUnrealisticTravelTime(
  item1: { lat?: number | null; lng?: number | null; time?: string },
  item2: { lat?: number | null; lng?: number | null; time?: string },
  availableMinutes?: number
): UnrealisticTravelCheckResult {
  if (!item1?.lat || !item1?.lng || !item2?.lat || !item2?.lng) {
    return { isUnrealistic: false, distanceKm: 0, estimatedMinutes: 0 };
  }

  const distanceKm = haversineKm(item1.lat, item1.lng, item2.lat, item2.lng);
  const est = estimateTransport(distanceKm);
  const estimatedMinutes = est.minutes;

  // No conflict if distance is trivial (< 0.1km)
  if (distanceKm < 0.1) {
    return { isUnrealistic: false, distanceKm: Math.round(distanceKm * 10) / 10, estimatedMinutes };
  }

  let isUnrealistic = false;
  let reason: 'impossible_speed' | 'insufficient_time' | 'excessive_distance' | undefined;
  let message: string | undefined;
  let severity: 'warning' | 'error' | undefined;
  let requiredSpeedKmH: number | undefined;

  if (availableMinutes !== undefined && availableMinutes > 0) {
    requiredSpeedKmH = Math.round((distanceKm / (availableMinutes / 60)) * 10) / 10;

    // 1. Extreme required speed check (> 250 km/h for ground, or > 900 km/h overall)
    if (!est.isFlight && requiredSpeedKmH > 250) {
      isUnrealistic = true;
      reason = 'impossible_speed';
      severity = 'error';
      message = `相距 ${Math.round(distanceKm * 10) / 10} km 但時間僅 ${availableMinutes} 分鐘，預估時速需高達 ${requiredSpeedKmH} km/h，難以順利抵達！`;
    } else if (requiredSpeedKmH > 900) {
      isUnrealistic = true;
      reason = 'impossible_speed';
      severity = 'error';
      message = `跨區相距 ${Math.round(distanceKm)} km 但時間僅 ${availableMinutes} 分鐘，所需速度 (${requiredSpeedKmH} km/h) 已超越航速，無法趕達！`;
    } 
    // 2. Insufficient time gap compared to estimated transport duration
    else if (estimatedMinutes > availableMinutes * 1.25) {
      isUnrealistic = true;
      reason = 'insufficient_time';
      severity = 'warning';
      message = `預估移動需約 ${formatMinutes(estimatedMinutes)}，但目前時間間隔僅 ${formatMinutes(availableMinutes)}，行程時間極度緊迫！`;
    }
  } else if (distanceKm > 800) {
    // 3. Huge distance (> 800km) between consecutive items on the same day without time gap info
    isUnrealistic = true;
    reason = 'excessive_distance';
    severity = 'warning';
    message = `連續景點距離過遠（${Math.round(distanceKm)} km），可能需要跨區域移動或搭乘飛機！`;
  }

  return {
    isUnrealistic,
    distanceKm: Math.round(distanceKm * 10) / 10,
    estimatedMinutes,
    availableMinutes,
    requiredSpeedKmH,
    reason,
    message,
    severity,
  };
}

