import type { ItineraryNode } from "../types/workflow";

const cacheKeyFor = (tripId: string) => `roamjelly_itinerary_${tripId}`;

/** Reads the per-trip itinerary cache (session, migrating any legacy localStorage copy). */
export function readCachedItinerary(tripId: string): ItineraryNode[] {
  if (typeof window === "undefined" || !tripId) return [];
  const storageKey = cacheKeyFor(tripId);
  const sessionCached = window.sessionStorage.getItem(storageKey);
  const legacyCached = window.localStorage.getItem(storageKey);
  const raw = sessionCached ?? legacyCached;
  if (!sessionCached && legacyCached) {
    window.sessionStorage.setItem(storageKey, legacyCached);
    window.localStorage.removeItem(storageKey);
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ItineraryNode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Writes the nodes for the currently-loaded days, preserving cached nodes for other days. */
export function writeCachedItineraryForLoadedDays(
  tripId: string,
  nodes: ItineraryNode[],
  loadedDays: number[],
) {
  if (typeof window === "undefined" || !tripId || loadedDays.length === 0)
    return;
  const loadedDaySet = new Set(loadedDays);
  const cached = readCachedItinerary(tripId);
  const merged = [
    ...cached.filter((node) => !loadedDaySet.has(Number(node.day ?? 1))),
    ...nodes.filter((node) => loadedDaySet.has(Number(node.day ?? 1))),
  ];
  const storageKey = cacheKeyFor(tripId);
  window.sessionStorage.setItem(storageKey, JSON.stringify(merged));
  window.localStorage.removeItem(storageKey);
}

/** Computes added/updated/removed counts between two itinerary node snapshots. */
export function summarizeItineraryDiff(
  previousNodes: ItineraryNode[],
  nextNodes: ItineraryNode[],
) {
  const previousMap = new Map(
    previousNodes.map((node) => [node.node_id, node]),
  );
  const nextMap = new Map(nextNodes.map((node) => [node.node_id, node]));

  const addedNodeIds: string[] = [];
  let updatedCount = 0;
  let removedCount = 0;

  for (const nextNode of nextNodes) {
    const previousNode = previousMap.get(nextNode.node_id);
    if (!previousNode) {
      addedNodeIds.push(nextNode.node_id);
      continue;
    }

    const previousSignature = [
      previousNode.day,
      previousNode.date,
      previousNode.time,
      previousNode.title,
      previousNode.description,
      previousNode.transport_to_next,
      previousNode.image_url,
      previousNode.is_visited,
    ].join("|");

    const nextSignature = [
      nextNode.day,
      nextNode.date,
      nextNode.time,
      nextNode.title,
      nextNode.description,
      nextNode.transport_to_next,
      nextNode.image_url,
      nextNode.is_visited,
    ].join("|");

    if (previousSignature !== nextSignature) {
      updatedCount += 1;
    }
  }

  for (const previousNode of previousNodes) {
    if (!nextMap.has(previousNode.node_id)) {
      removedCount += 1;
    }
  }

  return {
    addedCount: addedNodeIds.length,
    updatedCount,
    removedCount,
    addedNodeIds,
    totalChanges: addedNodeIds.length + updatedCount + removedCount,
  };
}

/** Builds a zh-TW message summarising changes that happened while offline. */
export function buildReconnectSummaryMessage(diff: {
  addedCount: number;
  updatedCount: number;
  removedCount: number;
}) {
  const parts = [
    diff.addedCount > 0 ? `新增 ${diff.addedCount} 個景點` : "",
    diff.updatedCount > 0 ? `更新 ${diff.updatedCount} 個景點` : "",
    diff.removedCount > 0 ? `刪除 ${diff.removedCount} 個景點` : "",
  ].filter(Boolean);

  return parts.length > 0
    ? `您離線期間，旅伴已${parts.join("、")}。`
    : "您已重新連線，行程已同步到最新版本。";
}
